// TypeScript interfaces for sync monitoring and health tracking
// Story 2.3: Comprehensive monitoring system types

// Database table interfaces
export interface SyncExecutionHistory {
  id: string
  entity_type: string
  execution_start: string
  execution_end?: string
  duration?: string // PostgreSQL interval as string
  success: boolean
  records_processed?: number
  memory_usage_mb?: number
  error_details?: Record<string, any>
  created_at: string
}

export interface SyncTournamentResults {
  id: string
  sync_execution_id: string
  tournament_no: string
  entity_type: string
  success: boolean
  records_processed?: number
  processing_duration?: string
  error_message?: string
  error_type?: string
  retry_attempt: number
  created_at: string
}

export interface SyncErrorLog {
  id: string
  entity_type: string
  tournament_no?: string
  error_type: ErrorType
  error_severity: ErrorSeverity
  error_message: string
  error_context?: Record<string, any>
  recovery_suggestion?: string
  occurred_at: string
  resolved_at?: string
  resolution_notes?: string
}

export interface AlertRule {
  id: string
  name: string
  description?: string
  entity_type: string
  metric: AlertMetric
  threshold: number
  evaluation_window: string
  severity: ErrorSeverity
  notification_channels: NotificationChannel[]
  escalation_delay: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ManualSyncAudit {
  id: string
  sync_job_id: string
  entity_type: string
  tournament_no?: string
  priority: SyncPriority
  triggered_by: string
  trigger_reason: string
  trigger_timestamp: string
  completion_timestamp?: string
  final_status?: string
  records_processed?: number
  error_details?: Record<string, any>
}

export interface SyncHealthSummary {
  entity_type: string
  total_executions: number
  successful_executions: number
  success_rate_percentage: number
  avg_duration_seconds: number
  last_execution: string
  total_records_processed: number
}

// Enhanced sync_status interface
export interface EnhancedSyncStatus {
  entity_type: string
  last_sync?: string
  sync_frequency?: string
  next_sync?: string
  success_count: number
  error_count: number
  last_error?: string
  last_error_time?: string
  is_active: boolean
  updated_at: string
  // New monitoring fields
  average_duration?: string
  last_duration?: string
  records_processed_last?: number
  records_processed_total: number
  last_memory_usage?: number
  alert_threshold_failures: number
  notification_channels?: NotificationChannel[]
}

// Enums and types
export type ErrorType = 
  | 'NETWORK' 
  | 'AUTH' 
  | 'API' 
  | 'DATABASE' 
  | 'TIMEOUT' 
  | 'VALIDATION'
  | 'INFO'

export type ErrorSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export type AlertMetric = 
  | 'success_rate' 
  | 'consecutive_failures' 
  | 'duration_exceeded'
  | 'memory_usage'

export type NotificationChannel = 'email' | 'webhook' | 'dashboard'

export type SyncPriority = 'NORMAL' | 'HIGH' | 'EMERGENCY'

export type SyncStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED'

export type HealthStatus = 'HEALTHY' | 'WARNING' | 'CRITICAL'

// Monitoring API interfaces
export interface PerformanceMetrics {
  cacheHitRatio: number
  averageResponseTime: number
  apiCallReduction: number
  errorRate: number
  syncJobSuccessRate: number
}

export interface SyncMonitoringMetrics {
  // Sync Success Metrics
  tournamentSyncSuccessRate: number
  matchScheduleSyncSuccessRate: number
  overallSyncHealthScore: number
  
  // Performance Metrics
  averageSyncDuration: number
  peakMemoryUsage: number
  apiCallVolumeReduction: number
  
  // Error Metrics
  errorRateByType: Record<ErrorType, number>
  consecutiveFailureCount: number
  criticalErrorCount: number
  
  // Alert Metrics
  activeAlerts: number
  alertEscalationCount: number
  meanTimeToResolution: number
}

export interface EntityHealthStatus {
  status: HealthStatus
  last_successful_sync: string
  success_rate_24h: number
  consecutive_failures: number
  average_duration: string
  records_processed_today: number
}

export interface AlertSummary {
  id: string
  name: string
  severity: ErrorSeverity
  entity_type: string
  triggered_at: string
  current_value: number
  threshold: number
  message: string
}

export interface PerformanceSummary {
  total_sync_jobs_24h: number
  avg_success_rate: number
  avg_duration_seconds: number
  total_records_processed: number
  memory_usage_peak_mb: number
  api_calls_saved_percentage: number
}

// Dashboard API response interfaces
export interface SyncHealthResponse {
  overall_status: HealthStatus
  sync_entities: {
    tournaments: EntityHealthStatus
    matches_schedule: EntityHealthStatus
    matches_live?: EntityHealthStatus
  }
  active_alerts: AlertSummary[]
  performance_summary: PerformanceSummary
  last_updated: string
}

export interface PerformanceDataPoint {
  timestamp: string
  success_rate: number
  duration_ms: number
  records_processed: number
  memory_usage_mb: number
  error_count: number
}

export interface AggregatedMetrics {
  period: string
  total_executions: number
  success_rate: number
  avg_duration_ms: number
  total_records: number
  avg_memory_mb: number
  error_breakdown: Record<ErrorType, number>
}

export interface PerformanceHistoryResponse {
  entity_type: string
  period: string
  data_points: PerformanceDataPoint[]
  aggregated_metrics: AggregatedMetrics
}

// Manual sync interfaces
export interface ManualSyncRequest {
  entity_type: 'tournaments' | 'matches_schedule'
  tournament_no?: string
  priority: SyncPriority
  triggered_by: string
  reason: string
}

export interface ManualSyncResponse {
  sync_job_id: string
  status: SyncStatus
  estimated_completion: string
  progress?: {
    tournaments_processed: number
    total_tournaments: number
    current_stage: string
  }
}

export interface SyncProgress {
  sync_job_id: string
  entity_type: string
  status: SyncStatus
  progress_percentage: number
  current_tournament?: string
  tournaments_completed: number
  total_tournaments: number
  records_processed: number
  start_time: string
  estimated_completion?: string
  error_message?: string
}

// Alert evaluation interfaces
export interface AlertEvaluationResult {
  rule_id: string
  rule_name: string
  triggered: boolean
  current_value: number
  threshold: number
  severity: ErrorSeverity
  entity_type: string
  evaluation_window: string
  message: string
  notification_channels: NotificationChannel[]
  escalation_required: boolean
}

export interface NotificationPayload {
  alert_id: string
  rule_name: string
  severity: ErrorSeverity
  entity_type: string
  message: string
  current_value: number
  threshold: number
  triggered_at: string
  dashboard_url?: string
  webhook_url?: string
}

// Monitoring configuration interfaces
export interface MonitoringConfig {
  alert_rules: AlertRule[]
  notification_settings: {
    email_enabled: boolean
    webhook_enabled: boolean
    dashboard_enabled: boolean
    escalation_delay_minutes: number
  }
  retention_settings: {
    execution_history_days: number
    tournament_results_days: number
    error_logs_days: number
    manual_audit_days: number
  }
  performance_settings: {
    materialized_view_refresh_minutes: number
    metrics_collection_enabled: boolean
    detailed_logging_enabled: boolean
  }
}

// Utility types for metrics calculation
export interface MetricsTimeWindow {
  start: string
  end: string
  window_type: 'hour' | 'day' | 'week' | 'month'
}

export interface SyncStatistics {
  entity_type: string
  time_window: MetricsTimeWindow
  total_executions: number
  successful_executions: number
  failed_executions: number
  success_rate: number
  avg_duration_seconds: number
  total_records_processed: number
  avg_memory_usage_mb: number
  error_breakdown: Record<ErrorType, number>
  consecutive_failures: number
}

// Error context interfaces for detailed logging
export interface NetworkErrorContext {
  url: string
  method: string
  status_code?: number
  timeout_ms?: number
  retry_attempt: number
  response_time_ms?: number
}

export interface AuthErrorContext {
  auth_method: 'jwt' | 'request_level'
  credential_type: string
  token_expired: boolean
  retry_attempt: number
}

export interface APIErrorContext {
  endpoint: string
  request_payload?: Record<string, any>
  response_status?: number
  response_body?: string
  parsing_error?: string
}

export interface DatabaseErrorContext {
  query_type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT'
  table_name?: string
  constraint_violation?: string
  connection_error?: boolean
  deadlock?: boolean
}

// Type guards for error context
export function isNetworkErrorContext(context: any): context is NetworkErrorContext {
  return context && typeof context.url === 'string' && typeof context.method === 'string'
}

export function isAuthErrorContext(context: any): context is AuthErrorContext {
  return context && typeof context.auth_method === 'string' && typeof context.token_expired === 'boolean'
}

export function isAPIErrorContext(context: any): context is APIErrorContext {
  return context && typeof context.endpoint === 'string'
}

export function isDatabaseErrorContext(context: any): context is DatabaseErrorContext {
  return context && typeof context.query_type === 'string'
}