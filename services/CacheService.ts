import { Tournament } from '../types/tournament';
import { BeachMatch } from '../types/match';
import { CachedData, CacheConfiguration, CacheResult, FilterOptions } from '../types/cache';
import { MemoryCacheManager } from './MemoryCacheManager';
import { LocalStorageManager } from './LocalStorageManager';
import { CacheStatsService } from './CacheStatsService';
import { supabase } from './supabase';
import { NetworkMonitor } from './NetworkMonitor';
import { visApiServiceFactory } from './VisApiServiceFactory';
import { IVisApiService } from './interfaces/IVisApiService';

/**
 * Multi-tier cache service with intelligent fallback logic
 * Implements Memory → Local Storage → Supabase → API fallback strategy
 */
export class CacheService {
  private static memoryCache: MemoryCacheManager;
  private static localStorage: LocalStorageManager;
  private static stats: CacheStatsService;
  private static config: CacheConfiguration;
  private static networkMonitor: NetworkMonitor;
  private static initialized = false;

  /**
   * Initialize cache service with configuration
   */
  static initialize(config?: Partial<CacheConfiguration>): void {
    if (this.initialized) return;

    this.config = {
      memoryMaxSize: 50, // MB
      memoryMaxEntries: 1000,
      localStorageMaxAge: 7, // days
      defaultTTL: {
        tournaments: 24 * 60 * 60 * 1000, // 24 hours
        matchesScheduled: 15 * 60 * 1000, // 15 minutes
        matchesLive: 30 * 1000, // 30 seconds
        matchesFinished: 24 * 60 * 60 * 1000 // 24 hours
      },
      ...config
    };

    this.memoryCache = new MemoryCacheManager(
      this.config.memoryMaxSize,
      this.config.memoryMaxEntries
    );
    this.localStorage = new LocalStorageManager(this.config.localStorageMaxAge);
    this.stats = CacheStatsService.getInstance();
    this.networkMonitor = NetworkMonitor.getInstance();

    this.initialized = true;
  }

  /**
   * Get tournaments with multi-tier fallback
   */
  static async getTournaments(filters?: FilterOptions): Promise<CacheResult<Tournament[]>> {
    this.ensureInitialized();
    const requestId = this.generateRequestId();
    
    // Create cache key that includes year for different API calls
    const baseCacheKey = filters?.year ? `tournaments_${filters.year}` : 'tournaments_recent';
    
    console.log(`🏐 CacheService: Using cache key: ${baseCacheKey}`);

    this.stats.startTimer(requestId);

    try {
      // Tier 1: Memory Cache
      const memoryResult = this.getFromMemory(baseCacheKey);
      if (memoryResult) {
        this.stats.recordHit('memory', requestId);
        
        // Apply client-side filtering for memory cache
        const filteredMemoryResult = this.applyTournamentFilters(memoryResult, filters);
        
        return {
          data: filteredMemoryResult,
          source: 'memory',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Tier 2: Local Storage
      const localResult = await this.getFromLocalStorage(baseCacheKey);
      if (localResult) {
        // Apply client-side filtering for local storage cache
        const filteredLocalResult = this.applyTournamentFilters(localResult, filters);
        
        // Update memory cache with filtered result
        this.setInMemory(baseCacheKey, filteredLocalResult, this.config.defaultTTL.tournaments);
        this.stats.recordHit('localStorage', requestId);
        return {
          data: filteredLocalResult,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Tier 2.5: Offline Storage (when network is unavailable)
      if (!this.networkMonitor.isConnected) {
        console.log('Network unavailable, checking offline storage for tournaments');
        const offlineResult = await this.getFromOfflineStorage(baseCacheKey);
        if (offlineResult) {
          this.stats.recordHit('offline', requestId);
          return {
            data: offlineResult,
            source: 'offline',
            fromCache: true,
            timestamp: Date.now()
          };
        }
        
        // If no offline data and network unavailable, throw specific error
        throw new Error('No cached data available offline');
      }

      // Tier 3: Supabase Cache (only when network available)
      const supabaseResult = await this.getTournamentsFromSupabase(filters);
      if (supabaseResult && supabaseResult.length > 0) {
        // Update higher tier caches and offline storage
        await this.setLocalStorage(baseCacheKey, supabaseResult, this.config.defaultTTL.tournaments);
        await this.setOfflineStorage(baseCacheKey, supabaseResult);
        this.setInMemory(baseCacheKey, supabaseResult, this.config.defaultTTL.tournaments);
        this.stats.recordHit('supabase', requestId);
        return {
          data: supabaseResult,
          source: 'supabase',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Tier 4: Direct API Fallback (only when network available)
      const apiResult = await this.getTournamentsFromAPI(filters);
      
      // Apply deduplication to fresh API data before caching
      console.log(`🏐 CacheService: API returned ${apiResult.length} tournaments, applying merging...`);
      const mergedApiResult = this.deduplicateTournaments(apiResult);
      console.log(`🏐 CacheService: After merging: ${mergedApiResult.length} tournaments`);
      
      // Log first few merged tournaments for debugging
      mergedApiResult.slice(0, 3).forEach(t => {
        const merged = (t as any)._mergedTournaments || [];
        console.log(`🏐 SAMPLE: "${t.Name}" has ${merged.length} merged tournaments`);
      });
      
      // Update all cache tiers including offline storage with merged data
      await this.updateSupabaseCache(mergedApiResult);
      await this.setLocalStorage(baseCacheKey, mergedApiResult, this.config.defaultTTL.tournaments);
      await this.setOfflineStorage(baseCacheKey, mergedApiResult);
      this.setInMemory(baseCacheKey, mergedApiResult, this.config.defaultTTL.tournaments);
      
      this.stats.recordHit('api', requestId);
      return {
        data: mergedApiResult,
        source: 'api',
        fromCache: false,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('CacheService.getTournaments error:', error);
      
      // Final fallback: try offline storage first, then stale data
      const offlineData = await this.getFromOfflineStorage(baseCacheKey);
      if (offlineData) {
        return {
          data: offlineData,
          source: 'offline',
          fromCache: true,
          timestamp: Date.now()
        };
      }
      
      const staleData = await this.getStaleData(baseCacheKey);
      if (staleData) {
        return {
          data: staleData,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      throw error;
    }
  }

  /**
   * Get matches with dynamic TTL based on match status
   */
  static async getMatches(tournamentNo: string): Promise<CacheResult<BeachMatch[]>> {
    this.ensureInitialized();
    const requestId = this.generateRequestId();
    const cacheKey = this.generateCacheKey('matches', { tournamentNo });

    this.stats.startTimer(requestId);

    try {
      // Tier 1: Memory Cache with performance monitoring
      const memoryStartTime = performance.now();
      const memoryResult = this.getFromMemory(cacheKey);
      if (memoryResult) {
        const memoryDuration = performance.now() - memoryStartTime;
        console.log(`Memory cache hit for matches in ${memoryDuration.toFixed(2)}ms`);
        this.stats.recordHit('memory', requestId);
        return {
          data: memoryResult,
          source: 'memory',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Tier 2: Local Storage with performance monitoring
      const localStartTime = performance.now();
      const localResult = await this.getFromLocalStorage(cacheKey);
      if (localResult) {
        const localDuration = performance.now() - localStartTime;
        console.log(`Local storage cache hit for matches in ${localDuration.toFixed(2)}ms`);
        const ttl = this.calculateMatchesTTL(localResult);
        this.setInMemory(cacheKey, localResult, ttl);
        this.stats.recordHit('localStorage', requestId);
        return {
          data: localResult,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Tier 2.5: Offline Storage (when network is unavailable)
      if (!this.networkMonitor.isConnected) {
        console.log('Network unavailable, checking offline storage for matches');
        const offlineResult = await this.getFromOfflineStorage(cacheKey);
        if (offlineResult) {
          this.stats.recordHit('offline', requestId);
          return {
            data: offlineResult,
            source: 'offline',
            fromCache: true,
            timestamp: Date.now()
          };
        }
        
        // If no offline data and network unavailable, throw specific error
        throw new Error('No cached match data available offline');
      }

      // Tier 3: Supabase Cache with enhanced error handling and performance monitoring (only when network available)
      try {
        const supabaseStartTime = performance.now();
        const supabaseResult = await this.getMatchesFromSupabase(tournamentNo);
        if (supabaseResult && supabaseResult.length > 0) {
          const supabaseDuration = performance.now() - supabaseStartTime;
          console.log(`Supabase cache hit for matches in ${supabaseDuration.toFixed(2)}ms`);
          const ttl = this.calculateMatchesTTL(supabaseResult);
          await this.setLocalStorage(cacheKey, supabaseResult, ttl);
          await this.setOfflineStorage(cacheKey, supabaseResult);
          this.setInMemory(cacheKey, supabaseResult, ttl);
          this.stats.recordHit('supabase', requestId);
          return {
            data: supabaseResult,
            source: 'supabase',
            fromCache: true,
            timestamp: Date.now()
          };
        }
      } catch (supabaseError) {
        console.warn('Supabase cache unavailable for matches, falling back to API:', supabaseError);
        // Continue to API fallback - this is expected behavior for graceful degradation
      }

      // Tier 4: Direct API Fallback (only when network available)
      const apiResult = await this.getMatchesFromAPI(tournamentNo);
      const ttl = this.calculateMatchesTTL(apiResult);
      
      // Update all cache tiers including offline storage
      await this.updateMatchesCache(tournamentNo, apiResult);
      await this.setLocalStorage(cacheKey, apiResult, ttl);
      await this.setOfflineStorage(cacheKey, apiResult);
      this.setInMemory(cacheKey, apiResult, ttl);
      
      this.stats.recordHit('api', requestId);
      return {
        data: apiResult,
        source: 'api',
        fromCache: false,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error('CacheService.getMatches error:', error);
      
      // Final fallback: try offline storage first, then stale data
      const offlineData = await this.getFromOfflineStorage(cacheKey);
      if (offlineData) {
        return {
          data: offlineData,
          source: 'offline',
          fromCache: true,
          timestamp: Date.now()
        };
      }
      
      const staleData = await this.getStaleData(cacheKey);
      if (staleData) {
        return {
          data: staleData,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      throw error;
    }
  }

  // Memory cache operations
  static getFromMemory(key: string): any | null {
    const entry = this.memoryCache.get(key);
    return entry ? entry.data : null;
  }

  static setInMemory(key: string, data: any, ttl: number): void {
    this.memoryCache.set(key, data, ttl);
  }

  static clearMemoryCache(key?: string): void {
    if (key) {
      this.memoryCache.delete(key);
    } else {
      this.memoryCache.clear();
    }
  }

  // Local storage operations
  static async getFromLocalStorage(key: string): Promise<any | null> {
    const cachedData = await this.localStorage.get(key);
    return cachedData ? cachedData.data : null;
  }

  static async setLocalStorage(key: string, data: any, ttl: number): Promise<void> {
    await this.localStorage.set(key, data, ttl);
  }

  static async clearLocalStorage(key?: string): Promise<void> {
    if (key) {
      await this.localStorage.delete(key);
    } else {
      await this.localStorage.clear();
    }
  }

  // Offline storage operations
  static async getFromOfflineStorage(key: string): Promise<any | null> {
    return await this.localStorage.getOffline(key);
  }

  static async setOfflineStorage(key: string, data: any): Promise<void> {
    await this.localStorage.setOffline(key, data);
  }

  static async clearOfflineStorage(key?: string): Promise<void> {
    if (key) {
      await this.localStorage.deleteOffline(key);
    } else {
      await this.localStorage.clearOffline();
    }
  }

  static get isNetworkConnected(): boolean {
    this.ensureInitialized();
    return this.networkMonitor.isConnected;
  }

  static async getNetworkStatus(): Promise<{
    isConnected: boolean;
    type: string | null;
    isInternetReachable: boolean | null;
  }> {
    this.ensureInitialized();
    return await this.networkMonitor.getNetworkState();
  }

  // Supabase cache operations
  static async getTournamentsFromSupabase(filters?: FilterOptions): Promise<Tournament[]> {
    try {
      let query = supabase.from('tournaments').select('*');

      // Apply filters matching API behavior
      if (filters?.currentlyActive) {
        query = query.eq('status', 'Running');
      }
      
      if (filters?.year) {
        // Filter by year in start_date
        const yearStart = `${filters.year}-01-01`;
        const yearEnd = `${filters.year}-12-31`;
        query = query.gte('start_date', yearStart).lte('start_date', yearEnd);
      }

      if (filters?.tournamentType && filters.tournamentType !== 'ALL') {
        // Filter by tournament type (FIVB, BPT, CEV, LOCAL)
        query = query.eq('type', filters.tournamentType);
      }

      // For historical data (previous years), use more relaxed freshness requirements
      const currentYear = new Date().getFullYear();
      const isHistoricalQuery = filters?.year && filters.year < currentYear;
      
      if (!isHistoricalQuery) {
        // For current year data, maintain 24-hour freshness requirement
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_synced', twentyFourHoursAgo);
      } else {
        // For historical data, use 30-day freshness to allow cached data
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        query = query.gte('last_synced', thirtyDaysAgo);
        console.log(`🏐 Using relaxed freshness for historical year ${filters.year} (30 days)`);
      }

      // Apply recent-only filter at database level when possible
      if (filters?.recentOnly) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
        
        query = query
          .gte('start_date', oneMonthAgo.toISOString().split('T')[0])
          .lte('start_date', oneMonthFromNow.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase tournaments query error:', error);
        return [];
      }

      return this.mapSupabaseTournaments(data || []);
    } catch (error) {
      console.error('getTournamentsFromSupabase error:', error);
      return [];
    }
  }

  static async getMatchesFromSupabase(tournamentNo: string): Promise<BeachMatch[]> {
    try {
      let query = supabase
        .from('matches')
        .select('*')
        .eq('tournament_no', tournamentNo);

      // Apply intelligent freshness checking based on match types
      // For live matches, data must be very fresh (last 30 seconds)
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
      
      // Get all matches first to analyze their status
      const { data: allMatches, error: allError } = await query;
      if (allError) {
        console.error('Supabase matches query error:', allError);
        return [];
      }

      const mappedMatches = this.mapSupabaseMatches(allMatches || []);
      
      // Check if we have live matches - if so, apply strict freshness
      const hasLiveMatches = mappedMatches.some(m => this.isLiveMatch(m));
      
      if (hasLiveMatches) {
        // For tournaments with live matches, only return data that's very fresh
        const freshQuery = await supabase
          .from('matches')
          .select('*')
          .eq('tournament_no', tournamentNo)
          .gte('last_synced', thirtySecondsAgo);

        const { data: freshData, error: freshError } = freshQuery;
        if (freshError || !freshData || freshData.length === 0) {
          console.log('Live matches detected but data not fresh enough, falling back to API');
          return [];
        }
        
        console.log(`Returning fresh match data for tournament ${tournamentNo} with live matches`);
        return this.mapSupabaseMatches(freshData);
      }

      // For non-live matches, apply standard freshness (15 minutes for scheduled, 24 hours for finished)
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      const hasScheduledMatches = mappedMatches.some(m => this.isScheduledMatch(m));
      const freshnessThreshold = hasScheduledMatches ? fifteenMinutesAgo : twentyFourHoursAgo;
      
      const standardQuery = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_no', tournamentNo)
        .gte('last_synced', freshnessThreshold);

      const { data, error } = standardQuery;
      if (error) {
        console.error('Supabase matches freshness query error:', error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log(`Match data for tournament ${tournamentNo} not fresh enough, will fetch from API`);
        return [];
      }

      console.log(`Returning cached match data for tournament ${tournamentNo} (fresh within threshold)`);
      return this.mapSupabaseMatches(data);
    } catch (error) {
      console.error('getMatchesFromSupabase error:', error);
      return [];
    }
  }

  static async updateSupabaseCache(tournaments: Tournament[]): Promise<void> {
    // This would be handled by background sync jobs in production
    // For now, we'll skip direct Supabase updates from client
    console.log('updateSupabaseCache: Would update', tournaments.length, 'tournaments');
  }

  static async updateMatchesCache(tournamentNo: string, matches: BeachMatch[]): Promise<void> {
    // This would be handled by background sync jobs in production
    console.log('updateMatchesCache: Would update', matches.length, 'matches for tournament', tournamentNo);
  }

  // Utility methods
  static isFresh(data: CachedData, maxAge: number): boolean {
    return Date.now() - data.timestamp < maxAge;
  }

  static generateCacheKey(type: string, filters?: any): string {
    if (!filters) return type;
    const filterString = JSON.stringify(filters);
    // Use btoa for React Native compatibility instead of Buffer
    const base64 = typeof btoa !== 'undefined' 
      ? btoa(filterString) 
      : Buffer.from(filterString).toString('base64');
    return `${type}_${base64.replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  static getCacheStats() {
    return this.stats.getDetailedMetrics();
  }

  // Private helper methods
  private static ensureInitialized(): void {
    if (!this.initialized) {
      this.initialize();
    }
  }

  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private static async getTournamentsFromAPI(filters?: FilterOptions): Promise<Tournament[]> {
    console.log('CacheService: getTournamentsFromAPI called, bypassing cache to call direct API');
    console.log('CacheService: Filters passed to API:', JSON.stringify(filters));
    console.log('CacheService: Starting direct API call...');
    const visApi = await visApiServiceFactory.getInstance();
    // Call the direct API method to avoid circular dependency
    const startTime = Date.now();
    const result = await visApi.fetchDirectFromAPI(filters);
    const duration = Date.now() - startTime;
    console.log(`CacheService: Direct API call completed in ${duration}ms, got ${result.length} tournaments`);
    if (filters?.year) {
      console.log(`CacheService: API result for year ${filters.year}: ${result.length} tournaments`);
    }
    return result;
  }

  private static async getMatchesFromAPI(tournamentNo: string): Promise<BeachMatch[]> {
    const visApi = await visApiServiceFactory.getInstance();
    return await visApi.fetchMatchesDirectFromAPI(tournamentNo);
  }

  private static calculateMatchesTTL(matches: BeachMatch[]): number {
    // Check for live matches first - they require the most frequent updates
    const hasLiveMatches = matches.some(m => this.isLiveMatch(m));
    if (hasLiveMatches) {
      console.log('Live matches detected, using 30-second TTL');
      return this.config.defaultTTL.matchesLive; // 30 seconds
    }

    // Check for scheduled/upcoming matches - moderate update frequency
    const hasScheduledMatches = matches.some(m => this.isScheduledMatch(m));
    if (hasScheduledMatches) {
      console.log('Scheduled matches detected, using 15-minute TTL');
      return this.config.defaultTTL.matchesScheduled; // 15 minutes
    }

    // All matches are finished - stable data, long TTL
    console.log('All matches finished, using 24-hour TTL');
    return this.config.defaultTTL.matchesFinished; // 24 hours
  }

  /**
   * Check if a match is live and requires frequent updates
   */
  private static isLiveMatch(match: BeachMatch): boolean {
    const status = match.Status?.toLowerCase();
    return status === 'live' || 
           status === 'inprogress' || 
           status === 'running';
  }

  /**
   * Check if a match is scheduled/upcoming
   */
  private static isScheduledMatch(match: BeachMatch): boolean {
    const status = match.Status?.toLowerCase();
    return status === 'scheduled' || 
           status === 'upcoming';
  }

  /**
   * Check if a match is finished
   */
  private static isFinishedMatch(match: BeachMatch): boolean {
    const status = match.Status?.toLowerCase();
    return status === 'finished' || 
           status === 'completed';
  }

  private static async getStaleData(key: string): Promise<any | null> {
    try {
      // Try to get data regardless of expiration
      const value = await this.localStorage.get(key);
      return value ? value.data : null;
    } catch {
      return null;
    }
  }

  private static mapSupabaseTournaments(data: any[]): Tournament[] {
    return data.map(item => ({
      No: item.no,
      Code: item.code,
      Name: item.name,
      StartDate: item.start_date,
      EndDate: item.end_date,
      Status: item.status,
      Location: item.location
    }));
  }

  private static mapSupabaseMatches(data: any[]): BeachMatch[] {
    return data.map(item => ({
      No: item.no,
      NoInTournament: item.no_in_tournament,
      TeamAName: item.team_a_name,
      TeamBName: item.team_b_name,
      LocalDate: item.local_date,
      LocalTime: item.local_time,
      Court: item.court,
      Status: item.status,
      Round: item.round,
      MatchPointsA: item.match_points_a?.toString(),
      MatchPointsB: item.match_points_b?.toString(),
      PointsTeamASet1: item.points_team_a_set1?.toString(),
      PointsTeamBSet1: item.points_team_b_set1?.toString(),
      PointsTeamASet2: item.points_team_a_set2?.toString(),
      PointsTeamBSet2: item.points_team_b_set2?.toString(),
      PointsTeamASet3: item.points_team_a_set3?.toString(),
      PointsTeamBSet3: item.points_team_b_set3?.toString(),
      DurationSet1: item.duration_set1,
      DurationSet2: item.duration_set2,
      DurationSet3: item.duration_set3,
      NoReferee1: item.no_referee1,
      NoReferee2: item.no_referee2,
      Referee1Name: item.referee1_name,
      Referee2Name: item.referee2_name,
      Referee1FederationCode: item.referee1_federation_code,
      Referee2FederationCode: item.referee2_federation_code,
      tournamentNo: item.tournament_no
    }));
  }

  /**
   * Cleanup operations
   */
  static async cleanup(): Promise<{
    memoryCleanedEntries: number;
    localStorageCleanedEntries: number;
  }> {
    const memoryCleanedEntries = this.memoryCache.cleanupExpired();
    const localStorageCleanedEntries = await this.localStorage.cleanup();

    return {
      memoryCleanedEntries,
      localStorageCleanedEntries
    };
  }

  /**
   * Invalidate cache entries by pattern
   */
  static async invalidate(pattern: string): Promise<void> {
    // Clear from memory cache
    const memoryKeys = this.memoryCache.getKeysByPattern(pattern);
    memoryKeys.forEach(key => this.memoryCache.delete(key));

    // Clear from local storage
    const localKeys = await this.localStorage.getKeysByPattern(pattern);
    for (const key of localKeys) {
      await this.localStorage.delete(key);
    }
  }

  /**
   * Invalidate match cache for a specific tournament (used by real-time updates)
   */
  static async invalidateMatchCache(tournamentNo: string): Promise<void> {
    const matchesKey = this.generateCacheKey('matches', { tournamentNo });
    
    // Clear from memory cache
    this.memoryCache.delete(matchesKey);
    
    // Clear from local storage
    await this.localStorage.delete(matchesKey);
    
    console.log(`Invalidated match cache for tournament ${tournamentNo}`);
  }

  /**
   * Get tournaments with offline-first strategy
   * Prioritizes offline storage when network is unavailable
   */
  static async getTournamentsOffline(filters?: FilterOptions): Promise<CacheResult<Tournament[]>> {
    this.ensureInitialized();
    const requestId = this.generateRequestId();
    const cacheKey = this.generateCacheKey('tournaments', filters);

    this.stats.startTimer(requestId);

    try {
      // Priority 1: Memory cache
      const memoryResult = this.getFromMemory(cacheKey);
      if (memoryResult) {
        this.stats.recordHit('memory', requestId);
        return {
          data: memoryResult,
          source: 'memory',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 2: Offline storage (persistent cache)
      const offlineResult = await this.getFromOfflineStorage(cacheKey);
      if (offlineResult) {
        // Update memory cache
        this.setInMemory(cacheKey, offlineResult, this.config.defaultTTL.tournaments);
        this.stats.recordHit('offline', requestId);
        return {
          data: offlineResult,
          source: 'offline',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 3: Local storage (if available and not expired)
      const localResult = await this.getFromLocalStorage(cacheKey);
      if (localResult) {
        this.setInMemory(cacheKey, localResult, this.config.defaultTTL.tournaments);
        this.stats.recordHit('localStorage', requestId);
        return {
          data: localResult,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 4: Only attempt network if available
      if (this.networkMonitor.isConnected) {
        return await this.getTournaments(filters);
      }

      // No data available and network offline
      throw new Error('No tournament data available offline');

    } catch (error) {
      console.error('CacheService.getTournamentsOffline error:', error);
      throw error;
    }
  }

  /**
   * Get matches with offline-first strategy
   * Prioritizes offline storage when network is unavailable
   */
  static async getMatchesOffline(tournamentNo: string): Promise<CacheResult<BeachMatch[]>> {
    this.ensureInitialized();
    const requestId = this.generateRequestId();
    const cacheKey = this.generateCacheKey('matches', { tournamentNo });

    this.stats.startTimer(requestId);

    try {
      // Priority 1: Memory cache
      const memoryResult = this.getFromMemory(cacheKey);
      if (memoryResult) {
        this.stats.recordHit('memory', requestId);
        return {
          data: memoryResult,
          source: 'memory',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 2: Offline storage (persistent cache)
      const offlineResult = await this.getFromOfflineStorage(cacheKey);
      if (offlineResult) {
        const ttl = this.calculateMatchesTTL(offlineResult);
        this.setInMemory(cacheKey, offlineResult, ttl);
        this.stats.recordHit('offline', requestId);
        return {
          data: offlineResult,
          source: 'offline',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 3: Local storage (if available and not expired)
      const localResult = await this.getFromLocalStorage(cacheKey);
      if (localResult) {
        const ttl = this.calculateMatchesTTL(localResult);
        this.setInMemory(cacheKey, localResult, ttl);
        this.stats.recordHit('localStorage', requestId);
        return {
          data: localResult,
          source: 'localStorage',
          fromCache: true,
          timestamp: Date.now()
        };
      }

      // Priority 4: Only attempt network if available
      if (this.networkMonitor.isConnected) {
        return await this.getMatches(tournamentNo);
      }

      // No data available and network offline
      throw new Error('No match data available offline');

    } catch (error) {
      console.error('CacheService.getMatchesOffline error:', error);
      throw error;
    }
  }

  /**
   * Get storage usage information for offline management
   */
  static async getStorageUsage(): Promise<{
    totalSize: number;
    offlineSize: number;
    cacheSize: number;
    isNearLimit: boolean;
  }> {
    this.ensureInitialized();
    return await this.localStorage.getStorageUsage();
  }

  /**
   * Manually trigger storage quota enforcement
   */
  static async enforceStorageQuota(): Promise<number> {
    this.ensureInitialized();
    return await this.localStorage.enforceStorageQuota();
  }

  /**
   * Get partial tournaments with graceful fallback handling
   * Returns available data even if some tournaments fail to load
   */
  static async getTournamentsGraceful(filters?: FilterOptions): Promise<{
    tournaments: Tournament[];
    source: CacheTier;
    errors: string[];
    isPartial: boolean;
    fromCache: boolean;
    timestamp: number;
  }> {
    this.ensureInitialized();
    const errors: string[] = [];

    try {
      // First try the normal flow
      const result = await this.getTournaments(filters);
      return {
        tournaments: result.data,
        source: result.source,
        errors: [],
        isPartial: false,
        fromCache: result.fromCache,
        timestamp: result.timestamp,
      };
    } catch (primaryError) {
      console.warn('Primary tournament load failed:', primaryError);
      errors.push(`Primary load failed: ${primaryError.message}`);

      // Try offline-first as fallback
      try {
        if (!this.networkMonitor.isConnected || this.networkMonitor) {
          const offlineResult = await this.getTournamentsOffline(filters);
          return {
            tournaments: offlineResult.data,
            source: offlineResult.source,
            errors,
            isPartial: true,
            fromCache: true,
            timestamp: offlineResult.timestamp,
          };
        }
      } catch (offlineError) {
        console.warn('Offline tournament load failed:', offlineError);
        errors.push(`Offline load failed: ${offlineError.message}`);
      }

      // Last resort: try to get any cached data, even expired
      try {
        const cacheKeys = await this.localStorage.getKeysByPattern('tournaments*');
        if (cacheKeys.length > 0) {
          // Get the most recent cached tournaments
          const cachedData = await this.localStorage.get(cacheKeys[0]);
          if (cachedData) {
            console.log('Using expired cached tournaments as last resort');
            errors.push('Using expired cached data');
            return {
              tournaments: cachedData.data,
              source: 'localStorage',
              errors,
              isPartial: true,
              fromCache: true,
              timestamp: cachedData.timestamp,
            };
          }
        }
      } catch (cacheError) {
        errors.push(`Cache fallback failed: ${cacheError.message}`);
      }

      // Return empty result with error information
      return {
        tournaments: [],
        source: 'localStorage',
        errors,
        isPartial: true,
        fromCache: true,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get partial matches with graceful fallback handling
   */
  static async getMatchesGraceful(tournamentNo: string): Promise<{
    matches: BeachMatch[];
    source: CacheTier;
    errors: string[];
    isPartial: boolean;
    fromCache: boolean;
    timestamp: number;
  }> {
    this.ensureInitialized();
    const errors: string[] = [];

    try {
      // First try the normal flow
      const result = await this.getMatches(tournamentNo);
      return {
        matches: result.data,
        source: result.source,
        errors: [],
        isPartial: false,
        fromCache: result.fromCache,
        timestamp: result.timestamp,
      };
    } catch (primaryError) {
      console.warn(`Primary match load failed for tournament ${tournamentNo}:`, primaryError);
      errors.push(`Primary load failed: ${primaryError.message}`);

      // Try offline-first as fallback
      try {
        const offlineResult = await this.getMatchesOffline(tournamentNo);
        return {
          matches: offlineResult.data,
          source: offlineResult.source,
          errors,
          isPartial: true,
          fromCache: true,
          timestamp: offlineResult.timestamp,
        };
      } catch (offlineError) {
        console.warn(`Offline match load failed for tournament ${tournamentNo}:`, offlineError);
        errors.push(`Offline load failed: ${offlineError.message}`);
      }

      // Last resort: try to get any cached match data
      try {
        const cacheKey = this.generateCacheKey('matches', { tournamentNo });
        const cachedData = await this.getStaleData(cacheKey);
        if (cachedData) {
          console.log(`Using stale cached matches for tournament ${tournamentNo} as last resort`);
          errors.push('Using expired cached data');
          return {
            matches: cachedData,
            source: 'localStorage',
            errors,
            isPartial: true,
            fromCache: true,
            timestamp: Date.now(),
          };
        }
      } catch (cacheError) {
        errors.push(`Cache fallback failed: ${cacheError.message}`);
      }

      // Return empty result with error information
      return {
        matches: [],
        source: 'localStorage',
        errors,
        isPartial: true,
        fromCache: true,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Apply client-side filtering to tournaments (used for cached data)
   */
  private static applyTournamentFilters(tournaments: Tournament[], filters?: FilterOptions): Tournament[] {
    if (!filters) return tournaments;

    let filtered = tournaments;

    // Apply year filter
    if (filters.year) {
      console.log(`🏐 CacheService: Applying client-side year filter for ${filters.year}`);
      const beforeCount = filtered.length;
      
      filtered = filtered.filter(tournament => {
        if (!tournament.StartDate) return false;
        
        try {
          const startDate = new Date(tournament.StartDate);
          const tournamentYear = startDate.getFullYear();
          return tournamentYear === filters.year;
        } catch (error) {
          console.warn(`Invalid date for tournament ${tournament.No}: ${tournament.StartDate}`);
          return false;
        }
      });
      
      console.log(`🏐 CacheService: Year filter result: ${beforeCount} → ${filtered.length} tournaments for year ${filters.year}`);
    }

    // Apply tournament type filter
    if (filters.tournamentType && filters.tournamentType !== 'ALL') {
      filtered = filtered.filter(tournament => {
        const name = (tournament.Name || tournament.Title || '').toUpperCase();
        const type = (tournament.Type || tournament.Category || tournament.Series || '').toUpperCase();
        const allText = `${name} ${type}`.trim();
        
        return type.includes(filters.tournamentType!) || allText.includes(filters.tournamentType!);
      });
    }

    // Apply currently active filter
    if (filters.currentlyActive) {
      const now = new Date();
      filtered = filtered.filter(tournament => {
        if (!tournament.StartDate || !tournament.EndDate) return false;
        
        try {
          const startDate = new Date(tournament.StartDate);
          const endDate = new Date(tournament.EndDate);
          return startDate <= now && now <= endDate;
        } catch {
          return false;
        }
      });
    }

    // Apply recent-only filter
    if (filters.recentOnly) {
      const today = new Date();
      const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      const oneMonthFromNow = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      
      filtered = filtered.filter(tournament => {
        if (!tournament.StartDate) return false;
        
        try {
          const startDate = new Date(tournament.StartDate);
          return startDate >= oneMonthAgo && startDate <= oneMonthFromNow;
        } catch {
          return false;
        }
      });
    }

    // Deduplicate tournaments with same name but different gender codes
    const merged = this.deduplicateTournaments(filtered);
    
    return merged;
  }

  /**
   * Merge tournaments that have the same base name but different gender codes
   */
  private static deduplicateTournaments(tournaments: Tournament[]): Tournament[] {
    console.log(`🏐 deduplicateTournaments: Processing ${tournaments.length} tournaments`);
    
    // TEMPORARY: Just return tournaments without merging to test basic functionality
    if (true) {
      console.log(`🏐 TEMPORARY: Skipping merging, returning original ${tournaments.length} tournaments`);
      return tournaments;
    }
    const tournamentGroups = new Map<string, Tournament[]>();
    
    // Group tournaments by their base characteristics
    tournaments.forEach((tournament) => {
      const name = (tournament.Name || tournament.Title || '').toLowerCase().trim();
      const location = (tournament.Location || tournament.City || tournament.Country || '').toLowerCase().trim();
      const startDate = tournament.StartDate || '';
      
      // More robust key generation - remove common gender indicators
      const cleanName = name
        .replace(/\b(men|women|male|female|boys|girls|m|w)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Create a key based on cleaned name, location, and start date
      const key = `${cleanName}_${location}_${startDate}`;
      
      if (!tournamentGroups.has(key)) {
        tournamentGroups.set(key, []);
      }
      tournamentGroups.get(key)!.push(tournament);
    });
    
    const result: Tournament[] = [];
    
    // Process each group
    tournamentGroups.forEach((group, key) => {
      if (group.length === 1) {
        // Single tournament - no merging needed
        result.push(group[0]);
      } else {
        // Multiple tournaments - merge them
        console.log(`🏐 MERGING ${group.length} tournaments: ${group.map(t => `"${t.Name}" (${t.Code})`).join(', ')}`);
        
        // Choose the representative tournament (most complete data)
        const representative = group.reduce((best, current) => {
          const currentScore = this.getTournamentCompletenessScore(current);
          const bestScore = this.getTournamentCompletenessScore(best);
          return currentScore > bestScore ? current : best;
        });
        
        // Create merged tournament that combines all gender variants
        const mergedTournament = {
          ...representative,
          // Create a unified name that indicates it includes both genders
          Name: this.createMergedTournamentName(group),
          // Store all the merged tournaments for match loading
          _mergedTournaments: group.map(t => ({
            No: t.No,
            Name: t.Name,
            Code: t.Code,
            StartDate: t.StartDate,
            EndDate: t.EndDate
          }))
        };
        
        console.log(`🏐 MERGED RESULT: "${mergedTournament.Name}" includes ${group.length} gender variants`);
        result.push(mergedTournament);
      }
    });
    
    return result;
  }
  
  /**
   * Create a unified name for merged tournaments
   */
  private static createMergedTournamentName(tournaments: Tournament[]): string {
    // Get the base name (without gender indicators)
    const baseName = tournaments[0].Name || tournaments[0].Title || '';
    const cleanName = baseName
      .replace(/\b(men|women|male|female|boys|girls|m|w)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Check what genders are included
    const hasWomen = tournaments.some(t => 
      /\b(women|female|girls|w)\b/i.test(t.Name || '') ||
      /\b(women|female|girls|w)\b/i.test(t.Code || '')
    );
    const hasMen = tournaments.some(t => 
      /\b(men|male|boys|m)\b/i.test(t.Name || '') ||
      /\b(men|male|boys|m)\b/i.test(t.Code || '')
    );
    
    if (hasWomen && hasMen) {
      return `${cleanName} (Mixed)`;
    } else if (hasWomen) {
      return `${cleanName} (Women)`;
    } else if (hasMen) {
      return `${cleanName} (Men)`;
    } else {
      return cleanName;
    }
  }
  

  /**
   * Calculate completeness score for a tournament (higher score = more complete data)
   */
  private static getTournamentCompletenessScore(tournament: Tournament): number {
    let score = 0;
    
    if (tournament.Name) score += 2;
    if (tournament.Title) score += 2;
    if (tournament.Location) score += 1;
    if (tournament.City) score += 1;
    if (tournament.Country) score += 1;
    if (tournament.StartDate) score += 2;
    if (tournament.EndDate) score += 2;
    if (tournament.Status) score += 1;
    if (tournament.Code) score += 1;
    
    return score;
  }
}