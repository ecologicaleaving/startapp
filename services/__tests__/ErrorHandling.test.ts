import { VisApiService } from '../visApi';
import { CacheService } from '../CacheService';
import { CachePerformanceMonitor } from '../CachePerformanceMonitor';

// Mock dependencies
jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn()
  }
}));

jest.mock('../CachePerformanceMonitor');
jest.mock('../MemoryCacheManager');
jest.mock('../LocalStorageManager');
jest.mock('../CacheStatsService');

const mockPerformanceMonitor = CachePerformanceMonitor as jest.Mocked<typeof CachePerformanceMonitor>;

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

describe('Error Handling Behavior Preservation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset console mocks
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('VisApiService Error Handling', () => {
    it('should handle HTTP errors in direct API calls', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(VisApiService.fetchDirectFromAPI()).rejects.toThrow('HTTP error! status: 500');
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching active tournaments from direct API:',
        expect.any(Error)
      );
    });

    it('should handle network errors in direct API calls', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(VisApiService.fetchDirectFromAPI()).rejects.toThrow('Failed to fetch active tournaments');
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching active tournaments from direct API:',
        expect.any(Error)
      );
    });

    it('should handle XML parsing errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<InvalidXML><NotClosed>')
      });

      const result = await VisApiService.fetchDirectFromAPI();
      
      // Should return empty array when XML parsing fails
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith(
        'Error parsing BeachTournaments XML:',
        expect.any(Error)
      );
    });

    it('should handle invalid date parsing in tournament filtering', async () => {
      const mockXmlResponse = `
        <BeachTournaments>
          <BeachTournament No="1" Code="MFIVB2025" Name="FIVB Tournament" StartDate="invalid-date" EndDate="2025-01-20" Version="1" />
          <BeachTournament No="2" Code="WFIVB2025" Name="FIVB Tournament 2" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
        </BeachTournaments>
      `;

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse)
      });

      const result = await VisApiService.fetchDirectFromAPI();
      
      // Should filter out tournaments with invalid dates and keep valid ones
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('WFIVB2025');
      expect(console.warn).toHaveBeenCalledWith(
        expect.stringContaining('Invalid date for tournament 1: invalid-date')
      );
    });

    it('should handle match fetch errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(VisApiService.getBeachMatchList('T001')).rejects.toThrow('Failed to fetch tournament matches');
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching matches for tournament T001:',
        expect.any(Error)
      );
    });

    it('should handle related tournaments lookup errors', async () => {
      const tournament = {
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB Tournament',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      };

      // Mock getTournamentListWithDetails to throw error
      jest.spyOn(VisApiService, 'getTournamentListWithDetails').mockRejectedValue(new Error('API error'));

      const result = await VisApiService.findRelatedTournaments(tournament);
      
      // Should return original tournament on error
      expect(result).toEqual([tournament]);
      expect(console.error).toHaveBeenCalledWith('Error finding related tournaments:', expect.any(Error));
    });
  });

  describe('Enhanced VisApiService Error Handling', () => {
    beforeEach(() => {
      CacheService.initialize();
    });

    it('should handle cache service errors and fallback to direct API', async () => {
      // Mock cache service to throw error
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockRejectedValueOnce(new Error('Cache service error'))
        .mockResolvedValueOnce({
          result: [{
            No: '1',
            Code: 'MFIVB2025', 
            Name: 'FIVB Tournament',
            StartDate: '2025-01-15',
            EndDate: '2025-01-20',
            Version: '1'
          }],
          duration: 1500,
          performant: false,
          threshold: 5000
        });

      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <BeachTournaments>
            <BeachTournament No="1" Code="MFIVB2025" Name="FIVB Tournament" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
          </BeachTournaments>
        `)
      });

      const result = await VisApiService.getTournamentListWithDetails();
      
      // Should successfully fallback to API
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('MFIVB2025');
      expect(console.error).toHaveBeenCalledWith('Error in getTournamentListWithDetails:', expect.any(Error));
      expect(console.log).toHaveBeenCalledWith('Attempting direct API fallback after cache error');
    });

    it('should handle both cache and API failures gracefully', async () => {
      // Mock cache service to fail
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockRejectedValueOnce(new Error('Cache error'))
        .mockRejectedValueOnce(new Error('API error'));

      await expect(VisApiService.getTournamentListWithDetails()).rejects.toThrow('Failed to fetch active tournaments');
      
      expect(console.error).toHaveBeenCalledWith('Error in getTournamentListWithDetails:', expect.any(Error));
      expect(console.error).toHaveBeenCalledWith('Direct API fallback also failed:', expect.any(Error));
    });

    it('should handle performance monitor errors during cache operations', async () => {
      mockPerformanceMonitor.monitorCacheTierPerformance.mockRejectedValue(new Error('Performance monitor error'));

      await expect(VisApiService.getTournamentListWithDetails()).rejects.toThrow('Failed to fetch active tournaments');
      expect(console.error).toHaveBeenCalledWith('Error in getTournamentListWithDetails:', expect.any(Error));
    });
  });

  describe('CacheService Error Handling', () => {
    beforeEach(() => {
      CacheService.initialize();
    });

    it('should handle Supabase query errors', async () => {
      const { supabase } = require('../supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          data: null,
          error: new Error('Database connection failed')
        })
      });

      const result = await CacheService.getTournamentsFromSupabase();
      
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('Supabase tournaments query error:', expect.any(Error));
    });

    it('should handle Supabase connection errors', async () => {
      const { supabase } = require('../supabase');
      supabase.from.mockImplementation(() => {
        throw new Error('Supabase connection failed');
      });

      const result = await CacheService.getTournamentsFromSupabase();
      
      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalledWith('getTournamentsFromSupabase error:', expect.any(Error));
    });

    it('should handle cache service errors and return stale data when available', async () => {
      // Mock memory cache to fail
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(null);
      
      // Mock local storage to fail
      (CacheService as any).getFromLocalStorage = jest.fn().mockRejectedValue(new Error('Local storage error'));
      
      // Mock Supabase to fail
      const { supabase } = require('../supabase');
      supabase.from.mockImplementation(() => {
        throw new Error('Supabase error');
      });

      // Mock API to fail
      jest.spyOn(VisApiService, 'getTournamentListWithDetails').mockRejectedValue(new Error('API error'));

      // Mock stale data availability
      const staleData = [{
        No: '1',
        Code: 'MFIVB2025',
        Name: 'Stale FIVB Tournament',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      }];
      (CacheService as any).getStaleData = jest.fn().mockResolvedValue(staleData);

      const result = await CacheService.getTournaments();
      
      // Should return stale data as fallback
      expect(result.data).toEqual(staleData);
      expect(result.source).toBe('localStorage');
      expect(console.error).toHaveBeenCalledWith('CacheService.getTournaments error:', expect.any(Error));
    });

    it('should throw error when all fallback options are exhausted', async () => {
      // Mock all cache tiers to fail
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(null);
      (CacheService as any).getFromLocalStorage = jest.fn().mockRejectedValue(new Error('Local storage error'));
      
      const { supabase } = require('../supabase');
      supabase.from.mockImplementation(() => {
        throw new Error('Supabase error');
      });

      jest.spyOn(VisApiService, 'getTournamentListWithDetails').mockRejectedValue(new Error('API error'));
      
      // Mock no stale data available
      (CacheService as any).getStaleData = jest.fn().mockResolvedValue(null);

      await expect(CacheService.getTournaments()).rejects.toThrow();
      expect(console.error).toHaveBeenCalledWith('CacheService.getTournaments error:', expect.any(Error));
    });
  });

  describe('Error Logging Consistency', () => {
    it('should maintain consistent error logging patterns', async () => {
      // Test API error logging
      mockFetch.mockRejectedValue(new Error('Network timeout'));

      await expect(VisApiService.fetchDirectFromAPI()).rejects.toThrow();
      
      // Verify error logging pattern
      expect(console.error).toHaveBeenCalledWith(
        expect.stringMatching(/Error fetching active tournaments/),
        expect.any(Error)
      );
    });

    it('should preserve error context in logged messages', async () => {
      mockFetch.mockRejectedValue(new Error('Specific network error'));

      await expect(VisApiService.getBeachMatchList('T001')).rejects.toThrow();
      
      // Verify error context is preserved
      expect(console.error).toHaveBeenCalledWith(
        'Error fetching matches for tournament T001:',
        expect.objectContaining({
          message: 'Specific network error'
        })
      );
    });

    it('should maintain error message consistency across cache tiers', async () => {
      // Test that error messages are consistent
      const expectedPatterns = [
        /CacheService\./,
        /Error.*:/,
        /Failed to fetch/
      ];

      // Mock various error scenarios
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(null);
      (CacheService as any).getFromLocalStorage = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      const { supabase } = require('../supabase');
      supabase.from.mockImplementation(() => {
        throw new Error('Database error');
      });
      
      jest.spyOn(VisApiService, 'getTournamentListWithDetails').mockRejectedValue(new Error('API error'));
      (CacheService as any).getStaleData = jest.fn().mockResolvedValue(null);

      await expect(CacheService.getTournaments()).rejects.toThrow();
      
      // Verify error messages follow expected patterns
      const errorCalls = (console.error as jest.Mock).mock.calls;
      expect(errorCalls.length).toBeGreaterThan(0);
      
      errorCalls.forEach(call => {
        const [message] = call;
        const matchesPattern = expectedPatterns.some(pattern => pattern.test(message));
        expect(matchesPattern).toBe(true);
      });
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should recover from transient errors on retry', async () => {
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Transient network error'));
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(`
            <BeachTournaments>
              <BeachTournament No="1" Code="MFIVB2025" Name="FIVB Tournament" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
            </BeachTournaments>
          `)
        });
      });

      // First call should fail
      await expect(VisApiService.fetchDirectFromAPI()).rejects.toThrow('Failed to fetch active tournaments');
      
      // Second call should succeed
      const result = await VisApiService.fetchDirectFromAPI();
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('MFIVB2025');
    });

    it('should handle partial XML data gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <BeachTournaments>
            <BeachTournament No="1" Code="MFIVB2025" Name="Valid Tournament" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
            <BeachTournament No="2" Code="" Name="" StartDate="" EndDate="" Version="" />
            <BeachTournament No="3" Code="WFIVB2025" Name="Another Valid Tournament" StartDate="2025-01-16" EndDate="2025-01-21" Version="1" />
          </BeachTournaments>
        `)
      });

      const result = await VisApiService.fetchDirectFromAPI();
      
      // Should include all tournaments even with incomplete data
      expect(result).toHaveLength(3);
      expect(result[0].Code).toBe('MFIVB2025');
      expect(result[1].Code).toBe('');
      expect(result[2].Code).toBe('WFIVB2025');
    });
  });
});