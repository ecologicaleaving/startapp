-- Migration: Set up cron trigger for tournament master data sync
-- Description: Creates daily cron job to trigger tournament synchronization at 00:00 UTC

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create or replace the cron job for daily tournament sync
-- This will run every day at 00:00 UTC (midnight)
SELECT cron.schedule(
  'tournament-sync-daily',
  '0 0 * * *',  -- Daily at 00:00 UTC (cron format: minute hour day month day-of-week)
  $$
  SELECT
    net.http_post(
      url := 'https://' || current_setting('app.settings.supabase_url') || '/functions/v1/tournament-master-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'source', 'cron_trigger',
        'timestamp', now()
      )
    ) as request_id;
  $$
);

-- Add helpful comment about the cron job
COMMENT ON EXTENSION pg_cron IS 'Tournament master sync runs daily at 00:00 UTC via cron.schedule';

-- Create a view to monitor cron job status (optional but helpful for monitoring)
CREATE OR REPLACE VIEW tournament_sync_cron_status AS
SELECT 
  jobname,
  schedule,
  active,
  jobid
FROM cron.job 
WHERE jobname = 'tournament-sync-daily';

-- Grant necessary permissions for the sync function
-- Ensure RLS policies allow the service role to update sync_status and tournaments tables
ALTER TABLE IF EXISTS sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tournaments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow service role to manage sync operations
DROP POLICY IF EXISTS "Allow service role full access to sync_status" ON sync_status;
CREATE POLICY "Allow service role full access to sync_status" ON sync_status
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role full access to tournaments" ON tournaments;
CREATE POLICY "Allow service role full access to tournaments" ON tournaments
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert initial sync_status record for tournaments if it doesn't exist
INSERT INTO sync_status (
  entity_type,
  sync_frequency, 
  last_sync,
  next_sync,
  success_count,
  error_count,
  last_error,
  last_error_time,
  updated_at
) VALUES (
  'tournaments',
  '1 day',
  NULL, -- Will be set on first successful sync
  NOW() + INTERVAL '1 day', -- Next sync tomorrow
  0,
  0,
  NULL,
  NULL,
  NOW()
) ON CONFLICT (entity_type) DO NOTHING;

-- Create helpful function to manually trigger tournament sync (for testing)
CREATE OR REPLACE FUNCTION trigger_tournament_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  response jsonb;
BEGIN
  SELECT net.http_post(
    url := 'https://' || current_setting('app.settings.supabase_url') || '/functions/v1/tournament-master-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'source', 'manual_trigger',
      'timestamp', now()
    )
  ) INTO response;
  
  RETURN response;
END;
$$;

-- Add comment explaining manual trigger function
COMMENT ON FUNCTION trigger_tournament_sync() IS 'Manually trigger tournament sync for testing purposes. Usage: SELECT trigger_tournament_sync();';

-- Create monitoring view for sync history and performance
CREATE OR REPLACE VIEW tournament_sync_monitoring AS
SELECT 
  entity_type,
  sync_frequency,
  last_sync,
  next_sync,
  success_count,
  error_count,
  last_error,
  last_error_time,
  CASE 
    WHEN last_sync IS NULL THEN 'Never synced'
    WHEN last_sync < NOW() - INTERVAL '2 days' THEN 'Stale (>48h)'
    WHEN last_error_time > last_sync THEN 'Last sync failed'
    ELSE 'Healthy'
  END as sync_health_status,
  EXTRACT(EPOCH FROM (NOW() - last_sync))/3600 as hours_since_last_sync,
  CASE 
    WHEN success_count + error_count = 0 THEN 0
    ELSE ROUND((success_count::numeric / (success_count + error_count)) * 100, 2)
  END as success_rate_percent
FROM sync_status 
WHERE entity_type = 'tournaments';

COMMENT ON VIEW tournament_sync_monitoring IS 'Monitoring view for tournament sync health and performance metrics';

-- Log the migration completion
INSERT INTO schema_versions (version, description) 
VALUES ('1.0.3', 'Added cron trigger for tournament master data sync')
ON CONFLICT (version) DO NOTHING;