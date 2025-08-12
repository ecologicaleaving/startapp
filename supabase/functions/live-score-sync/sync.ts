import { SupabaseClient } from 'supabase';
import { PerformanceMonitor } from './performance-monitor.ts';

interface Tournament {
  no: string;
  code?: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

interface BeachMatch {
  no: string;
  tournament_no: string;
  no_in_tournament?: string;
  team_a_name?: string;
  team_b_name?: string;
  local_date?: string;
  local_time?: string;
  status?: string;
  match_points_a?: number;
  match_points_b?: number;
  points_team_a_set1?: number;
  points_team_b_set1?: number;
  points_team_a_set2?: number;
  points_team_b_set2?: number;
  points_team_a_set3?: number;
  points_team_b_set3?: number;
}

interface LiveScore {
  matchNo: string;
  tournamentNo: string;
  matchPointsA: number;
  matchPointsB: number;
  set1ScoreA: number;
  set1ScoreB: number;
  set2ScoreA: number;
  set2ScoreB: number;
  set3ScoreA: number;
  set3ScoreB: number;
  status: string;
  lastUpdated: string;
}

interface SyncResult {
  totalTournaments: number;
  totalMatches: number;
  updatedMatches: number;
  errors: string[];
  duration: number;
}

/**
 * LiveScoreSync - Main orchestrator for live match score synchronization
 * Handles batch processing, error isolation, and efficient API usage
 */
export class LiveScoreSync {
  private supabase: SupabaseClient;
  private readonly VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  private readonly FIVB_APP_ID = Deno.env.get('FIVB_API_KEY') || '2a9523517c52420da73d927c6d6bab23';
  
  // Performance optimization constants
  private readonly CONCURRENT_LIMIT = 5; // Process max 5 tournaments simultaneously
  private readonly API_RATE_LIMIT = 10; // Max 10 API calls per minute per tournament
  private readonly MAX_RETRIES = 3;

  // Performance monitoring
  private performanceMonitor: PerformanceMonitor;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    this.performanceMonitor = new PerformanceMonitor(supabase);
  }

  /**
   * Execute the complete live score sync process
   */
  async executeLiveScoreSync(): Promise<SyncResult> {
    const startTime = Date.now();
    const result: SyncResult = {
      totalTournaments: 0,
      totalMatches: 0,
      updatedMatches: 0,
      errors: [],
      duration: 0,
    };

    try {
      console.log('Starting live score sync process');

      // Get active tournaments with live matches
      const activeTournaments = await this.getActiveTournaments();
      result.totalTournaments = activeTournaments.length;

      if (activeTournaments.length === 0) {
        console.log('No active tournaments found');
        result.duration = Date.now() - startTime;
        return result;
      }

      // Prioritize tournaments based on type and importance (FIVB > CEV > BPT > LOCAL)
      const prioritizedTournaments = this.performanceMonitor.prioritizeTournaments(activeTournaments);
      console.log(`Prioritized ${prioritizedTournaments.length} tournaments by importance`);

      // Map back to Tournament objects with priority information
      const prioritizedTournamentObjects = prioritizedTournaments.map(pt => {
        const tournament = activeTournaments.find(t => t.no === pt.tournamentNo)!;
        return { ...tournament, priority: pt.priority, type: pt.type };
      });

      // Get optimal batch size based on current performance
      const optimalBatchSize = this.performanceMonitor.getOptimalBatchSize();
      
      // Process tournaments in batches to manage resource usage
      const batches = this.chunkArray(prioritizedTournamentObjects, optimalBatchSize);
      
      console.log(`Processing ${activeTournaments.length} tournaments in ${batches.length} batches`);

      for (const batch of batches) {
        const batchResults = await Promise.allSettled(
          batch.map(tournament => this.syncTournamentLiveScores(tournament))
        );

        // Process batch results
        for (let i = 0; i < batchResults.length; i++) {
          const batchResult = batchResults[i];
          const tournament = batch[i];

          if (batchResult.status === 'fulfilled') {
            result.totalMatches += batchResult.value.totalMatches;
            result.updatedMatches += batchResult.value.updatedMatches;
            result.errors.push(...batchResult.value.errors);
          } else {
            const error = `Tournament ${tournament.no} failed: ${batchResult.reason}`;
            console.error(error);
            result.errors.push(error);
          }
        }

        // Brief pause between batches to respect rate limits
        if (batches.length > 1) {
          await this.sleep(1000);
        }
      }

      // Log performance metrics and detect bottlenecks
      const resourceUsage = this.performanceMonitor.getCurrentResourceUsage(
        activeTournaments.length,
        result.totalMatches
      );
      
      await this.performanceMonitor.logPerformanceMetrics(resourceUsage);
      
      const bottlenecks = this.performanceMonitor.detectBottlenecks();
      if (bottlenecks.hasBottlenecks) {
        console.warn('Performance bottlenecks detected:', bottlenecks.issues);
        console.log('Recommendations:', bottlenecks.recommendations);
      }

      result.duration = Date.now() - startTime;
      console.log(`Live score sync completed in ${result.duration}ms`);
      console.log(`Summary: ${result.updatedMatches}/${result.totalMatches} matches updated across ${result.totalTournaments} tournaments`);

      // Update sync status
      await this.updateSyncStatus(result);

      // Cleanup performance monitoring data
      this.performanceMonitor.cleanup();

      return result;

    } catch (error) {
      result.duration = Date.now() - startTime;
      const errorMsg = `Live score sync failed: ${error.message}`;
      console.error(errorMsg);
      result.errors.push(errorMsg);
      
      // Still try to update sync status with error
      await this.updateSyncStatus(result).catch(console.error);
      
      throw error;
    }
  }

  /**
   * Get active tournaments that may have live matches
   */
  private async getActiveTournaments(): Promise<Tournament[]> {
    const { data: tournaments, error } = await this.supabase
      .from('tournaments')
      .select('no, code, name, start_date, end_date, status')
      .eq('status', 'Running')
      .gte('end_date', new Date().toISOString().split('T')[0])
      .order('start_date', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch active tournaments: ${error.message}`);
    }

    return tournaments || [];
  }

  /**
   * Sync live scores for a single tournament with error isolation
   */
  private async syncTournamentLiveScores(tournament: Tournament | any): Promise<{
    totalMatches: number;
    updatedMatches: number;
    errors: string[];
  }> {
    const tournamentResult = {
      totalMatches: 0,
      updatedMatches: 0,
      errors: [],
    };

    const tournamentNo = tournament.tournamentNo || tournament.no;
    const tournamentName = tournament.name || 'Unknown';
    const tournamentCode = tournament.code || 'Unknown';

    try {
      // Check rate limiting before processing
      if (!this.performanceMonitor.canProcessTournament(tournamentNo)) {
        console.log(`Skipping tournament ${tournamentCode} due to rate limiting`);
        return tournamentResult;
      }

      const operationId = this.performanceMonitor.startOperation(`tournament_sync_${tournamentNo}`);
      
      console.log(`Syncing tournament: ${tournamentName} (${tournamentCode}) - Priority: ${tournament.priority || 'N/A'}`);

      // Get live matches for this tournament
      const liveMatches = await this.getLiveMatches(tournamentNo);
      tournamentResult.totalMatches = liveMatches.length;

      if (liveMatches.length === 0) {
        console.log(`No live matches found for tournament ${tournamentCode}`);
        this.performanceMonitor.endOperation(operationId, true, { matchCount: 0 });
        return tournamentResult;
      }

      console.log(`Found ${liveMatches.length} live matches in tournament ${tournamentCode}`);

      // Sync each match with individual error handling
      const matchResults = await Promise.allSettled(
        liveMatches.map(match => this.syncIndividualMatch(match, tournamentNo))
      );

      // Process individual match results
      matchResults.forEach((result, index) => {
        const match = liveMatches[index];
        
        if (result.status === 'fulfilled') {
          if (result.value.updated) {
            tournamentResult.updatedMatches++;
            console.log(`Updated match ${match.no_in_tournament}: ${match.team_a_name} vs ${match.team_b_name}`);
          }
        } else {
          const error = `Match ${match.no} sync failed: ${result.reason}`;
          console.error(error);
          tournamentResult.errors.push(error);
        }
      });

      console.log(`Tournament ${tournamentCode}: ${tournamentResult.updatedMatches}/${tournamentResult.totalMatches} matches updated`);

      this.performanceMonitor.endOperation(operationId, tournamentResult.errors.length === 0, {
        matchCount: liveMatches.length,
        updatedCount: tournamentResult.updatedMatches,
      });

    } catch (error) {
      const errorMsg = `Tournament ${tournament.no} sync failed: ${error.message}`;
      console.error(errorMsg);
      tournamentResult.errors.push(errorMsg);
    }

    return tournamentResult;
  }

  /**
   * Get live matches from database that need score updates
   */
  private async getLiveMatches(tournamentNo: string): Promise<BeachMatch[]> {
    const { data: matches, error } = await this.supabase
      .from('matches')
      .select('*')
      .eq('tournament_no', tournamentNo)
      .in('status', ['live', 'running', 'inprogress'])
      .order('local_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch live matches for tournament ${tournamentNo}: ${error.message}`);
    }

    return matches || [];
  }

  /**
   * Sync individual match with retry logic and exponential backoff
   */
  private async syncIndividualMatch(match: BeachMatch, tournamentNo?: string): Promise<{ updated: boolean }> {
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        // Record API call for rate limiting
        if (tournamentNo) {
          this.performanceMonitor.recordApiCall(tournamentNo);
        }

        // Fetch latest score from FIVB API with performance monitoring
        const apiStartTime = Date.now();
        const liveScore = await this.fetchMatchScore(match);
        const apiDuration = Date.now() - apiStartTime;
        
        this.performanceMonitor.recordApiResponseTime(apiDuration);
        
        // Check if score has changed
        if (this.hasScoreChanged(match, liveScore)) {
          // Update database with new score
          await this.updateMatchScore(match.no, liveScore);
          return { updated: true };
        }

        return { updated: false };

      } catch (error) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        
        if (attempt === this.MAX_RETRIES) {
          // Final attempt failed - log error but don't crash
          console.error(`Failed to sync match ${match.no} after ${this.MAX_RETRIES} attempts: ${error.message}`);
          throw error;
        }
        
        console.warn(`Match ${match.no} sync attempt ${attempt} failed, retrying in ${delay}ms: ${error.message}`);
        await this.sleep(delay);
      }
    }

    return { updated: false };
  }

  /**
   * Fetch live score from FIVB API for a specific match
   */
  private async fetchMatchScore(match: BeachMatch): Promise<LiveScore> {
    const fields = 'No NoInTournament MatchPointsA MatchPointsB PointsTeamASet1 PointsTeamBSet1 PointsTeamASet2 PointsTeamBSet2 PointsTeamASet3 PointsTeamBSet3 Status';
    const xmlRequest = `<Request Type='GetBeachMatchList' Fields='${fields}'><Filter NoTournament='${match.tournament_no}' No='${match.no}' /></Request>`;
    const requestUrl = `${this.VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;

    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': this.FIVB_APP_ID,
      },
    });

    if (!response.ok) {
      throw new Error(`FIVB API error: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    return this.parseMatchScore(xmlText, match);
  }

  /**
   * Parse match score from FIVB API XML response
   */
  private parseMatchScore(xmlText: string, match: BeachMatch): LiveScore {
    try {
      const matchMatch = xmlText.match(/<BeachMatch[^>]*\/>/);
      
      if (!matchMatch) {
        throw new Error('No match data found in API response');
      }

      const matchXml = matchMatch[0];
      
      const extractAttribute = (name: string): string => {
        const attrMatch = matchXml.match(new RegExp(`${name}="([^"]*)"`, 'i'));
        return attrMatch ? attrMatch[1] : '';
      };

      return {
        matchNo: match.no,
        tournamentNo: match.tournament_no,
        matchPointsA: parseInt(extractAttribute('MatchPointsA')) || 0,
        matchPointsB: parseInt(extractAttribute('MatchPointsB')) || 0,
        set1ScoreA: parseInt(extractAttribute('PointsTeamASet1')) || 0,
        set1ScoreB: parseInt(extractAttribute('PointsTeamBSet1')) || 0,
        set2ScoreA: parseInt(extractAttribute('PointsTeamASet2')) || 0,
        set2ScoreB: parseInt(extractAttribute('PointsTeamBSet2')) || 0,
        set3ScoreA: parseInt(extractAttribute('PointsTeamASet3')) || 0,
        set3ScoreB: parseInt(extractAttribute('PointsTeamBSet3')) || 0,
        status: extractAttribute('Status') || 'unknown',
        lastUpdated: new Date().toISOString(),
      };

    } catch (error) {
      throw new Error(`Failed to parse match score XML: ${error.message}`);
    }
  }

  /**
   * Check if match score has changed
   */
  private hasScoreChanged(currentMatch: BeachMatch, newScore: LiveScore): boolean {
    return (
      currentMatch.match_points_a !== newScore.matchPointsA ||
      currentMatch.match_points_b !== newScore.matchPointsB ||
      currentMatch.points_team_a_set1 !== newScore.set1ScoreA ||
      currentMatch.points_team_b_set1 !== newScore.set1ScoreB ||
      currentMatch.points_team_a_set2 !== newScore.set2ScoreA ||
      currentMatch.points_team_b_set2 !== newScore.set2ScoreB ||
      currentMatch.points_team_a_set3 !== newScore.set3ScoreA ||
      currentMatch.points_team_b_set3 !== newScore.set3ScoreB ||
      currentMatch.status !== newScore.status
    );
  }

  /**
   * Update match score in database
   */
  private async updateMatchScore(matchNo: string, liveScore: LiveScore): Promise<void> {
    const { error } = await this.supabase
      .from('matches')
      .update({
        match_points_a: liveScore.matchPointsA,
        match_points_b: liveScore.matchPointsB,
        points_team_a_set1: liveScore.set1ScoreA,
        points_team_b_set1: liveScore.set1ScoreB,
        points_team_a_set2: liveScore.set2ScoreA,
        points_team_b_set2: liveScore.set2ScoreB,
        points_team_a_set3: liveScore.set3ScoreA,
        points_team_b_set3: liveScore.set3ScoreB,
        status: liveScore.status,
        last_synced: new Date().toISOString(),
      })
      .eq('no', matchNo);

    if (error) {
      throw new Error(`Failed to update match ${matchNo}: ${error.message}`);
    }
  }

  /**
   * Update sync status tracking
   */
  private async updateSyncStatus(result: SyncResult): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sync_status')
        .upsert({
          entity_type: 'matches_live',
          last_sync: new Date().toISOString(),
          success_count: result.errors.length === 0 ? 1 : 0,
          error_count: result.errors.length > 0 ? 1 : 0,
          last_error: result.errors.length > 0 ? result.errors.join('; ') : null,
          last_error_time: result.errors.length > 0 ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to update sync status:', error);
      }
    } catch (error) {
      console.error('Error updating sync status:', error);
    }
  }

  /**
   * Utility: Split array into chunks
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Utility: Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}