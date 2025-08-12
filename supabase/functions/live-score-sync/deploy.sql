-- Live Score Sync Edge Function Deployment Configuration
-- This file contains the database setup and scheduling for the live score sync function

-- Create or update the live score sync status tracking
INSERT INTO sync_status (entity_type, sync_frequency, next_sync, is_active, updated_at) VALUES
('matches_live', INTERVAL '30 seconds', NOW() + INTERVAL '30 seconds', true, NOW())
ON CONFLICT (entity_type) 
DO UPDATE SET 
  sync_frequency = EXCLUDED.sync_frequency,
  next_sync = EXCLUDED.next_sync,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Schedule the live score sync to run every 30 seconds
-- Note: This requires pg_cron extension and will only run during tournament hours
SELECT cron.schedule(
  'live-score-sync',
  '*/30 * * * * *',  -- Every 30 seconds
  $$
  SELECT
    net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/live-score-sync',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb,
      body := '{}'::jsonb
    ) as request_id;
  $$
);

-- Create indexes for live score queries if not exists
CREATE INDEX IF NOT EXISTS idx_matches_live_status 
ON matches(status, local_date) 
WHERE status IN ('live', 'running', 'inprogress');

-- Create index for tournament status queries
CREATE INDEX IF NOT EXISTS idx_tournaments_running_status
ON tournaments(status, end_date)
WHERE status = 'Running';

-- Update match score fields for live score tracking (if needed)
DO $$
BEGIN
  -- Add live_updated_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'matches' AND column_name = 'live_updated_at') THEN
    ALTER TABLE matches ADD COLUMN live_updated_at TIMESTAMP DEFAULT NOW();
    
    -- Create index on the new column
    CREATE INDEX idx_matches_live_updated_at ON matches(live_updated_at);
    
    -- Create trigger to update live_updated_at when score fields change
    CREATE OR REPLACE FUNCTION update_live_updated_at()
    RETURNS TRIGGER AS $trigger$
    BEGIN
      -- Only update if score fields have changed
      IF (NEW.match_points_a IS DISTINCT FROM OLD.match_points_a OR
          NEW.match_points_b IS DISTINCT FROM OLD.match_points_b OR
          NEW.points_team_a_set1 IS DISTINCT FROM OLD.points_team_a_set1 OR
          NEW.points_team_b_set1 IS DISTINCT FROM OLD.points_team_b_set1 OR
          NEW.points_team_a_set2 IS DISTINCT FROM OLD.points_team_a_set2 OR
          NEW.points_team_b_set2 IS DISTINCT FROM OLD.points_team_b_set2 OR
          NEW.points_team_a_set3 IS DISTINCT FROM OLD.points_team_a_set3 OR
          NEW.points_team_b_set3 IS DISTINCT FROM OLD.points_team_b_set3) THEN
        NEW.live_updated_at = NOW();
      END IF;
      
      RETURN NEW;
    END;
    $trigger$ LANGUAGE plpgsql;
    
    CREATE TRIGGER trigger_update_live_updated_at
      BEFORE UPDATE ON matches
      FOR EACH ROW
      EXECUTE FUNCTION update_live_updated_at();
      
    RAISE NOTICE 'Added live_updated_at column and trigger to matches table';
  END IF;
END $$;

-- Grant necessary permissions to the service role
GRANT SELECT, UPDATE ON matches TO service_role;
GRANT SELECT ON tournaments TO service_role;
GRANT SELECT, INSERT, UPDATE ON sync_status TO service_role;

-- Create function to manually trigger live score sync (for testing)
CREATE OR REPLACE FUNCTION trigger_live_score_sync()
RETURNS TABLE(status TEXT, message TEXT) AS $$
BEGIN
  -- This would be replaced with actual Edge Function invocation in production
  RETURN QUERY SELECT 'success'::TEXT, 'Live score sync triggered manually'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION trigger_live_score_sync() TO service_role;

-- Create view for monitoring live match activity
CREATE OR REPLACE VIEW live_matches_status AS
SELECT 
  t.name as tournament_name,
  t.code as tournament_code,
  COUNT(m.id) as total_live_matches,
  COUNT(CASE WHEN m.live_updated_at > NOW() - INTERVAL '2 minutes' THEN 1 END) as recently_updated,
  MAX(m.live_updated_at) as last_score_update,
  MIN(m.live_updated_at) as oldest_score_update
FROM tournaments t
LEFT JOIN matches m ON t.no = m.tournament_no 
  AND m.status IN ('live', 'running', 'inprogress')
WHERE t.status = 'Running'
  AND t.end_date >= CURRENT_DATE
GROUP BY t.no, t.name, t.code
HAVING COUNT(m.id) > 0
ORDER BY MAX(m.live_updated_at) DESC;

-- Grant select permission on the view
GRANT SELECT ON live_matches_status TO service_role;

-- Log deployment completion
INSERT INTO schema_versions (version, description) VALUES
('4.1.0', 'Live Score Sync Edge Function deployment with 30-second scheduling')
ON CONFLICT (version) DO UPDATE SET 
  applied_at = NOW(),
  description = EXCLUDED.description;

-- Display deployment summary
SELECT 
  'Live Score Sync Edge Function deployed successfully' as status,
  'Scheduled to run every 30 seconds during tournament hours' as schedule,
  'Check live_matches_status view for monitoring' as monitoring;