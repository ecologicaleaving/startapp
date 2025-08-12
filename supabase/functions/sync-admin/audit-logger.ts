// Audit logging for manual sync operations
// Story 2.3: Comprehensive audit trail for sync admin actions

export interface ManualTriggerAudit {
  sync_job_id: string
  entity_type: string
  tournament_no?: string
  priority: string
  triggered_by: string
  trigger_reason: string
}

export interface SyncCancellationAudit {
  sync_job_id: string
  cancelled_by: string
  cancellation_reason: string
}

export interface SyncHistoryFilter {
  hours?: number
  entity_type?: string
  triggered_by?: string
  priority?: string
  status?: string
}

export class AuditLogger {
  private supabase: any

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  /**
   * Log manual sync trigger event
   */
  async logManualTrigger(audit: ManualTriggerAudit): Promise<void> {
    try {
      // Log to sync_error_log for general monitoring
      await this.supabase
        .from('sync_error_log')
        .insert([{
          entity_type: 'sync_admin',
          error_type: 'INFO',
          error_severity: this.getPrioritySeverity(audit.priority),
          error_message: `Manual sync triggered: ${audit.entity_type} by ${audit.triggered_by}`,
          error_context: {
            sync_job_id: audit.sync_job_id,
            entity_type: audit.entity_type,
            tournament_no: audit.tournament_no,
            priority: audit.priority,
            triggered_by: audit.triggered_by,
            trigger_reason: audit.trigger_reason,
            action: 'manual_trigger'
          },
          recovery_suggestion: 'No action required - this was a manual sync trigger'
        }])

      console.log(`Logged manual trigger for sync job ${audit.sync_job_id}`)
    } catch (error) {
      console.error('Failed to log manual trigger:', error)
      // Don't throw - audit logging failure shouldn't stop the sync
    }
  }

  /**
   * Log sync cancellation event
   */
  async logSyncCancellation(audit: SyncCancellationAudit): Promise<void> {
    try {
      // Get job details for better logging
      const { data: jobData } = await this.supabase
        .from('manual_sync_audit')
        .select('entity_type, priority, triggered_by, trigger_reason')
        .eq('sync_job_id', audit.sync_job_id)
        .single()

      await this.supabase
        .from('sync_error_log')
        .insert([{
          entity_type: 'sync_admin',
          error_type: 'INFO',
          error_severity: 'MEDIUM',
          error_message: `Sync job cancelled: ${audit.sync_job_id} by ${audit.cancelled_by}`,
          error_context: {
            sync_job_id: audit.sync_job_id,
            cancelled_by: audit.cancelled_by,
            cancellation_reason: audit.cancellation_reason,
            original_trigger: jobData ? {
              entity_type: jobData.entity_type,
              priority: jobData.priority,
              triggered_by: jobData.triggered_by,
              trigger_reason: jobData.trigger_reason
            } : null,
            action: 'sync_cancellation'
          },
          recovery_suggestion: `Cancelled sync job. Reason: ${audit.cancellation_reason}`
        }])

      console.log(`Logged sync cancellation for job ${audit.sync_job_id}`)
    } catch (error) {
      console.error('Failed to log sync cancellation:', error)
    }
  }

  /**
   * Log admin action (general purpose)
   */
  async logAdminAction(params: {
    action: string
    performed_by: string
    details: Record<string, any>
    severity?: 'LOW' | 'MEDIUM' | 'HIGH'
    description?: string
  }): Promise<void> {
    try {
      await this.supabase
        .from('sync_error_log')
        .insert([{
          entity_type: 'sync_admin',
          error_type: 'INFO',
          error_severity: params.severity || 'LOW',
          error_message: params.description || `Admin action: ${params.action} by ${params.performed_by}`,
          error_context: {
            action: params.action,
            performed_by: params.performed_by,
            details: params.details,
            timestamp: new Date().toISOString()
          },
          recovery_suggestion: 'No action required - this was an admin operation'
        }])

      console.log(`Logged admin action: ${params.action} by ${params.performed_by}`)
    } catch (error) {
      console.error('Failed to log admin action:', error)
    }
  }

  /**
   * Get sync history with filtering
   */
  async getSyncHistory(hours: number = 24, entityType?: string): Promise<{
    total_records: number
    sync_jobs: any[]
    summary: {
      by_entity_type: Record<string, number>
      by_priority: Record<string, number>
      by_status: Record<string, number>
      by_user: Record<string, number>
    }
    time_range: {
      start: string
      end: string
      hours: number
    }
  }> {
    try {
      const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
      const endTime = new Date().toISOString()

      // Build query
      let query = this.supabase
        .from('manual_sync_audit')
        .select('*')
        .gte('trigger_timestamp', cutoffTime)
        .order('trigger_timestamp', { ascending: false })

      if (entityType && entityType !== 'all') {
        query = query.eq('entity_type', entityType)
      }

      const { data: syncJobs, error } = await query

      if (error) {
        throw new Error(`Failed to get sync history: ${error.message}`)
      }

      const jobs = syncJobs || []

      // Calculate summary statistics
      const summary = {
        by_entity_type: this.groupBy(jobs, 'entity_type'),
        by_priority: this.groupBy(jobs, 'priority'),
        by_status: this.groupBy(jobs, 'final_status'),
        by_user: this.groupBy(jobs, 'triggered_by')
      }

      // Format jobs for response
      const formattedJobs = jobs.map(job => ({
        sync_job_id: job.sync_job_id,
        entity_type: job.entity_type,
        tournament_no: job.tournament_no,
        priority: job.priority,
        triggered_by: job.triggered_by,
        trigger_reason: job.trigger_reason,
        status: job.final_status,
        trigger_timestamp: job.trigger_timestamp,
        completion_timestamp: job.completion_timestamp,
        records_processed: job.records_processed,
        duration_seconds: this.calculateDurationSeconds(
          job.trigger_timestamp, 
          job.completion_timestamp
        ),
        error_details: job.error_details
      }))

      return {
        total_records: jobs.length,
        sync_jobs: formattedJobs,
        summary,
        time_range: {
          start: cutoffTime,
          end: endTime,
          hours
        }
      }
    } catch (error) {
      console.error('Failed to get sync history:', error)
      throw error
    }
  }

  /**
   * Get sync performance analytics
   */
  async getSyncPerformanceAnalytics(days: number = 7): Promise<{
    performance_trends: any[]
    user_statistics: any[]
    entity_performance: any[]
    failure_analysis: any
  }> {
    try {
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const { data: jobs, error } = await this.supabase
        .from('manual_sync_audit')
        .select('*')
        .gte('trigger_timestamp', cutoffTime)
        .order('trigger_timestamp', { ascending: true })

      if (error) {
        throw new Error(`Failed to get performance analytics: ${error.message}`)
      }

      const syncJobs = jobs || []

      return {
        performance_trends: this.calculatePerformanceTrends(syncJobs),
        user_statistics: this.calculateUserStatistics(syncJobs),
        entity_performance: this.calculateEntityPerformance(syncJobs),
        failure_analysis: this.analyzeFailures(syncJobs)
      }
    } catch (error) {
      console.error('Failed to get performance analytics:', error)
      throw error
    }
  }

  /**
   * Get top sync administrators by activity
   */
  async getTopAdministrators(days: number = 30): Promise<{
    administrators: Array<{
      triggered_by: string
      total_syncs: number
      successful_syncs: number
      failed_syncs: number
      success_rate: number
      most_common_entity: string
      most_common_priority: string
      avg_records_processed: number
    }>
    time_period: { days: number, start: string, end: string }
  }> {
    try {
      const cutoffTime = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

      const { data: jobs, error } = await this.supabase
        .from('manual_sync_audit')
        .select('*')
        .gte('trigger_timestamp', cutoffTime)

      if (error) {
        throw new Error(`Failed to get administrator statistics: ${error.message}`)
      }

      const syncJobs = jobs || []
      const adminStats = this.calculateAdministratorStatistics(syncJobs)

      return {
        administrators: adminStats,
        time_period: {
          days,
          start: cutoffTime,
          end: new Date().toISOString()
        }
      }
    } catch (error) {
      console.error('Failed to get administrator statistics:', error)
      throw error
    }
  }

  // Helper methods

  private getPrioritySeverity(priority: string): 'LOW' | 'MEDIUM' | 'HIGH' {
    switch (priority) {
      case 'EMERGENCY':
        return 'HIGH'
      case 'HIGH':
        return 'MEDIUM'
      case 'NORMAL':
      default:
        return 'LOW'
    }
  }

  private groupBy(items: any[], key: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = item[key] || 'unknown'
      acc[value] = (acc[value] || 0) + 1
      return acc
    }, {})
  }

  private calculateDurationSeconds(start: string, end: string | null): number | null {
    if (!start || !end) return null
    
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    
    return Math.round((endTime - startTime) / 1000)
  }

  private calculatePerformanceTrends(jobs: any[]): any[] {
    // Group jobs by day and calculate metrics
    const dailyStats: { [date: string]: any } = {}

    jobs.forEach(job => {
      const date = new Date(job.trigger_timestamp).toISOString().split('T')[0]
      
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          total_jobs: 0,
          successful_jobs: 0,
          failed_jobs: 0,
          total_records: 0,
          avg_duration: 0,
          durations: []
        }
      }

      const stats = dailyStats[date]
      stats.total_jobs++
      
      if (job.final_status === 'COMPLETED') {
        stats.successful_jobs++
      } else if (job.final_status === 'FAILED') {
        stats.failed_jobs++
      }

      if (job.records_processed) {
        stats.total_records += job.records_processed
      }

      const duration = this.calculateDurationSeconds(job.trigger_timestamp, job.completion_timestamp)
      if (duration !== null) {
        stats.durations.push(duration)
      }
    })

    // Calculate averages and return sorted by date
    return Object.values(dailyStats)
      .map(stats => ({
        date: stats.date,
        total_jobs: stats.total_jobs,
        successful_jobs: stats.successful_jobs,
        failed_jobs: stats.failed_jobs,
        success_rate: stats.total_jobs > 0 ? stats.successful_jobs / stats.total_jobs : 0,
        total_records: stats.total_records,
        avg_duration_seconds: stats.durations.length > 0 
          ? Math.round(stats.durations.reduce((sum: number, d: number) => sum + d, 0) / stats.durations.length)
          : 0
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  private calculateUserStatistics(jobs: any[]): any[] {
    const userStats: { [user: string]: any } = {}

    jobs.forEach(job => {
      const user = job.triggered_by
      
      if (!userStats[user]) {
        userStats[user] = {
          triggered_by: user,
          total_syncs: 0,
          successful_syncs: 0,
          failed_syncs: 0,
          total_records: 0,
          entity_types: {},
          priorities: {}
        }
      }

      const stats = userStats[user]
      stats.total_syncs++

      if (job.final_status === 'COMPLETED') {
        stats.successful_syncs++
      } else if (job.final_status === 'FAILED') {
        stats.failed_syncs++
      }

      if (job.records_processed) {
        stats.total_records += job.records_processed
      }

      // Track entity types and priorities
      stats.entity_types[job.entity_type] = (stats.entity_types[job.entity_type] || 0) + 1
      stats.priorities[job.priority] = (stats.priorities[job.priority] || 0) + 1
    })

    return Object.values(userStats).map(stats => ({
      ...stats,
      success_rate: stats.total_syncs > 0 ? stats.successful_syncs / stats.total_syncs : 0,
      avg_records_per_sync: stats.total_syncs > 0 ? Math.round(stats.total_records / stats.total_syncs) : 0
    }))
  }

  private calculateEntityPerformance(jobs: any[]): any[] {
    const entityStats: { [entity: string]: any } = {}

    jobs.forEach(job => {
      const entity = job.entity_type
      
      if (!entityStats[entity]) {
        entityStats[entity] = {
          entity_type: entity,
          total_syncs: 0,
          successful_syncs: 0,
          failed_syncs: 0,
          total_records: 0,
          durations: []
        }
      }

      const stats = entityStats[entity]
      stats.total_syncs++

      if (job.final_status === 'COMPLETED') {
        stats.successful_syncs++
      } else if (job.final_status === 'FAILED') {
        stats.failed_syncs++
      }

      if (job.records_processed) {
        stats.total_records += job.records_processed
      }

      const duration = this.calculateDurationSeconds(job.trigger_timestamp, job.completion_timestamp)
      if (duration !== null) {
        stats.durations.push(duration)
      }
    })

    return Object.values(entityStats).map(stats => ({
      entity_type: stats.entity_type,
      total_syncs: stats.total_syncs,
      successful_syncs: stats.successful_syncs,
      failed_syncs: stats.failed_syncs,
      success_rate: stats.total_syncs > 0 ? stats.successful_syncs / stats.total_syncs : 0,
      total_records: stats.total_records,
      avg_records_per_sync: stats.total_syncs > 0 ? Math.round(stats.total_records / stats.total_syncs) : 0,
      avg_duration_seconds: stats.durations.length > 0 
        ? Math.round(stats.durations.reduce((sum: number, d: number) => sum + d, 0) / stats.durations.length)
        : 0
    }))
  }

  private analyzeFailures(jobs: any[]): any {
    const failedJobs = jobs.filter(job => job.final_status === 'FAILED')
    
    const errorAnalysis = {
      total_failures: failedJobs.length,
      failure_rate: jobs.length > 0 ? failedJobs.length / jobs.length : 0,
      common_errors: {} as Record<string, number>,
      failures_by_entity: this.groupBy(failedJobs, 'entity_type'),
      failures_by_user: this.groupBy(failedJobs, 'triggered_by'),
      recent_failures: failedJobs
        .slice(0, 10)
        .map(job => ({
          sync_job_id: job.sync_job_id,
          entity_type: job.entity_type,
          triggered_by: job.triggered_by,
          trigger_timestamp: job.trigger_timestamp,
          error_details: job.error_details
        }))
    }

    // Analyze common error patterns
    failedJobs.forEach(job => {
      if (job.error_details && job.error_details.error) {
        const errorKey = job.error_details.error.substring(0, 100) // First 100 chars
        errorAnalysis.common_errors[errorKey] = (errorAnalysis.common_errors[errorKey] || 0) + 1
      }
    })

    return errorAnalysis
  }

  private calculateAdministratorStatistics(jobs: any[]): any[] {
    const userStats = this.calculateUserStatistics(jobs)

    return userStats
      .map(stats => ({
        triggered_by: stats.triggered_by,
        total_syncs: stats.total_syncs,
        successful_syncs: stats.successful_syncs,
        failed_syncs: stats.failed_syncs,
        success_rate: stats.success_rate,
        most_common_entity: this.getMostCommon(stats.entity_types),
        most_common_priority: this.getMostCommon(stats.priorities),
        avg_records_processed: stats.avg_records_per_sync
      }))
      .sort((a, b) => b.total_syncs - a.total_syncs) // Sort by total syncs descending
  }

  private getMostCommon(counts: Record<string, number>): string {
    const entries = Object.entries(counts)
    if (entries.length === 0) return 'unknown'
    
    return entries.reduce((max, current) => current[1] > max[1] ? current : max)[0]
  }
}