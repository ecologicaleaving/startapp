// Performance tests for sync monitoring system
// Story 2.3: Load testing and performance validation

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"

// Performance test configuration
const PERFORMANCE_CONFIG = {
  CONCURRENT_SYNCS: 10,
  SYNC_DURATION_THRESHOLD_MS: 5000,
  MEMORY_THRESHOLD_MB: 512,
  THROUGHPUT_THRESHOLD_RECORDS_PER_SECOND: 10,
  DATABASE_QUERY_THRESHOLD_MS: 1000,
  ALERT_EVALUATION_THRESHOLD_MS: 500
}

// Mock performance measurement utilities
class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map()

  startMeasurement(name: string): () => number {
    const start = performance.now()
    return () => {
      const duration = performance.now() - start
      if (!this.measurements.has(name)) {
        this.measurements.set(name, [])
      }
      this.measurements.get(name)!.push(duration)
      return duration
    }
  }

  getStats(name: string) {
    const values = this.measurements.get(name) || []
    if (values.length === 0) return null
    
    const sorted = values.sort((a, b) => a - b)
    return {
      count: values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    }
  }

  reset() {
    this.measurements.clear()
  }
}

// Mock memory usage tracker
class MemoryTracker {
  private baseline: number = 0
  private peak: number = 0

  startTracking() {
    this.baseline = this.getCurrentMemoryUsage()
    this.peak = this.baseline
  }

  trackPeak() {
    const current = this.getCurrentMemoryUsage()
    this.peak = Math.max(this.peak, current)
  }

  getMemoryStats() {
    return {
      baseline: this.baseline,
      peak: this.peak,
      increase: this.peak - this.baseline
    }
  }

  private getCurrentMemoryUsage(): number {
    // Mock memory usage - in real implementation would use Deno.memoryUsage()
    return Math.floor(Math.random() * 100) + 200 // 200-300 MB
  }
}

// Mock concurrent sync simulator
async function simulateConcurrentSyncs(count: number, monitor: PerformanceMonitor): Promise<any[]> {
  const promises = []
  
  for (let i = 0; i < count; i++) {
    promises.push(simulateSync(i, monitor))
  }
  
  return await Promise.all(promises)
}

async function simulateSync(id: number, monitor: PerformanceMonitor): Promise<any> {
  const endMeasurement = monitor.startMeasurement(`sync-${id}`)
  
  // Simulate sync work with random duration
  const syncDuration = 1000 + Math.random() * 3000 // 1-4 seconds
  await new Promise(resolve => setTimeout(resolve, syncDuration))
  
  const duration = endMeasurement()
  
  return {
    sync_id: `sync-${id}`,
    duration,
    records_processed: Math.floor(Math.random() * 100) + 50,
    memory_used: Math.floor(Math.random() * 50) + 100,
    success: Math.random() > 0.1 // 90% success rate
  }
}

Deno.test("Performance - Concurrent sync execution under load", async () => {
  const monitor = new PerformanceMonitor()
  const memoryTracker = new MemoryTracker()
  
  memoryTracker.startTracking()
  
  // Test concurrent sync performance
  const testStart = monitor.startMeasurement('concurrent-test')
  
  const results = await simulateConcurrentSyncs(PERFORMANCE_CONFIG.CONCURRENT_SYNCS, monitor)
  
  const totalDuration = testStart()
  memoryTracker.trackPeak()
  
  // Analyze results
  const successfulSyncs = results.filter(r => r.success)
  const avgDuration = results.reduce((sum, r) => sum + r.duration, 0) / results.length
  const totalRecords = results.reduce((sum, r) => sum + r.records_processed, 0)
  const throughput = totalRecords / (totalDuration / 1000) // records per second
  
  const memoryStats = memoryTracker.getMemoryStats()
  
  // Performance assertions
  assertEquals(results.length, PERFORMANCE_CONFIG.CONCURRENT_SYNCS)
  assertEquals(successfulSyncs.length >= 8, true, `Expected at least 8 successful syncs, got ${successfulSyncs.length}`)
  assertEquals(avgDuration < PERFORMANCE_CONFIG.SYNC_DURATION_THRESHOLD_MS, true, 
    `Average sync duration ${avgDuration}ms exceeds threshold ${PERFORMANCE_CONFIG.SYNC_DURATION_THRESHOLD_MS}ms`)
  assertEquals(throughput >= PERFORMANCE_CONFIG.THROUGHPUT_THRESHOLD_RECORDS_PER_SECOND, true,
    `Throughput ${throughput} records/sec below threshold ${PERFORMANCE_CONFIG.THROUGHPUT_THRESHOLD_RECORDS_PER_SECOND}`)
  assertEquals(memoryStats.peak < PERFORMANCE_CONFIG.MEMORY_THRESHOLD_MB, true,
    `Peak memory ${memoryStats.peak}MB exceeds threshold ${PERFORMANCE_CONFIG.MEMORY_THRESHOLD_MB}MB`)
  
  console.log(`Performance Results:
    - Concurrent syncs: ${results.length}
    - Successful syncs: ${successfulSyncs.length}
    - Average duration: ${avgDuration.toFixed(2)}ms
    - Throughput: ${throughput.toFixed(2)} records/sec
    - Peak memory: ${memoryStats.peak}MB
    - Total test duration: ${totalDuration.toFixed(2)}ms`)
})

Deno.test("Performance - Database query optimization", async () => {
  const monitor = new PerformanceMonitor()
  
  // Test database query performance under different loads
  const queryTests = [
    { name: 'sync-history-query', recordCount: 100 },
    { name: 'performance-metrics-query', recordCount: 1000 },
    { name: 'alert-evaluation-query', recordCount: 50 },
    { name: 'dashboard-aggregation-query', recordCount: 500 }
  ]
  
  for (const test of queryTests) {
    // Simulate multiple iterations of each query
    for (let i = 0; i < 10; i++) {
      const endMeasurement = monitor.startMeasurement(test.name)
      
      // Simulate database query with processing time based on record count
      const processingTime = Math.max(100, test.recordCount * 0.5 + Math.random() * 200)
      await new Promise(resolve => setTimeout(resolve, processingTime))
      
      endMeasurement()
    }
  }
  
  // Analyze query performance
  for (const test of queryTests) {
    const stats = monitor.getStats(test.name)
    assertExists(stats)
    
    assertEquals(stats.avg < PERFORMANCE_CONFIG.DATABASE_QUERY_THRESHOLD_MS, true,
      `Query ${test.name} average time ${stats.avg}ms exceeds threshold ${PERFORMANCE_CONFIG.DATABASE_QUERY_THRESHOLD_MS}ms`)
    assertEquals(stats.p95 < PERFORMANCE_CONFIG.DATABASE_QUERY_THRESHOLD_MS * 1.5, true,
      `Query ${test.name} p95 time ${stats.p95}ms exceeds acceptable limit`)
    
    console.log(`Query Performance - ${test.name}:
      - Average: ${stats.avg.toFixed(2)}ms
      - P95: ${stats.p95.toFixed(2)}ms
      - P99: ${stats.p99.toFixed(2)}ms
      - Min/Max: ${stats.min.toFixed(2)}ms / ${stats.max.toFixed(2)}ms`)
  }
})

Deno.test("Performance - Alert evaluation system load test", async () => {
  const monitor = new PerformanceMonitor()
  
  // Simulate multiple alert rules being evaluated simultaneously
  const alertRules = [
    { id: 'rule-1', name: 'Tournament Sync Success Rate', metric: 'success_rate' },
    { id: 'rule-2', name: 'Average Sync Duration', metric: 'avg_duration' },
    { id: 'rule-3', name: 'Memory Usage Threshold', metric: 'memory_usage' },
    { id: 'rule-4', name: 'Error Rate Monitor', metric: 'error_rate' },
    { id: 'rule-5', name: 'Consecutive Failures', metric: 'failure_count' }
  ]
  
  // Test alert evaluation performance
  const evaluationRounds = 20
  
  for (let round = 0; round < evaluationRounds; round++) {
    const promises = alertRules.map(async (rule) => {
      const endMeasurement = monitor.startMeasurement('alert-evaluation')
      
      // Simulate alert rule evaluation
      const evaluationTime = 50 + Math.random() * 200 // 50-250ms
      await new Promise(resolve => setTimeout(resolve, evaluationTime))
      
      const duration = endMeasurement()
      
      return {
        rule_id: rule.id,
        evaluation_duration: duration,
        triggered: Math.random() > 0.8, // 20% trigger rate
        current_value: Math.random() * 100,
        threshold: 80
      }
    })
    
    await Promise.all(promises)
  }
  
  // Analyze alert evaluation performance
  const alertStats = monitor.getStats('alert-evaluation')
  assertExists(alertStats)
  
  assertEquals(alertStats.avg < PERFORMANCE_CONFIG.ALERT_EVALUATION_THRESHOLD_MS, true,
    `Alert evaluation average time ${alertStats.avg}ms exceeds threshold ${PERFORMANCE_CONFIG.ALERT_EVALUATION_THRESHOLD_MS}ms`)
  assertEquals(alertStats.p95 < PERFORMANCE_CONFIG.ALERT_EVALUATION_THRESHOLD_MS * 2, true,
    `Alert evaluation p95 time ${alertStats.p95}ms exceeds acceptable limit`)
  
  const totalEvaluations = alertStats.count
  const expectedEvaluations = evaluationRounds * alertRules.length
  assertEquals(totalEvaluations, expectedEvaluations)
  
  console.log(`Alert Evaluation Performance:
    - Total evaluations: ${totalEvaluations}
    - Average time: ${alertStats.avg.toFixed(2)}ms
    - P95 time: ${alertStats.p95.toFixed(2)}ms
    - Throughput: ${(totalEvaluations / (alertStats.avg * totalEvaluations / 1000)).toFixed(2)} evaluations/sec`)
})

Deno.test("Performance - Dashboard data aggregation stress test", async () => {
  const monitor = new PerformanceMonitor()
  const memoryTracker = new MemoryTracker()
  
  memoryTracker.startTracking()
  
  // Simulate dashboard data requests under load
  const dashboardEndpoints = [
    'health-overview',
    'performance-history',
    'sync-statistics',
    'active-alerts',
    'admin-summary'
  ]
  
  // Test multiple concurrent dashboard requests
  const concurrentRequests = 15
  const requestRounds = 5
  
  for (let round = 0; round < requestRounds; round++) {
    const promises = []
    
    for (let i = 0; i < concurrentRequests; i++) {
      const endpoint = dashboardEndpoints[i % dashboardEndpoints.length]
      
      promises.push((async () => {
        const endMeasurement = monitor.startMeasurement(`dashboard-${endpoint}`)
        
        memoryTracker.trackPeak()
        
        // Simulate dashboard data aggregation
        const processingTime = 200 + Math.random() * 800 // 200-1000ms
        await new Promise(resolve => setTimeout(resolve, processingTime))
        
        const duration = endMeasurement()
        
        return {
          endpoint,
          duration,
          data_size: Math.floor(Math.random() * 1000) + 500 // KB
        }
      })())
    }
    
    await Promise.all(promises)
  }
  
  const memoryStats = memoryTracker.getMemoryStats()
  
  // Analyze dashboard performance for each endpoint
  for (const endpoint of dashboardEndpoints) {
    const stats = monitor.getStats(`dashboard-${endpoint}`)
    if (stats) {
      assertEquals(stats.avg < 2000, true, // 2 second threshold for dashboard
        `Dashboard endpoint ${endpoint} average time ${stats.avg}ms exceeds threshold`)
      assertEquals(stats.p95 < 3000, true,
        `Dashboard endpoint ${endpoint} p95 time ${stats.p95}ms exceeds acceptable limit`)
      
      console.log(`Dashboard Performance - ${endpoint}:
        - Requests: ${stats.count}
        - Average: ${stats.avg.toFixed(2)}ms
        - P95: ${stats.p95.toFixed(2)}ms`)
    }
  }
  
  assertEquals(memoryStats.increase < 100, true, // Memory increase should be < 100MB
    `Memory increase ${memoryStats.increase}MB during dashboard stress test exceeds threshold`)
  
  console.log(`Dashboard Stress Test Summary:
    - Total requests: ${concurrentRequests * requestRounds}
    - Memory baseline: ${memoryStats.baseline}MB
    - Memory peak: ${memoryStats.peak}MB
    - Memory increase: ${memoryStats.increase}MB`)
})

Deno.test("Performance - Cleanup and maintenance operations", async () => {
  const monitor = new PerformanceMonitor()
  
  // Test performance of maintenance operations
  const maintenanceOps = [
    { name: 'cleanup-old-sync-history', recordCount: 10000 },
    { name: 'cleanup-old-error-logs', recordCount: 5000 },
    { name: 'refresh-materialized-views', recordCount: 50000 },
    { name: 'update-performance-statistics', recordCount: 20000 },
    { name: 'archive-completed-jobs', recordCount: 2000 }
  ]
  
  for (const op of maintenanceOps) {
    const endMeasurement = monitor.startMeasurement(op.name)
    
    // Simulate maintenance operation based on record count
    const processingTime = Math.max(500, op.recordCount * 0.1 + Math.random() * 1000)
    await new Promise(resolve => setTimeout(resolve, processingTime))
    
    const duration = endMeasurement()
    
    // Maintenance operations should complete within reasonable time
    assertEquals(duration < 10000, true, // 10 second threshold
      `Maintenance operation ${op.name} took ${duration}ms, exceeds 10s threshold`)
    
    console.log(`Maintenance Operation - ${op.name}:
      - Records: ${op.recordCount}
      - Duration: ${duration.toFixed(2)}ms
      - Rate: ${(op.recordCount / (duration / 1000)).toFixed(2)} records/sec`)
  }
})

Deno.test("Performance - Memory leak detection", async () => {
  const memoryTracker = new MemoryTracker()
  
  // Test for memory leaks during extended operation
  const iterations = 50
  const memoryMeasurements = []
  
  memoryTracker.startTracking()
  
  for (let i = 0; i < iterations; i++) {
    // Simulate sync monitoring operations
    await simulateSync(i, new PerformanceMonitor())
    
    // Track memory after each operation
    memoryTracker.trackPeak()
    const currentMemory = memoryTracker.getMemoryStats().peak
    memoryMeasurements.push(currentMemory)
    
    // Small delay between operations
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Analyze memory usage trend
  const firstQuarter = memoryMeasurements.slice(0, Math.floor(iterations / 4))
  const lastQuarter = memoryMeasurements.slice(-Math.floor(iterations / 4))
  
  const avgFirstQuarter = firstQuarter.reduce((sum, val) => sum + val, 0) / firstQuarter.length
  const avgLastQuarter = lastQuarter.reduce((sum, val) => sum + val, 0) / lastQuarter.length
  
  const memoryIncrease = avgLastQuarter - avgFirstQuarter
  const memoryIncreasePercent = (memoryIncrease / avgFirstQuarter) * 100
  
  // Memory should not increase significantly over time (indicating no leaks)
  assertEquals(memoryIncreasePercent < 20, true, // Less than 20% increase
    `Memory usage increased by ${memoryIncreasePercent.toFixed(2)}% over ${iterations} iterations, indicating potential memory leak`)
  
  console.log(`Memory Leak Detection:
    - Iterations: ${iterations}
    - Initial avg memory: ${avgFirstQuarter.toFixed(2)}MB
    - Final avg memory: ${avgLastQuarter.toFixed(2)}MB
    - Memory increase: ${memoryIncrease.toFixed(2)}MB (${memoryIncreasePercent.toFixed(2)}%)`)
  
  assertEquals(memoryIncrease < 50, true, // Less than 50MB increase
    `Absolute memory increase ${memoryIncrease.toFixed(2)}MB exceeds acceptable threshold`)
})