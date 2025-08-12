// Unit tests for dashboard service
// Story 2.3: Comprehensive monitoring dashboard testing

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { DashboardService } from '../dashboard-service.ts'

// Mock Supabase client
class MockSupabaseClient {
  private mockData: any = {}
  private mockError: any = null

  setMockData(table: string, data: any) {
    this.mockData[table] = data
  }

  setMockError(error: any) {
    this.mockError = error
  }

  from(table: string) {
    return {
      select: (columns: string) => ({
        eq: (column: string, value: any) => this.createQuery(table, { [column]: value }),
        gte: (column: string, value: any) => this.createQuery(table, { [`${column}_gte`]: value }),
        order: (column: string, options: any) => this.createQuery(table),
        limit: (limit: number) => this.createQuery(table),
        single: () => this.createSingleQuery(table)
      })
    }
  }

  private createQuery(table: string, filters?: any) {
    return {
      data: this.mockError ? null : this.mockData[table] || [],
      error: this.mockError
    }
  }

  private createSingleQuery(table: string) {
    const data = this.mockData[table]
    return {
      data: this.mockError ? null : (Array.isArray(data) ? data[0] : data),
      error: this.mockError
    }
  }
}

Deno.test("DashboardService - getHealthOverview should return comprehensive health data", async () => {
  const mockClient = new MockSupabaseClient()
  const dashboardService = new DashboardService(mockClient)

  // Mock sync status data
  mockClient.setMockData('sync_status', [
    {
      entity_type: 'tournaments',
      last_sync: '2025-01-08T10:00:00Z',
      average_duration: '00:02:30',
      records_processed_last: 25,
      success_count: 10,
      error_count: 1
    },
    {
      entity_type: 'matches_schedule',
      last_sync: '2025-01-08T10:15:00Z',
      average_duration: '00:01:45',
      records_processed_last: 150,
      success_count: 20,
      error_count: 0
    }
  ])

  // Mock recent executions
  mockClient.setMockData('sync_execution_history', [
    {
      entity_type: 'tournaments',
      success: true,
      records_processed: 25,
      duration: '00:02:30',
      memory_usage_mb: 128,
      execution_start: '2025-01-08T10:00:00Z'
    },
    {
      entity_type: 'matches_schedule',
      success: true,
      records_processed: 150,
      duration: '00:01:45',
      memory_usage_mb: 96,
      execution_start: '2025-01-08T10:15:00Z'
    }
  ])

  // Mock active alerts
  mockClient.setMockData('sync_error_log', [])

  const healthOverview = await dashboardService.getHealthOverview()

  assertExists(healthOverview)
  assertEquals(healthOverview.overall_status, 'HEALTHY')
  assertExists(healthOverview.sync_entities)
  assertExists(healthOverview.sync_entities.tournaments)
  assertExists(healthOverview.sync_entities.matches_schedule)
  assertExists(healthOverview.performance_summary)
  assertExists(healthOverview.last_updated)

  // Verify entity health
  assertEquals(healthOverview.sync_entities.tournaments.status, 'HEALTHY')
  assertEquals(healthOverview.sync_entities.matches_schedule.status, 'HEALTHY')
})

Deno.test("DashboardService - getPerformanceHistory should group data into time buckets", async () => {
  const mockClient = new MockSupabaseClient()
  const dashboardService = new DashboardService(mockClient)

  // Mock execution data across time range
  const executionData = []
  const errorData = []
  
  // Create mock data for last 24 hours with some executions
  for (let i = 0; i < 10; i++) {
    const timestamp = new Date(Date.now() - i * 2 * 60 * 60 * 1000).toISOString() // Every 2 hours
    executionData.push({
      execution_start: timestamp,
      success: i % 3 !== 0, // 2/3 success rate
      duration: `00:0${i % 6}:${30 + i}`,
      records_processed: 50 + i * 10,
      memory_usage_mb: 100 + i * 5,
      entity_type: i % 2 === 0 ? 'tournaments' : 'matches_schedule'
    })
  }

  mockClient.setMockData('sync_execution_history', executionData)
  mockClient.setMockData('sync_error_log', errorData)

  const performanceHistory = await dashboardService.getPerformanceHistory('24h', 'all')

  assertExists(performanceHistory)
  assertEquals(performanceHistory.entity_type, 'all')
  assertEquals(performanceHistory.period, '24h')
  assertExists(performanceHistory.data_points)
  assertExists(performanceHistory.aggregated_metrics)

  // Verify data points structure
  if (performanceHistory.data_points.length > 0) {
    const firstPoint = performanceHistory.data_points[0]
    assertExists(firstPoint.timestamp)
    assertExists(firstPoint.success_rate)
    assertExists(firstPoint.duration_ms)
    assertExists(firstPoint.records_processed)
    assertExists(firstPoint.memory_usage_mb)
    assertExists(firstPoint.error_count)
  }
})

Deno.test("DashboardService - getSyncStatistics should calculate correct metrics", async () => {
  const mockClient = new MockSupabaseClient()
  const dashboardService = new DashboardService(mockClient)

  const mockExecutions = [
    {
      success: true,
      duration: '00:02:00',
      records_processed: 100,
      memory_usage_mb: 150,
      execution_start: '2025-01-08T10:00:00Z',
      execution_end: '2025-01-08T10:02:00Z'
    },
    {
      success: false,
      duration: '00:01:30',
      records_processed: 0,
      memory_usage_mb: 120,
      execution_start: '2025-01-08T09:00:00Z',
      execution_end: '2025-01-08T09:01:30Z'
    },
    {
      success: true,
      duration: '00:03:00',
      records_processed: 200,
      memory_usage_mb: 180,
      execution_start: '2025-01-08T08:00:00Z',
      execution_end: '2025-01-08T08:03:00Z'
    }
  ]

  mockClient.setMockData('sync_execution_history', mockExecutions)
  mockClient.setMockData('sync_tournament_results', [])

  const statistics = await dashboardService.getSyncStatistics('tournaments', 24)

  assertExists(statistics)
  assertEquals(statistics.entity_type, 'tournaments')
  assertExists(statistics.execution_stats)

  // Verify execution stats
  const execStats = statistics.execution_stats
  assertEquals(execStats.total, 3)
  assertEquals(execStats.successful, 2)
  assertEquals(execStats.failed, 1)
  assertEquals(Math.round(execStats.success_rate * 100), 67) // 2/3 = 66.67%
})

Deno.test("DashboardService - getErrorAnalytics should analyze error patterns", async () => {
  const mockClient = new MockSupabaseClient()
  const dashboardService = new DashboardService(mockClient)

  const mockErrors = [
    {
      error_type: 'NETWORK',
      error_severity: 'HIGH',
      entity_type: 'tournaments',
      occurred_at: '2025-01-08T10:00:00Z',
      resolved_at: null,
      error_message: 'Connection timeout'
    },
    {
      error_type: 'API',
      error_severity: 'MEDIUM',
      entity_type: 'matches_schedule',
      occurred_at: '2025-01-08T09:30:00Z',
      resolved_at: '2025-01-08T09:35:00Z',
      error_message: 'Invalid response format'
    },
    {
      error_type: 'NETWORK',
      error_severity: 'HIGH',
      entity_type: 'tournaments',
      occurred_at: '2025-01-08T09:00:00Z',
      resolved_at: null,
      error_message: 'Connection refused'
    }
  ]

  mockClient.setMockData('sync_error_log', mockErrors)

  const errorAnalytics = await dashboardService.getErrorAnalytics(24)

  assertExists(errorAnalytics)
  assertEquals(errorAnalytics.total_errors, 3)

  // Verify error groupings
  assertExists(errorAnalytics.errors_by_type)
  assertEquals(errorAnalytics.errors_by_type.NETWORK, 2)
  assertEquals(errorAnalytics.errors_by_type.API, 1)

  assertExists(errorAnalytics.errors_by_severity)
  assertEquals(errorAnalytics.errors_by_severity.HIGH, 2)
  assertEquals(errorAnalytics.errors_by_severity.MEDIUM, 1)

  assertExists(errorAnalytics.errors_by_entity)
  assertEquals(errorAnalytics.errors_by_entity.tournaments, 2)
  assertEquals(errorAnalytics.errors_by_entity.matches_schedule, 1)

  assertExists(errorAnalytics.resolution_stats)
  assertEquals(errorAnalytics.resolution_stats.total_errors, 3)
  assertEquals(errorAnalytics.resolution_stats.resolved_errors, 1)
  assertEquals(Math.round(errorAnalytics.resolution_stats.resolution_rate * 100), 33) // 1/3
})

Deno.test("DashboardService - getSystemStatus should evaluate component health", async () => {
  const mockClient = new MockSupabaseClient()
  const dashboardService = new DashboardService(mockClient)

  // Mock healthy system data
  mockClient.setMockData('sync_status', [
    { entity_type: 'tournaments', is_active: true, error_count: 1, success_count: 10 },
    { entity_type: 'matches_schedule', is_active: true, error_count: 0, success_count: 20 }
  ])

  mockClient.setMockData('alert_processor_status', {
    status: 'HEALTHY',
    component: 'alert_processor',
    executions_24h: 288, // Every 5 minutes
    last_execution: '2025-01-08T10:00:00Z',
    errors_24h: 0
  })

  const systemStatus = await dashboardService.getSystemStatus()

  assertExists(systemStatus)
  assertExists(systemStatus.overall_status)
  assertExists(systemStatus.components)
  assertExists(systemStatus.components.sync_system)
  assertExists(systemStatus.components.alert_processor)
  assertExists(systemStatus.components.database)

  // Should be healthy with good sync success rates and no major issues
  assertEquals(systemStatus.overall_status, 'HEALTHY')
})

Deno.test("DashboardService - getMetricsSummary should provide key performance indicators", async () => {
  const mockClient = new MockSupabaseClient()
  const dashboardService = new DashboardService(mockClient)

  // Mock recent execution data
  mockClient.setMockData('sync_execution_history', [
    {
      success: true,
      duration: '00:02:00',
      records_processed: 100,
      memory_usage_mb: 150,
      execution_start: '2025-01-08T10:00:00Z'
    },
    {
      success: true,
      duration: '00:01:30',
      records_processed: 75,
      memory_usage_mb: 120,
      execution_start: '2025-01-08T09:45:00Z'
    },
    {
      success: false,
      duration: '00:00:30',
      records_processed: 0,
      memory_usage_mb: 80,
      execution_start: '2025-01-08T09:30:00Z'
    }
  ])

  // Mock recent errors
  mockClient.setMockData('sync_error_log', [
    {
      error_type: 'API',
      error_severity: 'MEDIUM',
      occurred_at: '2025-01-08T09:30:00Z'
    }
  ])

  const metricsSummary = await dashboardService.getMetricsSummary(24)

  assertExists(metricsSummary)
  assertExists(metricsSummary.time_window)
  assertEquals(metricsSummary.time_window.hours, 24)

  assertExists(metricsSummary.sync_metrics)
  assertEquals(metricsSummary.sync_metrics.total_jobs, 3)
  assertEquals(metricsSummary.sync_metrics.successful_jobs, 2)

  assertExists(metricsSummary.error_metrics)
  assertEquals(metricsSummary.error_metrics.total_errors, 1)

  assertExists(metricsSummary.performance_metrics)
  assertEquals(metricsSummary.performance_metrics.total_records, 175) // 100 + 75 + 0

  assertExists(metricsSummary.health_score)
  // Health score should be positive but reduced due to failures
  assert(metricsSummary.health_score >= 0 && metricsSummary.health_score <= 100)
})

// Helper function for assertions
function assert(condition: boolean, message?: string) {
  if (!condition) {
    throw new Error(message || 'Assertion failed')
  }
}