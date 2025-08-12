# API Specifications: Caching Layer Integration

## Overview
This document defines the API specifications for integrating the Supabase caching layer with the existing FIVB VIS API calls, maintaining backward compatibility while adding caching capabilities.

## Enhanced VisApiService Methods

### getTournamentListWithDetails()
Enhanced to use multi-tier caching with intelligent fallback.

**Current Signature**:
```typescript
static async getTournamentListWithDetails(filterOptions?: {
  recentOnly?: boolean;
  year?: number;
  currentlyActive?: boolean;
  tournamentType?: TournamentType;
}): Promise<Tournament[]>
```

**Enhanced Behavior Flow**:
```typescript
1. Check Tier 1 (Memory Cache)
   → If fresh data exists (< 5 minutes), return immediately
   
2. Check Tier 2 (Supabase Cache) 
   → Query tournaments table where last_synced > NOW() - INTERVAL '24 hours'
   → If data exists and fresh, cache in memory and return
   
3. Check Tier 3 (Local Storage)
   → AsyncStorage fallback for offline scenarios
   → Return with freshness indicator
   
4. Fallback to Tier 4 (Direct API)
   → Original FIVB API call as ultimate fallback
   → Update all cache tiers with fresh data
```

**Implementation Example**:
```typescript
static async getTournamentListWithDetails(filterOptions?: FilterOptions): Promise<Tournament[]> {
  const cacheKey = `tournaments_${JSON.stringify(filterOptions || {})}`;
  
  try {
    // Tier 1: Memory Cache
    const memoryData = CacheService.getFromMemory(cacheKey);
    if (memoryData && CacheService.isFresh(memoryData, 5 * 60 * 1000)) {
      return memoryData.tournaments;
    }

    // Tier 2: Supabase Cache
    const cachedData = await CacheService.getTournamentsFromSupabase(filterOptions);
    if (cachedData.length > 0 && CacheService.isSupabaseFresh(cachedData, '24 hours')) {
      CacheService.setInMemory(cacheKey, { tournaments: cachedData, timestamp: Date.now() });
      return cachedData;
    }

    // Tier 4: Direct API (Tier 3 handled in catch block)
    const apiData = await this.fetchTournamentsDirectly(filterOptions);
    
    // Update all cache tiers
    await CacheService.updateSupabaseCache(apiData);
    CacheService.setInMemory(cacheKey, { tournaments: apiData, timestamp: Date.now() });
    await CacheService.setLocalStorage(cacheKey, apiData);
    
    return apiData;
    
  } catch (error) {
    // Tier 3: Local Storage Fallback
    const localData = await CacheService.getFromLocalStorage(cacheKey);
    if (localData) {
      console.warn('Using offline cached data:', error);
      return localData.tournaments;
    }
    
    throw new Error(`Failed to fetch tournaments: ${error.message}`);
  }
}
```

### getBeachMatchList()
Enhanced with real-time subscription capability and match-specific caching.

**Current Signature**:
```typescript
static async getBeachMatchList(tournamentNo: string): Promise<BeachMatch[]>
```

**Enhanced Behavior Flow**:
```typescript
1. Check for active real-time subscription
   → If subscribed to tournament matches, return latest cached data
   
2. Check Supabase cache with dynamic TTL
   → Live matches: 30-second TTL
   → Scheduled matches: 15-minute TTL
   → Finished matches: 24-hour TTL
   
3. Direct API fallback with cache update
   → Update cache and establish real-time subscription if matches are live
```

**Implementation Example**:
```typescript
static async getBeachMatchList(tournamentNo: string): Promise<BeachMatch[]> {
  const cacheKey = `matches_${tournamentNo}`;
  
  try {
    // Check if we have an active real-time subscription
    if (RealtimeService.hasActiveSubscription(tournamentNo)) {
      const realtimeData = RealtimeService.getLatestData(tournamentNo);
      if (realtimeData) {
        return realtimeData;
      }
    }

    // Check Supabase cache with dynamic TTL
    const cachedMatches = await CacheService.getMatchesFromSupabase(tournamentNo);
    if (cachedMatches.length > 0) {
      const ttl = this.calculateMatchesTTL(cachedMatches);
      if (CacheService.isSupabaseFresh(cachedMatches, ttl)) {
        // Start real-time subscription for live matches
        const liveMatches = cachedMatches.filter(m => m.status === 'Running');
        if (liveMatches.length > 0) {
          RealtimeService.subscribeToMatches(tournamentNo);
        }
        return cachedMatches;
      }
    }

    // Direct API fallback
    const apiMatches = await this.fetchMatchesDirectly(tournamentNo);
    
    // Update cache and start subscriptions
    await CacheService.updateMatchesCache(tournamentNo, apiMatches);
    const liveMatches = apiMatches.filter(m => m.status === 'Running');
    if (liveMatches.length > 0) {
      RealtimeService.subscribeToMatches(tournamentNo);
    }
    
    return apiMatches;
    
  } catch (error) {
    // Local storage fallback
    const localMatches = await CacheService.getMatchesFromLocal(tournamentNo);
    if (localMatches) {
      return localMatches;
    }
    
    throw new Error(`Failed to fetch matches for tournament ${tournamentNo}: ${error.message}`);
  }
}

private static calculateMatchesTTL(matches: BeachMatch[]): string {
  const hasLiveMatches = matches.some(m => m.status === 'Running');
  const hasScheduledMatches = matches.some(m => m.status === 'Scheduled');
  
  if (hasLiveMatches) return '30 seconds';
  if (hasScheduledMatches) return '15 minutes';
  return '24 hours'; // Finished matches
}
```

## New CacheService Methods

### Core Caching Operations

```typescript
export class CacheService {
  // Memory cache operations
  static getFromMemory(key: string): CachedData | null
  static setInMemory(key: string, data: any, ttl?: number): void
  static clearMemoryCache(key?: string): void
  
  // Supabase cache operations  
  static async getTournamentsFromSupabase(filters?: FilterOptions): Promise<Tournament[]>
  static async getMatchesFromSupabase(tournamentNo: string): Promise<BeachMatch[]>
  static async updateSupabaseCache(data: Tournament[] | BeachMatch[]): Promise<void>
  static isSupabaseFresh(data: CachedData, ttl: string): boolean
  
  // Local storage operations
  static async getFromLocalStorage(key: string): Promise<CachedData | null>
  static async setLocalStorage(key: string, data: any): Promise<void>
  static async clearLocalStorage(key?: string): Promise<void>
  
  // Utility methods
  static isFresh(data: CachedData, maxAge: number): boolean
  static generateCacheKey(type: string, filters?: any): string
  static getCacheStats(): CacheStats
}
```

### Real-Time Subscription Service

```typescript
export class RealtimeService {
  // Subscription management
  static subscribeToMatches(tournamentNo: string): Subscription
  static subscribeToTournaments(): Subscription
  static unsubscribe(tournamentNo?: string): void
  static hasActiveSubscription(tournamentNo: string): boolean
  
  // Data retrieval
  static getLatestData(tournamentNo: string): BeachMatch[] | null
  static onMatchUpdate(tournamentNo: string, callback: (matches: BeachMatch[]) => void): void
  static onTournamentUpdate(callback: (tournaments: Tournament[]) => void): void
  
  // Connection management
  static getConnectionStatus(): 'connected' | 'disconnected' | 'reconnecting'
  static reconnect(): Promise<void>
  static disconnect(): void
}
```

## Supabase Edge Functions

### tournament-sync
Daily synchronization of tournament master data.

**Endpoint**: `/functions/v1/tournament-sync`
**Schedule**: Daily at 00:00 UTC
**Authentication**: Service role key

**Function Logic**:
```typescript
// supabase/functions/tournament-sync/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Fetch active tournaments from FIVB API
    const tournaments = await fetchActiveTournaments()
    
    // Upsert tournaments in batch
    const { data, error } = await supabase
      .from('tournaments')
      .upsert(tournaments, { 
        onConflict: 'no',
        ignoreDuplicates: false
      })

    if (error) throw error

    // Update sync status
    await updateSyncStatus('tournaments', tournaments.length, null)

    return new Response(
      JSON.stringify({ 
        success: true, 
        synced: tournaments.length,
        timestamp: new Date().toISOString()
      }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    await updateSyncStatus('tournaments', 0, error.message)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

### match-schedule-sync
15-minute synchronization of match schedules.

**Endpoint**: `/functions/v1/match-schedule-sync`
**Schedule**: Every 15 minutes (:00, :15, :30, :45)
**Authentication**: Service role key

**Function Logic**:
```typescript
serve(async (req) => {
  try {
    // Get active tournaments
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('no')
      .eq('status', 'Running')

    let totalMatches = 0
    
    for (const tournament of tournaments || []) {
      const matches = await fetchTournamentMatches(tournament.no)
      
      await supabase
        .from('matches')
        .upsert(matches, { onConflict: 'no' })
        
      totalMatches += matches.length
    }

    await updateSyncStatus('matches_schedule', totalMatches, null)
    
    return new Response(JSON.stringify({ 
      success: true, 
      tournaments: tournaments?.length || 0,
      matches: totalMatches 
    }))
  } catch (error) {
    await updateSyncStatus('matches_schedule', 0, error.message)
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 })
  }
})
```

### live-score-sync
30-second synchronization of live match scores.

**Endpoint**: `/functions/v1/live-score-sync`
**Schedule**: Every 30 seconds during tournament hours
**Authentication**: Service role key

**Conditional Execution**: Only runs during active tournament periods.

## Client-Side Integration

### Environment Configuration
```typescript
// supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### TypeScript Interfaces
```typescript
// types/cache.ts
export interface CachedData {
  data: any
  timestamp: number
  ttl: number
}

export interface CacheStats {
  memoryHits: number
  supabaseHits: number
  localHits: number
  apiCalls: number
  totalRequests: number
  hitRatio: number
}

export interface SyncStatus {
  entity_type: string
  last_sync: string
  next_sync: string
  success_count: number
  error_count: number
  last_error?: string
  is_active: boolean
}
```

## Error Handling Specifications

### Cache Miss Scenarios
1. **Memory cache miss**: Continue to Supabase
2. **Supabase unavailable**: Continue to local storage
3. **Local storage miss**: Fallback to direct API
4. **Direct API failure**: Return cached data with staleness warning

### Network Offline Scenarios
1. **Complete offline**: Use local storage exclusively
2. **Intermittent connectivity**: Implement exponential backoff
3. **Supabase-only offline**: Fallback to direct API

### Data Consistency
1. **Version conflicts**: Use timestamp-based resolution
2. **Partial sync failures**: Continue with available data
3. **Schema mismatches**: Log warnings and attempt data migration

## Performance Monitoring

### Metrics Collection
```typescript
export interface PerformanceMetrics {
  cacheHitRatio: number
  averageResponseTime: number
  apiCallReduction: number
  errorRate: number
  syncJobSuccessRate: number
}
```

### Monitoring Integration
- Real-time performance dashboards
- Automated alerting for cache miss rates > 30%
- API call volume tracking
- Error rate monitoring with thresholds