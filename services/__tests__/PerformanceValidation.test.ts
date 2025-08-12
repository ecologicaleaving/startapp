import { VisApiService } from '../visApi';
import { CacheService } from '../CacheService';
import { CachePerformanceMonitor } from '../CachePerformanceMonitor';
import { CacheWarmupService } from '../CacheWarmupService';
import { Tournament } from '../../types/tournament';

// Mock dependencies
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
  }
}));

jest.mock('../MemoryCacheManager');
jest.mock('../LocalStorageManager');
jest.mock('../CacheStatsService');

// Mock fetch
global.fetch = jest.fn();

describe('Performance Testing and Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    // Reset performance monitor
    CachePerformanceMonitor.clearPerformanceData();
    
    // Silence console output during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Memory Cache Performance Requirements', () => {
    it('should achieve sub-100ms response times for memory cache hits', async () => {
      CacheService.initialize();
      
      const mockTournaments: Tournament[] = [{
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB World Tour',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      }];

      // Mock memory cache hit (fast response)
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(mockTournaments);

      const startTime = performance.now();
      const result = await CacheService.getTournaments();
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Validate performance
      expect(duration).toBeLessThan(100); // Sub-100ms requirement
      expect(result.source).toBe('memory');
      expect(result.data).toEqual(mockTournaments);
    });

    it('should validate memory cache performance using CachePerformanceMonitor', async () => {
      CacheService.initialize();

      // Simulate fast memory operations
      const fastOperation = async () => {
        // Simulate memory cache response in 45ms
        await new Promise(resolve => setTimeout(resolve, 45));
        return [{
          No: '1',
          Code: 'MFIVB2025',
          Name: 'FIVB Tournament',
          StartDate: '2025-01-15',
          EndDate: '2025-01-20',
          Version: '1'
        }];
      };

      const result = await CachePerformanceMonitor.monitorCacheTierPerformance('memory', fastOperation);

      expect(result.duration).toBeLessThan(100);
      expect(result.performant).toBe(true);
      expect(result.threshold).toBe(100);
    });

    it('should warn when memory cache exceeds 100ms threshold', async () => {
      const slowOperation = async () => {
        // Simulate slow memory response (150ms)
        await new Promise(resolve => setTimeout(resolve, 150));
        return [];
      };

      const result = await CachePerformanceMonitor.monitorCacheTierPerformance('memory', slowOperation);

      expect(result.duration).toBeGreaterThan(100);
      expect(result.performant).toBe(false);
      expect(result.threshold).toBe(100);
    });
  });

  describe('Supabase Cache Performance Requirements', () => {
    it('should achieve sub-500ms response times for Supabase cache', async () => {
      const { supabase } = require('../supabase');
      const mockData = [{
        no: '1',
        code: 'MFIVB2025',
        name: 'FIVB Tournament',
        start_date: '2025-01-15',
        end_date: '2025-01-20',
        last_synced: new Date().toISOString(),
        status: 'Running'
      }];

      const mockQuery = {
        eq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis()
      };
      mockQuery.data = mockData;
      mockQuery.error = null;

      supabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue(mockQuery)
      });

      const startTime = performance.now();
      const result = await CacheService.getTournamentsFromSupabase();
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Validate Supabase performance requirement (under 500ms)
      expect(duration).toBeLessThan(500);
      expect(result).toHaveLength(1);
    });

    it('should validate Supabase performance using monitor', async () => {
      const { supabase } = require('../supabase');
      
      // Mock fast Supabase response (300ms)
      const fastSupabaseOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 300));
        return [];
      };

      const result = await CachePerformanceMonitor.monitorCacheTierPerformance('supabase', fastSupabaseOperation);

      expect(result.duration).toBeLessThan(500);
      expect(result.performant).toBe(true);
      expect(result.threshold).toBe(500);
    });

    it('should identify when Supabase cache exceeds 500ms threshold', async () => {
      const slowSupabaseOperation = async () => {
        // Simulate slow Supabase response (800ms)
        await new Promise(resolve => setTimeout(resolve, 800));
        return [];
      };

      const result = await CachePerformanceMonitor.monitorCacheTierPerformance('supabase', slowSupabaseOperation);

      expect(result.duration).toBeGreaterThan(500);
      expect(result.performant).toBe(false);
      expect(result.threshold).toBe(500);
    });
  });

  describe('Cache Hit Ratio Requirements (70%)', () => {
    it('should achieve 70% cache hit ratio target', async () => {
      await CacheWarmupService.initialize();
      
      // Mock stats service to return good hit ratio
      const mockStats = {
        totalRequests: 100,
        memoryHits: 70,    // 70% memory hits
        supabaseHits: 20,  // 20% supabase hits
        localHits: 5,      // 5% local storage hits
        apiCalls: 5,       // 5% API calls
        hitRatio: 0.95     // 95% total hit ratio (cache vs API)
      };

      (CacheWarmupService as any).stats = {
        getStats: jest.fn().mockReturnValue(mockStats)
      };

      const metrics = CacheWarmupService.getMemoryPerformanceMetrics();

      expect(metrics.memoryHitRatio).toBe(0.7); // 70% memory hit ratio
      expect(metrics.cacheEfficiency).toBe('OPTIMAL'); // >= 70% is optimal
    });

    it('should identify when cache hit ratio is below 70%', async () => {
      await CacheWarmupService.initialize();
      
      // Mock stats with poor hit ratio
      const mockStats = {
        totalRequests: 100,
        memoryHits: 40,    // 40% memory hits (below 70% target)
        supabaseHits: 25,
        localHits: 15,
        apiCalls: 20,
        hitRatio: 0.8
      };

      (CacheWarmupService as any).stats = {
        getStats: jest.fn().mockReturnValue(mockStats)
      };

      const metrics = CacheWarmupService.getMemoryPerformanceMetrics();

      expect(metrics.memoryHitRatio).toBe(0.4); // 40% memory hit ratio
      expect(metrics.cacheEfficiency).toBe('NEEDS_IMPROVEMENT'); // < 50% needs improvement
    });

    it('should trigger cache optimization when hit ratio is low', async () => {
      await CacheWarmupService.initialize();
      
      // Mock low hit ratio stats
      const mockStats = {
        totalRequests: 100,
        memoryHits: 45, // 45% hit ratio (< 70% target)
        supabaseHits: 25,
        localHits: 15,
        apiCalls: 15,
        hitRatio: 0.85
      };

      (CacheWarmupService as any).stats = {
        getStats: jest.fn().mockReturnValue(mockStats)
      };

      // Mock CacheService methods
      const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;
      mockCacheService.cleanup = jest.fn().mockResolvedValue({
        memoryCleanedEntries: 10,
        localStorageCleanedEntries: 5
      });
      mockCacheService.initialize = jest.fn();

      const result = await CacheWarmupService.optimizeMemoryPerformance();

      // Should trigger cache size increase optimization
      expect(result.optimizationsApplied).toContain('Increased memory cache size for better hit ratio');
      expect(CacheService.initialize).toHaveBeenCalledWith({
        memoryMaxSize: 100,
        memoryMaxEntries: 2000
      });
    });
  });

  describe('Load Time Improvement (50%)', () => {
    it('should demonstrate 50% load time improvement with caching', async () => {
      const mockTournaments: Tournament[] = [{
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB Tournament',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      }];

      // Test 1: Direct API call (baseline - slow)
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: () => new Promise(resolve => {
          // Simulate slow API response (2000ms)
          setTimeout(() => {
            resolve(`
              <BeachTournaments>
                <BeachTournament No="1" Code="MFIVB2025" Name="FIVB Tournament" StartDate="2025-01-15" EndDate="2025-01-20" Version="1" />
              </BeachTournaments>
            `);
          }, 2000);
        })
      });

      const apiStartTime = performance.now();
      const apiResult = await VisApiService.fetchDirectFromAPI();
      const apiEndTime = performance.now();
      const apiDuration = apiEndTime - apiStartTime;

      // Test 2: Cached call (fast)
      CacheService.initialize();
      (CacheService as any).getFromMemory = jest.fn().mockReturnValue(mockTournaments);

      const cacheStartTime = performance.now();
      const cacheResult = await CacheService.getTournaments();
      const cacheEndTime = performance.now();
      const cacheDuration = cacheEndTime - cacheStartTime;

      // Calculate improvement
      const improvement = (apiDuration - cacheDuration) / apiDuration;
      const improvementPercent = improvement * 100;

      expect(improvementPercent).toBeGreaterThan(50); // Should exceed 50% improvement
      expect(cacheResult.source).toBe('memory');
      expect(apiResult).toHaveLength(1);
      expect(cacheResult.data).toEqual(mockTournaments);
    });

    it('should validate end-to-end performance improvement', async () => {
      // Initialize warmup service for optimal performance
      await CacheWarmupService.initialize();
      
      const mockTournaments: Tournament[] = [{
        No: '1',
        Code: 'MFIVB2025',
        Name: 'FIVB Tournament',
        StartDate: '2025-01-15',
        EndDate: '2025-01-20',
        Version: '1'
      }];

      // Mock enhanced API with cache performance monitoring
      const mockPerformanceMonitor = CachePerformanceMonitor as jest.Mocked<typeof CachePerformanceMonitor>;
      
      // First call - cache miss, API call (slow)
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: null,
          duration: 0,
          performant: true,
          threshold: 100
        })
        .mockResolvedValueOnce({
          result: mockTournaments,
          duration: 1800, // Slow API call
          performant: false,
          threshold: 5000
        });

      const firstCallStart = performance.now();
      const firstResult = await VisApiService.getTournamentListWithDetails();
      const firstCallEnd = performance.now();
      const firstCallDuration = firstCallEnd - firstCallStart;

      // Second call - cache hit (fast)  
      mockPerformanceMonitor.monitorCacheTierPerformance
        .mockResolvedValueOnce({
          result: {
            data: mockTournaments,
            source: 'memory',
            fromCache: true,
            timestamp: Date.now()
          },
          duration: 45, // Fast memory cache hit
          performant: true,
          threshold: 100
        });

      const secondCallStart = performance.now();
      const secondResult = await VisApiService.getTournamentListWithDetails();
      const secondCallEnd = performance.now();
      const secondCallDuration = secondCallEnd - secondCallStart;

      // Calculate improvement
      const improvement = (firstCallDuration - secondCallDuration) / firstCallDuration;
      const improvementPercent = improvement * 100;

      expect(improvementPercent).toBeGreaterThan(50);
      expect(firstResult).toEqual(secondResult);
    });
  });

  describe('Performance Monitoring and Reporting', () => {
    it('should generate comprehensive performance reports', () => {
      // Record some performance data
      CachePerformanceMonitor.recordPerformance('memory_operation', 45);
      CachePerformanceMonitor.recordPerformance('supabase_operation', 350);
      CachePerformanceMonitor.recordPerformance('api_operation', 1800);

      const report = CachePerformanceMonitor.generatePerformanceReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('tierDetails');
      expect(report).toHaveProperty('recommendations');

      expect(report.summary).toHaveProperty('totalMeasurements');
      expect(report.summary).toHaveProperty('performantTiers');
      expect(report.summary).toHaveProperty('underperformingTiers');
    });

    it('should validate cache performance against all requirements', () => {
      // Record performance data for all tiers
      const performanceData = [
        { tier: 'memory', times: [45, 52, 38, 67, 73] },      // All under 100ms
        { tier: 'supabase', times: [320, 450, 380, 290, 410] }, // All under 500ms
        { tier: 'localStorage', times: [120, 150, 135, 148] },   // Under 200ms threshold
        { tier: 'api', times: [1800, 2200, 1950, 2400] }        // Expected to be slow
      ];

      performanceData.forEach(({ tier, times }) => {
        times.forEach(time => {
          CachePerformanceMonitor.recordPerformance(`${tier}_operation`, time);
        });
      });

      const validation = CachePerformanceMonitor.validateCachePerformance();

      expect(validation.overall).toBe('PASS');
      expect(validation.details.memory.status).toBe('PASS');
      expect(validation.details.supabase.status).toBe('PASS');
      expect(validation.details.localStorage.status).toBe('PASS');
      
      // API is expected to be slower, so it might fail, but that's acceptable
      expect(validation.recommendations).toContain('All cache tiers are performing within acceptable thresholds.');
    });

    it('should provide actionable performance recommendations', () => {
      // Record poor performance data
      CachePerformanceMonitor.recordPerformance('memory_operation', 150); // Over 100ms
      CachePerformanceMonitor.recordPerformance('supabase_operation', 750); // Over 500ms

      const validation = CachePerformanceMonitor.validateCachePerformance();

      expect(validation.overall).toBe('FAIL');
      expect(validation.recommendations).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Memory cache averaging'),
          expect.stringContaining('exceeds 100ms requirement'),
          expect.stringContaining('Supabase cache averaging'),
          expect.stringContaining('exceeds 500ms requirement')
        ])
      );
    });
  });

  describe('Performance Optimization Validation', () => {
    it('should validate memory cache optimization effectiveness', async () => {
      await CacheWarmupService.initialize();

      // Mock initial poor performance
      let optimizationApplied = false;
      const mockStats = {
        totalRequests: 100,
        memoryHits: 40, // Initially poor hit ratio
        supabaseHits: 30,
        localHits: 20,
        apiCalls: 10,
        hitRatio: 0.9
      };

      (CacheWarmupService as any).stats = {
        getStats: jest.fn().mockImplementation(() => {
          if (optimizationApplied) {
            return {
              ...mockStats,
              memoryHits: 75 // Improved after optimization
            };
          }
          return mockStats;
        })
      };

      // Mock cache service optimization
      const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;
      mockCacheService.cleanup = jest.fn().mockResolvedValue({
        memoryCleanedEntries: 15,
        localStorageCleanedEntries: 8
      });
      mockCacheService.initialize = jest.fn().mockImplementation(() => {
        optimizationApplied = true;
      });

      // Initial metrics
      const initialMetrics = CacheWarmupService.getMemoryPerformanceMetrics();
      expect(initialMetrics.cacheEfficiency).toBe('NEEDS_IMPROVEMENT');

      // Apply optimization
      await CacheWarmupService.optimizeMemoryPerformance();

      // Metrics after optimization
      const optimizedMetrics = CacheWarmupService.getMemoryPerformanceMetrics();
      expect(optimizedMetrics.memoryHitRatio).toBeGreaterThan(initialMetrics.memoryHitRatio);
      expect(optimizedMetrics.cacheEfficiency).toBe('OPTIMAL');
    });
  });
});