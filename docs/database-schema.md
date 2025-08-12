# Database Schema Guide: Multi-Tier Caching System

## Overview
This document defines the PostgreSQL schema for the Supabase caching layer, designed to cache FIVB VIS API data with real-time synchronization capabilities.

## Table Definitions

### tournaments
Primary table for tournament master data caching.

```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no VARCHAR NOT NULL UNIQUE,
  code VARCHAR,
  name VARCHAR,
  start_date DATE,
  end_date DATE,
  status VARCHAR,
  location VARCHAR,
  last_synced TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance optimization
CREATE INDEX idx_tournaments_code ON tournaments(code);
CREATE INDEX idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_last_synced ON tournaments(last_synced);
```

**Fields Mapping to FIVB API**:
- `no` → Tournament.No (primary identifier)
- `code` → Tournament.Code (tournament code like "MWBVT2025")
- `name` → Tournament.Name (tournament display name)
- `start_date` → Tournament.StartDate (parsed from XML date format)
- `end_date` → Tournament.EndDate (parsed from XML date format)
- `status` → Tournament.Status (Running, Finished, etc.)

### matches
Match data with tournament relationships and live score tracking.

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no VARCHAR NOT NULL,
  tournament_no VARCHAR NOT NULL,
  no_in_tournament VARCHAR,
  team_a_name VARCHAR,
  team_b_name VARCHAR,
  local_date DATE,
  local_time TIME,
  court VARCHAR,
  status VARCHAR,
  round VARCHAR,
  -- Score tracking
  match_points_a INTEGER,
  match_points_b INTEGER,
  points_team_a_set1 INTEGER,
  points_team_b_set1 INTEGER,
  points_team_a_set2 INTEGER,
  points_team_b_set2 INTEGER,
  points_team_a_set3 INTEGER,
  points_team_b_set3 INTEGER,
  -- Set durations
  duration_set1 VARCHAR,
  duration_set2 VARCHAR,
  duration_set3 VARCHAR,
  -- Referee information
  no_referee1 VARCHAR,
  no_referee2 VARCHAR,
  referee1_name VARCHAR,
  referee2_name VARCHAR,
  referee1_federation_code VARCHAR,
  referee2_federation_code VARCHAR,
  -- Metadata
  last_synced TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tournament_no) REFERENCES tournaments(no) ON DELETE CASCADE
);

-- Performance indexes
CREATE INDEX idx_matches_tournament_no ON matches(tournament_no);
CREATE INDEX idx_matches_local_date ON matches(local_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_last_synced ON matches(last_synced);
CREATE INDEX idx_matches_no_in_tournament ON matches(no_in_tournament);
```

**Fields Mapping to FIVB API**:
- `no` → BeachMatch.No (unique match identifier)
- `tournament_no` → Foreign key to tournaments.no
- `no_in_tournament` → BeachMatch.NoInTournament (match number within tournament)
- `team_a_name` → BeachMatch.TeamAName
- `team_b_name` → BeachMatch.TeamBName
- `local_date` → BeachMatch.LocalDate
- `local_time` → BeachMatch.LocalTime
- `court` → BeachMatch.Court
- Score fields map directly to corresponding BeachMatch fields

### sync_status
Tracking table for monitoring synchronization job health.

```sql
CREATE TABLE sync_status (
  entity_type VARCHAR PRIMARY KEY,
  last_sync TIMESTAMP,
  sync_frequency INTERVAL,
  next_sync TIMESTAMP,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  last_error_time TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Initial sync status records
INSERT INTO sync_status (entity_type, sync_frequency, next_sync) VALUES
('tournaments', INTERVAL '1 day', NOW() + INTERVAL '1 day'),
('matches_schedule', INTERVAL '15 minutes', NOW() + INTERVAL '15 minutes'),
('matches_live', INTERVAL '30 seconds', NOW() + INTERVAL '30 seconds');
```

## Row Level Security (RLS)

### tournaments table
```sql
-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Public read access for client applications
CREATE POLICY "Allow public read" ON tournaments
  FOR SELECT USING (true);

-- Service role full access for sync operations
CREATE POLICY "Allow service full access" ON tournaments
  FOR ALL USING (auth.role() = 'service_role');
```

### matches table
```sql
-- Enable RLS
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Allow public read" ON matches
  FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Allow service full access" ON matches
  FOR ALL USING (auth.role() = 'service_role');
```

### sync_status table
```sql
-- Enable RLS
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Read-only access for monitoring
CREATE POLICY "Allow read sync status" ON sync_status
  FOR SELECT USING (true);

-- Service role full access
CREATE POLICY "Allow service full access" ON sync_status
  FOR ALL USING (auth.role() = 'service_role');
```

## Real-Time Configuration

Enable real-time subscriptions for live data updates:

```sql
-- Enable real-time for tournaments
ALTER PUBLICATION supabase_realtime ADD TABLE tournaments;

-- Enable real-time for matches
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
```

## Data Retention Strategy

### tournaments
- Keep all tournament records indefinitely for historical analysis
- Archive tournaments older than 2 years to separate table

### matches
- Keep match records for duration of tournament + 6 months
- Archive completed matches to reduce active table size

### Cleanup Function
```sql
CREATE OR REPLACE FUNCTION cleanup_old_matches()
RETURNS void AS $$
BEGIN
  -- Archive matches from tournaments that ended more than 6 months ago
  DELETE FROM matches 
  WHERE tournament_no IN (
    SELECT no FROM tournaments 
    WHERE end_date < NOW() - INTERVAL '6 months'
  );
  
  -- Archive very old tournaments (2+ years)
  DELETE FROM tournaments 
  WHERE end_date < NOW() - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup to run monthly
SELECT cron.schedule('cleanup-old-data', '0 0 1 * *', 'SELECT cleanup_old_matches();');
```

## Cache Invalidation Strategy

### TTL Guidelines
- **tournaments**: 24 hours (master data changes infrequently)
- **matches_schedule**: 15 minutes (schedules may change)
- **matches_live**: 30 seconds (live scores need frequent updates)

### Invalidation Triggers
```sql
-- Function to update last_synced timestamp
CREATE OR REPLACE FUNCTION update_last_synced()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_synced = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_tournaments_timestamp
  BEFORE UPDATE ON tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_last_synced();

CREATE TRIGGER update_matches_timestamp
  BEFORE UPDATE ON matches
  FOR EACH ROW
  EXECUTE FUNCTION update_last_synced();
```

## Performance Optimization

### Index Strategy
- Primary keys: UUID with B-tree indexes
- Foreign keys: Tournament references with cascade deletes
- Query optimization: Composite indexes for common filter combinations
- Time-based queries: Separate indexes on date/time fields

### Query Patterns
```sql
-- Common queries that should be optimized
-- 1. Recent tournaments
SELECT * FROM tournaments 
WHERE start_date >= NOW() - INTERVAL '1 month'
ORDER BY start_date ASC;

-- 2. Tournament matches
SELECT * FROM matches 
WHERE tournament_no = $1 
ORDER BY local_date, local_time;

-- 3. Live matches
SELECT * FROM matches 
WHERE status = 'Running' 
AND local_date = CURRENT_DATE;

-- 4. Sync status check
SELECT * FROM sync_status 
WHERE next_sync <= NOW() 
AND is_active = true;
```

## Migration Scripts

### Initial Setup
```sql
-- Run in order:
-- 1. Create tables
-- 2. Create indexes  
-- 3. Enable RLS and create policies
-- 4. Enable real-time
-- 5. Insert initial sync_status records
-- 6. Create functions and triggers
```

### Version Updates
Track schema changes with version numbers:
```sql
-- Schema version tracking
CREATE TABLE schema_versions (
  version VARCHAR PRIMARY KEY,
  applied_at TIMESTAMP DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_versions (version, description) VALUES
('1.0.0', 'Initial schema with tournaments, matches, and sync_status tables');
```