-- Migration 005: Live Score Enhancements for Story 4.1
-- Adds additional fields and indexes for live match score synchronization

-- =============================================================================
-- SCHEMA VERSION TRACKING
-- =============================================================================

INSERT INTO schema_versions (version, description) VALUES
('4.1.0', 'Live Score Enhancement - Additional fields and indexes for real-time score sync')
ON CONFLICT (version) DO NOTHING;

-- =============================================================================
-- MATCH TABLE ENHANCEMENTS FOR LIVE SCORES
-- =============================================================================

-- Add live score tracking fields if they don't exist
DO $$
BEGIN
  -- Add live_updated_at for tracking when scores were last updated
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'matches' AND column_name = 'live_updated_at') THEN
    ALTER TABLE matches ADD COLUMN live_updated_at TIMESTAMP DEFAULT NOW();
    RAISE NOTICE 'Added live_updated_at column to matches table';
  END IF;

  -- Add set_scores JSONB field for detailed set-by-set score tracking
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'matches' AND column_name = 'set_scores') THEN
    ALTER TABLE matches ADD COLUMN set_scores JSONB DEFAULT '{}';
    RAISE NOTICE 'Added set_scores JSONB column to matches table';
  END IF;

  -- Add points_a and points_b as aliases for match_points_a/b for consistency
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'matches' AND column_name = 'points_a') THEN
    ALTER TABLE matches ADD COLUMN points_a INTEGER;
    RAISE NOTICE 'Added points_a column to matches table';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'matches' AND column_name = 'points_b') THEN
    ALTER TABLE matches ADD COLUMN points_b INTEGER;
    RAISE NOTICE 'Added points_b column to matches table';
  END IF;
END $$;

-- =============================================================================
-- PERFORMANCE INDEXES FOR LIVE SCORE QUERIES
-- =============================================================================

-- Create index for live score queries (status + date filtering)
CREATE INDEX IF NOT EXISTS idx_matches_live_status 
ON matches(status, local_date) 
WHERE status IN ('live', 'running', 'inprogress');

-- Create index for tournament running status
CREATE INDEX IF NOT EXISTS idx_tournaments_running_status
ON tournaments(status, end_date)
WHERE status = 'Running';

-- Create index for live_updated_at timestamp queries
CREATE INDEX IF NOT EXISTS idx_matches_live_updated_at 
ON matches(live_updated_at);

-- Create composite index for tournament + live status queries
CREATE INDEX IF NOT EXISTS idx_matches_tournament_live
ON matches(tournament_no, status)
WHERE status IN ('live', 'running', 'inprogress');

-- Create index for JSONB set_scores queries
CREATE INDEX IF NOT EXISTS idx_matches_set_scores_gin
ON matches USING gin(set_scores);

-- =============================================================================
-- MATCH EVENTS TABLE FOR DETAILED SCORE PROGRESSION (OPTIONAL)
-- =============================================================================

-- Create match_events table for detailed score progression tracking
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL,
  match_no VARCHAR NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'point_scored', 'set_completed', 'match_finished', etc.
  event_data JSONB DEFAULT '{}',
  set_number INTEGER,
  score_a INTEGER,
  score_b INTEGER,
  match_points_a INTEGER,
  match_points_b INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
);

-- Create indexes for match_events table
CREATE INDEX IF NOT EXISTS idx_match_events_match_id ON match_events(match_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match_no ON match_events(match_no);
CREATE INDEX IF NOT EXISTS idx_match_events_type ON match_events(event_type);
CREATE INDEX IF NOT EXISTS idx_match_events_created_at ON match_events(created_at);
CREATE INDEX IF NOT EXISTS idx_match_events_set_number ON match_events(set_number);

-- =============================================================================
-- PERFORMANCE MONITORING TABLE
-- =============================================================================

-- Create sync_performance_logs table for monitoring Edge Function performance
CREATE TABLE IF NOT EXISTS sync_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  function_type VARCHAR(50) NOT NULL, -- 'live_score_sync', 'tournament_sync', etc.
  concurrent_tournaments INTEGER DEFAULT 0,
  total_matches INTEGER DEFAULT 0,
  api_calls_per_minute INTEGER DEFAULT 0,
  average_response_time FLOAT DEFAULT 0,
  error_rate FLOAT DEFAULT 0,
  additional_metrics JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance logs table
CREATE INDEX IF NOT EXISTS idx_sync_performance_logs_timestamp ON sync_performance_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_performance_logs_function_type ON sync_performance_logs(function_type);
CREATE INDEX IF NOT EXISTS idx_sync_performance_logs_created_at ON sync_performance_logs(created_at);

-- =============================================================================
-- FUNCTIONS AND TRIGGERS FOR LIVE SCORE MANAGEMENT
-- =============================================================================

-- Function to update live_updated_at when score fields change
CREATE OR REPLACE FUNCTION update_live_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update timestamp if score fields have actually changed
  IF (NEW.match_points_a IS DISTINCT FROM OLD.match_points_a OR
      NEW.match_points_b IS DISTINCT FROM OLD.match_points_b OR
      NEW.points_team_a_set1 IS DISTINCT FROM OLD.points_team_a_set1 OR
      NEW.points_team_b_set1 IS DISTINCT FROM OLD.points_team_b_set1 OR
      NEW.points_team_a_set2 IS DISTINCT FROM OLD.points_team_a_set2 OR
      NEW.points_team_b_set2 IS DISTINCT FROM OLD.points_team_b_set2 OR
      NEW.points_team_a_set3 IS DISTINCT FROM OLD.points_team_a_set3 OR
      NEW.points_team_b_set3 IS DISTINCT FROM OLD.points_team_b_set3 OR
      NEW.status IS DISTINCT FROM OLD.status) THEN
    
    NEW.live_updated_at = NOW();
    
    -- Sync points_a/points_b with match_points_a/b
    IF NEW.match_points_a IS NOT NULL THEN
      NEW.points_a = NEW.match_points_a;
    END IF;
    
    IF NEW.match_points_b IS NOT NULL THEN
      NEW.points_b = NEW.match_points_b;
    END IF;
    
    -- Update set_scores JSONB with current set data
    NEW.set_scores = jsonb_build_object(
      'set1', jsonb_build_object(
        'team_a', COALESCE(NEW.points_team_a_set1, 0),
        'team_b', COALESCE(NEW.points_team_b_set1, 0)
      ),
      'set2', jsonb_build_object(
        'team_a', COALESCE(NEW.points_team_a_set2, 0),
        'team_b', COALESCE(NEW.points_team_b_set2, 0)
      ),
      'set3', jsonb_build_object(
        'team_a', COALESCE(NEW.points_team_a_set3, 0),
        'team_b', COALESCE(NEW.points_team_b_set3, 0)
      )
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic live score timestamp updates
DROP TRIGGER IF EXISTS trigger_update_live_updated_at ON matches;
CREATE TRIGGER trigger_update_live_updated_at
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_live_updated_at();

-- Function to create match event entries
CREATE OR REPLACE FUNCTION create_match_event(
  p_match_id UUID,
  p_match_no VARCHAR,
  p_event_type VARCHAR,
  p_event_data JSONB DEFAULT '{}',
  p_set_number INTEGER DEFAULT NULL,
  p_score_a INTEGER DEFAULT NULL,
  p_score_b INTEGER DEFAULT NULL,
  p_match_points_a INTEGER DEFAULT NULL,
  p_match_points_b INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO match_events (
    match_id, match_no, event_type, event_data, set_number,
    score_a, score_b, match_points_a, match_points_b
  ) VALUES (
    p_match_id, p_match_no, p_event_type, p_event_data, p_set_number,
    p_score_a, p_score_b, p_match_points_a, p_match_points_b
  )
  RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- ROW LEVEL SECURITY FOR NEW TABLES
-- =============================================================================

-- Enable RLS on match_events table
ALTER TABLE match_events ENABLE ROW LEVEL SECURITY;

-- Create policies for match_events table
CREATE POLICY "match_events_public_read" ON match_events
FOR SELECT USING (true);

CREATE POLICY "match_events_service_full_access" ON match_events
FOR ALL USING (auth.role() = 'service_role');

-- Enable RLS on sync_performance_logs table
ALTER TABLE sync_performance_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for sync_performance_logs table
CREATE POLICY "sync_performance_logs_monitoring_read" ON sync_performance_logs
FOR SELECT USING (true);

CREATE POLICY "sync_performance_logs_service_full_access" ON sync_performance_logs
FOR ALL USING (auth.role() = 'service_role');

-- =============================================================================
-- VIEWS FOR MONITORING LIVE SCORE ACTIVITY
-- =============================================================================

-- Create view for live match monitoring
CREATE OR REPLACE VIEW live_matches_status AS
SELECT 
  t.no as tournament_no,
  t.name as tournament_name,
  t.code as tournament_code,
  t.start_date,
  t.end_date,
  COUNT(m.id) as total_live_matches,
  COUNT(CASE WHEN m.live_updated_at > NOW() - INTERVAL '2 minutes' THEN 1 END) as recently_updated,
  MAX(m.live_updated_at) as last_score_update,
  MIN(m.live_updated_at) as oldest_score_update,
  STRING_AGG(
    CONCAT(m.team_a_name, ' vs ', m.team_b_name, ' (', m.status, ')'), 
    '; ' ORDER BY m.local_time
  ) as live_matches_summary
FROM tournaments t
LEFT JOIN matches m ON t.no = m.tournament_no 
  AND m.status IN ('live', 'running', 'inprogress')
WHERE t.status = 'Running'
  AND t.end_date >= CURRENT_DATE
GROUP BY t.no, t.name, t.code, t.start_date, t.end_date
HAVING COUNT(m.id) > 0
ORDER BY MAX(m.live_updated_at) DESC NULLS LAST;

-- Create view for match score progression
CREATE OR REPLACE VIEW match_score_progression AS
SELECT 
  m.no as match_no,
  m.no_in_tournament,
  m.team_a_name,
  m.team_b_name,
  m.status,
  m.match_points_a,
  m.match_points_b,
  m.points_team_a_set1,
  m.points_team_b_set1,
  m.points_team_a_set2,
  m.points_team_b_set2,
  m.points_team_a_set3,
  m.points_team_b_set3,
  m.set_scores,
  m.live_updated_at,
  t.name as tournament_name,
  t.code as tournament_code,
  COUNT(e.id) as event_count,
  MAX(e.created_at) as last_event_time
FROM matches m
JOIN tournaments t ON m.tournament_no = t.no
LEFT JOIN match_events e ON m.id = e.match_id
WHERE m.status IN ('live', 'running', 'inprogress', 'finished')
GROUP BY m.id, m.no, m.no_in_tournament, m.team_a_name, m.team_b_name,
         m.status, m.match_points_a, m.match_points_b,
         m.points_team_a_set1, m.points_team_b_set1,
         m.points_team_a_set2, m.points_team_b_set2,
         m.points_team_a_set3, m.points_team_b_set3,
         m.set_scores, m.live_updated_at,
         t.name, t.code
ORDER BY m.live_updated_at DESC NULLS LAST;

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant necessary permissions to service role for live score sync
GRANT SELECT, UPDATE ON matches TO service_role;
GRANT SELECT ON tournaments TO service_role;
GRANT SELECT, INSERT, UPDATE ON sync_status TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON match_events TO service_role;
GRANT SELECT, INSERT ON sync_performance_logs TO service_role;
GRANT SELECT ON live_matches_status TO service_role;
GRANT SELECT ON match_score_progression TO service_role;
GRANT EXECUTE ON FUNCTION create_match_event TO service_role;
GRANT EXECUTE ON FUNCTION update_live_updated_at TO service_role;

-- Grant read access to public (anonymous) users for client apps
GRANT SELECT ON live_matches_status TO anon;
GRANT SELECT ON match_score_progression TO anon;

-- =============================================================================
-- REAL-TIME SUBSCRIPTIONS SETUP
-- =============================================================================

-- Ensure match_events table is added to real-time publication
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE match_events;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Table already added to real-time publication, ignore error
    NULL;
END $$;

-- =============================================================================
-- VALIDATION AND COMPLETION
-- =============================================================================

-- Verify all new objects were created successfully
DO $$
DECLARE
  match_events_count INTEGER;
  index_count INTEGER;
  view_count INTEGER;
BEGIN
  -- Check match_events table exists
  SELECT COUNT(*) INTO match_events_count
  FROM information_schema.tables 
  WHERE table_name = 'match_events';
  
  -- Check indexes were created
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes 
  WHERE indexname LIKE 'idx_%live%' OR indexname LIKE 'idx_match_events%';
  
  -- Check views were created
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views 
  WHERE table_name IN ('live_matches_status', 'match_score_progression');
  
  ASSERT match_events_count = 1, 'match_events table was not created';
  ASSERT index_count >= 6, 'Not all live score indexes were created';
  ASSERT view_count = 2, 'Not all monitoring views were created';
  
  RAISE NOTICE 'Live Score Enhancement migration completed successfully';
  RAISE NOTICE 'Created: match_events table, % indexes, % views', index_count, view_count;
END $$;