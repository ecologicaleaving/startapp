-- Deployment script for Match Schedule Sync Edge Function
-- Sets up cron triggers for 15-minute interval execution

-- Drop existing cron jobs if they exist (for redeployment)
SELECT cron.unschedule('match-sync-00');
SELECT cron.unschedule('match-sync-15');
SELECT cron.unschedule('match-sync-30');
SELECT cron.unschedule('match-sync-45');

-- Create cron jobs for match schedule synchronization
-- Runs at :00, :15, :30, :45 minutes past each hour

-- Job 1: Run at the top of each hour (:00)
SELECT cron.schedule(
  'match-sync-00',
  '0 * * * *',  -- Every hour at minute 0
  $$
    SELECT net.http_post(
      url := 'https://' || current_setting('app.settings.supabase_url') || '/functions/v1/match-schedule-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'trigger', 'cron-00',
        'timestamp', now()
      )
    );
  $$
);

-- Job 2: Run at 15 minutes past each hour (:15)
SELECT cron.schedule(
  'match-sync-15',
  '15 * * * *',  -- Every hour at minute 15
  $$
    SELECT net.http_post(
      url := 'https://' || current_setting('app.settings.supabase_url') || '/functions/v1/match-schedule-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'trigger', 'cron-15',
        'timestamp', now()
      )
    );
  $$
);

-- Job 3: Run at 30 minutes past each hour (:30)
SELECT cron.schedule(
  'match-sync-30',
  '30 * * * *',  -- Every hour at minute 30
  $$
    SELECT net.http_post(
      url := 'https://' || current_setting('app.settings.supabase_url') || '/functions/v1/match-schedule-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'trigger', 'cron-30',
        'timestamp', now()
      )
    );
  $$
);

-- Job 4: Run at 45 minutes past each hour (:45)
SELECT cron.schedule(
  'match-sync-45',
  '45 * * * *',  -- Every hour at minute 45
  $$
    SELECT net.http_post(
      url := 'https://' || current_setting('app.settings.supabase_url') || '/functions/v1/match-schedule-sync',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'trigger', 'cron-45',
        'timestamp', now()
      )
    );
  $$
);

-- Verify cron jobs are scheduled
SELECT jobname, schedule, active 
FROM cron.job 
WHERE jobname LIKE 'match-sync-%'
ORDER BY jobname;

-- Initialize sync status record for matches_schedule
INSERT INTO sync_status (entity_type, sync_frequency, next_sync, is_active) 
VALUES ('matches_schedule', INTERVAL '15 minutes', NOW() + INTERVAL '15 minutes', true)
ON CONFLICT (entity_type) DO UPDATE SET
  sync_frequency = EXCLUDED.sync_frequency,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Create additional indexes for match sync performance if they don't exist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_tournament_status 
ON matches(tournament_no, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_local_date_status 
ON matches(local_date, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_status_updated 
ON matches(status, updated_at);

-- Create function to manually trigger match sync (for testing)
CREATE OR REPLACE FUNCTION trigger_match_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Call the match schedule sync function
  SELECT net.http_post(
    url := 'https://' || current_setting('app.settings.supabase_url') || '/functions/v1/match-schedule-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := jsonb_build_object(
      'trigger', 'manual',
      'timestamp', now()
    )
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Grant execute permission on the manual trigger function
GRANT EXECUTE ON FUNCTION trigger_match_sync() TO service_role;

-- Display deployment summary
SELECT 
  'Match Schedule Sync Deployment Complete' as status,
  COUNT(*) as cron_jobs_created
FROM cron.job 
WHERE jobname LIKE 'match-sync-%';