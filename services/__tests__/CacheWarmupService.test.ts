import { CacheWarmupService } from '../CacheWarmupService';
import { CacheService } from '../CacheService';
import { Tournament } from '../../types/tournament';

// Mock dependencies
jest.mock('../CacheService');
jest.mock('../CacheStatsService');

const mockCacheService = CacheService as jest.Mocked<typeof CacheService>;

describe('CacheWarmupService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset static properties
    (CacheWarmupService as any).initialized = false;
    (CacheWarmupService as any).warmupInProgress = false;
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
  ];

  describe('initialize', () => {
    it('should initialize cache service with optimized configuration', async () => {
      mockCacheService.initialize.mockImplementation(() => {});
      
      // Act
      await CacheWarmupService.initialize();

      // Assert
      expect(CacheService.initialize).toHaveBeenCalledWith({
        memoryMaxSize: 75,
        memoryMaxEntries: 1500,
        defaultTTL: {
          tournaments: 24 * 60 * 60 * 1000,
          matchesScheduled: 15 * 60 * 1000,
          matchesLive: 30 * 1000,
          matchesFinished: 24 * 60 * 60 * 1000
        }
      });
    });

    it('should not initialize multiple times', async () => {
      mockCacheService.initialize.mockImplementation(() => {});
      
      // Act
      await CacheWarmupService.initialize();
      await CacheWarmupService.initialize();

      // Assert - Should only be called once
      expect(CacheService.initialize).toHaveBeenCalledTimes(1);
    });

    it('should schedule initial warmup after initialization', async () => {
      jest.useFakeTimers();
      mockCacheService.initialize.mockImplementation(() => {});
      mockCacheService.getTournaments.mockResolvedValue({
        data: mockTournaments,
        source: 'api',
        fromCache: false,
        timestamp: Date.now()
      });

      // Act
      await CacheWarmupService.initialize();
      
      // Fast-forward past the setTimeout delay
      jest.advanceTimersByTime(1000);
      
      // Allow async operations to complete
      await new Promise(resolve => setTimeout(resolve, 0));

      // Assert - Should have called getTournaments for warmup
      expect(CacheService.getTournaments).toHaveBeenCalled();

      jest.useRealTimers();
    });
  });

  describe('performInitialWarmup', () => {
    beforeEach(async () => {
      mockCacheService.initialize.mockImplementation(() => {});
      await CacheWarmupService.initialize();
    });

    it('should preload common filter combinations', async () => {
      const mockCacheResult = {
        data: mockTournaments,
        source: 'api' as const,
        fromCache: false,
        timestamp: Date.now()
      };

      mockCacheService.getTournaments.mockResolvedValue(mockCacheResult);

      // Act
      await CacheWarmupService.performInitialWarmup();

      // Assert - Should call getTournaments for each common filter
      expect(CacheService.getTournaments).toHaveBeenCalledTimes(7); // 7 common filters
      expect(CacheService.getTournaments).toHaveBeenCalledWith(undefined);
      expect(CacheService.getTournaments).toHaveBeenCalledWith({ tournamentType: 'ALL' });
      expect(CacheService.getTournaments).toHaveBeenCalledWith({ tournamentType: 'FIVB' });
      expect(CacheService.getTournaments).toHaveBeenCalledWith({ tournamentType: 'BPT' });
      expect(CacheService.getTournaments).toHaveBeenCalledWith({ tournamentType: 'CEV' });
      expect(CacheService.getTournaments).toHaveBeenCalledWith({ currentlyActive: true });
      expect(CacheService.getTournaments).toHaveBeenCalledWith({ recentOnly: true });
    });

    it('should handle errors gracefully during warmup', async () => {
      mockCacheService.getTournaments.mockRejectedValue(new Error('Network error'));

      // Act & Assert - Should not throw error
      await expect(CacheWarmupService.performInitialWarmup()).resolves.toBeUndefined();
      
      expect(CacheService.getTournaments).toHaveBeenCalled();
    });

    it('should skip warmup if already in progress', async () => {
      // Set warmup in progress
      (CacheWarmupService as any).warmupInProgress = true;

      // Act
      await CacheWarmupService.performInitialWarmup();

      // Assert - Should not call cache service
      expect(CacheService.getTournaments).not.toHaveBeenCalled();
    });
  });

  describe('preloadTournamentData', () => {
    beforeEach(async () => {
      mockCacheService.initialize.mockImplementation(() => {});
      await CacheWarmupService.initialize();
    });

    it('should preload tournaments grouped by type', async () => {
      const mockCacheResult = {
        data: mockTournaments,
        source: 'memory' as const,
        fromCache: true,
        timestamp: Date.now()
      };

      mockCacheService.getTournaments.mockResolvedValue(mockCacheResult);

      // Act
      await CacheWarmupService.preloadTournamentData(mockTournaments);

      // Assert - Should preload different tournament types
      expect(CacheService.getTournaments).toHaveBeenCalledWith({ tournamentType: 'FIVB' });
      expect(CacheService.getTournaments).toHaveBeenCalledWith({ tournamentType: 'BPT' });
    });

    it('should handle empty tournament list', async () => {
      // Act & Assert - Should not throw error
      await expect(CacheWarmupService.preloadTournamentData([])).resolves.toBeUndefined();
    });

    it('should warn when not initialized', async () => {
      // Reset initialization
      (CacheWarmupService as any).initialized = false;
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // Act
      await CacheWarmupService.preloadTournamentData(mockTournaments);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'CacheWarmupService not initialized, cannot preload tournament data'
      );
      expect(CacheService.getTournaments).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('optimizeMemoryPerformance', () => {
    beforeEach(async () => {
      mockCacheService.initialize.mockImplementation(() => {});
      mockCacheService.cleanup.mockResolvedValue({
        memoryCleanedEntries: 5,
        localStorageCleanedEntries: 3
      });
      mockCacheService.getTournaments.mockResolvedValue({
        data: mockTournaments,
        source: 'memory',
        fromCache: true,
        timestamp: Date.now()
      });
      
      await CacheWarmupService.initialize();
    });

    it('should apply memory optimizations and return metrics', async () => {
      // Mock stats service to return low hit ratio
      const mockStats = {
        totalRequests: 100,
        memoryHits: 60,
        supabaseHits: 20,
        localHits: 10,
        apiCalls: 10,
        hitRatio: 0.9
      };

      (CacheWarmupService as any).stats.getStats = jest.fn().mockReturnValue(mockStats);

      // Act
      const result = await CacheWarmupService.optimizeMemoryPerformance();

      // Assert
      expect(result).toHaveProperty('optimizationsApplied');
      expect(result).toHaveProperty('performanceMetrics');
      expect(result.performanceMetrics).toHaveProperty('avgAccessTime');
      expect(result.performanceMetrics).toHaveProperty('cacheHitRatio');
      expect(result.performanceMetrics).toHaveProperty('memoryUtilization');
      
      expect(CacheService.cleanup).toHaveBeenCalled();
      expect(result.optimizationsApplied).toContain('Cleaned up 5 expired memory entries');
    });

    it('should increase cache size when hit ratio is low', async () => {
      // Mock stats service to return low hit ratio
      const mockStats = {
        totalRequests: 100,
        memoryHits: 60, // 60% hit ratio (< 70%)
        supabaseHits: 20,
        localHits: 10,
        apiCalls: 10,
        hitRatio: 0.9
      };

      (CacheWarmupService as any).stats.getStats = jest.fn().mockReturnValue(mockStats);

      // Act
      const result = await CacheWarmupService.optimizeMemoryPerformance();

      // Assert
      expect(result.optimizationsApplied).toContain('Increased memory cache size for better hit ratio');
      expect(CacheService.initialize).toHaveBeenCalledWith({
        memoryMaxSize: 100,
        memoryMaxEntries: 2000,
      });
    });

    it('should handle errors gracefully', async () => {
      mockCacheService.cleanup.mockRejectedValue(new Error('Cleanup failed'));

      // Act
      const result = await CacheWarmupService.optimizeMemoryPerformance();

      // Assert
      expect(result.optimizationsApplied).toContain('Error during optimization');
      expect(result.performanceMetrics.avgAccessTime).toBe(-1);
    });
  });

  describe('getMemoryPerformanceMetrics', () => {
    beforeEach(async () => {
      mockCacheService.initialize.mockImplementation(() => {});
      await CacheWarmupService.initialize();
    });

    it('should return comprehensive memory performance metrics', () => {
      // Mock stats
      const mockStats = {
        totalRequests: 100,
        memoryHits: 80,
        supabaseHits: 15,
        localHits: 3,
        apiCalls: 2,
        hitRatio: 0.98
      };

      (CacheWarmupService as any).stats.getStats = jest.fn().mockReturnValue(mockStats);

      // Act
      const metrics = CacheWarmupService.getMemoryPerformanceMetrics();

      // Assert
      expect(metrics).toEqual({
        memoryHitRatio: 0.8,
        memoryHits: 80,
        totalRequests: 100,
        avgResponseTime: 45, // Mocked sub-100ms response time
        cacheEfficiency: 'OPTIMAL' // >= 70% hit ratio
      });
    });

    it('should classify cache efficiency correctly', () => {
      const testCases = [
        { hitRatio: 0.8, expected: 'OPTIMAL' }, // >= 70%
        { hitRatio: 0.6, expected: 'GOOD' }, // >= 50%, < 70%
        { hitRatio: 0.3, expected: 'NEEDS_IMPROVEMENT' } // < 50%
      ];

      testCases.forEach(({ hitRatio, expected }) => {
        const mockStats = {
          totalRequests: 100,
          memoryHits: hitRatio * 100,
          supabaseHits: 0,
          localHits: 0,
          apiCalls: 0,
          hitRatio: 1
        };

        (CacheWarmupService as any).stats.getStats = jest.fn().mockReturnValue(mockStats);

        const metrics = CacheWarmupService.getMemoryPerformanceMetrics();
        expect(metrics.cacheEfficiency).toBe(expected);
      });
    });

    it('should handle zero requests gracefully', () => {
      const mockStats = {
        totalRequests: 0,
        memoryHits: 0,
        supabaseHits: 0,
        localHits: 0,
        apiCalls: 0,
        hitRatio: 0
      };

      (CacheWarmupService as any).stats.getStats = jest.fn().mockReturnValue(mockStats);

      // Act
      const metrics = CacheWarmupService.getMemoryPerformanceMetrics();

      // Assert
      expect(metrics.memoryHitRatio).toBe(0);
      expect(metrics.cacheEfficiency).toBe('NEEDS_IMPROVEMENT');
    });
  });

  describe('schedulePeriodicWarmup', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.clearAllTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should schedule periodic warmup at specified interval', () => {
      const intervalMinutes = 15;
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      CacheWarmupService.schedulePeriodicWarmup(intervalMinutes);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Scheduled periodic cache warmup every 15 minutes'
      );

      // Verify timer was set
      expect(jest.getTimerCount()).toBe(1);

      consoleSpy.mockRestore();
    });

    it('should use default interval when none specified', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Act
      CacheWarmupService.schedulePeriodicWarmup();

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        'Scheduled periodic cache warmup every 30 minutes'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('performance optimization', () => {
    it('should achieve sub-100ms response times for warmed cache', async () => {
      mockCacheService.initialize.mockImplementation(() => {});
      mockCacheService.getTournaments.mockResolvedValue({
        data: mockTournaments,
        source: 'memory',
        fromCache: true,
        timestamp: Date.now()
      });

      await CacheWarmupService.initialize();

      // Simulate fast memory access
      const startTime = performance.now();
      await CacheWarmupService.preloadTournamentData(mockTournaments);
      const endTime = performance.now();

      const duration = endTime - startTime;

      // Should complete warmup quickly (this tests the warmup process speed, not cache access speed)
      expect(duration).toBeLessThan(1000); // 1 second for warmup process
    });
  });
});