import { VisApiService, TournamentType } from '../visApi';
import { CacheService } from '../CacheService';
import { Tournament } from '../../types/tournament';

// Mock CacheService
jest.mock('../CacheService', () => ({
  CacheService: {
    initialize: jest.fn(),
    getTournaments: jest.fn(),
  },
}));

// Mock fetch for direct API calls
global.fetch = jest.fn();

const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('VisApiService Enhanced with Caching', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockTournaments: Tournament[] = [
    {
      No: '1',
      Code: 'MFIVB2025',
      Name: 'FIVB World Tour Tournament',
      StartDate: '2025-01-15',
      EndDate: '2025-01-20',
      Version: '1',
    },
    {
      No: '2',
      Code: 'WBPT2025',
      Name: 'Beach Pro Tour Challenge',
      StartDate: '2025-01-25',
      EndDate: '2025-01-30',
      Version: '1',
    },
    {
      No: '3',
      Code: 'MCEV2025',
      Name: 'CEV European Championship',
      StartDate: '2025-02-05',
      EndDate: '2025-02-10',
      Version: '1',
    },
  ];

  describe('getTournamentListWithDetails with 4-tier cache integration', () => {
    it('should initialize cache service and return cached data on cache hit', async () => {
      // Arrange
      const filterOptions = { tournamentType: 'ALL' as TournamentType };
      const mockCacheResult = {
        data: mockTournaments,
        source: 'memory' as const,
        fromCache: true,
        timestamp: Date.now(),
      };

      mockCacheService.getTournaments.mockResolvedValue(mockCacheResult);

      // Act
      const result = await VisApiService.getTournamentListWithDetails(filterOptions);

      // Assert
      expect(CacheService.initialize).toHaveBeenCalled();
      expect(CacheService.getTournaments).toHaveBeenCalledWith(filterOptions);
      expect(result).toEqual(mockTournaments);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should fallback to direct API when cache service fails', async () => {
      // Arrange
      const filterOptions = { tournamentType: 'FIVB' as TournamentType };
      
      mockCacheService.getTournaments.mockRejectedValue(new Error('Cache service unavailable'));
      
      // Mock successful direct API response
      const mockXmlResponse = `
        <BeachTournament No="1" Code="MFIVB2025" Name="FIVB World Tour Tournament" StartDate="2025-01-15" EndDate="2025-01-20" />
      `;
      
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse),
      } as Response);

      // Act
      const result = await VisApiService.getTournamentListWithDetails(filterOptions);

      // Assert
      expect(CacheService.initialize).toHaveBeenCalled();
      expect(CacheService.getTournaments).toHaveBeenCalledWith(filterOptions);
      expect(mockFetch).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('MFIVB2025');
    });

    it('should handle cache service returning null/undefined data', async () => {
      // Arrange
      const filterOptions = { tournamentType: 'BPT' as TournamentType };
      
      mockCacheService.getTournaments.mockResolvedValue({
        data: null,
        source: 'api' as const,
        fromCache: false,
        timestamp: Date.now(),
      });
      
      // Mock successful direct API response
      const mockXmlResponse = `
        <BeachTournament No="2" Code="WBPT2025" Name="Beach Pro Tour Challenge" StartDate="2025-01-25" EndDate="2025-01-30" />
      `;
      
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse),
      } as Response);

      // Act
      const result = await VisApiService.getTournamentListWithDetails(filterOptions);

      // Assert
      expect(CacheService.initialize).toHaveBeenCalled();
      expect(CacheService.getTournaments).toHaveBeenCalledWith(filterOptions);
      expect(mockFetch).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('WBPT2025');
    });

    it('should propagate errors when both cache and direct API fail', async () => {
      // Arrange
      const filterOptions = { tournamentType: 'CEV' as TournamentType };
      
      mockCacheService.getTournaments.mockRejectedValue(new Error('Cache service error'));
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(
        VisApiService.getTournamentListWithDetails(filterOptions)
      ).rejects.toThrow('Failed to fetch active tournaments');
      
      expect(CacheService.initialize).toHaveBeenCalled();
      expect(CacheService.getTournaments).toHaveBeenCalledWith(filterOptions);
      expect(mockFetch).toHaveBeenCalledTimes(2); // Two attempts in fallback logic
    });

    it('should work without filter options', async () => {
      // Arrange
      const mockCacheResult = {
        data: mockTournaments,
        source: 'supabase' as const,
        fromCache: true,
        timestamp: Date.now(),
      };

      mockCacheService.getTournaments.mockResolvedValue(mockCacheResult);

      // Act
      const result = await VisApiService.getTournamentListWithDetails();

      // Assert
      expect(CacheService.initialize).toHaveBeenCalled();
      expect(CacheService.getTournaments).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockTournaments);
    });

    it('should preserve existing tournament classification with cached data', async () => {
      // Arrange
      const mockCacheResult = {
        data: mockTournaments,
        source: 'localStorage' as const,
        fromCache: true,
        timestamp: Date.now(),
      };

      mockCacheService.getTournaments.mockResolvedValue(mockCacheResult);

      // Act
      const result = await VisApiService.getTournamentListWithDetails();

      // Assert
      expect(result).toEqual(mockTournaments);
      
      // Test classification still works
      expect(VisApiService.classifyTournament(result[0])).toBe('FIVB');
      expect(VisApiService.classifyTournament(result[1])).toBe('BPT');
      expect(VisApiService.classifyTournament(result[2])).toBe('CEV');
    });
  });

  describe('fetchDirectFromAPI method (backward compatibility)', () => {
    it('should maintain exact original API behavior', async () => {
      // Arrange
      const mockXmlResponse = `
        <BeachTournament No="1" Code="MFIVB2025" Name="FIVB World Tour Tournament" StartDate="2025-01-15" EndDate="2025-01-20" />
        <BeachTournament No="2" Code="WBPT2025" Name="Beach Pro Tour Challenge" StartDate="2025-01-25" EndDate="2025-01-30" />
      `;
      
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse),
      } as Response);

      const filterOptions = { tournamentType: 'ALL' as TournamentType };

      // Act
      const result = await VisApiService.fetchDirectFromAPI(filterOptions);

      // Assert
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://www.fivb.org/Vis2009/XmlRequest.asmx'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
          }),
        })
      );
      
      expect(result).toHaveLength(2);
      expect(result[0].Code).toBe('MFIVB2025');
      expect(result[1].Code).toBe('WBPT2025');
    });

    it('should filter tournaments by date range (±1 month)', async () => {
      // Arrange
      const today = new Date();
      const oldDate = new Date(today.getFullYear(), today.getMonth() - 2, 1); // 2 months ago
      const futureDate = new Date(today.getFullYear(), today.getMonth() + 2, 1); // 2 months from now
      const recentDate = new Date(today.getFullYear(), today.getMonth(), 15); // This month

      const mockXmlResponse = `
        <BeachTournament No="1" Code="OLD2025" Name="Old Tournament" StartDate="${oldDate.toISOString().split('T')[0]}" EndDate="${oldDate.toISOString().split('T')[0]}" />
        <BeachTournament No="2" Code="RECENT2025" Name="Recent Tournament" StartDate="${recentDate.toISOString().split('T')[0]}" EndDate="${recentDate.toISOString().split('T')[0]}" />
        <BeachTournament No="3" Code="FUTURE2025" Name="Future Tournament" StartDate="${futureDate.toISOString().split('T')[0]}" EndDate="${futureDate.toISOString().split('T')[0]}" />
      `;
      
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse),
      } as Response);

      // Act
      const result = await VisApiService.fetchDirectFromAPI();

      // Assert - Should only include the recent tournament
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('RECENT2025');
    });

    it('should apply tournament type filtering', async () => {
      // Arrange
      const mockXmlResponse = `
        <BeachTournament No="1" Code="MFIVB2025" Name="FIVB World Tour Tournament" StartDate="2025-01-15" EndDate="2025-01-20" />
        <BeachTournament No="2" Code="WBPT2025" Name="Beach Pro Tour Challenge" StartDate="2025-01-25" EndDate="2025-01-30" />
        <BeachTournament No="3" Code="MLOCAL2025" Name="Local Tournament" StartDate="2025-01-18" EndDate="2025-01-22" />
      `;
      
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse),
      } as Response);

      // Act
      const result = await VisApiService.fetchDirectFromAPI({ tournamentType: 'FIVB' });

      // Assert - Should only include FIVB tournament
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('MFIVB2025');
      expect(VisApiService.classifyTournament(result[0])).toBe('FIVB');
    });

    it('should handle HTTP errors', async () => {
      // Arrange
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      // Act & Assert
      await expect(VisApiService.fetchDirectFromAPI()).rejects.toThrow('HTTP error! status: 500');
    });

    it('should handle network errors', async () => {
      // Arrange
      mockFetch.mockRejectedValue(new Error('Network error'));

      // Act & Assert
      await expect(VisApiService.fetchDirectFromAPI()).rejects.toThrow('Failed to fetch active tournaments');
    });

    it('should handle malformed XML gracefully', async () => {
      // Arrange
      const malformedXml = '<invalid>xml</structure>';
      
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(malformedXml),
      } as Response);

      // Act
      const result = await VisApiService.fetchDirectFromAPI();

      // Assert - Should return empty array for malformed XML
      expect(result).toEqual([]);
    });

    it('should sort tournaments by start date in ascending order', async () => {
      // Arrange
      const mockXmlResponse = `
        <BeachTournament No="3" Code="THIRD2025" Name="Third Tournament" StartDate="2025-01-25" EndDate="2025-01-30" />
        <BeachTournament No="1" Code="FIRST2025" Name="First Tournament" StartDate="2025-01-15" EndDate="2025-01-20" />
        <BeachTournament No="2" Code="SECOND2025" Name="Second Tournament" StartDate="2025-01-20" EndDate="2025-01-25" />
      `;
      
      mockFetch.mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse),
      } as Response);

      // Act
      const result = await VisApiService.fetchDirectFromAPI();

      // Assert - Should be sorted by start date
      expect(result).toHaveLength(3);
      expect(result[0].Code).toBe('FIRST2025'); // Jan 15
      expect(result[1].Code).toBe('SECOND2025'); // Jan 20  
      expect(result[2].Code).toBe('THIRD2025'); // Jan 25
    });
  });

  describe('Performance and caching behavior validation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should demonstrate cache performance improvement', async () => {
      // Arrange
      const mockCacheResult = {
        data: mockTournaments,
        source: 'memory' as const,
        fromCache: true,
        timestamp: Date.now(),
      };

      mockCacheService.getTournaments.mockResolvedValue(mockCacheResult);

      const startTime = performance.now();

      // Act
      const result = await VisApiService.getTournamentListWithDetails();

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Assert
      expect(result).toEqual(mockTournaments);
      expect(duration).toBeLessThan(50); // Should be very fast from memory cache
      expect(CacheService.getTournaments).toHaveBeenCalledTimes(1);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle different cache sources correctly', async () => {
      const cacheSources = ['memory', 'localStorage', 'supabase', 'api'] as const;

      for (const source of cacheSources) {
        // Arrange
        jest.clearAllMocks();
        const mockCacheResult = {
          data: mockTournaments,
          source,
          fromCache: source !== 'api',
          timestamp: Date.now(),
        };

        mockCacheService.getTournaments.mockResolvedValue(mockCacheResult);

        // Act
        const result = await VisApiService.getTournamentListWithDetails();

        // Assert
        expect(result).toEqual(mockTournaments);
        expect(CacheService.getTournaments).toHaveBeenCalledTimes(1);
        
        // API calls should only happen for 'api' source, but that's handled by CacheService
        // so we don't expect direct fetch calls here
        expect(mockFetch).not.toHaveBeenCalled();
      }
    });
  });
});