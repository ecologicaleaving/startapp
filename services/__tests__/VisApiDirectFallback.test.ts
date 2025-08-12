import { VisApiService } from '../visApi';
import { CacheService } from '../CacheService';
import { CachePerformanceMonitor } from '../CachePerformanceMonitor';

// Mock dependencies
jest.mock('../CacheService');
jest.mock('../CachePerformanceMonitor');

const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;
const mockPerformanceMonitor = CachePerformanceMonitor as jest.Mocked<typeof CachePerformanceMonitor>;

// Mock fetch globally
global.fetch = jest.fn();

describe('VisApiService Direct API Fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset fetch mock
    (global.fetch as jest.Mock).mockReset();
  });

  describe('Network Failure Scenarios', () => {
    it('should fallback to direct API when cache service completely fails', async () => {
      // Mock cache service to throw error
      mockCacheService.getTournaments.mockRejectedValue(new Error('Cache service unavailable'));
      mockCacheService.initialize.mockImplementation(() => {});

      // Mock performance monitor for cache failure
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: null,
          duration: 0,
          performant: false,
          threshold: 100
        })
        .mockResolvedValueOnce({
          result: [],
          duration: 1500,
          performant: false,
          threshold: 5000
        });

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <BeachTournaments>
            <BeachTournament No="1" Code="MFIVB2025" Name="FIVB World Tour" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
          </BeachTournaments>
        `)
      });

      // Act
      const result = await VisApiService.getTournamentListWithDetails();

      // Assert - Should fallback to direct API
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('MFIVB2025');
      expect(global.fetch).toHaveBeenCalled();
      
      // Verify the API fallback was logged
      const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
      expect(fetchCall[0]).toContain('https://www.fivb.org/Vis2009/XmlRequest.asmx');
    });

    it('should handle network timeout during API fallback', async () => {
      // Mock cache service failure
      mockCacheService.getTournaments.mockRejectedValue(new Error('Cache timeout'));
      mockCacheService.initialize.mockImplementation(() => {});

      // Mock performance monitor for failures
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: null,
          duration: 0,
          performant: false,
          threshold: 100
        })
        .mockRejectedValue(new Error('Network timeout'));

      // Mock fetch timeout
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network timeout'));

      // Act & Assert - Should throw error after all fallbacks fail
      await expect(VisApiService.getTournamentListWithDetails()).rejects.toThrow('Failed to fetch active tournaments');
    });

    it('should handle malformed XML response gracefully', async () => {
      // Mock cache failure
      mockCacheService.getTournaments.mockRejectedValue(new Error('Cache error'));
      mockCacheService.initialize.mockImplementation(() => {});

      // Mock performance monitor
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: null,
          duration: 0,
          performant: false,
          threshold: 100
        })
        .mockResolvedValueOnce({
          result: [],
          duration: 2000,
          performant: false,
          threshold: 5000
        });

      // Mock malformed XML response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<InvalidXML><NotClosed>')
      });

      // Act
      const result = await VisApiService.getTournamentListWithDetails();

      // Assert - Should return empty array for malformed XML
      expect(result).toEqual([]);
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Cache Error Scenarios', () => {
    it('should fallback when CacheService returns null result', async () => {
      // Mock cache service to return null
      mockCacheService.getTournaments.mockResolvedValue(null);
      mockCacheService.initialize.mockImplementation(() => {});

      // Mock performance monitor to return null result
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: null,
          duration: 50,
          performant: true,
          threshold: 100
        })
        .mockResolvedValueOnce({
          result: [{
            No: '1',
            Code: 'MFIVB2025',
            Name: 'FIVB World Tour',
            StartDate: '2025-01-15',
            EndDate: '2025-01-20',
            Version: '1'
          }],
          duration: 1200,
          performant: false,
          threshold: 5000
        });

      // Mock successful API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <BeachTournaments>
            <BeachTournament No="1" Code="MFIVB2025" Name="FIVB World Tour" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
          </BeachTournaments>
        `)
      });

      // Act
      const result = await VisApiService.getTournamentListWithDetails();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('MFIVB2025');
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should fallback when cache performance monitor fails', async () => {
      mockCacheService.initialize.mockImplementation(() => {});
      
      // Mock performance monitor to throw error during cache monitoring
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockRejectedValue(new Error('Performance monitoring failed'));

      // Mock successful API fallback
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: [{
            No: '1',
            Code: 'WBPT2025',
            Name: 'Beach Pro Tour',
            StartDate: '2025-01-25',
            EndDate: '2025-01-30',
            Version: '1'
          }],
          duration: 1800,
          performant: false,
          threshold: 5000
        });

      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <BeachTournaments>
            <BeachTournament No="1" Code="WBPT2025" Name="Beach Pro Tour" StartDate="2025-01-25" EndDate="2025-01-30" Version="1" />
          </BeachTournaments>
        `)
      });

      // Act
      const result = await VisApiService.getTournamentListWithDetails();

      // Assert - Should fallback successfully
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('WBPT2025');
    });
  });

  describe('Response Format Preservation', () => {
    it('should return identical format from cache vs direct API', async () => {
      const mockTournament = {
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB World Tour Tournament',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      };

      // Test 1: Cache response
      mockCacheService.getTournaments.mockResolvedValue({
        data: [mockTournament],
        source: 'memory',
        fromCache: true,
        timestamp: Date.now()
      });
      mockCacheService.initialize.mockImplementation(() => {});
      mockPerformanceMonitor.monitorCacheTierPerformance.mockResolvedValue({
        result: {
          data: [mockTournament],
          source: 'memory',
          fromCache: true,
          timestamp: Date.now()
        },
        duration: 45,
        performant: true,
        threshold: 100
      });

      const cacheResult = await VisApiService.getTournamentListWithDetails();

      // Test 2: Direct API response
      jest.clearAllMocks();
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <BeachTournaments>
            <BeachTournament No="1" Code="MFIVB2025" Name="FIVB World Tour Tournament" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
          </BeachTournaments>
        `)
      });

      const apiResult = await VisApiService.fetchDirectFromAPI();

      // Assert - Both should have identical structure
      expect(cacheResult).toHaveLength(1);
      expect(apiResult).toHaveLength(1);
      expect(cacheResult[0]).toEqual(apiResult[0]);
      expect(cacheResult[0]).toHaveProperty('No');
      expect(cacheResult[0]).toHaveProperty('Code');
      expect(cacheResult[0]).toHaveProperty('Name');
      expect(cacheResult[0]).toHaveProperty('StartDate');
      expect(cacheResult[0]).toHaveProperty('EndDate');
      expect(cacheResult[0]).toHaveProperty('Version');
    });

    it('should preserve tournament type filtering in direct API fallback', async () => {
      // Mock cache failure
      mockCacheService.getTournaments.mockRejectedValue(new Error('Cache unavailable'));
      mockCacheService.initialize.mockImplementation(() => {});
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: null,
          duration: 0,
          performant: false,
          threshold: 100
        })
        .mockResolvedValueOnce({
          result: [{
            No: '1',
            Code: 'MFIVB2025',
            Name: 'FIVB World Tour Tournament',
            StartDate: '2025-01-15',
            EndDate: '2025-01-20',
            Version: '1'
          }],
          duration: 1500,
          performant: false,
          threshold: 5000
        });

      // Mock API response with FIVB and BPT tournaments
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <BeachTournaments>
            <BeachTournament No="1" Code="MFIVB2025" Name="FIVB World Tour Tournament" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
            <BeachTournament No="2" Code="WBPT2025" Name="Beach Pro Tour Challenge" StartDate="2025-01-25" EndDate="2025-01-30" Version="1" />
          </BeachTournaments>
        `)
      });

      // Act - Request FIVB tournaments only
      const result = await VisApiService.getTournamentListWithDetails({ tournamentType: 'FIVB' });

      // Assert - Should only return FIVB tournament
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('MFIVB2025');
      expect(result[0].Name).toContain('FIVB');
    });

    it('should preserve date filtering logic in direct API fallback', async () => {
      // Mock cache failure  
      mockCacheService.getTournaments.mockRejectedValue(new Error('Cache unavailable'));
      mockCacheService.initialize.mockImplementation(() => {});
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: null,
          duration: 0,
          performant: false,
          threshold: 100
        })
        .mockResolvedValueOnce({
          result: [],
          duration: 1500,
          performant: false,
          threshold: 5000
        });

      // Mock API response with old and recent tournaments
      const oldTournament = `<BeachTournament No="1" Code="OLD2024" Name="Old Tournament" StartDate="2024-01-15" EndDate="2024-01-20" Version="1" />`;
      const recentTournament = `<BeachTournament No="2" Code="NEW2025" Name="New Tournament" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />`;
      
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(`
          <BeachTournaments>
            ${oldTournament}
            ${recentTournament}
          </BeachTournaments>
        `)
      });

      // Act
      const result = await VisApiService.getTournamentListWithDetails();

      // Assert - Should filter out old tournaments (outside +/-1 month)
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('NEW2025');
    });
  });

  describe('Error Handling Preservation', () => {
    it('should preserve HTTP error handling in fallback', async () => {
      // Mock cache failure
      mockCacheService.getTournaments.mockRejectedValue(new Error('Cache error'));
      mockCacheService.initialize.mockImplementation(() => {});
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: null,
          duration: 0,
          performant: false,
          threshold: 100
        })
        .mockRejectedValue(new Error('HTTP 500'));

      // Mock HTTP error response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      });

      // Act & Assert
      await expect(VisApiService.getTournamentListWithDetails()).rejects.toThrow('Failed to fetch active tournaments');
    });

    it('should handle API request headers correctly in fallback', async () => {
      // Mock cache failure
      mockCacheService.getTournaments.mockRejectedValue(new Error('Cache error'));
      mockCacheService.initialize.mockImplementation(() => {});
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: null,
          duration: 0,
          performant: false,
          threshold: 100
        })
        .mockResolvedValueOnce({
          result: [],
          duration: 1000,
          performant: false,
          threshold: 5000
        });

      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<BeachTournaments></BeachTournaments>')
      });

      // Act
      await VisApiService.getTournamentListWithDetails();

      // Assert - Verify correct headers were sent
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.fivb.org/Vis2009/XmlRequest.asmx'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23'
          }
        })
      );
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should monitor direct API fallback performance', async () => {
      // Mock cache failure
      mockCacheService.getTournaments.mockRejectedValue(new Error('Cache error'));
      mockCacheService.initialize.mockImplementation(() => {});

      // Mock performance monitor calls
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: null,
          duration: 0,
          performant: false,
          threshold: 100
        })
        .mockResolvedValueOnce({
          result: [],
          duration: 2500,
          performant: false,
          threshold: 5000
        });

      // Mock API response
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        text: () => Promise.resolve('<BeachTournaments></BeachTournaments>')
      });

      // Act
      const result = await VisApiService.getTournamentListWithDetails();

      // Assert - Performance monitor should be called for API tier
      expect(mockPerformanceMonitor.monitorCacheTierPerformance).toHaveBeenCalledWith(
        'api',
        expect.any(Function)
      );
      expect(result).toEqual([]);
    });
  });
});