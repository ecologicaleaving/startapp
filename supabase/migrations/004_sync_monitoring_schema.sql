-- Migration 004: Sync Monitoring and Health Tracking Schema
-- Story 2.3: Comprehensive monitoring tables and extensions
-- Created: 2025-01-08

-- Extend existing sync_status table with monitoring columns
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS average_duration INTERVAL;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS last_duration INTERVAL;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS records_processed_last INTEGER;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS records_processed_total BIGINT DEFAULT 0;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS last_memory_usage INTEGER;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS alert_threshold_failures INTEGER DEFAULT 3;
ALTER TABLE sync_status ADD COLUMN IF NOT EXISTS notification_channels JSONB;

-- Update sync_status records to have default alert thresholds
UPDATE sync_status 
SET alert_threshold_failures = 3, notification_channels = '["dashboard"]'::jsonb 
WHERE alert_threshold_failures IS NULL;

-- Sync execution history table for detailed tracking
CREATE TABLE sync_execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL,
  execution_start TIMESTAMP NOT NULL,
  execution_end TIMESTAMP,
  duration INTERVAL,
  success BOOLEAN,
  records_processed INTEGER,
  memory_usage_mb INTEGER,
  error_details JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_sync_execution_entity 
    FOREIGN KEY (entity_type) REFERENCES sync_status(entity_type)
);

-- Per-tournament sync tracking for detailed analysis
CREATE TABLE sync_tournament_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_execution_id UUID,
  tournament_no VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL,
  success BOOLEAN NOT NULL,
  records_processed INTEGER,
  processing_duration INTERVAL,
  error_message TEXT,
  error_type VARCHAR,
  retry_attempt INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_sync_tournament_execution 
    FOREIGN KEY (sync_execution_id) REFERENCES sync_execution_history(id),
  CONSTRAINT fk_sync_tournament_tournament 
    FOREIGN KEY (tournament_no) REFERENCES tournaments(no) ON DELETE CASCADE
);

-- Sync error classification and logging
CREATE TABLE sync_error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type VARCHAR NOT NULL,
  tournament_no VARCHAR,
  error_type VARCHAR NOT NULL, -- 'NETWORK', 'AUTH', 'API', 'DATABASE', 'TIMEOUT', 'VALIDATION'
  error_severity VARCHAR NOT NULL, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  error_message TEXT NOT NULL,
  error_context JSONB, -- Stack trace, request details, etc.
  recovery_suggestion TEXT,
  occurred_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  CONSTRAINT fk_sync_error_tournament
    FOREIGN KEY (tournament_no) REFERENCES tournaments(no) ON DELETE SET NULL
);

-- Alert rules configuration table
CREATE TABLE alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  entity_type VARCHAR NOT NULL, -- 'tournaments', 'matches_schedule', 'all'
  metric VARCHAR NOT NULL, -- 'success_rate', 'consecutive_failures', 'duration_exceeded', 'memory_usage'
  threshold NUMERIC NOT NULL,
  evaluation_window INTERVAL NOT NULL,
  severity VARCHAR NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
  notification_channels JSONB DEFAULT '["dashboard"]'::jsonb, -- ['email', 'webhook', 'dashboard']
  escalation_delay INTERVAL DEFAULT '30 minutes',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Manual sync audit logging
CREATE TABLE manual_sync_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_job_id UUID NOT NULL,
  entity_type VARCHAR NOT NULL,
  tournament_no VARCHAR,
  priority VARCHAR NOT NULL, -- 'NORMAL', 'HIGH', 'EMERGENCY'
  triggered_by VARCHAR NOT NULL,
  trigger_reason TEXT NOT NULL,
  trigger_timestamp TIMESTAMP DEFAULT NOW(),
  completion_timestamp TIMESTAMP,
  final_status VARCHAR,
  records_processed INTEGER,
  error_details JSONB,
  CONSTRAINT fk_manual_sync_tournament
    FOREIGN KEY (tournament_no) REFERENCES tournaments(no) ON DELETE SET NULL
);

-- Performance indexes for monitoring queries
CREATE INDEX idx_sync_execution_history_entity_time 
ON sync_execution_history(entity_type, execution_start);

CREATE INDEX idx_sync_execution_history_success_time
ON sync_execution_history(success, execution_start);

CREATE INDEX idx_sync_tournament_results_tournament_time
ON sync_tournament_results(tournament_no, created_at);

CREATE INDEX idx_sync_tournament_results_success_time
ON sync_tournament_results(success, created_at);

CREATE INDEX idx_sync_error_log_type_severity_time
ON sync_error_log(error_type, error_severity, occurred_at);

CREATE INDEX idx_sync_error_log_entity_time
ON sync_error_log(entity_type, occurred_at);

CREATE INDEX idx_alert_rules_entity_active
ON alert_rules(entity_type, is_active);

CREATE INDEX idx_manual_sync_audit_entity_time
ON manual_sync_audit(entity_type, trigger_timestamp);

-- Materialized view for dashboard performance
CREATE MATERIALIZED VIEW sync_health_summary AS
SELECT 
  entity_type,
  COUNT(*) as total_executions,
  COUNT(*) FILTER (WHERE success = true) as successful_executions,
  ROUND(COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*), 2) as success_rate_percentage,
  AVG(EXTRACT(EPOCH FROM duration)) as avg_duration_seconds,
  MAX(execution_start) as last_execution,
  SUM(records_processed) as total_records_processed
FROM sync_execution_history 
WHERE execution_start > NOW() - INTERVAL '24 hours'
GROUP BY entity_type;

-- Index on materialized view
CREATE UNIQUE INDEX idx_sync_health_summary_entity 
ON sync_health_summary(entity_type);

-- Row Level Security policies
ALTER TABLE sync_execution_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_tournament_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_sync_audit ENABLE ROW LEVEL SECURITY;

-- Public read access for monitoring dashboard
CREATE POLICY "Allow monitoring read" ON sync_execution_history
  FOR SELECT USING (true);

CREATE POLICY "Allow monitoring read" ON sync_tournament_results  
  FOR SELECT USING (true);

CREATE POLICY "Allow monitoring read" ON sync_error_log
  FOR SELECT USING (true);

CREATE POLICY "Allow alert rules read" ON alert_rules
  FOR SELECT USING (true);

CREATE POLICY "Allow manual sync audit read" ON manual_sync_audit
  FOR SELECT USING (true);

-- Service role full access for monitoring functions
CREATE POLICY "Allow service monitoring access" ON sync_execution_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service tournament results access" ON sync_tournament_results
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service error log access" ON sync_error_log
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service alert rules access" ON alert_rules
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Allow service manual sync access" ON manual_sync_audit
  FOR ALL USING (auth.role() = 'service_role');

-- Enable real-time subscriptions for monitoring tables
ALTER PUBLICATION supabase_realtime ADD TABLE sync_execution_history;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_tournament_results;
ALTER PUBLICATION supabase_realtime ADD TABLE sync_error_log;

-- Insert default alert rules
INSERT INTO alert_rules (name, description, entity_type, metric, threshold, evaluation_window, severity, notification_channels) VALUES
('Tournament Sync Consecutive Failures', 'Alert when tournament sync fails 3 times in a row', 'tournaments', 'consecutive_failures', 3, '1 hour', 'HIGH', '["dashboard", "webhook"]'::jsonb),
('Match Schedule Consecutive Failures', 'Alert when match schedule sync fails 3 times in a row', 'matches_schedule', 'consecutive_failures', 3, '45 minutes', 'HIGH', '["dashboard", "webhook"]'::jsonb),
('Overall Sync Success Rate Drop', 'Alert when overall sync success rate drops below 95%', 'all', 'success_rate', 0.95, '24 hours', 'MEDIUM', '["dashboard"]'::jsonb),
('Tournament Sync Duration Exceeded', 'Alert when tournament sync takes longer than 5 minutes', 'tournaments', 'duration_exceeded', 300, '15 minutes', 'MEDIUM', '["dashboard"]'::jsonb),
('Match Schedule Duration Exceeded', 'Alert when match schedule sync takes longer than 10 minutes', 'matches_schedule', 'duration_exceeded', 600, '15 minutes', 'MEDIUM', '["dashboard"]'::jsonb),
('Memory Usage Exceeded', 'Alert when sync job memory usage exceeds 512MB', 'all', 'memory_usage', 512, '15 minutes', 'HIGH', '["dashboard", "webhook"]'::jsonb);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_sync_health_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY sync_health_summary;
END;
$$ LANGUAGE plpgsql;

-- Schedule materialized view refresh every 5 minutes
SELECT cron.schedule(
  'refresh-sync-health-summary',
  '*/5 * * * *', -- Every 5 minutes
  'SELECT refresh_sync_health_summary();'
);

-- Function to clean up old monitoring data
CREATE OR REPLACE FUNCTION cleanup_old_monitoring_data()
RETURNS void AS $$
BEGIN
  -- Keep sync execution history for 30 days
  DELETE FROM sync_execution_history 
  WHERE execution_start < NOW() - INTERVAL '30 days';
  
  -- Keep tournament results for 30 days  
  DELETE FROM sync_tournament_results
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Keep error logs for 90 days
  DELETE FROM sync_error_log
  WHERE occurred_at < NOW() - INTERVAL '90 days' AND resolved_at IS NOT NULL;
  
  -- Keep manual sync audit for 90 days
  DELETE FROM manual_sync_audit
  WHERE trigger_timestamp < NOW() - INTERVAL '90 days';
  
  -- Log cleanup completion
  INSERT INTO sync_error_log (entity_type, error_type, error_severity, error_message, recovery_suggestion)
  VALUES ('monitoring', 'INFO', 'LOW', 'Monitoring data cleanup completed', 'No action required');
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run weekly
SELECT cron.schedule(
  'cleanup-monitoring-data',
  '0 2 * * 0', -- Weekly on Sunday at 2 AM
  'SELECT cleanup_old_monitoring_data();'
);

-- Grant necessary permissions
GRANT SELECT ON sync_execution_history TO anon, authenticated;
GRANT SELECT ON sync_tournament_results TO anon, authenticated;
GRANT SELECT ON sync_error_log TO anon, authenticated;
GRANT SELECT ON alert_rules TO anon, authenticated;
GRANT SELECT ON manual_sync_audit TO anon, authenticated;
GRANT SELECT ON sync_health_summary TO anon, authenticated;

-- Complete migration marker
INSERT INTO sync_error_log (entity_type, error_type, error_severity, error_message, recovery_suggestion)
VALUES ('monitoring', 'INFO', 'LOW', 'Migration 004 completed: Sync monitoring schema deployed', 'Monitoring system ready for use');