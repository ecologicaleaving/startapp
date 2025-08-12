import { VisApiService } from '../visApi';
import { CacheService } from '../CacheService';
import { Tournament } from '../../types/tournament';

// Mock React Native components and modules for testing
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        data: [],
        error: null
      }))
    }))
  },
  testSupabaseConnection: jest.fn()
}));

jest.mock('../MemoryCacheManager');
jest.mock('../LocalStorageManager');
jest.mock('../CacheStatsService');
jest.mock('../CachePerformanceMonitor');

global.fetch = jest.fn();

describe('Component Integration Testing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    CacheService.initialize();
    
    // Silence console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('TournamentList Component Integration', () => {
    const mockTournaments: Tournament[] = [
      {
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB World Tour Tournament',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      },
      {
        No: '2',
        Code: 'WBPT2025',
        Name: 'Beach Pro Tour Challenge',
        StartDate: '2025-01-25',
        EndDate: '2025-01-30',
        Version: '1'
      },
      {
        No: '3',
        Code: 'MCEV2025',
        Name: 'CEV European Championship',
        StartDate: '2025-02-05',
        EndDate: '2025-02-10',
        Version: '1'
      }
    ];

    it('should work seamlessly with cached data (zero component changes required)', async () => {
      // Simulate TournamentList component behavior
      const loadTournaments = async (selectedType: string = 'BPT') => {
        // This is the exact same call pattern used in TournamentList.tsx:104-107
        const tournamentList = await VisApiService.getTournamentListWithDetails({ 
          currentlyActive: true, 
          tournamentType: selectedType as any
        });
        return tournamentList;
      };

      // Mock cache hit (fast response)
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(
        mockTournaments.filter(t => t.Code?.includes('BPT'))
      );

      const startTime = performance.now();
      const result = await loadTournaments('BPT');
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Verify component gets filtered results
      expect(result).toHaveLength(1);
      expect(result[0].Code).toBe('WBPT2025');
      
      // Verify performance improvement
      expect(duration).toBeLessThan(100); // Sub-100ms from cache
      
      // Verify no component changes required
      expect(typeof result[0].No).toBe('string');
      expect(typeof result[0].Code).toBe('string');
      expect(typeof result[0].Name).toBe('string');
      expect(typeof result[0].StartDate).toBe('string');
      expect(typeof result[0].EndDate).toBe('string');
    });

    it('should handle filter changes exactly as before', async () => {
      const loadTournaments = async (selectedType: string) => {
        return await VisApiService.getTournamentListWithDetails({ 
          currentlyActive: true, 
          tournamentType: selectedType as any
        });
      };

      // Mock different cache responses for different filters
      (CacheService as any).getFromMemory = jest.fn()
        .mockReturnValueOnce(mockTournaments.filter(t => t.Code?.includes('FIVB'))) // FIVB filter
        .mockReturnValueOnce(mockTournaments.filter(t => t.Code?.includes('BPT')))  // BPT filter  
        .mockReturnValueOnce(mockTournaments.filter(t => t.Code?.includes('CEV')))  // CEV filter
        .mockReturnValueOnce(mockTournaments); // ALL filter

      // Test all filter types that TournamentList uses
      const fivbResults = await loadTournaments('FIVB');
      expect(fivbResults).toHaveLength(1);
      expect(fivbResults[0].Code).toBe('MFIVB2025');

      const bptResults = await loadTournaments('BPT');
      expect(bptResults).toHaveLength(1);
      expect(bptResults[0].Code).toBe('WBPT2025');

      const cevResults = await loadTournaments('CEV');
      expect(cevResults).toHaveLength(1);
      expect(cevResults[0].Code).toBe('MCEV2025');

      const allResults = await loadTournaments('ALL');
      expect(allResults).toHaveLength(3);
    });

    it('should preserve error handling behavior for component', async () => {
      const loadTournaments = async () => {
        try {
          return await VisApiService.getTournamentListWithDetails({ 
            currentlyActive: true, 
            tournamentType: 'FIVB'
          });
        } catch (err) {
          // Simulate the same error handling as TournamentList.tsx:110-112
          const errorMessage = err instanceof Error ? err.message : 'An error occurred';
          throw new Error(errorMessage);
        }
      };

      // Mock cache and API failures
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(null);
      (CacheService as any).getFromLocalStorage = jest.fn().mockResolvedValue(null);
      
      const { supabase } = require('../supabase');
      supabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      // Component should receive the same error behavior
      await expect(loadTournaments()).rejects.toThrow();
    });

    it('should maintain backward compatibility with component expectations', async () => {
      // Test that all expected Tournament properties are present and correctly typed
      const mockXmlResponse = `
        <BeachTournaments>
          <BeachTournament No="1" Code="MFIVB2025" Name="FIVB World Tour" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
        </BeachTournaments>
      `;

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => Promise.resolve(mockXmlResponse)
      });

      // Force API fallback to test data structure
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(null);
      (CacheService as any).getFromLocalStorage = jest.fn().mockResolvedValue(null);
      
      const { supabase } = require('../supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          data: [],
          error: null
        })
      });

      const result = await VisApiService.getTournamentListWithDetails({
        currentlyActive: true,
        tournamentType: 'FIVB'
      });

      // Verify all properties that TournamentList component uses
      expect(result).toHaveLength(1);
      const tournament = result[0];
      
      // Core properties used in TournamentList
      expect(tournament).toHaveProperty('No');
      expect(tournament).toHaveProperty('Code');
      expect(tournament).toHaveProperty('Name');
      expect(tournament).toHaveProperty('StartDate');
      expect(tournament).toHaveProperty('EndDate');
      expect(tournament).toHaveProperty('Version');
      
      // Verify types match component expectations
      expect(typeof tournament.No).toBe('string');
      expect(typeof tournament.Code).toBe('string');
      expect(typeof tournament.Name).toBe('string');
      expect(typeof tournament.StartDate).toBe('string');
      expect(typeof tournament.EndDate).toBe('string');
    });
  });

  describe('Performance Impact on Components', () => {
    it('should provide faster load times for component initial render', async () => {
      const mockTournaments: Tournament[] = [{
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB Tournament',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      }];

      // First load (cache miss - slower)
      (CacheService as any).getFromMemory = jest.fn().mockReturnValueOnce(null);
      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              text: () => Promise.resolve(`
                <BeachTournaments>
                  <BeachTournament No="1" Code="MFIVB2025" Name="FIVB Tournament" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
                </BeachTournaments>
              `)
            });
          }, 1000); // Simulate 1s API delay
        })
      );

      const firstLoadStart = performance.now();
      const firstLoad = await VisApiService.getTournamentListWithDetails({
        currentlyActive: true,
        tournamentType: 'FIVB'
      });
      const firstLoadEnd = performance.now();
      const firstLoadDuration = firstLoadEnd - firstLoadStart;

      // Second load (cache hit - faster)
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(mockTournaments);

      const secondLoadStart = performance.now();
      const secondLoad = await VisApiService.getTournamentListWithDetails({
        currentlyActive: true,
        tournamentType: 'FIVB'
      });
      const secondLoadEnd = performance.now();
      const secondLoadDuration = secondLoadEnd - secondLoadStart;

      // Verify performance improvement for component
      const improvement = (firstLoadDuration - secondLoadDuration) / firstLoadDuration;
      expect(improvement).toBeGreaterThan(0.5); // > 50% improvement
      expect(secondLoadDuration).toBeLessThan(100); // Sub-100ms cache hit
      
      // Verify same data returned
      expect(firstLoad).toHaveLength(1);
      expect(secondLoad).toHaveLength(1);
      expect(firstLoad[0].Code).toBe(secondLoad[0].Code);
    });

    it('should handle rapid filter changes efficiently', async () => {
      const filterTypes = ['FIVB', 'BPT', 'CEV', 'ALL', 'FIVB', 'BPT']; // Simulate rapid switching
      
      // Mock cache hits for all filter types (simulating warmed cache)
      const mockCacheResponses = filterTypes.map(type => 
        mockTournaments.filter(t => 
          type === 'ALL' ? true : t.Code?.includes(type)
        )
      );

      (CacheService as any).getFromMemory = jest.fn()
        .mockReturnValueOnce(mockCacheResponses[0])
        .mockReturnValueOnce(mockCacheResponses[1])
        .mockReturnValueOnce(mockCacheResponses[2])
        .mockReturnValueOnce(mockCacheResponses[3])
        .mockReturnValueOnce(mockCacheResponses[4])
        .mockReturnValueOnce(mockCacheResponses[5]);

      const loadTimes: number[] = [];

      // Simulate rapid filter changes (like user clicking tabs quickly)
      for (const type of filterTypes) {
        const start = performance.now();
        await VisApiService.getTournamentListWithDetails({
          currentlyActive: true,
          tournamentType: type as any
        });
        const end = performance.now();
        loadTimes.push(end - start);
      }

      // All cached requests should be fast
      loadTimes.forEach(duration => {
        expect(duration).toBeLessThan(100);
      });

      // Average should be very fast
      const avgDuration = loadTimes.reduce((sum, d) => sum + d, 0) / loadTimes.length;
      expect(avgDuration).toBeLessThan(50);
    });
  });

  describe('Data Consistency Across Cache Tiers', () => {
    it('should provide consistent data regardless of cache tier', async () => {
      const baseFilter = { currentlyActive: true, tournamentType: 'FIVB' as any };
      
      // Test data from different cache tiers
      const scenarios = [
        {
          name: 'Memory Cache',
          setup: () => {
            (CacheService as any).getFromMemory = jest.fn().mockReturnValue(mockTournaments.filter(t => t.Code?.includes('FIVB')));
          },
          expectedSource: 'memory'
        },
        {
          name: 'Local Storage Cache',
          setup: () => {
            (CacheService as any).getFromMemory = jest.fn().mockReturnValue(null);
            (CacheService as any).getFromLocalStorage = jest.fn().mockResolvedValue(mockTournaments.filter(t => t.Code?.includes('FIVB')));
          },
          expectedSource: 'localStorage'
        },
        {
          name: 'Direct API',
          setup: () => {
            (CacheService as any).getFromMemory = jest.fn().mockReturnValue(null);
            (CacheService as any).getFromLocalStorage = jest.fn().mockResolvedValue(null);
            
            const { supabase } = require('../supabase');
            supabase.from.mockReturnValue({
              select: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnThis(),
                gte: jest.fn().mockReturnThis(),
                lte: jest.fn().mockReturnThis(),
                data: [],
                error: null
              })
            });
            
            global.fetch = jest.fn().mockResolvedValue({
              ok: true,
              text: () => Promise.resolve(`
                <BeachTournaments>
                  <BeachTournament No="1" Code="MFIVB2025" Name="FIVB World Tour Tournament" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
                </BeachTournaments>
              `)
            });
          },
          expectedSource: 'api' // This comes through the enhanced API
        }
      ];

      const results: any[] = [];

      for (const scenario of scenarios) {
        scenario.setup();
        
        const result = await VisApiService.getTournamentListWithDetails(baseFilter);
        results.push({
          name: scenario.name,
          data: result
        });
      }

      // All results should have consistent data structure
      const firstResult = results[0].data;
      results.forEach(({ name, data }) => {
        expect(data).toHaveLength(1);
        expect(data[0]).toHaveProperty('No');
        expect(data[0]).toHaveProperty('Code');
        expect(data[0]).toHaveProperty('Name');
        expect(data[0].Code).toBe('MFIVB2025');
      });
    });
  });

  describe('Cache Warmup Integration', () => {
    it('should improve component performance after cache warmup', async () => {
      // Simulate component mounting behavior
      const simulateComponentMount = async () => {
        // TournamentList mounts and immediately loads tournaments
        return await VisApiService.getTournamentListWithDetails({
          currentlyActive: true,
          tournamentType: 'BPT'
        });
      };

      // Before warmup - cache miss
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(null);
      (CacheService as any).getFromLocalStorage = jest.fn().mockResolvedValue(null);
      
      const { supabase } = require('../supabase');
      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          data: [],
          error: null
        })
      });

      global.fetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              text: () => Promise.resolve(`
                <BeachTournaments>
                  <BeachTournament No="2" Code="WBPT2025" Name="Beach Pro Tour Challenge" StartDate="2025-01-25" EndDate="2025-01-30" Version="1" />
                </BeachTournaments>
              `)
            });
          }, 800); // Slow initial load
        })
      );

      const beforeWarmupStart = performance.now();
      const beforeWarmupResult = await simulateComponentMount();
      const beforeWarmupEnd = performance.now();
      const beforeWarmupDuration = beforeWarmupEnd - beforeWarmupStart;

      // After warmup - cache hit
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue([{
        No: '2',
        Code: 'WBPT2025',
        Name: 'Beach Pro Tour Challenge',
        StartDate: '2025-01-25',
        EndDate: '2025-01-30',
        Version: '1'
      }]);

      const afterWarmupStart = performance.now();
      const afterWarmupResult = await simulateComponentMount();
      const afterWarmupEnd = performance.now();
      const afterWarmupDuration = afterWarmupEnd - afterWarmupStart;

      // Verify significant improvement
      const improvement = (beforeWarmupDuration - afterWarmupDuration) / beforeWarmupDuration;
      expect(improvement).toBeGreaterThan(0.7); // > 70% improvement
      expect(afterWarmupDuration).toBeLessThan(100);
      
      // Verify data consistency
      expect(beforeWarmupResult).toHaveLength(1);
      expect(afterWarmupResult).toHaveLength(1);
      expect(beforeWarmupResult[0].Code).toBe(afterWarmupResult[0].Code);
    });
  });

  describe('Concurrent Component Access', () => {
    it('should handle multiple components accessing cache simultaneously', async () => {
      // Simulate multiple components or views loading data simultaneously
      const mockTournaments: Tournament[] = [{
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB Tournament',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      }];

      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(mockTournaments);

      // Simulate concurrent requests from different components/views
      const concurrentRequests = [
        VisApiService.getTournamentListWithDetails({ currentlyActive: true, tournamentType: 'FIVB' }),
        VisApiService.getTournamentListWithDetails({ currentlyActive: true, tournamentType: 'ALL' }),
        VisApiService.getTournamentListWithDetails({ recentOnly: true }),
        VisApiService.getTournamentListWithDetails({ currentlyActive: true, tournamentType: 'FIVB' }),
      ];

      const startTime = performance.now();
      const results = await Promise.all(concurrentRequests);
      const endTime = performance.now();
      const totalDuration = endTime - startTime;

      // All should complete quickly due to caching
      expect(totalDuration).toBeLessThan(500);
      
      // All should return data
      results.forEach(result => {
        expect(Array.isArray(result)).toBe(true);
      });

      // Cache should have been accessed multiple times
      expect((CacheService as any).getFromMemory).toHaveBeenCalledTimes(4);
    });
  });
});