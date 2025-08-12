import { assertEquals, assert } from 'std/testing/asserts.ts';
import { describe, it, beforeEach } from 'std/testing/bdd.ts';
import { stub } from 'std/testing/mock.ts';

/**
 * Performance tests for Live Score Sync high-volume optimization
 * Tests priority queuing, rate limiting, and bottleneck detection
 */

describe('Live Score Sync Performance Tests', () => {
  const mockSupabaseClient = {
    from: (table: string) => ({
      select: () => ({ data: [], error: null }),
      update: () => ({ error: null }),
      upsert: () => ({ error: null }),
      insert: () => ({ error: null }),
      eq: () => ({ data: [], error: null }),
      in: () => ({ data: [], error: null }),
      gte: () => ({ data: [], error: null }),
      order: () => ({ data: [], error: null }),
    }),
  };

  beforeEach(() => {
    // Mock environment variables
    stub(Deno.env, 'get', (key: string) => {
      const envVars: { [key: string]: string } = {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-key',
        'FIVB_API_KEY': 'test-fivb-key',
      };
      return envVars[key];
    });
  });

  describe('Tournament Priority Queuing', () => {
    it('should prioritize FIVB tournaments over other types', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      const tournaments = [
        { no: '1', name: 'Local Beach Tournament', code: 'LOCAL-2024' },
        { no: '2', name: 'FIVB Beach Volleyball World Tour', code: 'M-FIVB2024' },
        { no: '3', name: 'CEV European Championship', code: 'M-CEV2024' },
        { no: '4', name: 'Beach Pro Tour Elite16', code: 'M-BPT2024' },
      ];

      const prioritized = monitor.prioritizeTournaments(tournaments);

      // FIVB should be first (highest priority)
      assertEquals(prioritized[0].tournamentNo, '2');
      assertEquals(prioritized[0].type, 'FIVB');
      assert(prioritized[0].priority === 100);

      // CEV should be second
      assertEquals(prioritized[1].tournamentNo, '3');
      assertEquals(prioritized[1].type, 'CEV');
      assert(prioritized[1].priority === 85);

      // BPT should be third
      assertEquals(prioritized[2].tournamentNo, '4');
      assertEquals(prioritized[2].type, 'BPT');
      assert(prioritized[2].priority === 75);

      // Local should be last
      assertEquals(prioritized[3].tournamentNo, '1');
      assertEquals(prioritized[3].type, 'LOCAL');
      assert(prioritized[3].priority === 65);
    });

    it('should handle mixed case tournament names correctly', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      const tournaments = [
        { no: '1', name: 'fivb beach volleyball world championship', code: 'mixed' },
        { no: '2', name: 'CEV European Beach Volleyball Championship', code: 'MIXED' },
        { no: '3', name: 'Beach Pro Tour ELITE16 Tournament', code: 'Mixed-2024' },
      ];

      const prioritized = monitor.prioritizeTournaments(tournaments);

      assertEquals(prioritized[0].type, 'FIVB');
      assertEquals(prioritized[1].type, 'CEV');
      assertEquals(prioritized[2].type, 'BPT');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce API rate limits per tournament', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      const tournamentNo = '12345';

      // Should initially allow processing
      assert(monitor.canProcessTournament(tournamentNo));

      // Make multiple API calls to reach the limit
      for (let i = 0; i < 10; i++) {
        monitor.recordApiCall(tournamentNo);
        if (i < 9) {
          assert(monitor.canProcessTournament(tournamentNo), `Should allow call ${i + 1}`);
        }
      }

      // 11th call should be rate limited
      monitor.recordApiCall(tournamentNo);
      assert(!monitor.canProcessTournament(tournamentNo), 'Should be rate limited after 10 calls');
    });

    it('should allow processing after rate limit window expires', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      const tournamentNo = '12345';

      // Fill up the rate limit
      for (let i = 0; i < 11; i++) {
        monitor.recordApiCall(tournamentNo);
      }

      assert(!monitor.canProcessTournament(tournamentNo));

      // Simulate time passing by clearing old calls
      // In real implementation, this happens automatically based on timestamps
      monitor.cleanup();

      // Should be able to process again
      assert(monitor.canProcessTournament(tournamentNo));
    });

    it('should track rate limits independently per tournament', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      const tournament1 = '12345';
      const tournament2 = '67890';

      // Fill rate limit for tournament 1
      for (let i = 0; i < 11; i++) {
        monitor.recordApiCall(tournament1);
      }

      // Tournament 1 should be rate limited
      assert(!monitor.canProcessTournament(tournament1));

      // Tournament 2 should still be allowed
      assert(monitor.canProcessTournament(tournament2));
    });
  });

  describe('Performance Monitoring', () => {
    it('should track operation performance metrics', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      // Start operation
      const operationId = monitor.startOperation('test_sync');

      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 10));

      // End operation
      monitor.endOperation(operationId, true, { matches: 5 });

      const metrics = monitor.getPerformanceMetrics();

      assert(metrics.totalOperations >= 1);
      assert(metrics.averageOperationTime >= 10);
      assertEquals(metrics.successRate, 1.0);
    });

    it('should track API response times', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      // Record some API response times
      monitor.recordApiResponseTime(100);
      monitor.recordApiResponseTime(200);
      monitor.recordApiResponseTime(150);

      const metrics = monitor.getPerformanceMetrics();

      assertEquals(metrics.averageApiResponseTime, 150);
    });

    it('should calculate success rates correctly', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      // Record operations with mixed success
      const op1 = monitor.startOperation('sync1');
      monitor.endOperation(op1, true);

      const op2 = monitor.startOperation('sync2');
      monitor.endOperation(op2, false);

      const op3 = monitor.startOperation('sync3');
      monitor.endOperation(op3, true);

      const metrics = monitor.getPerformanceMetrics();

      assertEquals(metrics.successRate, 2/3); // 2 successes out of 3
    });
  });

  describe('Bottleneck Detection', () => {
    it('should detect high API response times as bottleneck', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      // Record high response times
      monitor.recordApiResponseTime(6000); // 6 seconds
      monitor.recordApiResponseTime(7000); // 7 seconds

      const bottlenecks = monitor.detectBottlenecks();

      assert(bottlenecks.hasBottlenecks);
      assert(bottlenecks.issues.some(issue => issue.includes('High API response times')));
      assert(bottlenecks.recommendations.length > 0);
    });

    it('should detect low success rates as bottleneck', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      // Record mostly failed operations
      for (let i = 0; i < 10; i++) {
        const opId = monitor.startOperation(`sync${i}`);
        monitor.endOperation(opId, i < 2); // Only first 2 succeed (20% success rate)
      }

      const bottlenecks = monitor.detectBottlenecks();

      assert(bottlenecks.hasBottlenecks);
      assert(bottlenecks.issues.some(issue => issue.includes('Low success rate')));
    });

    it('should detect approaching rate limits as bottleneck', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      const tournamentNo = '12345';

      // Make calls approaching the limit (90% of 10 = 9 calls)
      for (let i = 0; i < 9; i++) {
        monitor.recordApiCall(tournamentNo);
      }

      const bottlenecks = monitor.detectBottlenecks();

      assert(bottlenecks.hasBottlenecks);
      assert(bottlenecks.issues.some(issue => issue.includes('Approaching API rate limits')));
    });

    it('should not detect bottlenecks under normal conditions', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      // Record normal performance metrics
      monitor.recordApiResponseTime(1000); // 1 second - good
      
      const opId = monitor.startOperation('normal_sync');
      await new Promise(resolve => setTimeout(resolve, 100)); // 100ms operation
      monitor.endOperation(opId, true);

      const bottlenecks = monitor.detectBottlenecks();

      assert(!bottlenecks.hasBottlenecks);
      assertEquals(bottlenecks.issues.length, 0);
      assertEquals(bottlenecks.recommendations.length, 0);
    });
  });

  describe('Optimal Batch Size Calculation', () => {
    it('should reduce batch size for poor performance', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      // Record poor performance
      monitor.recordApiResponseTime(4000); // 4 seconds - high
      monitor.recordApiResponseTime(5000); // 5 seconds - high

      const batchSize = monitor.getOptimalBatchSize();

      assert(batchSize < 5, 'Batch size should be reduced for poor performance');
    });

    it('should increase batch size for good performance', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      // Record good performance
      monitor.recordApiResponseTime(500); // 500ms - good
      monitor.recordApiResponseTime(800); // 800ms - good

      // Record successful operations
      for (let i = 0; i < 5; i++) {
        const opId = monitor.startOperation(`sync${i}`);
        monitor.endOperation(opId, true);
      }

      const batchSize = monitor.getOptimalBatchSize();

      assert(batchSize >= 5, 'Batch size should be maintained or increased for good performance');
    });

    it('should further reduce batch size for low success rate', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      // Record poor performance and low success rate
      monitor.recordApiResponseTime(4000);
      
      for (let i = 0; i < 10; i++) {
        const opId = monitor.startOperation(`sync${i}`);
        monitor.endOperation(opId, i < 3); // 30% success rate
      }

      const batchSize = monitor.getOptimalBatchSize();

      assert(batchSize <= 2, 'Batch size should be significantly reduced for poor performance and low success rate');
    });
  });

  describe('Resource Usage Tracking', () => {
    it('should track current resource usage correctly', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      const tournamentNo = '12345';

      // Record some API calls
      monitor.recordApiCall(tournamentNo);
      monitor.recordApiCall(tournamentNo);

      // Record some response times
      monitor.recordApiResponseTime(1500);
      monitor.recordApiResponseTime(2000);

      const resourceUsage = monitor.getCurrentResourceUsage(3, 15);

      assertEquals(resourceUsage.concurrent_tournaments, 3);
      assertEquals(resourceUsage.total_matches, 15);
      assertEquals(resourceUsage.api_calls_per_minute, 2);
      assertEquals(resourceUsage.average_response_time, 1750);
      assert(resourceUsage.error_rate >= 0);
      assert(typeof resourceUsage.timestamp === 'string');
    });
  });

  describe('Memory Management', () => {
    it('should cleanup old metrics to prevent memory leaks', async () => {
      const { PerformanceMonitor } = await import('../performance-monitor.ts');
      const monitor = new PerformanceMonitor(mockSupabaseClient as any);

      // Record many operations
      for (let i = 0; i < 100; i++) {
        const opId = monitor.startOperation(`sync${i}`);
        monitor.endOperation(opId, true);
        monitor.recordApiResponseTime(1000);
        monitor.recordApiCall(`tournament${i}`);
      }

      const beforeCleanup = monitor.getPerformanceMetrics();
      
      monitor.cleanup();
      
      const afterCleanup = monitor.getPerformanceMetrics();

      // Some metrics should be cleaned up, but recent ones should remain
      assert(afterCleanup.totalOperations <= beforeCleanup.totalOperations);
    });
  });
});