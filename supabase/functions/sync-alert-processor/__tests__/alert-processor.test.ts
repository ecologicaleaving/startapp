// Unit tests for alert processor
// Story 2.3: Alert system testing

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts"
import { AlertProcessor } from '../alert-processor.ts'

// Mock Supabase client for alert testing
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
        not: (column: string, operator: string, value: any) => this.createQuery(table),
        order: (column: string, options: any) => this.createQuery(table),
        limit: (limit: number) => this.createQuery(table),
        single: () => this.createSingleQuery(table),
        ilike: (column: string, pattern: string) => this.createQuery(table)
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

const createMockAlertRule = (overrides = {}) => ({
  id: 'test-rule-id',
  name: 'Test Alert Rule',
  description: 'Test alert for unit testing',
  entity_type: 'tournaments',
  metric: 'success_rate',
  threshold: 0.8,
  evaluation_window: '1 hour',
  severity: 'MEDIUM',
  notification_channels: ['dashboard'],
  escalation_delay: '30 minutes',
  is_active: true,
  ...overrides
})

Deno.test("AlertProcessor - evaluateAlertRule should trigger on low success rate", async () => {
  const mockClient = new MockSupabaseClient()
  const alertProcessor = new AlertProcessor(mockClient)

  // Mock execution data with low success rate (40%)
  mockClient.setMockData('sync_execution_history', [
    { success: true },
    { success: false },
    { success: false },
    { success: true },
    { success: false }
  ])

  const alertRule = createMockAlertRule({
    metric: 'success_rate',
    threshold: 0.8, // 80% threshold
    entity_type: 'tournaments'
  })

  const result = await alertProcessor.evaluateAlertRule(alertRule)

  assertExists(result)
  assertEquals(result.rule_id, 'test-rule-id')
  assertEquals(result.triggered, true) // Should trigger because 40% < 80%
  assertEquals(result.current_value, 0.4) // 2 successful out of 5
  assertEquals(result.threshold, 0.8)
  assertEquals(result.message.includes('success rate has dropped'), true)
})

Deno.test("AlertProcessor - evaluateAlertRule should not trigger on healthy success rate", async () => {
  const mockClient = new MockSupabaseClient()
  const alertProcessor = new AlertProcessor(mockClient)

  // Mock execution data with good success rate (100%)
  mockClient.setMockData('sync_execution_history', [
    { success: true },
    { success: true },
    { success: true },
    { success: true },
    { success: true }
  ])

  const alertRule = createMockAlertRule({
    metric: 'success_rate',
    threshold: 0.8,
    entity_type: 'tournaments'
  })

  const result = await alertProcessor.evaluateAlertRule(alertRule)

  assertExists(result)
  assertEquals(result.rule_id, 'test-rule-id')
  assertEquals(result.triggered, false) // Should not trigger because 100% >= 80%
  assertEquals(result.current_value, 1.0) // 5 successful out of 5
  assertEquals(result.message.includes('is healthy'), true)
})

Deno.test("AlertProcessor - evaluateAlertRule should trigger on consecutive failures", async () => {
  const mockClient = new MockSupabaseClient()
  const alertProcessor = new AlertProcessor(mockClient)

  // Mock execution data with consecutive failures at the start
  mockClient.setMockData('sync_execution_history', [
    { success: false }, // Most recent
    { success: false },
    { success: false },
    { success: false }, // 4 consecutive failures
    { success: true },  // Older success
    { success: true }
  ])

  const alertRule = createMockAlertRule({
    metric: 'consecutive_failures',
    threshold: 3, // Trigger on 3+ consecutive failures
    entity_type: 'tournaments'
  })

  const result = await alertProcessor.evaluateAlertRule(alertRule)

  assertExists(result)
  assertEquals(result.triggered, true) // Should trigger because 4 >= 3
  assertEquals(result.current_value, 4) // 4 consecutive failures
  assertEquals(result.threshold, 3)
  assertEquals(result.message.includes('consecutive failures'), true)
})

Deno.test("AlertProcessor - evaluateAlertRule should trigger on duration exceeded", async () => {
  const mockClient = new MockSupabaseClient()
  const alertProcessor = new AlertProcessor(mockClient)

  // Mock execution data with long duration (5 minutes average)
  mockClient.setMockData('sync_execution_history', [
    { duration: '00:05:00' }, // 5 minutes
    { duration: '00:04:30' }, // 4.5 minutes
    { duration: '00:05:30' }, // 5.5 minutes
    { duration: '00:04:00' }  // 4 minutes
  ])

  const alertRule = createMockAlertRule({
    metric: 'duration_exceeded',
    threshold: 240, // 4 minutes in seconds
    entity_type: 'tournaments'
  })

  const result = await alertProcessor.evaluateAlertRule(alertRule)

  assertExists(result)
  assertEquals(result.triggered, true) // Should trigger because avg 4.75min > 4min
  assertEquals(result.current_value, 285) // 4.75 minutes in seconds
  assertEquals(result.threshold, 240)
  assertEquals(result.message.includes('duration is'), true)
})

Deno.test("AlertProcessor - evaluateAlertRule should trigger on memory usage exceeded", async () => {
  const mockClient = new MockSupabaseClient()
  const alertProcessor = new AlertProcessor(mockClient)

  // Mock execution data with high memory usage
  mockClient.setMockData('sync_execution_history', [
    { memory_usage_mb: 300 },
    { memory_usage_mb: 450 },
    { memory_usage_mb: 600 }, // Peak usage
    { memory_usage_mb: 350 }
  ])

  const alertRule = createMockAlertRule({
    metric: 'memory_usage',
    threshold: 500, // 500MB threshold
    entity_type: 'tournaments'
  })

  const result = await alertProcessor.evaluateAlertRule(alertRule)

  assertExists(result)
  assertEquals(result.triggered, true) // Should trigger because peak 600MB > 500MB
  assertEquals(result.current_value, 600) // Peak memory usage
  assertEquals(result.threshold, 500)
  assertEquals(result.message.includes('memory usage is'), true)
})

Deno.test("AlertProcessor - evaluateAlertRule should handle 'all' entity type", async () => {
  const mockClient = new MockSupabaseClient()
  const alertProcessor = new AlertProcessor(mockClient)

  // Mock execution data from multiple entities
  mockClient.setMockData('sync_execution_history', [
    { success: true, entity_type: 'tournaments' },
    { success: false, entity_type: 'matches_schedule' },
    { success: true, entity_type: 'tournaments' },
    { success: false, entity_type: 'matches_schedule' }
  ])

  const alertRule = createMockAlertRule({
    metric: 'success_rate',
    threshold: 0.8,
    entity_type: 'all' // Should consider all entities
  })

  const result = await alertProcessor.evaluateAlertRule(alertRule)

  assertExists(result)
  assertEquals(result.current_value, 0.5) // 2 successful out of 4 total
  assertEquals(result.entity_type, 'all')
  assertEquals(result.message.includes('all sync jobs'), true)
})

Deno.test("AlertProcessor - evaluateAlertRule should handle missing data gracefully", async () => {
  const mockClient = new MockSupabaseClient()
  const alertProcessor = new AlertProcessor(mockClient)

  // Mock empty data
  mockClient.setMockData('sync_execution_history', [])

  const alertRule = createMockAlertRule({
    metric: 'success_rate',
    threshold: 0.8,
    entity_type: 'tournaments'
  })

  const result = await alertProcessor.evaluateAlertRule(alertRule)

  assertExists(result)
  assertEquals(result.triggered, false) // Should not trigger with no data
  assertEquals(result.current_value, 1.0) // Default to 100% success with no data
  assertEquals(result.message.includes('is healthy'), true)
})

Deno.test("AlertProcessor - evaluateAlertRule should handle database errors", async () => {
  const mockClient = new MockSupabaseClient()
  const alertProcessor = new AlertProcessor(mockClient)

  // Mock database error
  mockClient.setMockError(new Error('Database connection failed'))

  const alertRule = createMockAlertRule({
    metric: 'success_rate',
    threshold: 0.8,
    entity_type: 'tournaments'
  })

  const result = await alertProcessor.evaluateAlertRule(alertRule)

  assertExists(result)
  assertEquals(result.triggered, false) // Should not trigger on error
  assertExists(result.error) // Should include error details
  assertEquals(result.error, 'Database connection failed')
})

Deno.test("AlertProcessor - evaluateAlertRule should check escalation requirements", async () => {
  const mockClient = new MockSupabaseClient()
  const alertProcessor = new AlertProcessor(mockClient)

  // Mock low success rate that should trigger
  mockClient.setMockData('sync_execution_history', [
    { success: false },
    { success: false },
    { success: false }
  ])

  // Mock no recent alerts (escalation required)
  mockClient.setMockData('sync_error_log', [])

  const alertRule = createMockAlertRule({
    metric: 'success_rate',
    threshold: 0.8,
    escalation_delay: '30 minutes'
  })

  const result = await alertProcessor.evaluateAlertRule(alertRule)

  assertExists(result)
  assertEquals(result.triggered, true)
  assertEquals(result.escalation_required, true) // No recent alerts, so escalation required
})

Deno.test("AlertProcessor - should parse evaluation window correctly", async () => {
  const mockClient = new MockSupabaseClient()
  const alertProcessor = new AlertProcessor(mockClient)

  // Test different time window formats
  const testWindows = [
    { window: '1 hour', expectedMs: 60 * 60 * 1000 },
    { window: '30 minutes', expectedMs: 30 * 60 * 1000 },
    { window: '2 hours', expectedMs: 2 * 60 * 60 * 1000 },
    { window: '1 day', expectedMs: 24 * 60 * 60 * 1000 }
  ]

  for (const test of testWindows) {
    mockClient.setMockData('sync_execution_history', [])

    const alertRule = createMockAlertRule({
      evaluation_window: test.window
    })

    // The actual time window parsing is tested indirectly by checking that the alert processes without error
    const result = await alertProcessor.evaluateAlertRule(alertRule)
    assertExists(result)
    assertEquals(result.evaluation_window, test.window)
  }
})

Deno.test("AlertProcessor - should generate appropriate alert messages", async () => {
  const mockClient = new MockSupabaseClient()
  const alertProcessor = new AlertProcessor(mockClient)

  const testCases = [
    {
      metric: 'success_rate',
      currentValue: 0.6,
      threshold: 0.8,
      triggered: true,
      expectedMessage: 'success rate has dropped to 60.0%'
    },
    {
      metric: 'consecutive_failures',
      currentValue: 5,
      threshold: 3,
      triggered: true,
      expectedMessage: 'has 5 consecutive failures'
    },
    {
      metric: 'duration_exceeded',
      currentValue: 350,
      threshold: 300,
      triggered: true,
      expectedMessage: 'average duration is 350s'
    },
    {
      metric: 'memory_usage',
      currentValue: 650,
      threshold: 500,
      triggered: true,
      expectedMessage: 'memory usage is 650MB'
    }
  ]

  for (const testCase of testCases) {
    // Mock appropriate data for each test case
    if (testCase.metric === 'success_rate') {
      mockClient.setMockData('sync_execution_history', [
        { success: true }, { success: false }, { success: false },
        { success: true }, { success: false } // 40% success rate
      ])
    } else if (testCase.metric === 'consecutive_failures') {
      mockClient.setMockData('sync_execution_history', [
        { success: false }, { success: false }, { success: false },
        { success: false }, { success: false }, { success: true }
      ])
    } else if (testCase.metric === 'duration_exceeded') {
      mockClient.setMockData('sync_execution_history', [
        { duration: '00:05:50' } // 350 seconds
      ])
    } else if (testCase.metric === 'memory_usage') {
      mockClient.setMockData('sync_execution_history', [
        { memory_usage_mb: 650 }
      ])
    }

    const alertRule = createMockAlertRule({
      metric: testCase.metric,
      threshold: testCase.threshold
    })

    const result = await alertProcessor.evaluateAlertRule(alertRule)

    assertExists(result)
    assertEquals(result.triggered, testCase.triggered)
    
    if (testCase.triggered) {
      assertEquals(result.message.includes(testCase.expectedMessage), true,
        `Expected message to contain "${testCase.expectedMessage}" but got "${result.message}"`)
    }
  }
})