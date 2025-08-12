-- Deployment SQL for Sync Alert Processor
-- Story 2.3: Alert system deployment and cron configuration

-- Create cron job for alert processing (every 5 minutes)
SELECT cron.schedule(
  'sync-alert-processor-5min',
  '*/5 * * * *',  -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://' || current_setting('app.settings.project_ref') || '.supabase.co/functions/v1/sync-alert-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'trigger', 'cron',
      'timestamp', extract(epoch from now())
    ),
    timeout_milliseconds := 30000
  );
  $$
);

-- Create manual alert processor trigger function for testing/debugging
CREATE OR REPLACE FUNCTION trigger_alert_processor()
RETURNS jsonb AS $$
DECLARE
  response_data jsonb;
BEGIN
  -- Call the alert processor Edge Function
  SELECT content::jsonb INTO response_data
  FROM http((
    'POST',
    'https://' || current_setting('app.settings.project_ref') || '.supabase.co/functions/v1/sync-alert-processor',
    ARRAY[
      http_header('Content-Type', 'application/json'),
      http_header('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
    ],
    'application/json',
    jsonb_build_object(
      'trigger', 'manual',
      'triggered_by', 'database_function',
      'timestamp', extract(epoch from now())
    )::text
  ));

  -- Log the manual trigger
  INSERT INTO sync_error_log (entity_type, error_type, error_severity, error_message, recovery_suggestion)
  VALUES (
    'alert_system',
    'INFO', 
    'LOW',
    'Manual alert processor trigger executed',
    'No action required - this was a manual trigger'
  );

  RETURN COALESCE(response_data, '{"error": "No response received"}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION trigger_alert_processor() TO service_role;

-- Create alert processor status view
CREATE OR REPLACE VIEW alert_processor_status AS
SELECT 
  'alert_processor' as component,
  CASE 
    WHEN COUNT(*) FILTER (WHERE occurred_at > NOW() - INTERVAL '10 minutes') > 0 
    THEN 'HEALTHY'
    WHEN COUNT(*) FILTER (WHERE occurred_at > NOW() - INTERVAL '30 minutes') > 0
    THEN 'WARNING'
    ELSE 'CRITICAL'
  END as status,
  COUNT(*) FILTER (WHERE occurred_at > NOW() - INTERVAL '24 hours') as executions_24h,
  MAX(occurred_at) as last_execution,
  COUNT(*) FILTER (WHERE occurred_at > NOW() - INTERVAL '24 hours' AND error_severity = 'HIGH') as errors_24h
FROM sync_error_log 
WHERE entity_type = 'alert_system'
  AND error_message LIKE '%Alert processor%';

-- Grant select on the view
GRANT SELECT ON alert_processor_status TO anon, authenticated, service_role;

-- Create alert summary view for dashboard
CREATE OR REPLACE VIEW alert_summary AS
SELECT 
  ar.entity_type,
  ar.severity,
  COUNT(*) as rule_count,
  COUNT(*) FILTER (WHERE ar.is_active = true) as active_rules,
  COUNT(DISTINCT sel.id) FILTER (WHERE sel.occurred_at > NOW() - INTERVAL '24 hours') as triggers_24h,
  COUNT(DISTINCT sel.id) FILTER (WHERE sel.occurred_at > NOW() - INTERVAL '1 hour') as triggers_1h,
  MAX(sel.occurred_at) as last_trigger
FROM alert_rules ar
LEFT JOIN sync_error_log sel ON (
  sel.entity_type = 'alert_system' 
  AND sel.error_message LIKE '%Alert triggered: ' || ar.name || '%'
)
GROUP BY ar.entity_type, ar.severity
ORDER BY ar.entity_type, ar.severity;

-- Grant select on alert summary view
GRANT SELECT ON alert_summary TO anon, authenticated, service_role;

-- Create function to disable/enable alert rules
CREATE OR REPLACE FUNCTION toggle_alert_rule(rule_id UUID, enable BOOLEAN DEFAULT NULL)
RETURNS jsonb AS $$
DECLARE
  rule_record RECORD;
  new_status BOOLEAN;
BEGIN
  -- Get current rule status
  SELECT * INTO rule_record FROM alert_rules WHERE id = rule_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Alert rule not found'
    );
  END IF;

  -- Determine new status
  new_status := COALESCE(enable, NOT rule_record.is_active);

  -- Update the rule
  UPDATE alert_rules 
  SET is_active = new_status, updated_at = NOW()
  WHERE id = rule_id;

  -- Log the change
  INSERT INTO sync_error_log (entity_type, error_type, error_severity, error_message, recovery_suggestion)
  VALUES (
    'alert_system',
    'INFO',
    'LOW',
    'Alert rule ' || rule_record.name || ' ' || 
    CASE WHEN new_status THEN 'enabled' ELSE 'disabled' END || ' manually',
    'No action required - this was a manual rule toggle'
  );

  RETURN jsonb_build_object(
    'success', true,
    'rule_id', rule_id,
    'rule_name', rule_record.name,
    'previous_status', rule_record.is_active,
    'new_status', new_status
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION toggle_alert_rule(UUID, BOOLEAN) TO service_role;

-- Create function to update alert rule thresholds
CREATE OR REPLACE FUNCTION update_alert_threshold(
  rule_id UUID,
  new_threshold NUMERIC,
  reason TEXT DEFAULT 'Manual threshold adjustment'
)
RETURNS jsonb AS $$
DECLARE
  rule_record RECORD;
  old_threshold NUMERIC;
BEGIN
  -- Get current rule
  SELECT * INTO rule_record FROM alert_rules WHERE id = rule_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Alert rule not found'
    );
  END IF;

  old_threshold := rule_record.threshold;

  -- Update threshold
  UPDATE alert_rules 
  SET threshold = new_threshold, updated_at = NOW()
  WHERE id = rule_id;

  -- Log the change
  INSERT INTO sync_error_log (entity_type, error_type, error_severity, error_message, recovery_suggestion)
  VALUES (
    'alert_system',
    'INFO',
    'LOW',
    'Alert rule ' || rule_record.name || ' threshold changed from ' || old_threshold || ' to ' || new_threshold || '. Reason: ' || reason,
    'No action required - this was a manual threshold update'
  );

  RETURN jsonb_build_object(
    'success', true,
    'rule_id', rule_id,
    'rule_name', rule_record.name,
    'old_threshold', old_threshold,
    'new_threshold', new_threshold,
    'reason', reason
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_alert_threshold(UUID, NUMERIC, TEXT) TO service_role;

-- Insert completion log
INSERT INTO sync_error_log (entity_type, error_type, error_severity, error_message, recovery_suggestion)
VALUES (
  'alert_system',
  'INFO',
  'LOW',
  'Alert processor deployment completed successfully',
  'Alert system is now active and monitoring sync job health'
);