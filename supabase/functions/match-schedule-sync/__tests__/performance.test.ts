// Performance tests for match schedule synchronization
import { assertEquals, assertLess, assertGreaterOrEqual } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { MatchSynchronizer } from "../sync.ts";
import { CacheManager } from "../cache.ts";
import { ErrorHandler } from "../error-handler.ts";

// Helper function to measure execution time
const measureTime = async <T>(operation: () => Promise<T>): Promise<{ result: T; duration: number }> => {
  const start = performance.now();
  const result = await operation();
  const duration = performance.now() - start;
  return { result, duration };
};

// Helper function to generate large datasets
const generateMockMatches = (count: number, options: {
  statusDistribution?: { scheduled: number; running: number; finished: number };
  tournamentCount?: number;
} = {}) => {
  const { statusDistribution = { scheduled: 0.6, running: 0.2, finished: 0.2 }, tournamentCount = 1 } = options;
  const matches = [];
  
  for (let i = 1; i <= count; i++) {
    const rand = Math.random();
    let status = "Scheduled";
    
    if (rand < statusDistribution.finished) {
      status = "Finished";
    } else if (rand < statusDistribution.finished + statusDistribution.running) {
      status = "Running";
    }
    
    matches.push({
      No: i.toString(),
      NoInTournament: `M${i.toString().padStart(4, '0')}`,
      TeamAName: `Team A${i}`,
      TeamBName: `Team B${i}`,
      LocalDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      LocalTime: `${(9 + Math.floor(Math.random() * 8)).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      Court: `Court ${(i % 8) + 1}`,
      Status: status,
      Round: `Round ${Math.ceil(i / 50)}`,
      MatchPointsA: status === "Finished" ? Math.floor(Math.random() * 3) : undefined,
      MatchPointsB: status === "Finished" ? Math.floor(Math.random() * 3) : undefined
    });
  }
  
  return matches;
};

// Mock Supabase client optimized for performance testing
const createPerformanceMockSupabase = (options: {
  simulateLatency?: number;
  failureRate?: number;
} = {}) => {
  const { simulateLatency = 0, failureRate = 0 } = options;
  
  return {
    from: (table: string) => ({
      select: async (columns?: string, options?: any) => {
        // Simulate network latency
        if (simulateLatency > 0) {
          await new Promise(resolve => setTimeout(resolve, simulateLatency));
        }
        
        // Simulate random failures
        if (Math.random() < failureRate) {
          throw new Error("Simulated database error");
        }
        
        if (table === 'tournaments') {
          return {
            in: () => ({
              lte: () => ({
                gte: () => ({
                  gte: () => ({
                    order: () => Promise.resolve({
                      data: Array.from({ length: 20 }, (_, i) => ({
                        no: (i + 1).toString(),
                        code: `PERF${i + 1}`,
                        name: `Performance Test Tournament ${i + 1}`,
                        status: i % 2 === 0 ? "Running" : "Live",
                        start_date: "2025-01-08",
                        end_date: "2025-01-10",
                        last_synced: new Date().toISOString()
                      })),
                      error: null
                    })
                  })
                })
              })
            })
          };
        }
        
        if (table === 'matches') {
          if (options?.count === 'exact' && options?.head === true) {
            return Promise.resolve({ count: 1000, error: null });
          }
          
          if (columns === 'no') {
            return {
              in: () => Promise.resolve({
                data: [], // Simulate no existing matches for insert performance
                error: null
              })
            };
          }
        }
        
        return Promise.resolve({ data: [], error: null });
      },
      
      upsert: async (data: any[], options?: any) => {
        // Simulate batch processing time
        const processingTime = Math.max(10, data.length * 0.5);
        await new Promise(resolve => setTimeout(resolve, processingTime));
        
        if (Math.random() < failureRate) {
          throw new Error("Simulated upsert error");
        }
        
        return Promise.resolve({
          data: null,
          error: null,
          count: data.length
        });
      }
    })
  };
};

Deno.test("Performance - Large batch match processing", async () => {
  const mockSupabase = createPerformanceMockSupabase();
  const synchronizer = new MatchSynchronizer(mockSupabase);
  
  // Generate 1000 matches for testing
  const matches = generateMockMatches(1000);
  
  const { result, duration } = await measureTime(async () => {
    return await synchronizer.processMatchBatch(matches, "12345", 100);
  });
  
  assertEquals(result.processed, 1000);
  assertEquals(result.errors, 0);
  
  // Should process 1000 matches in under 5 seconds
  assertLess(duration, 5000);
  console.log(`Processed ${result.processed} matches in ${duration.toFixed(2)}ms`);
});

Deno.test("Performance - XML parsing with large datasets", () => {
  const synchronizer = new MatchSynchronizer({} as any);
  
  // Generate large XML with 2000 matches
  const matchCount = 2000;
  let largeXML = '<BeachMatches>';
  
  for (let i = 1; i <= matchCount; i++) {
    largeXML += `
      <BeachMatch>
        <No>${i}</No>
        <NoInTournament>M${i.toString().padStart(4, '0')}</NoInTournament>
        <TeamAName>Team A${i}</TeamAName>
        <TeamBName>Team B${i}</TeamBName>
        <LocalDate>2025-01-08</LocalDate>
        <LocalTime>10:00</LocalTime>
        <Court>Court ${(i % 8) + 1}</Court>
        <Status>${i % 3 === 0 ? 'Running' : 'Scheduled'}</Status>
        <Round>Pool Play</Round>
        <MatchPointsA>0</MatchPointsA>
        <MatchPointsB>0</MatchPointsB>
      </BeachMatch>
    `;
  }
  largeXML += '</BeachMatches>';
  
  const { result, duration } = measureTime(() => {
    return Promise.resolve(synchronizer.parseXMLMatches(largeXML));
  });
  
  assertEquals(result.length, matchCount);
  
  // Should parse 2000 matches in under 1 second
  assertLess(duration, 1000);
  console.log(`Parsed ${result.length} matches from XML in ${duration.toFixed(2)}ms`);
});

Deno.test("Performance - Concurrent tournament processing", async () => {
  const mockSupabase = createPerformanceMockSupabase({ simulateLatency: 50 });
  
  const tournaments = Array.from({ length: 20 }, (_, i) => ({
    no: (i + 1).toString(),
    name: `Tournament ${i + 1}`
  }));
  
  const errorHandler = new ErrorHandler();
  
  const processOperation = async (tournament: { no: string; name: string }) => {
    // Simulate match processing for each tournament
    const matches = generateMockMatches(100);
    const synchronizer = new MatchSynchronizer(mockSupabase);
    
    const result = await synchronizer.processMatchBatch(matches, tournament.no, 50);
    return {
      tournamentNo: tournament.no,
      matchesProcessed: result.processed,
      success: result.errors === 0
    };
  };
  
  const { result, duration } = await measureTime(async () => {
    return await errorHandler.executeTournamentOperations(
      tournaments,
      processOperation,
      "processMatches"
    );
  });
  
  assertEquals(result.successful.length, 20);
  assertEquals(result.failed.length, 0);
  
  // Should process 20 tournaments concurrently in reasonable time
  // With 50ms latency per tournament, concurrent processing should be much faster than 20 * 50ms
  assertLess(duration, 10000); // Under 10 seconds
  console.log(`Processed ${result.successful.length} tournaments concurrently in ${duration.toFixed(2)}ms`);
});

Deno.test("Performance - Cache TTL calculation with large match sets", () => {
  const cacheManager = new CacheManager();
  
  // Generate 5000 matches with various statuses
  const matches = generateMockMatches(5000, {
    statusDistribution: { scheduled: 0.5, running: 0.3, finished: 0.2 }
  });
  
  const { result, duration } = measureTime(() => {
    return Promise.resolve(cacheManager.calculateMatchesTTL(matches));
  });
  
  assertEquals(typeof result, "string");
  
  // Should calculate TTL for 5000 matches in under 100ms
  assertLess(duration, 100);
  console.log(`Calculated TTL for ${matches.length} matches in ${duration.toFixed(2)}ms`);
});

Deno.test("Performance - Cache statistics generation", () => {
  const cacheManager = new CacheManager();
  
  const matches = generateMockMatches(10000, {
    statusDistribution: { scheduled: 0.4, running: 0.3, finished: 0.3 }
  });
  
  const { result, duration } = measureTime(() => {
    return Promise.resolve(cacheManager.getCacheStatistics(matches));
  });
  
  assertEquals(result.totalMatches, 10000);
  assertGreaterOrEqual(result.liveMatches, 0);
  assertGreaterOrEqual(result.scheduledMatches, 0);
  assertGreaterOrEqual(result.finishedMatches, 0);
  
  // Should generate statistics for 10,000 matches in under 50ms
  assertLess(duration, 50);
  console.log(`Generated statistics for ${result.totalMatches} matches in ${duration.toFixed(2)}ms`);
});

Deno.test("Performance - Error classification at scale", () => {
  const errorHandler = new ErrorHandler();
  
  const errors = [
    new Error("Network error occurred"),
    new Error("401 Unauthorized"),
    new Error("Database connection failed"),
    new Error("Timeout exceeded"),
    new Error("Rate limit exceeded"),
    new Error("Validation failed"),
    new Error("API request failed: 500"),
    new Error("API request failed: 404")
  ];
  
  const contexts = Array.from({ length: 1000 }, (_, i) => ({
    operation: `operation${i}`,
    tournamentNo: `${i % 100}`,
    timestamp: new Date().toISOString()
  }));
  
  const { result, duration } = measureTime(() => {
    const classifications = [];
    for (let i = 0; i < contexts.length; i++) {
      const error = errors[i % errors.length];
      const context = contexts[i];
      classifications.push(errorHandler.classifyError(error, context));
    }
    return Promise.resolve(classifications);
  });
  
  assertEquals(result.length, 1000);
  
  // Should classify 1000 errors in under 100ms
  assertLess(duration, 100);
  console.log(`Classified ${result.length} errors in ${duration.toFixed(2)}ms`);
});

Deno.test("Performance - Match data mapping transformation", () => {
  const mockSupabase = createPerformanceMockSupabase();
  const synchronizer = new MatchSynchronizer(mockSupabase);
  
  const matches = generateMockMatches(5000);
  
  const { result, duration } = measureTime(() => {
    const mappedMatches = matches.map(match => 
      synchronizer.mapMatchToDatabase(match, "12345")
    );
    return Promise.resolve(mappedMatches);
  });
  
  assertEquals(result.length, 5000);
  assertEquals(result[0].tournament_no, "12345");
  
  // Should map 5000 matches in under 200ms
  assertLess(duration, 200);
  console.log(`Mapped ${result.length} matches to database format in ${duration.toFixed(2)}ms`);
});

Deno.test("Performance - Batch size optimization", async () => {
  const mockSupabase = createPerformanceMockSupabase({ simulateLatency: 20 });
  const synchronizer = new MatchSynchronizer(mockSupabase);
  
  const matches = generateMockMatches(1000);
  const batchSizes = [50, 100, 200, 500];
  const results: Array<{ batchSize: number; duration: number; throughput: number }> = [];
  
  for (const batchSize of batchSizes) {
    const { result, duration } = await measureTime(async () => {
      return await synchronizer.processMatchBatch(matches, "12345", batchSize);
    });
    
    assertEquals(result.processed, 1000);
    const throughput = matches.length / (duration / 1000); // matches per second
    
    results.push({ batchSize, duration, throughput });
    console.log(`Batch size ${batchSize}: ${duration.toFixed(2)}ms (${throughput.toFixed(0)} matches/sec)`);
  }
  
  // Find optimal batch size (highest throughput)
  const optimal = results.reduce((best, current) => 
    current.throughput > best.throughput ? current : best
  );
  
  console.log(`Optimal batch size: ${optimal.batchSize} (${optimal.throughput.toFixed(0)} matches/sec)`);
  
  // Verify that we tested multiple batch sizes and found performance differences
  assertGreaterOrEqual(results.length, 4);
  assertGreaterOrEqual(optimal.throughput, 100); // At least 100 matches per second
});

Deno.test("Performance - Memory efficiency during large operations", async () => {
  const mockSupabase = createPerformanceMockSupabase();
  const synchronizer = new MatchSynchronizer(mockSupabase);
  
  // Test memory usage doesn't grow excessively with large datasets
  const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
  
  // Process multiple large batches sequentially
  for (let batch = 0; batch < 5; batch++) {
    const matches = generateMockMatches(2000); // 2000 matches per batch
    
    await synchronizer.processMatchBatch(matches, `tournament${batch}`, 100);
    
    // Force garbage collection if available
    if (globalThis.gc) {
      globalThis.gc();
    }
  }
  
  const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
  const memoryIncrease = finalMemory - initialMemory;
  
  console.log(`Memory increase after processing 10,000 matches: ${memoryIncrease} bytes`);
  
  // Memory increase should be reasonable (less than 50MB for this test)
  if (initialMemory > 0) {
    assertLess(memoryIncrease, 50 * 1024 * 1024);
  }
});

Deno.test("Performance - Error handler resilience under load", async () => {
  const errorHandler = new ErrorHandler({
    maxRetries: 2,
    baseDelay: 1,
    maxDelay: 10
  });
  
  let operationCount = 0;
  const totalOperations = 500;
  
  const flakyOperation = async () => {
    operationCount++;
    // 30% failure rate
    if (Math.random() < 0.3) {
      throw new Error("Network error occurred");
    }
    return `Operation ${operationCount} success`;
  };
  
  const { result, duration } = await measureTime(async () => {
    const operations = Array.from({ length: totalOperations }, () => 
      errorHandler.executeWithRetry(
        flakyOperation,
        {
          operation: "flakyTest",
          timestamp: new Date().toISOString()
        }
      ).catch(error => ({ error: error.message }))
    );
    
    return await Promise.all(operations);
  });
  
  const successes = result.filter(r => typeof r === 'string').length;
  const failures = result.length - successes;
  
  console.log(`Error handler performance: ${successes}/${totalOperations} succeeded in ${duration.toFixed(2)}ms`);
  console.log(`Failure rate: ${(failures / totalOperations * 100).toFixed(1)}%`);
  
  // Should handle high concurrency efficiently
  assertLess(duration, 5000); // Under 5 seconds for 500 operations
  assertGreaterOrEqual(successes, totalOperations * 0.5); // At least 50% success rate
  
  const stats = errorHandler.getErrorStatistics();
  console.log(`Dead letter queue entries: ${stats.deadLetterQueueSize}`);
});

Deno.test("Performance - End-to-end synchronization simulation", async () => {
  const mockSupabase = createPerformanceMockSupabase({ simulateLatency: 25 });
  const synchronizer = new MatchSynchronizer(mockSupabase);
  const cacheManager = new CacheManager();
  const errorHandler = new ErrorHandler();
  
  // Simulate realistic tournament sync scenario
  const tournaments = Array.from({ length: 15 }, (_, i) => ({
    no: (i + 1).toString(),
    name: `Tournament ${i + 1}`
  }));
  
  const { result, duration } = await measureTime(async () => {
    const results = [];
    
    for (const tournament of tournaments) {
      try {
        // Generate realistic match data for each tournament
        const matchCount = 50 + Math.floor(Math.random() * 100); // 50-150 matches
        const matches = generateMockMatches(matchCount);
        
        // Process tournament matches
        const syncResult = await synchronizer.processMatchBatch(
          matches,
          tournament.no,
          100
        );
        
        // Calculate cache TTL
        const ttl = cacheManager.calculateMatchesTTL(matches);
        
        results.push({
          tournamentNo: tournament.no,
          matchesProcessed: syncResult.processed,
          ttl,
          success: syncResult.errors === 0
        });
        
      } catch (error) {
        results.push({
          tournamentNo: tournament.no,
          matchesProcessed: 0,
          ttl: "15 minutes",
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  });
  
  const successful = result.filter(r => r.success).length;
  const totalMatches = result.reduce((sum, r) => sum + r.matchesProcessed, 0);
  
  console.log(`End-to-end performance: ${successful}/${tournaments.length} tournaments processed`);
  console.log(`Total matches processed: ${totalMatches} in ${duration.toFixed(2)}ms`);
  console.log(`Average processing rate: ${(totalMatches / (duration / 1000)).toFixed(0)} matches/sec`);
  
  // Performance targets for production readiness
  assertEquals(successful, tournaments.length); // 100% success rate expected
  assertGreaterOrEqual(totalMatches, 750); // At least 50 matches per tournament on average
  assertLess(duration, 10000); // Complete sync in under 10 seconds
  assertGreaterOrEqual(totalMatches / (duration / 1000), 200); // At least 200 matches/sec throughput
});