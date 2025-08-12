// Alert rule evaluation and processing logic
// Story 2.3: Alert system implementation

export interface AlertRule {
  id: string
  name: string
  description?: string
  entity_type: string
  metric: string
  threshold: number
  evaluation_window: string
  severity: string
  notification_channels: string[]
  escalation_delay: string
  is_active: boolean
}

export interface AlertEvaluationResult {
  rule_id: string
  rule_name: string
  triggered: boolean
  current_value: number
  threshold: number
  severity: string
  entity_type: string
  evaluation_window: string
  message: string
  notification_channels: string[]
  escalation_required: boolean
  error?: string
}

export class AlertProcessor {
  private supabase: any

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  /**
   * Evaluate a specific alert rule
   */
  async evaluateAlertRule(rule: AlertRule): Promise<AlertEvaluationResult> {
    try {
      console.log(`Evaluating alert rule: ${rule.name} (${rule.metric})`)

      const currentValue = await this.getCurrentMetricValue(rule)
      const triggered = this.isAlertTriggered(rule, currentValue)
      const escalationRequired = triggered && await this.checkEscalationRequired(rule)

      const result: AlertEvaluationResult = {
        rule_id: rule.id,
        rule_name: rule.name,
        triggered,
        current_value: currentValue,
        threshold: rule.threshold,
        severity: rule.severity,
        entity_type: rule.entity_type,
        evaluation_window: rule.evaluation_window,
        message: this.generateAlertMessage(rule, currentValue, triggered),
        notification_channels: rule.notification_channels,
        escalation_required
      }

      // Log alert evaluation if triggered
      if (triggered) {
        await this.logAlertTrigger(rule, result)
      }

      return result
    } catch (error) {
      console.error(`Alert evaluation failed for rule ${rule.name}:`, error)
      
      return {
        rule_id: rule.id,
        rule_name: rule.name,
        triggered: false,
        current_value: 0,
        threshold: rule.threshold,
        severity: rule.severity,
        entity_type: rule.entity_type,
        evaluation_window: rule.evaluation_window,
        message: `Alert evaluation failed: ${error.message}`,
        notification_channels: rule.notification_channels,
        escalation_required: false,
        error: error.message
      }
    }
  }

  /**
   * Get current value for a specific metric
   */
  private async getCurrentMetricValue(rule: AlertRule): Promise<number> {
    const evaluationWindow = this.parseEvaluationWindow(rule.evaluation_window)
    const cutoffTime = new Date(Date.now() - evaluationWindow).toISOString()

    switch (rule.metric) {
      case 'success_rate':
        return await this.getSuccessRate(rule.entity_type, cutoffTime)
      
      case 'consecutive_failures':
        return await this.getConsecutiveFailures(rule.entity_type)
      
      case 'duration_exceeded':
        return await this.getAverageJobDuration(rule.entity_type, cutoffTime)
      
      case 'memory_usage':
        return await this.getPeakMemoryUsage(rule.entity_type, cutoffTime)
      
      default:
        throw new Error(`Unknown metric: ${rule.metric}`)
    }
  }

  /**
   * Check if alert should be triggered based on threshold
   */
  private isAlertTriggered(rule: AlertRule, currentValue: number): boolean {
    switch (rule.metric) {
      case 'success_rate':
        // Trigger if success rate is below threshold
        return currentValue < rule.threshold
      
      case 'consecutive_failures':
        // Trigger if consecutive failures exceed threshold
        return currentValue >= rule.threshold
      
      case 'duration_exceeded':
        // Trigger if average duration exceeds threshold (seconds)
        return currentValue > rule.threshold
      
      case 'memory_usage':
        // Trigger if memory usage exceeds threshold (MB)
        return currentValue > rule.threshold
      
      default:
        return false
    }
  }

  /**
   * Get success rate for entity type within time window
   */
  private async getSuccessRate(entityType: string, cutoffTime: string): Promise<number> {
    try {
      let query = this.supabase
        .from('sync_execution_history')
        .select('success')
        .gte('execution_start', cutoffTime)

      if (entityType !== 'all') {
        query = query.eq('entity_type', entityType)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data || data.length === 0) return 1.0 // No data means 100% success

      const successful = data.filter(d => d.success).length
      return successful / data.length
    } catch (error) {
      console.error('Failed to get success rate:', error)
      return 1.0 // Default to success to avoid false alerts
    }
  }

  /**
   * Get consecutive failures for entity type
   */
  private async getConsecutiveFailures(entityType: string): Promise<number> {
    try {
      let query = this.supabase
        .from('sync_execution_history')
        .select('success')
        .order('execution_start', { ascending: false })
        .limit(20)

      if (entityType !== 'all') {
        query = query.eq('entity_type', entityType)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data || data.length === 0) return 0

      let consecutiveFailures = 0
      for (const execution of data) {
        if (!execution.success) {
          consecutiveFailures++
        } else {
          break // Stop at first success
        }
      }

      return consecutiveFailures
    } catch (error) {
      console.error('Failed to get consecutive failures:', error)
      return 0
    }
  }

  /**
   * Get average job duration in seconds
   */
  private async getAverageJobDuration(entityType: string, cutoffTime: string): Promise<number> {
    try {
      let query = this.supabase
        .from('sync_execution_history')
        .select('duration')
        .gte('execution_start', cutoffTime)
        .not('duration', 'is', null)

      if (entityType !== 'all') {
        query = query.eq('entity_type', entityType)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data || data.length === 0) return 0

      const durations = data.map(d => this.parsePgIntervalToSeconds(d.duration))
      return durations.reduce((sum, d) => sum + d, 0) / durations.length
    } catch (error) {
      console.error('Failed to get average job duration:', error)
      return 0
    }
  }

  /**
   * Get peak memory usage in MB
   */
  private async getPeakMemoryUsage(entityType: string, cutoffTime: string): Promise<number> {
    try {
      let query = this.supabase
        .from('sync_execution_history')
        .select('memory_usage_mb')
        .gte('execution_start', cutoffTime)
        .not('memory_usage_mb', 'is', null)

      if (entityType !== 'all') {
        query = query.eq('entity_type', entityType)
      }

      const { data, error } = await query

      if (error) throw error
      if (!data || data.length === 0) return 0

      return Math.max(...data.map(d => d.memory_usage_mb || 0))
    } catch (error) {
      console.error('Failed to get peak memory usage:', error)
      return 0
    }
  }

  /**
   * Check if escalation is required based on escalation delay
   */
  private async checkEscalationRequired(rule: AlertRule): Promise<boolean> {
    try {
      // Check if there's already a recent alert for this rule
      const escalationDelayMs = this.parseEvaluationWindow(rule.escalation_delay)
      const recentAlertCutoff = new Date(Date.now() - escalationDelayMs).toISOString()

      const { data, error } = await this.supabase
        .from('sync_error_log')
        .select('occurred_at')
        .eq('entity_type', 'alert_system')
        .ilike('error_message', `%Alert triggered: ${rule.name}%`)
        .gte('occurred_at', recentAlertCutoff)
        .limit(1)

      if (error) {
        console.error('Failed to check escalation status:', error)
        return true // Default to escalation to be safe
      }

      // If no recent alerts, escalation is required
      return !data || data.length === 0
    } catch (error) {
      console.error('Failed to check escalation required:', error)
      return true
    }
  }

  /**
   * Log alert trigger to error log for audit trail
   */
  private async logAlertTrigger(rule: AlertRule, result: AlertEvaluationResult): Promise<void> {
    try {
      await this.supabase.from('sync_error_log').insert([{
        entity_type: 'alert_system',
        error_type: 'INFO',
        error_severity: result.severity,
        error_message: `Alert triggered: ${rule.name} - ${result.message}`,
        error_context: {
          rule_id: rule.id,
          current_value: result.current_value,
          threshold: result.threshold,
          entity_type: rule.entity_type,
          metric: rule.metric,
          evaluation_window: rule.evaluation_window,
          escalation_required: result.escalation_required
        },
        recovery_suggestion: this.getRecoverySuggestion(rule)
      }])
    } catch (error) {
      console.error('Failed to log alert trigger:', error)
    }
  }

  /**
   * Generate human-readable alert message
   */
  private generateAlertMessage(rule: AlertRule, currentValue: number, triggered: boolean): string {
    const entityDisplay = rule.entity_type === 'all' ? 'all sync jobs' : `${rule.entity_type} sync`
    const formattedValue = this.formatMetricValue(rule.metric, currentValue)
    const formattedThreshold = this.formatMetricValue(rule.metric, rule.threshold)

    if (!triggered) {
      return `${entityDisplay} ${rule.metric} is healthy: ${formattedValue} (threshold: ${formattedThreshold})`
    }

    switch (rule.metric) {
      case 'success_rate':
        return `${entityDisplay} success rate has dropped to ${formattedValue} (below threshold of ${formattedThreshold})`
      
      case 'consecutive_failures':
        return `${entityDisplay} has ${Math.round(currentValue)} consecutive failures (threshold: ${rule.threshold})`
      
      case 'duration_exceeded':
        return `${entityDisplay} average duration is ${formattedValue} (exceeds threshold of ${formattedThreshold})`
      
      case 'memory_usage':
        return `${entityDisplay} peak memory usage is ${formattedValue} (exceeds threshold of ${formattedThreshold})`
      
      default:
        return `${entityDisplay} metric ${rule.metric} value ${formattedValue} exceeded threshold ${formattedThreshold}`
    }
  }

  /**
   * Format metric value for display
   */
  private formatMetricValue(metric: string, value: number): string {
    switch (metric) {
      case 'success_rate':
        return `${(value * 100).toFixed(1)}%`
      
      case 'consecutive_failures':
        return `${Math.round(value)} failures`
      
      case 'duration_exceeded':
        return `${Math.round(value)}s`
      
      case 'memory_usage':
        return `${Math.round(value)}MB`
      
      default:
        return value.toString()
    }
  }

  /**
   * Get recovery suggestion for alert
   */
  private getRecoverySuggestion(rule: AlertRule): string {
    switch (rule.metric) {
      case 'success_rate':
        return 'Check sync job logs for errors. Verify API connectivity and authentication.'
      
      case 'consecutive_failures':
        return 'Investigate latest sync job failures. Consider manual sync trigger if needed.'
      
      case 'duration_exceeded':
        return 'Check for performance issues. Verify database connectivity and API response times.'
      
      case 'memory_usage':
        return 'Monitor sync job memory usage. Consider reducing batch sizes or optimizing queries.'
      
      default:
        return 'Review sync job performance and logs for issues.'
    }
  }

  /**
   * Parse evaluation window string to milliseconds
   */
  private parseEvaluationWindow(window: string): number {
    const windowRegex = /(\d+)\s*(minute|minutes|hour|hours|day|days)s?/i
    const match = window.match(windowRegex)

    if (!match) {
      console.warn(`Invalid evaluation window format: ${window}, defaulting to 1 hour`)
      return 60 * 60 * 1000 // 1 hour default
    }

    const value = parseInt(match[1])
    const unit = match[2].toLowerCase()

    switch (unit) {
      case 'minute':
      case 'minutes':
        return value * 60 * 1000
      case 'hour':
      case 'hours':
        return value * 60 * 60 * 1000
      case 'day':
      case 'days':
        return value * 24 * 60 * 60 * 1000
      default:
        return 60 * 60 * 1000 // 1 hour default
    }
  }

  /**
   * Parse PostgreSQL interval to seconds
   */
  private parsePgIntervalToSeconds(interval: string): number {
    if (!interval) return 0
    
    // Handle PostgreSQL interval format (HH:MM:SS)
    const parts = interval.split(':').map(Number)
    if (parts.length !== 3) return 0
    
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  }
}