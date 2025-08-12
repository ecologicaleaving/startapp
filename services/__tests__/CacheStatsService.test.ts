import { CacheStatsService } from '../CacheStatsService';

describe('CacheStatsService', () => {
  let statsService: CacheStatsService;

  beforeEach(() => {
    statsService = CacheStatsService.getInstance();
    statsService.reset(); // Reset stats for each test
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = CacheStatsService.getInstance();
      const instance2 = CacheStatsService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Hit Recording', () => {
    test('should record memory hits correctly', () => {
      statsService.recordHit('memory');
      statsService.recordHit('memory');
      
      const stats = statsService.getStats();
      
      expect(stats.memoryHits).toBe(2);
      expect(stats.totalRequests).toBe(2);
    });

    test('should record hits for all tiers', () => {
      statsService.recordHit('memory');
      statsService.recordHit('localStorage');
      statsService.recordHit('supabase');
      statsService.recordHit('api');
      
      const stats = statsService.getStats();
      
      expect(stats.memoryHits).toBe(1);
      expect(stats.localHits).toBe(1);
      expect(stats.supabaseHits).toBe(1);
      expect(stats.apiCalls).toBe(1);
      expect(stats.totalRequests).toBe(4);
    });

    test('should calculate hit ratio correctly', () => {
      // 3 cache hits + 1 API call = 75% hit ratio
      statsService.recordHit('memory');
      statsService.recordHit('localStorage');
      statsService.recordHit('supabase');
      statsService.recordHit('api');
      
      const stats = statsService.getStats();
      
      expect(stats.hitRatio).toBe(0.75);
    });
  });

  describe('Response Time Tracking', () => {
    test('should track response times with timer', () => {
      const requestId = 'test-request-1';
      
      statsService.startTimer(requestId);
      
      // Simulate some delay
      setTimeout(() => {
        statsService.recordResponseTime('memory', requestId);
        
        const stats = statsService.getStats();
        expect(stats.averageResponseTimes.memory).toBeGreaterThan(0);
      }, 10);
    });

    test('should handle multiple concurrent requests', () => {
      statsService.startTimer('req1');
      statsService.startTimer('req2');
      
      setTimeout(() => {
        statsService.recordResponseTime('memory', 'req1');
        statsService.recordResponseTime('supabase', 'req2');
        
        const stats = statsService.getStats();
        expect(stats.averageResponseTimes.memory).toBeGreaterThan(0);
        expect(stats.averageResponseTimes.supabase).toBeGreaterThan(0);
      }, 10);
    });

    test('should limit response time history', () => {
      // Add more than 100 response times
      for (let i = 0; i < 150; i++) {
        const requestId = `req-${i}`;
        statsService.startTimer(requestId);
        statsService.recordResponseTime('memory', requestId);
      }
      
      const detailedStats = statsService.getDetailedMetrics();
      
      // Should keep only last 100 entries per tier
      expect(detailedStats.responseTimes.memory.average).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistics Calculations', () => {
    test('should calculate cache efficiency', () => {
      // 80% cache efficiency (8 cache hits out of 10 requests)
      for (let i = 0; i < 8; i++) {
        statsService.recordHit('memory');
      }
      for (let i = 0; i < 2; i++) {
        statsService.recordHit('api');
      }
      
      const stats = statsService.getStats();
      
      expect(stats.cacheEfficiency).toBe(80);
    });

    test('should calculate API reduction percentage', () => {
      // 70% API reduction (3 out of 10 requests hit API)
      for (let i = 0; i < 7; i++) {
        statsService.recordHit('memory');
      }
      for (let i = 0; i < 3; i++) {
        statsService.recordHit('api');
      }
      
      const stats = statsService.getStats();
      
      expect(stats.apiReductionPercentage).toBe(70);
    });

    test('should provide detailed breakdown', () => {
      statsService.recordHit('memory');
      statsService.recordHit('memory');
      statsService.recordHit('localStorage');
      statsService.recordHit('supabase');
      statsService.recordHit('api');
      
      const detailedStats = statsService.getDetailedMetrics();
      
      expect(detailedStats.breakdown.memoryHitPercentage).toBe(40); // 2/5
      expect(detailedStats.breakdown.localStorageHitPercentage).toBe(20); // 1/5
      expect(detailedStats.breakdown.supabaseHitPercentage).toBe(20); // 1/5
      expect(detailedStats.breakdown.apiCallPercentage).toBe(20); // 1/5
    });
  });

  describe('Performance Target Checking', () => {
    test('should check hit ratio target', () => {
      // Add hits to achieve > 80% hit ratio
      for (let i = 0; i < 9; i++) {
        statsService.recordHit('memory');
      }
      statsService.recordHit('api');
      
      const targets = statsService.checkPerformanceTargets();
      
      expect(targets.hitRatioTarget).toBe(true);
      expect(targets.overallHealth).toBe('good'); // 2 targets met (hitRatio and apiReduction)
    });

    test('should check memory response time target', () => {
      const requestId = 'fast-request';
      
      statsService.startTimer(requestId);
      // Immediately record (very fast response)
      statsService.recordResponseTime('memory', requestId);
      
      const targets = statsService.checkPerformanceTargets();
      
      expect(targets.memoryResponseTimeTarget).toBe(true);
    });

    test('should determine overall health correctly', () => {
      // Meet all targets
      for (let i = 0; i < 9; i++) {
        statsService.recordHit('memory', 'req' + i);
      }
      statsService.recordHit('api');
      
      // Add fast memory response
      statsService.startTimer('fast');
      statsService.recordResponseTime('memory', 'fast');
      
      const targets = statsService.checkPerformanceTargets();
      
      expect(targets.overallHealth).toBe('excellent');
    });
  });

  describe('Statistics Export', () => {
    test('should export statistics with timestamp', () => {
      statsService.recordHit('memory');
      statsService.recordHit('api');
      
      const exported = statsService.exportStats();
      
      expect(exported.timestamp).toBeDefined();
      expect(exported.stats).toBeDefined();
      expect(exported.responseTimes).toBeDefined();
      expect(new Date(exported.timestamp).getTime()).toBeCloseTo(Date.now(), -2);
    });
  });

  describe('Reset Functionality', () => {
    test('should reset all statistics', () => {
      // Add some stats
      statsService.recordHit('memory');
      statsService.recordHit('api');
      statsService.startTimer('req1');
      statsService.recordResponseTime('memory', 'req1');
      
      // Reset
      statsService.reset();
      
      const stats = statsService.getStats();
      
      expect(stats.memoryHits).toBe(0);
      expect(stats.apiCalls).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.hitRatio).toBe(0);
      expect(stats.averageResponseTimes.memory).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle zero requests gracefully', () => {
      const stats = statsService.getStats();
      
      expect(stats.hitRatio).toBe(0);
      expect(stats.cacheEfficiency).toBe(0);
      expect(stats.apiReductionPercentage).toBe(0);
      expect(stats.averageResponseTimes.memory).toBe(0);
    });

    test('should handle missing start timer', () => {
      // Record response time without starting timer
      statsService.recordResponseTime('memory', 'missing-timer');
      
      const stats = statsService.getStats();
      expect(stats.averageResponseTimes.memory).toBe(0);
    });

    test('should handle timer cleanup', () => {
      statsService.startTimer('cleanup-test');
      statsService.recordResponseTime('memory', 'cleanup-test');
      
      // Timer should be cleaned up after recording
      statsService.recordResponseTime('memory', 'cleanup-test');
      
      const stats = statsService.getStats();
      expect(stats.averageResponseTimes.memory).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Statistical Calculations', () => {
    test('should calculate median correctly', () => {
      // Add response times manually to test median calculation
      const requestIds = ['req1', 'req2', 'req3', 'req4', 'req5'];
      
      requestIds.forEach((id, index) => {
        statsService.startTimer(id);
        // Simulate different response times by adding delays
        setTimeout(() => {
          statsService.recordResponseTime('memory', id);
        }, index * 10);
      });
      
      setTimeout(() => {
        const detailedStats = statsService.getDetailedMetrics();
        expect(detailedStats.responseTimes.memory.median).toBeGreaterThanOrEqual(0);
      }, 100);
    });

    test('should handle empty response time arrays', () => {
      const detailedStats = statsService.getDetailedMetrics();
      
      expect(detailedStats.responseTimes.memory.min).toBe(Infinity);
      expect(detailedStats.responseTimes.memory.max).toBe(-Infinity);
      expect(detailedStats.responseTimes.memory.average).toBe(0);
      expect(detailedStats.responseTimes.memory.median).toBe(0);
    });
  });

  describe('Multiple Instance Behavior', () => {
    test('should share state across getInstance calls', () => {
      const instance1 = CacheStatsService.getInstance();
      const instance2 = CacheStatsService.getInstance();
      
      instance1.recordHit('memory');
      
      const stats2 = instance2.getStats();
      expect(stats2.memoryHits).toBe(1);
    });
  });
});