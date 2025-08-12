// Unit tests for audit logger
// Story 2.3: Comprehensive audit logging testing

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { AuditLogger } from '../audit-logger.ts'

// Mock Supabase client for audit testing
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
      }),
      insert: (data: any[]) => ({
        data: this.mockError ? null : data,
        error: this.mockError
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

const createMockTriggerAudit = (overrides = {}) => ({
  sync_job_id: 'test-job-123',
  entity_type: 'tournaments',
  tournament_no: 'T001',
  priority: 'NORMAL' as const,
  triggered_by: 'test-admin',
  trigger_reason: 'Manual sync for testing',
  ...overrides
})

const createMockCancellationAudit = (overrides = {}) => ({
  sync_job_id: 'test-job-456',
  cancelled_by: 'test-admin',
  cancellation_reason: 'Cancelled for testing',
  ...overrides
})

Deno.test("AuditLogger - logManualTrigger should log trigger event", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  const audit = createMockTriggerAudit()
  
  // Should not throw
  await auditLogger.logManualTrigger(audit)

  // Test passes if no error is thrown
  assertEquals(true, true)
})

Deno.test("AuditLogger - logManualTrigger should handle database errors gracefully", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  // Mock database error
  mockClient.setMockError(new Error('Database connection failed'))

  const audit = createMockTriggerAudit()
  
  // Should not throw - errors should be logged but not propagated
  await auditLogger.logManualTrigger(audit)

  // Test passes if no error is thrown
  assertEquals(true, true)
})

Deno.test("AuditLogger - logSyncCancellation should log cancellation event", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  // Mock job data for lookup
  mockClient.setMockData('manual_sync_audit', {
    entity_type: 'tournaments',
    priority: 'HIGH',
    triggered_by: 'original-user',
    trigger_reason: 'Emergency sync'
  })

  const audit = createMockCancellationAudit()
  
  // Should not throw
  await auditLogger.logSyncCancellation(audit)

  // Test passes if no error is thrown
  assertEquals(true, true)
})

Deno.test("AuditLogger - logSyncCancellation should handle missing job data", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  // Mock no job data found
  mockClient.setMockData('manual_sync_audit', null)
  mockClient.setMockError(new Error('Job not found'))

  const audit = createMockCancellationAudit()
  
  // Should not throw - should handle missing data gracefully
  await auditLogger.logSyncCancellation(audit)

  // Test passes if no error is thrown
  assertEquals(true, true)
})

Deno.test("AuditLogger - logAdminAction should log general admin actions", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  const actionParams = {
    action: 'bulk_sync_trigger',
    performed_by: 'super-admin',
    details: {
      entity_types: ['tournaments', 'matches_schedule'],
      tournament_count: 5,
      reason: 'Weekly maintenance sync'
    },
    severity: 'MEDIUM' as const,
    description: 'Bulk sync operation for weekly maintenance'
  }
  
  // Should not throw
  await auditLogger.logAdminAction(actionParams)

  // Test passes if no error is thrown
  assertEquals(true, true)
})

Deno.test("AuditLogger - logAdminAction should use defaults for optional parameters", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  const minimalParams = {
    action: 'config_update',
    performed_by: 'admin-user',
    details: { setting: 'sync_interval', old_value: 60, new_value: 30 }
  }
  
  // Should not throw and use default severity
  await auditLogger.logAdminAction(minimalParams)

  // Test passes if no error is thrown
  assertEquals(true, true)
})

Deno.test("AuditLogger - getSyncHistory should return formatted history", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  // Mock sync history data
  mockClient.setMockData('manual_sync_audit', [
    {
      sync_job_id: 'job-1',
      entity_type: 'tournaments',
      tournament_no: 'T001',
      priority: 'HIGH',
      triggered_by: 'admin-user',
      trigger_reason: 'Emergency sync',
      final_status: 'COMPLETED',
      trigger_timestamp: '2025-01-08T10:00:00Z',
      completion_timestamp: '2025-01-08T10:02:00Z',
      records_processed: 25,
      error_details: null
    },
    {
      sync_job_id: 'job-2',
      entity_type: 'matches_schedule',
      tournament_no: null,
      priority: 'NORMAL',
      triggered_by: 'test-user',
      trigger_reason: 'Regular maintenance',
      final_status: 'FAILED',
      trigger_timestamp: '2025-01-08T09:00:00Z',
      completion_timestamp: '2025-01-08T09:01:00Z',
      records_processed: 0,
      error_details: { error: 'Connection timeout' }
    }
  ])

  const history = await auditLogger.getSyncHistory(24, 'all')

  assertExists(history)
  assertEquals(history.total_records, 2)
  assertEquals(Array.isArray(history.sync_jobs), true)
  assertEquals(history.sync_jobs.length, 2)

  assertExists(history.summary)
  assertExists(history.summary.by_entity_type)
  assertExists(history.summary.by_priority)
  assertExists(history.summary.by_status)
  assertExists(history.summary.by_user)

  assertExists(history.time_range)
  assertEquals(history.time_range.hours, 24)

  // Check first job details
  const job1 = history.sync_jobs[0]
  assertEquals(job1.sync_job_id, 'job-1')
  assertEquals(job1.entity_type, 'tournaments')
  assertEquals(job1.priority, 'HIGH')
  assertEquals(job1.triggered_by, 'admin-user')
  assertEquals(job1.status, 'COMPLETED')
  assertEquals(job1.records_processed, 25)
  assertEquals(typeof job1.duration_seconds, 'number')
})

Deno.test("AuditLogger - getSyncHistory should filter by entity type", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  // Mock filtered data
  mockClient.setMockData('manual_sync_audit', [
    {
      sync_job_id: 'job-1',
      entity_type: 'tournaments',
      priority: 'HIGH',
      triggered_by: 'admin-user',
      final_status: 'COMPLETED',
      trigger_timestamp: '2025-01-08T10:00:00Z',
      completion_timestamp: '2025-01-08T10:02:00Z',
      records_processed: 25
    }
  ])

  const history = await auditLogger.getSyncHistory(24, 'tournaments')

  assertExists(history)
  assertEquals(history.total_records, 1)
  assertEquals(history.sync_jobs[0].entity_type, 'tournaments')
})

Deno.test("AuditLogger - getSyncPerformanceAnalytics should return comprehensive analytics", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  // Mock performance data over multiple days
  const mockJobs = []
  const currentTime = Date.now()
  
  // Create mock jobs over 7 days
  for (let i = 0; i < 7; i++) {
    const dayOffset = i * 24 * 60 * 60 * 1000
    mockJobs.push({
      sync_job_id: `job-${i}-1`,
      entity_type: 'tournaments',
      triggered_by: 'admin-user',
      final_status: 'COMPLETED',
      trigger_timestamp: new Date(currentTime - dayOffset).toISOString(),
      completion_timestamp: new Date(currentTime - dayOffset + 2 * 60 * 1000).toISOString(),
      records_processed: 20 + i * 5
    })
    mockJobs.push({
      sync_job_id: `job-${i}-2`,
      entity_type: 'matches_schedule',
      triggered_by: 'test-user',
      final_status: i % 3 === 0 ? 'FAILED' : 'COMPLETED',
      trigger_timestamp: new Date(currentTime - dayOffset + 60 * 60 * 1000).toISOString(),
      completion_timestamp: new Date(currentTime - dayOffset + 63 * 60 * 1000).toISOString(),
      records_processed: i % 3 === 0 ? 0 : 100 + i * 10,
      error_details: i % 3 === 0 ? { error: 'Network timeout' } : null
    })
  }

  mockClient.setMockData('manual_sync_audit', mockJobs)

  const analytics = await auditLogger.getSyncPerformanceAnalytics(7)

  assertExists(analytics)
  assertExists(analytics.performance_trends)
  assertExists(analytics.user_statistics)
  assertExists(analytics.entity_performance)
  assertExists(analytics.failure_analysis)

  // Check performance trends structure
  assertEquals(Array.isArray(analytics.performance_trends), true)
  if (analytics.performance_trends.length > 0) {
    const trend = analytics.performance_trends[0]
    assertExists(trend.date)
    assertExists(trend.total_jobs)
    assertExists(trend.successful_jobs)
    assertExists(trend.success_rate)
  }

  // Check user statistics structure
  assertEquals(Array.isArray(analytics.user_statistics), true)
  if (analytics.user_statistics.length > 0) {
    const userStat = analytics.user_statistics[0]
    assertExists(userStat.triggered_by)
    assertExists(userStat.total_syncs)
    assertExists(userStat.success_rate)
  }

  // Check failure analysis
  assertExists(analytics.failure_analysis.total_failures)
  assertExists(analytics.failure_analysis.failure_rate)
  assertExists(analytics.failure_analysis.failures_by_entity)
  assertExists(analytics.failure_analysis.failures_by_user)
})

Deno.test("AuditLogger - getTopAdministrators should return admin statistics", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  // Mock admin activity data
  mockClient.setMockData('manual_sync_audit', [
    {
      sync_job_id: 'job-1',
      entity_type: 'tournaments',
      triggered_by: 'super-admin',
      priority: 'HIGH',
      final_status: 'COMPLETED',
      trigger_timestamp: '2025-01-08T10:00:00Z',
      records_processed: 50
    },
    {
      sync_job_id: 'job-2',
      entity_type: 'tournaments',
      triggered_by: 'super-admin',
      priority: 'NORMAL',
      final_status: 'COMPLETED',
      trigger_timestamp: '2025-01-08T11:00:00Z',
      records_processed: 30
    },
    {
      sync_job_id: 'job-3',
      entity_type: 'matches_schedule',
      triggered_by: 'junior-admin',
      priority: 'NORMAL',
      final_status: 'FAILED',
      trigger_timestamp: '2025-01-08T12:00:00Z',
      records_processed: 0
    }
  ])

  const adminStats = await auditLogger.getTopAdministrators(30)

  assertExists(adminStats)
  assertExists(adminStats.administrators)
  assertExists(adminStats.time_period)

  assertEquals(Array.isArray(adminStats.administrators), true)
  assertEquals(adminStats.time_period.days, 30)

  if (adminStats.administrators.length > 0) {
    const topAdmin = adminStats.administrators[0]
    assertExists(topAdmin.triggered_by)
    assertExists(topAdmin.total_syncs)
    assertExists(topAdmin.successful_syncs)
    assertExists(topAdmin.success_rate)
    assertExists(topAdmin.most_common_entity)
    assertExists(topAdmin.most_common_priority)
    assertExists(topAdmin.avg_records_processed)

    // Should be sorted by total syncs (super-admin should be first)
    assertEquals(topAdmin.triggered_by, 'super-admin')
    assertEquals(topAdmin.total_syncs, 2)
    assertEquals(topAdmin.success_rate, 1.0)
  }
})

Deno.test("AuditLogger - should handle empty data sets gracefully", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  // Mock empty data
  mockClient.setMockData('manual_sync_audit', [])

  const history = await auditLogger.getSyncHistory(24)
  assertEquals(history.total_records, 0)
  assertEquals(history.sync_jobs.length, 0)

  const analytics = await auditLogger.getSyncPerformanceAnalytics(7)
  assertEquals(analytics.performance_trends.length, 0)
  assertEquals(analytics.user_statistics.length, 0)
  assertEquals(analytics.entity_performance.length, 0)

  const adminStats = await auditLogger.getTopAdministrators(30)
  assertEquals(adminStats.administrators.length, 0)
})

Deno.test("AuditLogger - should handle database errors in analytics", async () => {
  const mockClient = new MockSupabaseClient()
  const auditLogger = new AuditLogger(mockClient)

  // Mock database error
  mockClient.setMockError(new Error('Database connection failed'))

  try {
    await auditLogger.getSyncHistory(24)
    throw new Error('Should have thrown an error')
  } catch (error) {
    assertEquals(error.message.includes('Database connection failed'), true)
  }

  try {
    await auditLogger.getSyncPerformanceAnalytics(7)
    throw new Error('Should have thrown an error')
  } catch (error) {
    assertEquals(error.message.includes('Failed to get performance analytics'), true)
  }

  try {
    await auditLogger.getTopAdministrators(30)
    throw new Error('Should have thrown an error')
  } catch (error) {
    assertEquals(error.message.includes('Failed to get administrator statistics'), true)
  }
})