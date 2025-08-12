// Sync queue management for manual triggers
// Story 2.3: Manual sync job queue and execution management

export interface SyncJobRequest {
  entity_type: string
  tournament_no?: string
  priority: 'NORMAL' | 'HIGH' | 'EMERGENCY'
  triggered_by: string
  reason: string
}

export interface SyncJobStatus {
  sync_job_id: string
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  progress?: {
    tournaments_processed: number
    total_tournaments: number
    current_stage: string
    current_tournament?: string
  }
  estimated_completion?: string
  start_time?: string
  completion_time?: string
  error_message?: string
  records_processed?: number
}

export interface SyncJobResult {
  success: boolean
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  estimated_completion: string
  progress?: any
  message?: string
}

export class SyncQueueManager {
  private supabase: any
  private activeSyncJobs: Map<string, SyncJobStatus> = new Map()

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  /**
   * Create a new sync job
   */
  async createSyncJob(request: SyncJobRequest): Promise<string> {
    const syncJobId = crypto.randomUUID()

    try {
      // Insert sync job record
      const { error } = await this.supabase
        .from('manual_sync_audit')
        .insert([{
          sync_job_id: syncJobId,
          entity_type: request.entity_type,
          tournament_no: request.tournament_no,
          priority: request.priority,
          triggered_by: request.triggered_by,
          trigger_reason: request.reason,
          final_status: 'QUEUED'
        }])

      if (error) {
        throw new Error(`Failed to create sync job: ${error.message}`)
      }

      // Initialize job status
      this.activeSyncJobs.set(syncJobId, {
        sync_job_id: syncJobId,
        status: 'QUEUED',
        start_time: new Date().toISOString()
      })

      console.log(`Created sync job ${syncJobId} for ${request.entity_type}`)
      return syncJobId
    } catch (error) {
      console.error('Failed to create sync job:', error)
      throw error
    }
  }

  /**
   * Execute a sync job
   */
  async executeSyncJob(syncJobId: string): Promise<SyncJobResult> {
    try {
      const jobStatus = this.activeSyncJobs.get(syncJobId)
      if (!jobStatus) {
        throw new Error(`Sync job ${syncJobId} not found`)
      }

      // Update status to running
      jobStatus.status = 'RUNNING'
      jobStatus.start_time = new Date().toISOString()
      this.activeSyncJobs.set(syncJobId, jobStatus)

      // Get job details from database
      const { data: jobData, error: jobError } = await this.supabase
        .from('manual_sync_audit')
        .select('*')
        .eq('sync_job_id', syncJobId)
        .single()

      if (jobError || !jobData) {
        throw new Error(`Failed to get sync job details: ${jobError?.message}`)
      }

      console.log(`Executing sync job ${syncJobId}:`, jobData)

      // Execute the actual sync based on entity type
      const executionResult = await this.executeSyncByEntityType(
        jobData.entity_type,
        jobData.tournament_no,
        syncJobId
      )

      // Update final status
      const finalStatus = executionResult.success ? 'COMPLETED' : 'FAILED'
      jobStatus.status = finalStatus
      jobStatus.completion_time = new Date().toISOString()
      jobStatus.records_processed = executionResult.records_processed
      jobStatus.error_message = executionResult.error_message

      this.activeSyncJobs.set(syncJobId, jobStatus)

      // Update database record
      await this.supabase
        .from('manual_sync_audit')
        .update({
          final_status: finalStatus,
          completion_timestamp: new Date().toISOString(),
          records_processed: executionResult.records_processed,
          error_details: executionResult.error_message ? { error: executionResult.error_message } : null
        })
        .eq('sync_job_id', syncJobId)

      return {
        success: executionResult.success,
        status: finalStatus,
        estimated_completion: jobStatus.completion_time || new Date().toISOString(),
        progress: jobStatus.progress,
        message: executionResult.message
      }
    } catch (error) {
      console.error(`Failed to execute sync job ${syncJobId}:`, error)

      // Update job as failed
      const jobStatus = this.activeSyncJobs.get(syncJobId)
      if (jobStatus) {
        jobStatus.status = 'FAILED'
        jobStatus.error_message = error.message
        jobStatus.completion_time = new Date().toISOString()
        this.activeSyncJobs.set(syncJobId, jobStatus)
      }

      // Update database
      await this.supabase
        .from('manual_sync_audit')
        .update({
          final_status: 'FAILED',
          completion_timestamp: new Date().toISOString(),
          error_details: { error: error.message, stack_trace: error.stack }
        })
        .eq('sync_job_id', syncJobId)

      return {
        success: false,
        status: 'FAILED',
        estimated_completion: new Date().toISOString(),
        message: `Sync job failed: ${error.message}`
      }
    }
  }

  /**
   * Execute sync based on entity type
   */
  private async executeSyncByEntityType(
    entityType: string,
    tournamentNo: string | null,
    syncJobId: string
  ): Promise<{
    success: boolean
    records_processed: number
    error_message?: string
    message: string
  }> {
    const baseUrl = `https://${Deno.env.get('SUPABASE_PROJECT_REF')}.supabase.co/functions/v1`
    
    try {
      let syncUrl: string
      let requestBody: any = {
        manual_trigger: true,
        sync_job_id: syncJobId,
        triggered_at: new Date().toISOString()
      }

      switch (entityType) {
        case 'tournaments':
          syncUrl = `${baseUrl}/tournament-master-sync`
          if (tournamentNo) {
            requestBody.specific_tournament = tournamentNo
          }
          break

        case 'matches_schedule':
          syncUrl = `${baseUrl}/match-schedule-sync`
          if (tournamentNo) {
            requestBody.specific_tournament = tournamentNo
          }
          break

        default:
          throw new Error(`Unknown entity type: ${entityType}`)
      }

      console.log(`Calling sync function: ${syncUrl}`)

      // Update progress
      this.updateJobProgress(syncJobId, {
        tournaments_processed: 0,
        total_tournaments: tournamentNo ? 1 : 0, // Will be updated by sync function
        current_stage: 'initializing',
        current_tournament: tournamentNo || undefined
      })

      // Call the sync function
      const response = await fetch(syncUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      })

      const responseData = await response.json()

      if (!response.ok) {
        throw new Error(`Sync function failed: ${responseData.error || response.statusText}`)
      }

      // Extract results from sync function response
      const recordsProcessed = responseData.synced || responseData.matches || responseData.records_processed || 0
      const success = responseData.success === true

      return {
        success,
        records_processed: recordsProcessed,
        message: responseData.message || `${entityType} sync completed successfully`,
        error_message: success ? undefined : responseData.error
      }
    } catch (error) {
      console.error(`Sync execution failed for ${entityType}:`, error)
      return {
        success: false,
        records_processed: 0,
        error_message: error.message,
        message: `Failed to execute ${entityType} sync`
      }
    }
  }

  /**
   * Get sync job status
   */
  async getSyncJobStatus(syncJobId: string): Promise<SyncJobStatus> {
    // Check active jobs first
    const activeJob = this.activeSyncJobs.get(syncJobId)
    if (activeJob) {
      return activeJob
    }

    // Check database for completed/failed jobs
    try {
      const { data, error } = await this.supabase
        .from('manual_sync_audit')
        .select('*')
        .eq('sync_job_id', syncJobId)
        .single()

      if (error || !data) {
        throw new Error(`Sync job ${syncJobId} not found`)
      }

      return {
        sync_job_id: syncJobId,
        status: data.final_status || 'UNKNOWN',
        start_time: data.trigger_timestamp,
        completion_time: data.completion_timestamp,
        records_processed: data.records_processed,
        error_message: data.error_details?.error
      }
    } catch (error) {
      console.error('Failed to get sync job status:', error)
      throw error
    }
  }

  /**
   * Get overall queue status
   */
  async getQueueStatus(): Promise<{
    active_jobs: number
    queued_jobs: number
    running_jobs: number
    recent_jobs: any[]
    queue_health: 'HEALTHY' | 'WARNING' | 'CRITICAL'
  }> {
    try {
      // Count active jobs
      const activeJobs = this.activeSyncJobs.size
      const queuedJobs = Array.from(this.activeSyncJobs.values()).filter(j => j.status === 'QUEUED').length
      const runningJobs = Array.from(this.activeSyncJobs.values()).filter(j => j.status === 'RUNNING').length

      // Get recent jobs from database
      const { data: recentJobs, error } = await this.supabase
        .from('manual_sync_audit')
        .select('*')
        .gte('trigger_timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('trigger_timestamp', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Failed to get recent jobs:', error)
      }

      // Calculate queue health
      const queueHealth = this.calculateQueueHealth(activeJobs, runningJobs, recentJobs || [])

      return {
        active_jobs: activeJobs,
        queued_jobs: queuedJobs,
        running_jobs: runningJobs,
        recent_jobs: (recentJobs || []).map(job => ({
          sync_job_id: job.sync_job_id,
          entity_type: job.entity_type,
          priority: job.priority,
          triggered_by: job.triggered_by,
          trigger_reason: job.trigger_reason,
          status: job.final_status,
          triggered_at: job.trigger_timestamp,
          completed_at: job.completion_timestamp,
          records_processed: job.records_processed
        })),
        queue_health: queueHealth
      }
    } catch (error) {
      console.error('Failed to get queue status:', error)
      return {
        active_jobs: 0,
        queued_jobs: 0,
        running_jobs: 0,
        recent_jobs: [],
        queue_health: 'CRITICAL'
      }
    }
  }

  /**
   * Cancel a sync job
   */
  async cancelSyncJob(syncJobId: string): Promise<{ success: boolean; message: string }> {
    try {
      const jobStatus = this.activeSyncJobs.get(syncJobId)
      
      if (!jobStatus) {
        // Check if job exists in database
        const { data, error } = await this.supabase
          .from('manual_sync_audit')
          .select('final_status')
          .eq('sync_job_id', syncJobId)
          .single()

        if (error || !data) {
          return { success: false, message: 'Sync job not found' }
        }

        if (data.final_status === 'COMPLETED' || data.final_status === 'FAILED') {
          return { success: false, message: 'Cannot cancel completed or failed job' }
        }
      }

      if (jobStatus && jobStatus.status === 'RUNNING') {
        return { success: false, message: 'Cannot cancel running job - it will complete shortly' }
      }

      // Update job status
      if (jobStatus) {
        jobStatus.status = 'CANCELLED'
        jobStatus.completion_time = new Date().toISOString()
        this.activeSyncJobs.set(syncJobId, jobStatus)
      }

      // Update database
      await this.supabase
        .from('manual_sync_audit')
        .update({
          final_status: 'CANCELLED',
          completion_timestamp: new Date().toISOString()
        })
        .eq('sync_job_id', syncJobId)

      // Remove from active jobs if queued
      if (jobStatus && jobStatus.status === 'QUEUED') {
        this.activeSyncJobs.delete(syncJobId)
      }

      return { success: true, message: 'Sync job cancelled successfully' }
    } catch (error) {
      console.error('Failed to cancel sync job:', error)
      return { success: false, message: `Failed to cancel job: ${error.message}` }
    }
  }

  /**
   * Update job progress
   */
  private updateJobProgress(syncJobId: string, progress: any): void {
    const jobStatus = this.activeSyncJobs.get(syncJobId)
    if (jobStatus) {
      jobStatus.progress = progress
      this.activeSyncJobs.set(syncJobId, jobStatus)
    }
  }

  /**
   * Calculate queue health based on job metrics
   */
  private calculateQueueHealth(
    activeJobs: number,
    runningJobs: number,
    recentJobs: any[]
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' {
    // Check for stuck jobs (running too long)
    if (runningJobs > 5) return 'CRITICAL'
    
    // Check recent failure rate
    const recentFailures = recentJobs.filter(job => job.final_status === 'FAILED').length
    const failureRate = recentJobs.length > 0 ? recentFailures / recentJobs.length : 0
    
    if (failureRate > 0.5) return 'CRITICAL'
    if (failureRate > 0.2 || runningJobs > 2) return 'WARNING'
    
    return 'HEALTHY'
  }

  /**
   * Cleanup old job statuses from memory
   */
  cleanupOldJobs(): void {
    const cutoffTime = Date.now() - 2 * 60 * 60 * 1000 // 2 hours
    
    for (const [jobId, status] of this.activeSyncJobs.entries()) {
      if (status.completion_time) {
        const completionTime = new Date(status.completion_time).getTime()
        if (completionTime < cutoffTime) {
          this.activeSyncJobs.delete(jobId)
        }
      }
    }

    console.log(`Cleaned up old jobs, ${this.activeSyncJobs.size} active jobs remaining`)
  }
}