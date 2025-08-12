# Technical Implementation Details

## Database Schema Design
```sql
-- Tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no VARCHAR NOT NULL UNIQUE,
  code VARCHAR,
  name VARCHAR,
  start_date DATE,
  end_date DATE,
  status VARCHAR,
  last_synced TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Matches table  
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no VARCHAR NOT NULL,
  tournament_no VARCHAR NOT NULL,
  team_a_name VARCHAR,
  team_b_name VARCHAR,
  local_date DATE,
  local_time TIME,
  status VARCHAR,
  points_a INTEGER,
  points_b INTEGER,
  last_synced TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tournament_no) REFERENCES tournaments(no)
);

-- Sync status tracking
CREATE TABLE sync_status (
  entity_type VARCHAR PRIMARY KEY,
  last_sync TIMESTAMP,
  sync_frequency INTERVAL,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Service Integration Pattern
```typescript
// Enhanced VisApiService method example
static async getTournamentListWithDetails(filterOptions?: FilterOptions): Promise<Tournament[]> {
  try {
    // Tier 1: Check memory cache
    const memoryCache = CacheService.getFromMemory('tournaments');
    if (memoryCache && !CacheService.isExpired(memoryCache)) {
      return memoryCache.data;
    }

    // Tier 2: Check Supabase cache
    const cachedData = await CacheService.getFromSupabase('tournaments');
    if (cachedData && CacheService.isFresh(cachedData, '24 hours')) {
      CacheService.setInMemory('tournaments', cachedData);
      return cachedData;
    }

    // Tier 3: Fallback to direct API
    const apiData = await this.fetchDirectFromAPI();
    
    // Update cache tiers
    await CacheService.updateSupabaseCache('tournaments', apiData);
    CacheService.setInMemory('tournaments', apiData);
    
    return apiData;
  } catch (error) {
    // Tier 4: Offline fallback
    return await CacheService.getOfflineData('tournaments');
  }
}
```
