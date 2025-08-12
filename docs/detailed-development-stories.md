# Detailed Development Stories: Multi-Tier Caching Implementation

## Story Breakdown Structure
Each Epic is broken down into granular development stories that can be implemented independently, with clear acceptance criteria and definition of done.

---

# Epic 1: Foundation Infrastructure (Weeks 1-2)

## Story 1.1.1: Create Supabase Project and Basic Configuration
**Story Points**: 3  
**Priority**: Critical  
**Dependencies**: None  

**Description**: Set up the foundational Supabase project with production-ready configuration.

**Tasks**:
- [ ] Create new Supabase project via dashboard
- [ ] Configure project name and region selection
- [ ] Set up billing and resource limits
- [ ] Generate and securely store API keys
- [ ] Configure project settings for production use

**Acceptance Criteria**:
- [ ] Supabase project accessible via dashboard
- [ ] Service role key and anon key generated
- [ ] Project URL and keys stored in secure environment variables
- [ ] Project region optimized for target user base
- [ ] Resource quotas appropriate for expected usage

**Definition of Done**:
- Project dashboard accessible and responsive
- API keys tested and functional
- Environment variables configured in development environment

---

## Story 1.1.2: Configure Row Level Security and Authentication
**Story Points**: 5  
**Priority**: Critical  
**Dependencies**: Story 1.1.1  

**Description**: Implement comprehensive security configuration including RLS policies and authentication setup.

**Tasks**:
- [ ] Enable Row Level Security on all tables
- [ ] Create service role policies for Edge Functions
- [ ] Configure anonymous access policies for mobile app
- [ ] Set up authentication flow (if required)
- [ ] Test security policies with different user roles
- [ ] Document security configuration for team

**Acceptance Criteria**:
- [ ] RLS enabled on tournaments, matches, and sync_status tables
- [ ] Service role has full CRUD access for sync operations
- [ ] Anonymous users have read-only access to tournament/match data
- [ ] Unauthorized access attempts properly blocked
- [ ] Security policies tested with different scenarios

**Definition of Done**:
- All security tests pass
- Documentation completed for security setup
- Team members can reproduce security configuration

---

## Story 1.2.1: Create Tournaments Table Schema
**Story Points**: 3  
**Priority**: Critical  
**Dependencies**: Story 1.1.2  

**Description**: Implement the tournaments table with optimized schema design for caching FIVB tournament data.

**Tasks**:
- [ ] Create tournaments table with all required fields
- [ ] Add constraints and data types matching FIVB API data
- [ ] Create primary and secondary indexes for performance
- [ ] Add timestamps for caching logic (created_at, updated_at, last_synced)
- [ ] Test table schema with sample data insertion

**SQL Implementation**:
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

CREATE INDEX idx_tournaments_code ON tournaments(code);
CREATE INDEX idx_tournaments_start_date ON tournaments(start_date);
CREATE INDEX idx_tournaments_status ON tournaments(status);
CREATE INDEX idx_tournaments_last_synced ON tournaments(last_synced);
```

**Acceptance Criteria**:
- [ ] Table created with all fields from specification
- [ ] Unique constraint on tournament number enforced
- [ ] All indexes created and performance tested
- [ ] Sample data insertion and querying successful
- [ ] Field data types accommodate FIVB API data ranges

**Definition of Done**:
- Table schema matches database-schema.md specification
- Performance benchmarks established for common queries
- Sample data operations working correctly

---

## Story 1.2.2: Create Matches Table with Tournament Relationships
**Story Points**: 4  
**Priority**: Critical  
**Dependencies**: Story 1.2.1  

**Description**: Implement matches table with foreign key relationships and comprehensive match data fields.

**Tasks**:
- [ ] Create matches table with all BeachMatch fields
- [ ] Establish foreign key relationship to tournaments table
- [ ] Add indexes for query optimization
- [ ] Include score tracking fields for live updates
- [ ] Add referee and court information fields
- [ ] Test relationship constraints and cascade behavior

**SQL Implementation**:
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
  match_points_a INTEGER,
  match_points_b INTEGER,
  points_team_a_set1 INTEGER,
  points_team_b_set1 INTEGER,
  points_team_a_set2 INTEGER,
  points_team_b_set2 INTEGER,
  points_team_a_set3 INTEGER,
  points_team_b_set3 INTEGER,
  duration_set1 VARCHAR,
  duration_set2 VARCHAR,
  duration_set3 VARCHAR,
  no_referee1 VARCHAR,
  no_referee2 VARCHAR,
  referee1_name VARCHAR,
  referee2_name VARCHAR,
  referee1_federation_code VARCHAR,
  referee2_federation_code VARCHAR,
  last_synced TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (tournament_no) REFERENCES tournaments(no) ON DELETE CASCADE
);

CREATE INDEX idx_matches_tournament_no ON matches(tournament_no);
CREATE INDEX idx_matches_local_date ON matches(local_date);
CREATE INDEX idx_matches_status ON matches(status);
CREATE INDEX idx_matches_last_synced ON matches(last_synced);
```

**Acceptance Criteria**:
- [ ] All match fields accommodate FIVB API BeachMatch structure
- [ ] Foreign key relationship enforced with proper cascade behavior
- [ ] Indexes optimized for common query patterns
- [ ] Score fields support live match updates
- [ ] Referee and court information properly stored

**Definition of Done**:
- Match data insertion working with tournament relationships
- Query performance meets requirements for mobile app
- Foreign key constraints tested and working

---

## Story 1.2.3: Create Sync Status Monitoring Table
**Story Points**: 2  
**Priority**: High  
**Dependencies**: None (independent table)  

**Description**: Implement sync_status table for monitoring and tracking background synchronization job health.

**Tasks**:
- [ ] Create sync_status table with monitoring fields
- [ ] Add initial records for each sync job type
- [ ] Create functions for updating sync status
- [ ] Add queries for sync health monitoring
- [ ] Test sync status tracking workflows

**SQL Implementation**:
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

INSERT INTO sync_status (entity_type, sync_frequency, next_sync) VALUES
('tournaments', INTERVAL '1 day', NOW() + INTERVAL '1 day'),
('matches_schedule', INTERVAL '15 minutes', NOW() + INTERVAL '15 minutes'),
('matches_live', INTERVAL '30 seconds', NOW() + INTERVAL '30 seconds');
```

**Acceptance Criteria**:
- [ ] Sync status tracked for all sync job types
- [ ] Success/error counts maintained accurately
- [ ] Next sync time calculated automatically
- [ ] Error details stored for troubleshooting
- [ ] Active/inactive status controls sync execution

**Definition of Done**:
- Sync status queries working for monitoring dashboard
- Status update functions tested and reliable
- Initial sync job records configured correctly

---

## Story 1.3.1: Implement Core CacheService Class Structure
**Story Points**: 5  
**Priority**: Critical  
**Dependencies**: None (can work with mock data initially)  

**Description**: Create the foundational CacheService class with multi-tier architecture and intelligent fallback logic.

**Tasks**:
- [ ] Create CacheService class with TypeScript interfaces
- [ ] Implement memory cache tier with Map-based storage
- [ ] Add TTL validation logic for cache freshness
- [ ] Create fallback chain architecture (Memory → Supabase → Local → API)
- [ ] Add comprehensive error handling and logging
- [ ] Implement cache statistics tracking

**Implementation Structure**:
```typescript
// services/CacheService.ts
interface CachedData<T> {
  data: T;
  timestamp: number;
  ttl: number;
  source: 'memory' | 'supabase' | 'local' | 'api';
}

interface CacheStats {
  memoryHits: number;
  supabaseHits: number;
  localHits: number;
  apiCalls: number;
  totalRequests: number;
  hitRatio: number;
}

export class CacheService {
  private static memoryCache = new Map<string, CachedData<any>>();
  private static stats: CacheStats = {
    memoryHits: 0,
    supabaseHits: 0,
    localHits: 0,
    apiCalls: 0,
    totalRequests: 0,
    hitRatio: 0
  };

  static async getCachedData<T>(
    key: string, 
    fetchFunction: () => Promise<T>, 
    ttl: number
  ): Promise<CachedData<T>> {
    // Implementation of 4-tier fallback logic
  }
  
  static isFresh(data: CachedData<any>, maxAge: number): boolean {
    // TTL validation logic
  }
  
  static updateStats(source: string): void {
    // Statistics tracking
  }
}
```

**Acceptance Criteria**:
- [ ] CacheService class implements all 4 cache tiers
- [ ] Memory cache with configurable TTL and size limits
- [ ] Fallback logic handles failures gracefully at each tier
- [ ] Cache statistics tracked for performance monitoring
- [ ] TypeScript interfaces ensure type safety
- [ ] Comprehensive error logging for debugging

**Definition of Done**:
- Unit tests pass for all cache tier scenarios
- Memory management prevents excessive cache growth
- Error handling tested with simulated failures

---

## Story 1.3.2: Implement AsyncStorage Local Cache Tier
**Story Points**: 3  
**Priority**: High  
**Dependencies**: Story 1.3.1  

**Description**: Integrate AsyncStorage for persistent offline data storage as Tier 2 cache.

**Tasks**:
- [ ] Install and configure @react-native-async-storage/async-storage
- [ ] Implement local storage methods in CacheService
- [ ] Add JSON serialization/deserialization for complex objects
- [ ] Implement storage size management and cleanup
- [ ] Add offline data freshness indicators
- [ ] Test offline scenarios and storage persistence

**Implementation**:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export class CacheService {
  static async setLocalStorage(key: string, data: any): Promise<void> {
    try {
      const cacheData: CachedData<any> = {
        data,
        timestamp: Date.now(),
        ttl: 24 * 60 * 60 * 1000, // 24 hours default
        source: 'local'
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to save to local storage:', error);
    }
  }

  static async getFromLocalStorage(key: string): Promise<CachedData<any> | null> {
    try {
      const stored = await AsyncStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to read from local storage:', error);
    }
    return null;
  }
}
```

**Acceptance Criteria**:
- [ ] AsyncStorage integration working across app restarts
- [ ] Local cache persists through app lifecycle changes
- [ ] Storage size management prevents excessive disk usage
- [ ] Offline data accessible when network unavailable
- [ ] JSON serialization handles all tournament/match data types

**Definition of Done**:
- Offline scenarios tested and working
- Storage cleanup functions prevent unbounded growth
- Local cache integrates seamlessly with fallback chain

---

## Story 1.3.3: Implement Supabase Cache Tier Integration
**Story Points**: 4  
**Priority**: Critical  
**Dependencies**: Stories 1.2.1, 1.2.2, 1.3.1  

**Description**: Integrate Supabase client for Tier 3 cache operations with tournament and match data.

**Tasks**:
- [ ] Install and configure @supabase/supabase-js
- [ ] Create Supabase client with proper authentication
- [ ] Implement tournament cache methods (get, set, update)
- [ ] Implement match cache methods with tournament relationships
- [ ] Add cache freshness validation using last_synced timestamps
- [ ] Test Supabase cache operations with real data

**Implementation**:
```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: false,
    },
  }
);

export class CacheService {
  static async getTournamentsFromSupabase(filters?: FilterOptions): Promise<Tournament[]> {
    try {
      let query = supabase
        .from('tournaments')
        .select('*')
        .order('start_date', { ascending: true });

      if (filters?.tournamentType && filters.tournamentType !== 'ALL') {
        // Apply type-based filtering logic
      }

      const { data, error } = await query;
      if (error) throw error;

      this.updateStats('supabase');
      return data || [];
    } catch (error) {
      console.error('Supabase cache error:', error);
      throw error;
    }
  }
}
```

**Acceptance Criteria**:
- [ ] Supabase client connects successfully with authentication
- [ ] Tournament data retrieval with filtering support
- [ ] Match data retrieval with tournament relationships
- [ ] Cache freshness validation using database timestamps
- [ ] Error handling for network and authentication failures

**Definition of Done**:
- Supabase cache operations tested with database
- Authentication and security working correctly
- Cache integration with existing fallback logic

---

# Epic 2: Background Synchronization (Weeks 3-4)

## Story 2.1.1: Create Tournament Sync Edge Function
**Story Points**: 5  
**Priority**: Critical  
**Dependencies**: All Epic 1 database stories  

**Description**: Implement Supabase Edge Function for daily tournament master data synchronization from FIVB API.

**Tasks**:
- [ ] Create Edge Function project structure in /supabase/functions/
- [ ] Implement FIVB API integration with authentication
- [ ] Add XML parsing for tournament data
- [ ] Implement upsert logic for tournament updates
- [ ] Add comprehensive error handling and logging
- [ ] Configure function deployment and scheduling

**Implementation Structure**:
```typescript
// supabase/functions/tournament-sync/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch tournaments from FIVB API
    const xmlRequest = "<Request Type='GetBeachTournamentList' Fields='No Code Name StartDate EndDate'><Filter Statuses='Running' /></Request>";
    const requestUrl = `https://www.fivb.org/Vis2009/XmlRequest.asmx?Request=${encodeURIComponent(xmlRequest)}`;
    
    const response = await fetch(requestUrl, {
      headers: {
        'X-FIVB-App-ID': Deno.env.get('FIVB_APP_ID') ?? '',
      },
    });

    if (!response.ok) {
      throw new Error(`FIVB API error: ${response.status}`);
    }

    const xmlText = await response.text();
    const tournaments = parseBeachTournamentList(xmlText);

    // Upsert tournaments
    const { error: upsertError } = await supabase
      .from('tournaments')
      .upsert(tournaments, { 
        onConflict: 'no',
        ignoreDuplicates: false 
      });

    if (upsertError) throw upsertError;

    // Update sync status
    await supabase
      .from('sync_status')
      .update({
        last_sync: new Date().toISOString(),
        next_sync: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        success_count: tournaments.length,
        updated_at: new Date().toISOString()
      })
      .eq('entity_type', 'tournaments');

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: tournaments.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error('Tournament sync error:', error);
    
    // Update error status
    await supabase
      .from('sync_status')
      .update({
        error_count: 1,
        last_error: error.message,
        last_error_time: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('entity_type', 'tournaments');

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
```

**Acceptance Criteria**:
- [ ] Edge Function deploys successfully to Supabase
- [ ] Daily cron trigger configured and working
- [ ] FIVB API authentication and data fetching working
- [ ] Tournament data upserted with conflict resolution
- [ ] Sync status updated with success/error information
- [ ] Error handling prevents function crashes

**Definition of Done**:
- Tournament sync runs automatically daily
- Sync status accurately tracked in database
- Error scenarios handled gracefully

---

## Story 2.1.2: Configure Tournament Sync Scheduling
**Story Points**: 2  
**Priority**: High  
**Dependencies**: Story 2.1.1  

**Description**: Set up automated scheduling for tournament sync function with proper cron configuration.

**Tasks**:
- [ ] Configure Supabase cron trigger for daily execution
- [ ] Set optimal scheduling time (00:00 UTC)
- [ ] Add timezone considerations for global tournaments
- [ ] Test scheduled execution and verify timing
- [ ] Set up monitoring for missed executions
- [ ] Document scheduling configuration for team

**Cron Configuration**:
```sql
-- Schedule tournament sync daily at midnight UTC
SELECT cron.schedule(
  'tournament-sync',
  '0 0 * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/tournament-sync',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) as request_id;$$
);
```

**Acceptance Criteria**:
- [ ] Cron job scheduled with correct timing
- [ ] Function executes automatically at specified time
- [ ] Timezone handling appropriate for global tournaments
- [ ] Monitoring detects missed or failed executions
- [ ] Manual trigger capability for emergency syncs

**Definition of Done**:
- Automated scheduling working for 7+ consecutive days
- Manual sync testing successful
- Monitoring alerts configured

---

## Story 2.2.1: Create Match Schedule Sync Edge Function
**Story Points**: 6  
**Priority**: Critical  
**Dependencies**: Stories 2.1.1, 1.2.2  

**Description**: Implement Edge Function for 15-minute match schedule synchronization across all active tournaments.

**Tasks**:
- [ ] Create match-schedule-sync Edge Function
- [ ] Implement logic to fetch matches for all active tournaments
- [ ] Add batch processing for efficient API usage
- [ ] Handle match rescheduling and court changes
- [ ] Implement error recovery for individual tournament failures
- [ ] Add performance optimization for high-volume periods

**Implementation Highlights**:
```typescript
// supabase/functions/match-schedule-sync/index.ts
serve(async (req) => {
  try {
    // Get active tournaments
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('no, code, name')
      .in('status', ['Running', 'Starting Soon']);

    let totalMatches = 0;
    const errors: string[] = [];

    // Process tournaments in parallel (with concurrency limit)
    const concurrencyLimit = 5;
    for (let i = 0; i < tournaments.length; i += concurrencyLimit) {
      const batch = tournaments.slice(i, i + concurrencyLimit);
      
      const promises = batch.map(async (tournament) => {
        try {
          const matches = await fetchTournamentMatches(tournament.no);
          
          if (matches.length > 0) {
            const { error } = await supabase
              .from('matches')
              .upsert(matches, { onConflict: 'no', ignoreDuplicates: false });
              
            if (error) throw error;
            return matches.length;
          }
          return 0;
        } catch (error) {
          errors.push(`Tournament ${tournament.no}: ${error.message}`);
          return 0;
        }
      });

      const results = await Promise.all(promises);
      totalMatches += results.reduce((sum, count) => sum + count, 0);
    }

    // Update sync status
    await updateSyncStatus('matches_schedule', totalMatches, errors);

    return new Response(JSON.stringify({
      success: true,
      tournaments: tournaments.length,
      matches: totalMatches,
      errors: errors.length,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    await updateSyncStatus('matches_schedule', 0, [error.message]);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
});
```

**Acceptance Criteria**:
- [ ] Syncs matches for all active tournaments every 15 minutes
- [ ] Batch processing optimized for API rate limits
- [ ] Individual tournament failures don't stop overall sync
- [ ] Match schedule changes and court updates handled
- [ ] Performance scales with number of active tournaments
- [ ] Error tracking for individual tournament issues

**Definition of Done**:
- Match sync runs reliably every 15 minutes
- Performance tested with high tournament volume
- Error recovery tested with simulated failures

---

## Story 2.2.2: Implement Match Sync Scheduling and Monitoring
**Story Points**: 3  
**Priority**: High  
**Dependencies**: Story 2.2.1  

**Description**: Configure 15-minute scheduling for match sync with comprehensive monitoring and alerting.

**Tasks**:
- [ ] Configure cron trigger for 15-minute intervals
- [ ] Set up monitoring for sync job health
- [ ] Implement alerting for consecutive failures
- [ ] Add performance metrics collection
- [ ] Create dashboard view for sync status
- [ ] Test scheduling accuracy and reliability

**Cron Configuration**:
```sql
-- Schedule match sync every 15 minutes
SELECT cron.schedule(
  'match-schedule-sync',
  '*/15 * * * *',
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/match-schedule-sync',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) as request_id;$$
);
```

**Acceptance Criteria**:
- [ ] Function executes every 15 minutes (:00, :15, :30, :45)
- [ ] Sync health monitored with success/failure tracking
- [ ] Alerts triggered for 3+ consecutive failures
- [ ] Performance metrics tracked (duration, matches processed)
- [ ] Dashboard provides real-time sync status visibility

**Definition of Done**:
- 15-minute scheduling working consistently for 48+ hours
- Monitoring dashboard operational and accurate
- Alert system tested and functional

---

## Story 2.3.1: Implement Sync Status Dashboard Query System
**Story Points**: 3  
**Priority**: Medium  
**Dependencies**: All previous sync stories  

**Description**: Create comprehensive query system for monitoring synchronization job health and performance.

**Tasks**:
- [ ] Create sync status aggregation queries
- [ ] Implement performance metrics calculation
- [ ] Add historical sync data tracking
- [ ] Create health check queries for monitoring systems
- [ ] Build query functions for dashboard integration
- [ ] Test query performance with historical data

**Query Implementation**:
```sql
-- Sync health summary view
CREATE VIEW sync_health_summary AS
SELECT 
  entity_type,
  last_sync,
  next_sync,
  success_count,
  error_count,
  CASE 
    WHEN error_count = 0 THEN 'healthy'
    WHEN error_count < 3 THEN 'warning'
    ELSE 'critical'
  END as health_status,
  ROUND(
    (success_count::decimal / NULLIF(success_count + error_count, 0)) * 100, 
    2
  ) as success_rate,
  is_active,
  updated_at
FROM sync_status;

-- Performance metrics query
CREATE OR REPLACE FUNCTION get_sync_metrics(
  entity_type_param VARCHAR,
  hours_back INTEGER DEFAULT 24
) 
RETURNS TABLE (
  avg_duration INTERVAL,
  total_executions INTEGER,
  success_rate DECIMAL,
  last_error TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    AVG(sync_duration) as avg_duration,
    COUNT(*)::INTEGER as total_executions,
    ROUND(
      (COUNT(CASE WHEN success THEN 1 END)::decimal / COUNT(*)) * 100,
      2
    ) as success_rate,
    MAX(CASE WHEN NOT success THEN error_message END) as last_error
  FROM sync_execution_log 
  WHERE entity_type = entity_type_param 
    AND executed_at >= NOW() - INTERVAL '1 hour' * hours_back;
END;
$$ LANGUAGE plpgsql;
```

**Acceptance Criteria**:
- [ ] Sync health summary available via SQL views
- [ ] Performance metrics calculated accurately
- [ ] Historical data tracking for trend analysis
- [ ] Health check queries optimized for monitoring systems
- [ ] Query performance acceptable for dashboard use

**Definition of Done**:
- All sync monitoring queries working and optimized
- Dashboard integration tested and functional
- Historical data retention strategy implemented

---

# Epic 3: Service Layer Integration (Weeks 5-6)

## Story 3.1.1: Enhance getTournamentListWithDetails with Multi-Tier Caching
**Story Points**: 5  
**Priority**: Critical  
**Dependencies**: All Epic 1 and 2 foundation stories  

**Description**: Integrate 4-tier caching into the existing getTournamentListWithDetails method while maintaining backward compatibility.

**Tasks**:
- [ ] Modify VisApiService.getTournamentListWithDetails to use CacheService
- [ ] Implement cache-first data retrieval pattern
- [ ] Add fallback logic for each cache tier
- [ ] Preserve all existing filtering and sorting functionality
- [ ] Maintain identical method signature and return type
- [ ] Add performance monitoring and cache statistics

**Implementation**:
```typescript
// Enhanced method in services/visApi.ts
static async getTournamentListWithDetails(filterOptions?: {
  recentOnly?: boolean;
  year?: number;
  currentlyActive?: boolean;
  tournamentType?: TournamentType;
}): Promise<Tournament[]> {
  const cacheKey = `tournaments_${JSON.stringify(filterOptions || {})}`;
  
  try {
    // Tier 1: Memory Cache (5-minute TTL)
    const memoryData = CacheService.getFromMemory(cacheKey);
    if (memoryData && CacheService.isFresh(memoryData, 5 * 60 * 1000)) {
      console.log('Cache hit: Memory');
      CacheService.updateStats('memory');
      return memoryData.data;
    }

    // Tier 2: Supabase Cache (24-hour TTL)
    const cachedTournaments = await CacheService.getTournamentsFromSupabase(filterOptions);
    if (cachedTournaments.length > 0 && CacheService.isSupabaseFresh(cachedTournaments, '24 hours')) {
      console.log('Cache hit: Supabase');
      CacheService.updateStats('supabase');
      CacheService.setInMemory(cacheKey, { data: cachedTournaments, timestamp: Date.now() });
      return this.applyClientSideFiltering(cachedTournaments, filterOptions);
    }

    // Tier 4: Direct API (skip Tier 3 for now, will be added in next story)
    console.log('Cache miss: Fetching from API');
    const apiTournaments = await this.fetchTournamentsDirectly(filterOptions);
    
    // Update all cache tiers
    await CacheService.updateSupabaseCache('tournaments', apiTournaments);
    CacheService.setInMemory(cacheKey, { data: apiTournaments, timestamp: Date.now() });
    CacheService.updateStats('api');
    
    return apiTournaments;
    
  } catch (error) {
    console.error('Tournament fetch error:', error);
    throw new Error(`Failed to fetch tournaments: ${error.message}`);
  }
}

// Extract original API logic to separate method for fallback
private static async fetchTournamentsDirectly(filterOptions?: any): Promise<Tournament[]> {
  // Original implementation moved here
  const xmlRequest = "<Request Type='GetBeachTournamentList' Fields='No Code Name StartDate EndDate'><Filter Statuses='Running' /></Request>";
  const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
  
  const response = await fetch(requestUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/xml, text/xml',
      'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const xmlText = await response.text();
  return this.parseBeachTournamentList(xmlText);
}
```

**Acceptance Criteria**:
- [ ] Method signature and return type unchanged
- [ ] All existing filtering options work identically
- [ ] Cache hit ratio exceeds 70% in testing
- [ ] Performance improvement measurable (50%+ for cached data)
- [ ] Error handling maintains same behavior
- [ ] Existing TournamentList component works without changes

**Definition of Done**:
- All existing tests pass without modification
- Performance benchmarks show significant improvement
- Cache statistics tracking functional

---

## Story 3.1.2: Add Local Storage Fallback for Offline Tournament Access
**Story Points**: 3  
**Priority**: High  
**Dependencies**: Story 3.1.1  

**Description**: Complete the 4-tier caching by adding AsyncStorage as Tier 3 for offline tournament access.

**Tasks**:
- [ ] Integrate AsyncStorage as Tier 3 in tournament fetching
- [ ] Add offline data persistence for tournament lists
- [ ] Implement graceful offline mode indicators
- [ ] Add data freshness timestamps for offline data
- [ ] Test offline scenarios with airplane mode
- [ ] Add storage cleanup for old cached data

**Enhanced Implementation**:
```typescript
static async getTournamentListWithDetails(filterOptions?: FilterOptions): Promise<Tournament[]> {
  const cacheKey = `tournaments_${JSON.stringify(filterOptions || {})}`;
  
  try {
    // Tier 1: Memory Cache
    const memoryData = CacheService.getFromMemory(cacheKey);
    if (memoryData && CacheService.isFresh(memoryData, 5 * 60 * 1000)) {
      return memoryData.data;
    }

    // Tier 2: Supabase Cache
    const cachedTournaments = await CacheService.getTournamentsFromSupabase(filterOptions);
    if (cachedTournaments.length > 0 && CacheService.isSupabaseFresh(cachedTournaments, '24 hours')) {
      CacheService.setInMemory(cacheKey, { data: cachedTournaments, timestamp: Date.now() });
      // Update local storage for offline access
      await CacheService.setLocalStorage(cacheKey, cachedTournaments);
      return this.applyClientSideFiltering(cachedTournaments, filterOptions);
    }

    // Tier 4: Direct API
    const apiTournaments = await this.fetchTournamentsDirectly(filterOptions);
    
    // Update all cache tiers including local storage
    await Promise.all([
      CacheService.updateSupabaseCache('tournaments', apiTournaments),
      CacheService.setLocalStorage(cacheKey, apiTournaments)
    ]);
    CacheService.setInMemory(cacheKey, { data: apiTournaments, timestamp: Date.now() });
    
    return apiTournaments;
    
  } catch (error) {
    // Tier 3: Local Storage Fallback
    console.warn('Online sources failed, trying local storage:', error.message);
    const localData = await CacheService.getFromLocalStorage(cacheKey);
    
    if (localData && localData.data) {
      console.log('Using offline cached tournaments');
      CacheService.updateStats('local');
      return localData.data;
    }
    
    throw new Error(`No tournament data available: ${error.message}`);
  }
}
```

**Acceptance Criteria**:
- [ ] Offline tournament browsing works for previously loaded data
- [ ] Local storage persists through app restarts
- [ ] Graceful error messages for offline scenarios
- [ ] Data freshness indicated in offline mode
- [ ] Storage cleanup prevents excessive disk usage
- [ ] Network recovery resumes normal caching

**Definition of Done**:
- Offline mode tested with airplane mode simulation
- Local storage management working correctly
- Network recovery automatic and seamless

---

## Story 3.2.1: Enhance getBeachMatchList with Intelligent Caching
**Story Points**: 6  
**Priority**: Critical  
**Dependencies**: Story 3.1.1  

**Description**: Implement dynamic TTL caching for match data based on match status (live, scheduled, finished).

**Tasks**:
- [ ] Add multi-tier caching to getBeachMatchList method
- [ ] Implement dynamic TTL based on match status
- [ ] Add real-time subscription setup for live matches
- [ ] Preserve all existing match data formatting
- [ ] Maintain tournament relationship functionality
- [ ] Add cache invalidation for match status changes

**Implementation with Dynamic TTL**:
```typescript
static async getBeachMatchList(tournamentNo: string): Promise<BeachMatch[]> {
  const cacheKey = `matches_${tournamentNo}`;
  
  try {
    // Check for active real-time subscription first
    if (RealtimeService.hasActiveSubscription(tournamentNo)) {
      const realtimeData = RealtimeService.getLatestData(tournamentNo);
      if (realtimeData && realtimeData.length > 0) {
        console.log('Using real-time subscription data');
        return realtimeData;
      }
    }

    // Tier 1: Memory Cache with dynamic TTL
    const memoryData = CacheService.getFromMemory(cacheKey);
    if (memoryData) {
      const dynamicTTL = this.calculateMatchCacheTTL(memoryData.data);
      if (CacheService.isFresh(memoryData, dynamicTTL)) {
        CacheService.updateStats('memory');
        return memoryData.data;
      }
    }

    // Tier 2: Supabase Cache
    const cachedMatches = await CacheService.getMatchesFromSupabase(tournamentNo);
    if (cachedMatches.length > 0) {
      const supabaseTTL = this.calculateMatchCacheTTL(cachedMatches);
      if (CacheService.isSupabaseFresh(cachedMatches, supabaseTTL)) {
        console.log('Cache hit: Supabase matches');
        CacheService.setInMemory(cacheKey, { data: cachedMatches, timestamp: Date.now() });
        
        // Start real-time subscription for live matches
        const liveMatches = cachedMatches.filter(m => m.status === 'Running');
        if (liveMatches.length > 0) {
          RealtimeService.subscribeToMatches(tournamentNo);
        }
        
        CacheService.updateStats('supabase');
        return cachedMatches;
      }
    }

    // Tier 4: Direct API
    const apiMatches = await this.fetchMatchesDirectly(tournamentNo);
    
    // Update cache tiers
    await CacheService.updateMatchesCache(tournamentNo, apiMatches);
    CacheService.setInMemory(cacheKey, { data: apiMatches, timestamp: Date.now() });
    
    // Setup real-time subscriptions for live matches
    const liveMatches = apiMatches.filter(m => m.status === 'Running');
    if (liveMatches.length > 0) {
      RealtimeService.subscribeToMatches(tournamentNo);
    }
    
    CacheService.updateStats('api');
    return apiMatches;
    
  } catch (error) {
    // Tier 3: Local Storage Fallback
    const localMatches = await CacheService.getMatchesFromLocal(tournamentNo);
    if (localMatches) {
      console.log('Using offline cached matches');
      CacheService.updateStats('local');
      return localMatches;
    }
    
    throw new Error(`Failed to fetch matches for tournament ${tournamentNo}: ${error.message}`);
  }
}

private static calculateMatchCacheTTL(matches: BeachMatch[]): number {
  const hasLiveMatches = matches.some(m => m.status === 'Running');
  const hasScheduledMatches = matches.some(m => m.status === 'Scheduled');
  
  if (hasLiveMatches) return 30 * 1000; // 30 seconds
  if (hasScheduledMatches) return 15 * 60 * 1000; // 15 minutes
  return 24 * 60 * 60 * 1000; // 24 hours for finished matches
}
```

**Acceptance Criteria**:
- [ ] Dynamic TTL based on match status (30s live, 15min scheduled, 24h finished)
- [ ] Real-time subscriptions auto-established for live matches
- [ ] All existing match display functionality preserved
- [ ] Match status changes invalidate cache appropriately
- [ ] Performance improvement measurable for repeated requests
- [ ] TournamentDetail component works without changes

**Definition of Done**:
- Match caching working with all status types
- Real-time subscriptions established correctly
- Cache invalidation logic tested and working

---

# Epic 4: Real-Time Features (Weeks 7-8)

## Story 4.1.1: Implement Live Score Sync Edge Function
**Story Points**: 6  
**Priority**: Critical  
**Dependencies**: All previous sync infrastructure  

**Description**: Create Edge Function for 30-second live match score synchronization during active tournament periods.

**Tasks**:
- [ ] Create live-score-sync Edge Function
- [ ] Implement conditional execution (only during tournament hours)
- [ ] Add logic to identify truly live matches
- [ ] Optimize API calls to fetch only live match data
- [ ] Handle score updates and match status changes
- [ ] Add performance monitoring for high-frequency execution

**Implementation**:
```typescript
// supabase/functions/live-score-sync/index.ts
serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if we should run (only during tournament hours)
    const shouldRun = await checkIfTournamentHoursActive();
    if (!shouldRun) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Skipped: No active tournament hours',
        timestamp: new Date().toISOString()
      }));
    }

    // Get matches that are currently running
    const { data: liveMatches } = await supabase
      .from('matches')
      .select('no, tournament_no, status, local_date')
      .eq('status', 'Running')
      .eq('local_date', new Date().toISOString().split('T')[0]);

    if (!liveMatches || liveMatches.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No live matches found',
        timestamp: new Date().toISOString()
      }));
    }

    // Group matches by tournament for efficient API calls
    const matchesByTournament = liveMatches.reduce((acc, match) => {
      if (!acc[match.tournament_no]) {
        acc[match.tournament_no] = [];
      }
      acc[match.tournament_no].push(match);
      return acc;
    }, {} as Record<string, any[]>);

    let totalUpdated = 0;
    const errors: string[] = [];

    // Process tournaments with live matches
    for (const [tournamentNo, matches] of Object.entries(matchesByTournament)) {
      try {
        // Fetch latest match data for this tournament
        const updatedMatches = await fetchLiveMatchData(tournamentNo);
        
        // Update only the matches that have changed
        const matchesToUpdate = updatedMatches.filter(updated => {
          const existing = matches.find(m => m.no === updated.no);
          return existing && hasMatchDataChanged(existing, updated);
        });

        if (matchesToUpdate.length > 0) {
          const { error } = await supabase
            .from('matches')
            .upsert(matchesToUpdate, { onConflict: 'no', ignoreDuplicates: false });

          if (error) throw error;
          totalUpdated += matchesToUpdate.length;
          
          console.log(`Updated ${matchesToUpdate.length} matches for tournament ${tournamentNo}`);
        }
      } catch (error) {
        errors.push(`Tournament ${tournamentNo}: ${error.message}`);
        console.error(`Live sync error for tournament ${tournamentNo}:`, error);
      }
    }

    // Update sync status
    await supabase
      .from('sync_status')
      .update({
        last_sync: new Date().toISOString(),
        next_sync: new Date(Date.now() + 30 * 1000).toISOString(), // Next sync in 30 seconds
        success_count: totalUpdated,
        error_count: errors.length,
        last_error: errors.length > 0 ? errors.join('; ') : null,
        updated_at: new Date().toISOString()
      })
      .eq('entity_type', 'matches_live');

    return new Response(JSON.stringify({
      success: true,
      liveMatches: liveMatches.length,
      updated: totalUpdated,
      errors: errors.length,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('Live score sync error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500 }
    );
  }
});

async function checkIfTournamentHoursActive(): Promise<boolean> {
  const now = new Date();
  const currentUTCHour = now.getUTCHours();
  
  // Active tournament hours: 08:00 - 22:00 UTC (covers most global tournament times)
  return currentUTCHour >= 8 && currentUTCHour <= 22;
}

function hasMatchDataChanged(existing: any, updated: any): boolean {
  return (
    existing.match_points_a !== updated.match_points_a ||
    existing.match_points_b !== updated.match_points_b ||
    existing.points_team_a_set1 !== updated.points_team_a_set1 ||
    existing.points_team_b_set1 !== updated.points_team_b_set1 ||
    existing.points_team_a_set2 !== updated.points_team_a_set2 ||
    existing.points_team_b_set2 !== updated.points_team_b_set2 ||
    existing.status !== updated.status
  );
}
```

**Acceptance Criteria**:
- [ ] Function executes every 30 seconds during tournament hours (08:00-22:00 UTC)
- [ ] Only processes matches with status 'Running'
- [ ] Efficiently batches API calls by tournament
- [ ] Updates only matches with actual score changes
- [ ] Handles errors for individual matches without stopping overall sync
- [ ] Pauses execution during non-tournament hours to conserve resources

**Definition of Done**:
- Live score sync working for multiple concurrent matches
- Performance optimized for high-frequency execution
- Error handling tested with various failure scenarios

---

## Story 4.1.2: Configure Live Score Sync Scheduling
**Story Points**: 2  
**Priority**: Critical  
**Dependencies**: Story 4.1.1  

**Description**: Set up 30-second scheduling for live score sync with intelligent activation during tournament hours.

**Tasks**:
- [ ] Configure cron trigger for 30-second intervals
- [ ] Implement conditional execution logic
- [ ] Add monitoring for sync frequency and performance
- [ ] Test scheduling accuracy under load
- [ ] Set up resource usage monitoring
- [ ] Document scheduling behavior for team

**Cron Configuration**:
```sql
-- Schedule live score sync every 30 seconds (during tournament hours only)
SELECT cron.schedule(
  'live-score-sync',
  '*/30 * * * * *',  -- Every 30 seconds
  $$SELECT net.http_post(
    url := 'https://your-project.supabase.co/functions/v1/live-score-sync',
    headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '"}'::jsonb
  ) as request_id;$$
);
```

**Acceptance Criteria**:
- [ ] Function scheduled to run every 30 seconds
- [ ] Conditional execution prevents unnecessary runs outside tournament hours
- [ ] Scheduling accuracy maintained under high database load
- [ ] Resource usage monitored and within acceptable limits
- [ ] Manual override capability for special events

**Definition of Done**:
- 30-second scheduling working consistently for extended periods
- Conditional execution logic tested and reliable
- Resource usage within acceptable bounds

---

## Story 4.2.1: Implement WebSocket Real-Time Subscriptions
**Story Points**: 5  
**Priority**: Critical  
**Dependencies**: Story 4.1.1, Supabase real-time configuration  

**Description**: Create RealtimeService for managing WebSocket subscriptions to live match data changes.

**Tasks**:
- [ ] Create RealtimeService class for subscription management
- [ ] Implement WebSocket connection handling
- [ ] Add automatic reconnection logic
- [ ] Create subscription methods for match data
- [ ] Add connection state tracking
- [ ] Test subscription reliability across network changes

**Implementation**:
```typescript
// services/RealtimeService.ts
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { BeachMatch } from '../types/match';

interface SubscriptionInfo {
  channel: RealtimeChannel;
  tournamentNo: string;
  callback: (matches: BeachMatch[]) => void;
  isActive: boolean;
}

export class RealtimeService {
  private static subscriptions = new Map<string, SubscriptionInfo>();
  private static connectionStatus: 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;

  static async subscribeToMatches(
    tournamentNo: string, 
    callback: (matches: BeachMatch[]) => void
  ): Promise<void> {
    try {
      // Clean up existing subscription for this tournament
      await this.unsubscribe(tournamentNo);

      const channelName = `matches_${tournamentNo}`;
      
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter: `tournament_no=eq.${tournamentNo}`
          },
          (payload: RealtimePostgresChangesPayload<BeachMatch>) => {
            console.log('Match update received:', payload);
            this.handleMatchUpdate(tournamentNo, payload, callback);
          }
        )
        .subscribe(async (status) => {
          console.log(`Subscription status for tournament ${tournamentNo}:`, status);
          
          if (status === 'SUBSCRIBED') {
            this.connectionStatus = 'connected';
            this.reconnectAttempts = 0;
          } else if (status === 'CLOSED' || status === 'TIMED_OUT') {
            this.connectionStatus = 'disconnected';
            // Attempt reconnection
            setTimeout(() => this.attemptReconnection(tournamentNo, callback), 1000);
          }
        });

      this.subscriptions.set(tournamentNo, {
        channel,
        tournamentNo,
        callback,
        isActive: true
      });

      console.log(`Subscribed to live updates for tournament ${tournamentNo}`);
    } catch (error) {
      console.error(`Failed to subscribe to tournament ${tournamentNo}:`, error);
      throw error;
    }
  }

  private static async handleMatchUpdate(
    tournamentNo: string,
    payload: RealtimePostgresChangesPayload<BeachMatch>,
    callback: (matches: BeachMatch[]) => void
  ) {
    try {
      // Fetch all current matches for the tournament to maintain consistency
      const { data: matches, error } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_no', tournamentNo)
        .order('local_date', { ascending: true })
        .order('local_time', { ascending: true });

      if (error) throw error;

      // Call the callback with updated match data
      callback(matches || []);
      
      console.log(`Updated ${matches?.length || 0} matches for tournament ${tournamentNo}`);
    } catch (error) {
      console.error('Error handling match update:', error);
    }
  }

  private static async attemptReconnection(
    tournamentNo: string,
    callback: (matches: BeachMatch[]) => void
  ) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`Max reconnection attempts reached for tournament ${tournamentNo}`);
      return;
    }

    this.connectionStatus = 'reconnecting';
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect to tournament ${tournamentNo} (attempt ${this.reconnectAttempts})`);

    try {
      await this.subscribeToMatches(tournamentNo, callback);
    } catch (error) {
      console.error(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      // Exponential backoff for next attempt
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      setTimeout(() => this.attemptReconnection(tournamentNo, callback), delay);
    }
  }

  static async unsubscribe(tournamentNo?: string): Promise<void> {
    if (tournamentNo) {
      const subscription = this.subscriptions.get(tournamentNo);
      if (subscription) {
        await supabase.removeChannel(subscription.channel);
        this.subscriptions.delete(tournamentNo);
        console.log(`Unsubscribed from tournament ${tournamentNo}`);
      }
    } else {
      // Unsubscribe from all
      for (const [tournoNo, subscription] of this.subscriptions) {
        await supabase.removeChannel(subscription.channel);
      }
      this.subscriptions.clear();
      console.log('Unsubscribed from all tournaments');
    }
  }

  static hasActiveSubscription(tournamentNo: string): boolean {
    const subscription = this.subscriptions.get(tournamentNo);
    return subscription ? subscription.isActive : false;
  }

  static getLatestData(tournamentNo: string): BeachMatch[] | null {
    // This would return cached real-time data if available
    // For now, return null to trigger fresh fetch
    return null;
  }

  static getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting' {
    return this.connectionStatus;
  }

  static async disconnect(): Promise<void> {
    await this.unsubscribe();
    this.connectionStatus = 'disconnected';
  }
}
```

**Acceptance Criteria**:
- [ ] WebSocket subscriptions established for tournaments with live matches
- [ ] Automatic reconnection after network interruptions
- [ ] Connection state tracking and reporting
- [ ] Subscription cleanup when leaving tournament screens
- [ ] Efficient data updates without excessive API calls
- [ ] Battery usage optimization through intelligent connection management

**Definition of Done**:
- Real-time subscriptions working reliably
- Connection handling tested with various network conditions
- Memory and resource usage optimized

---

## Story 4.2.2: Integrate Real-Time Updates with TournamentDetail Component
**Story Points**: 4  
**Priority**: High  
**Dependencies**: Story 4.2.1, Story 3.2.1  

**Description**: Integrate real-time match updates into the TournamentDetail component for automatic UI updates.

**Tasks**:
- [ ] Add optional real-time subscription to TournamentDetail
- [ ] Implement automatic UI updates when match data changes
- [ ] Add visual indicators for live matches
- [ ] Handle subscription lifecycle with component mounting/unmounting
- [ ] Add connection status indicators
- [ ] Test real-time updates across app state changes

**Enhanced Component Implementation**:
```typescript
// components/TournamentDetail.tsx (enhanced version)
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { VisApiService } from '../services/visApi';
import { RealtimeService } from '../services/RealtimeService';
import { BeachMatch } from '../types/match';

interface Props {
  tournamentNo: string;
  onBack: () => void;
}

const TournamentDetail: React.FC<Props> = ({ tournamentNo, onBack }) => {
  const [matches, setMatches] = useState<BeachMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');

  // Fetch initial match data (same as before)
  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const matchData = await VisApiService.getBeachMatchList(tournamentNo);
      setMatches(matchData);
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [tournamentNo]);

  // Handle real-time match updates
  const handleRealtimeUpdate = useCallback((updatedMatches: BeachMatch[]) => {
    console.log('Received real-time match updates:', updatedMatches.length);
    setMatches(updatedMatches);
    setConnectionStatus(RealtimeService.getConnectionStatus());
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchMatches();

    // Set up real-time subscription for live matches
    const setupRealtimeSubscription = async () => {
      try {
        // Check if any matches are live
        const hasLiveMatches = matches.some(match => match.status === 'Running');
        
        if (hasLiveMatches) {
          console.log('Setting up real-time subscription for live matches');
          await RealtimeService.subscribeToMatches(tournamentNo, handleRealtimeUpdate);
          setConnectionStatus(RealtimeService.getConnectionStatus());
        }
      } catch (error) {
        console.error('Failed to setup real-time subscription:', error);
      }
    };

    // Setup subscription after initial data is loaded
    if (!loading && matches.length > 0) {
      setupRealtimeSubscription();
    }

    // Cleanup subscription on unmount
    return () => {
      RealtimeService.unsubscribe(tournamentNo);
    };
  }, [tournamentNo, fetchMatches, handleRealtimeUpdate, loading, matches.length]);

  // Check for live matches for visual indicators
  const liveMatchIds = matches
    .filter(match => match.status === 'Running')
    .map(match => match.No);

  const renderMatch = ({ item }: { item: BeachMatch }) => {
    const isLive = item.status === 'Running';
    
    return (
      <View style={[styles.matchCard, isLive && styles.liveMatchCard]}>
        {isLive && (
          <View style={styles.liveIndicator}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
        
        <View style={styles.matchHeader}>
          <Text style={styles.matchNumber}>Match {item.NoInTournament}</Text>
          <Text style={styles.matchTime}>{item.LocalDate} {item.LocalTime}</Text>
        </View>
        
        <View style={styles.teamsContainer}>
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{item.TeamAName}</Text>
            <Text style={styles.score}>
              {item.MatchPointsA || '0'}
            </Text>
          </View>
          
          <Text style={styles.vs}>vs</Text>
          
          <View style={styles.teamRow}>
            <Text style={styles.teamName}>{item.TeamBName}</Text>
            <Text style={styles.score}>
              {item.MatchPointsB || '0'}
            </Text>
          </View>
        </View>

        {/* Show set scores for live matches */}
        {isLive && (item.PointsTeamASet1 || item.PointsTeamBSet1) && (
          <View style={styles.setScores}>
            <Text style={styles.setScoreText}>
              Set 1: {item.PointsTeamASet1 || '0'} - {item.PointsTeamBSet1 || '0'}
            </Text>
            {(item.PointsTeamASet2 || item.PointsTeamBSet2) && (
              <Text style={styles.setScoreText}>
                Set 2: {item.PointsTeamASet2 || '0'} - {item.PointsTeamBSet2 || '0'}
              </Text>
            )}
            {(item.PointsTeamASet3 || item.PointsTeamBSet3) && (
              <Text style={styles.setScoreText}>
                Set 3: {item.PointsTeamASet3 || '0'} - {item.PointsTeamBSet3 || '0'}
              </Text>
            )}
          </View>
        )}
        
        <View style={styles.matchFooter}>
          <Text style={styles.court}>Court: {item.Court || 'TBD'}</Text>
          <Text style={[styles.status, isLive && styles.liveStatus]}>
            {item.Status || 'Scheduled'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Connection status indicator for live matches */}
      {liveMatchIds.length > 0 && (
        <View style={styles.statusBar}>
          <View style={[styles.connectionIndicator, 
            connectionStatus === 'connected' ? styles.connected : 
            connectionStatus === 'reconnecting' ? styles.reconnecting : styles.disconnected
          ]} />
          <Text style={styles.statusText}>
            {connectionStatus === 'connected' && 'Live updates active'}
            {connectionStatus === 'reconnecting' && 'Reconnecting...'}
            {connectionStatus === 'disconnected' && 'Live updates unavailable'}
          </Text>
        </View>
      )}

      {/* Match list (same as before) */}
      <FlatList
        data={matches}
        renderItem={renderMatch}
        keyExtractor={(item) => item.No}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={fetchMatches}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  connectionIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  connected: {
    backgroundColor: '#4CAF50',
  },
  reconnecting: {
    backgroundColor: '#FF9800',
  },
  disconnected: {
    backgroundColor: '#f44336',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  liveMatchCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    backgroundColor: '#fff',
  },
  liveIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#f44336',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  setScores: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  setScoreText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  liveStatus: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  // ... other existing styles
});

export default TournamentDetail;
```

**Acceptance Criteria**:
- [ ] Real-time updates appear automatically without user action
- [ ] Live matches visually distinct with indicators and styling
- [ ] Connection status displayed when real-time features active
- [ ] Subscription cleanup prevents memory leaks
- [ ] Component works identically when real-time features disabled
- [ ] Performance impact minimal on component rendering

**Definition of Done**:
- Real-time UI updates working smoothly
- Visual indicators provide clear feedback
- Component lifecycle management tested thoroughly

---

This detailed breakdown provides implementable stories for each Epic, with clear acceptance criteria, technical specifications, and definition of done requirements. Each story can be worked on independently while building toward the complete multi-tier caching system.