// Unit tests for sync queue manager
// Story 2.3: Manual sync job management testing

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { SyncQueueManager } from '../sync-queue-manager.ts'

// Mock Supabase client for sync queue testing
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
      }),
      update: (data: any) => ({
        eq: (column: string, value: any) => ({
          data: this.mockError ? null : data,
          error: this.mockError
        })
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

// Mock fetch for testing sync function calls
const originalFetch = globalThis.fetch
function mockFetch(url: string, options: any) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      success: true,
      synced: 25,
      message: 'Tournament sync completed successfully'
    })
  })
}

const createMockSyncRequest = (overrides = {}) => ({
  entity_type: 'tournaments',
  priority: 'NORMAL' as const,
  triggered_by: 'test-user',
  reason: 'Manual sync for testing',
  ...overrides
})

Deno.test("SyncQueueManager - createSyncJob should create job with unique ID", async () => {
  const mockClient = new MockSupabaseClient()
  const queueManager = new SyncQueueManager(mockClient)

  const request = createMockSyncRequest()
  const syncJobId = await queueManager.createSyncJob(request)

  assertExists(syncJobId)
  assertEquals(typeof syncJobId, 'string')
  assertEquals(syncJobId.length, 36) // UUID length
})

Deno.test("SyncQueueManager - createSyncJob should handle database errors", async () => {
  const mockClient = new MockSupabaseClient()
  const queueManager = new SyncQueueManager(mockClient)

  // Mock database error
  mockClient.setMockError(new Error('Database connection failed'))

  const request = createMockSyncRequest()
  
  try {
    await queueManager.createSyncJob(request)
    throw new Error('Should have thrown an error')
  } catch (error) {
    assertEquals(error.message.includes('Failed to create sync job'), true)
  }
})

Deno.test("SyncQueueManager - getSyncJobStatus should return job status", async () => {
  const mockClient = new MockSupabaseClient()
  const queueManager = new SyncQueueManager(mockClient)

  const mockJobId = 'test-job-123'
  
  // Mock database response for completed job
  mockClient.setMockData('manual_sync_audit', {
    sync_job_id: mockJobId,
    final_status: 'COMPLETED',
    trigger_timestamp: '2025-01-08T10:00:00Z',
    completion_timestamp: '2025-01-08T10:02:00Z',
    records_processed: 25,
    error_details: null
  })

  const status = await queueManager.getSyncJobStatus(mockJobId)

  assertExists(status)
  assertEquals(status.sync_job_id, mockJobId)
  assertEquals(status.status, 'COMPLETED')
  assertEquals(status.records_processed, 25)
  assertExists(status.start_time)
  assertExists(status.completion_time)
})

Deno.test("SyncQueueManager - getSyncJobStatus should handle missing jobs", async () => {
  const mockClient = new MockSupabaseClient()
  const queueManager = new SyncQueueManager(mockClient)

  const mockJobId = 'non-existent-job'
  
  // Mock no data found
  mockClient.setMockData('manual_sync_audit', null)
  mockClient.setMockError(new Error('Job not found'))

  try {
    await queueManager.getSyncJobStatus(mockJobId)
    throw new Error('Should have thrown an error')
  } catch (error) {
    assertEquals(error.message.includes('not found'), true)
  }
})

Deno.test("SyncQueueManager - getQueueStatus should return queue metrics", async () => {
  const mockClient = new MockSupabaseClient()
  const queueManager = new SyncQueueManager(mockClient)

  // Mock recent jobs data
  mockClient.setMockData('manual_sync_audit', [
    {
      sync_job_id: 'job-1',
      entity_type: 'tournaments',
      priority: 'HIGH',
      triggered_by: 'admin-user',
      trigger_reason: 'Emergency sync',
      final_status: 'COMPLETED',
      trigger_timestamp: '2025-01-08T10:00:00Z',
      completion_timestamp: '2025-01-08T10:02:00Z',
      records_processed: 25
    },
    {
      sync_job_id: 'job-2',
      entity_type: 'matches_schedule',
      priority: 'NORMAL',
      triggered_by: 'test-user',
      trigger_reason: 'Regular sync',
      final_status: 'FAILED',
      trigger_timestamp: '2025-01-08T09:00:00Z',
      completion_timestamp: '2025-01-08T09:01:00Z',
      records_processed: 0
    }
  ])

  const queueStatus = await queueManager.getQueueStatus()

  assertExists(queueStatus)
  assertEquals(typeof queueStatus.active_jobs, 'number')
  assertEquals(typeof queueStatus.queued_jobs, 'number')
  assertEquals(typeof queueStatus.running_jobs, 'number')
  assertExists(queueStatus.recent_jobs)
  assertEquals(Array.isArray(queueStatus.recent_jobs), true)
  assertExists(queueStatus.queue_health)
})

Deno.test("SyncQueueManager - cancelSyncJob should cancel queued job", async () => {
  const mockClient = new MockSupabaseClient()
  const queueManager = new SyncQueueManager(mockClient)

  const mockJobId = 'test-job-cancel'
  
  // First create a job to cancel
  const request = createMockSyncRequest()
  const syncJobId = await queueManager.createSyncJob(request)

  // Mock database response for job lookup
  mockClient.setMockData('manual_sync_audit', {
    sync_job_id: syncJobId,
    final_status: 'QUEUED'
  })

  const result = await queueManager.cancelSyncJob(syncJobId)

  assertExists(result)
  assertEquals(result.success, true)
  assertEquals(result.message.includes('cancelled successfully'), true)
})

Deno.test("SyncQueueManager - cancelSyncJob should not cancel completed job", async () => {
  const mockClient = new MockSupabaseClient()
  const queueManager = new SyncQueueManager(mockClient)

  const mockJobId = 'completed-job-123'
  
  // Mock database response for completed job
  mockClient.setMockData('manual_sync_audit', {
    sync_job_id: mockJobId,
    final_status: 'COMPLETED'
  })

  const result = await queueManager.cancelSyncJob(mockJobId)

  assertExists(result)
  assertEquals(result.success, false)
  assertEquals(result.message.includes('Cannot cancel completed'), true)
})

Deno.test("SyncQueueManager - executeSyncJob should execute tournament sync", async () => {
  // Mock fetch for sync function call
  globalThis.fetch = mockFetch

  // Mock environment variables
  Deno.env.set('SUPABASE_PROJECT_REF', 'test-project')
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key')

  const mockClient = new MockSupabaseClient()
  const queueManager = new SyncQueueManager(mockClient)

  // Create and execute job
  const request = createMockSyncRequest({
    entity_type: 'tournaments',
    tournament_no: 'T001'
  })
  
  const syncJobId = await queueManager.createSyncJob(request)
  
  // Mock job data lookup
  mockClient.setMockData('manual_sync_audit', {
    sync_job_id: syncJobId,
    entity_type: 'tournaments',
    tournament_no: 'T001',
    priority: 'NORMAL',
    triggered_by: 'test-user',
    trigger_reason: 'Manual sync for testing'
  })

  const result = await queueManager.executeSyncJob(syncJobId)

  assertExists(result)
  assertEquals(result.success, true)
  assertEquals(result.status, 'COMPLETED')
  assertExists(result.message)

  // Restore original fetch
  globalThis.fetch = originalFetch
})

Deno.test("SyncQueueManager - executeSyncJob should handle sync failures", async () => {
  // Mock failed fetch
  globalThis.fetch = () => Promise.resolve({
    ok: false,
    statusText: 'Internal Server Error',
    json: () => Promise.resolve({ error: 'Sync function failed' })
  })

  // Mock environment variables
  Deno.env.set('SUPABASE_PROJECT_REF', 'test-project')
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-key')

  const mockClient = new MockSupabaseClient()
  const queueManager = new SyncQueueManager(mockClient)

  const request = createMockSyncRequest()
  const syncJobId = await queueManager.createSyncJob(request)
  
  // Mock job data lookup
  mockClient.setMockData('manual_sync_audit', {
    sync_job_id: syncJobId,
    entity_type: 'tournaments',
    priority: 'NORMAL',
    triggered_by: 'test-user',
    trigger_reason: 'Manual sync for testing'
  })

  const result = await queueManager.executeSyncJob(syncJobId)

  assertExists(result)
  assertEquals(result.success, false)
  assertEquals(result.status, 'FAILED')
  assertExists(result.message)

  // Restore original fetch
  globalThis.fetch = originalFetch
})

Deno.test("SyncQueueManager - should handle unknown entity types", async () => {
  const mockClient = new MockSupabaseClient()
  const queueManager = new SyncQueueManager(mockClient)

  const request = createMockSyncRequest({
    entity_type: 'unknown_entity'
  })
  
  const syncJobId = await queueManager.createSyncJob(request)
  
  // Mock job data lookup
  mockClient.setMockData('manual_sync_audit', {
    sync_job_id: syncJobId,
    entity_type: 'unknown_entity',
    priority: 'NORMAL',
    triggered_by: 'test-user',
    trigger_reason: 'Test unknown entity'
  })

  const result = await queueManager.executeSyncJob(syncJobId)

  assertExists(result)
  assertEquals(result.success, false)
  assertEquals(result.status, 'FAILED')
  assertEquals(result.message?.includes('Unknown entity type'), true)
})

Deno.test("SyncQueueManager - cleanupOldJobs should remove completed jobs", async () => {
  const mockClient = new MockSupabaseClient()
  const queueManager = new SyncQueueManager(mockClient)

  // Create some test jobs
  const request1 = createMockSyncRequest()
  const request2 = createMockSyncRequest()
  
  const jobId1 = await queueManager.createSyncJob(request1)
  const jobId2 = await queueManager.createSyncJob(request2)

  // Manually set completion times (one old, one recent)
  const oldTime = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
  const recentTime = new Date().toISOString()

  // Access private activeSyncJobs for testing
  const activeSyncJobs = (queueManager as any).activeSyncJobs
  const job1Status = activeSyncJobs.get(jobId1)
  const job2Status = activeSyncJobs.get(jobId2)
  
  if (job1Status) {
    job1Status.completion_time = oldTime
    job1Status.status = 'COMPLETED'
    activeSyncJobs.set(jobId1, job1Status)
  }
  
  if (job2Status) {
    job2Status.completion_time = recentTime
    job2Status.status = 'COMPLETED'
    activeSyncJobs.set(jobId2, job2Status)
  }

  // Initial count
  const initialSize = activeSyncJobs.size
  assertEquals(initialSize, 2)

  // Cleanup old jobs
  queueManager.cleanupOldJobs()

  // Should have removed the old job
  const finalSize = activeSyncJobs.size
  assertEquals(finalSize, 1)
  assertEquals(activeSyncJobs.has(jobId2), true) // Recent job should remain
})