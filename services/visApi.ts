import { Tournament } from '../types/tournament';
import { BeachMatch } from '../types/match';
import { CacheService } from './CacheService';
import { CachePerformanceMonitor } from './CachePerformanceMonitor';
import { RealtimeSubscriptionService } from './RealtimeSubscriptionService';

export type TournamentType = 'ALL' | 'FIVB' | 'CEV' | 'BPT' | 'LOCAL';

const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

export type GenderType = 'M' | 'W' | 'Mixed' | 'Unknown';

export class VisApiService {
  // Extract gender from tournament code (M/W prefix)
  static extractGenderFromCode(code?: string): GenderType {
    if (!code) return 'Unknown';
    
    const upperCode = code.toUpperCase();
    if (upperCode.startsWith('M')) return 'M';
    if (upperCode.startsWith('W')) return 'W';
    
    return 'Mixed';
  }

  // Get base tournament code without gender prefix
  static getBaseTournamentCode(code?: string): string {
    if (!code) return '';
    
    const upperCode = code.toUpperCase();
    if (upperCode.startsWith('M') || upperCode.startsWith('W')) {
      return upperCode.substring(1);
    }
    
    return upperCode;
  }

  // Find related tournaments by base code
  static async findRelatedTournaments(tournament: Tournament): Promise<Tournament[]> {
    if (!tournament.Code) return [tournament];
    
    try {
      const allTournaments = await this.getTournamentListWithDetails();
      const baseCode = this.getBaseTournamentCode(tournament.Code);
      
      return allTournaments.filter(t => {
        if (!t.Code) return false;
        const tBaseCode = this.getBaseTournamentCode(t.Code);
        return tBaseCode === baseCode;
      });
    } catch (error) {
      console.error('Error finding related tournaments:', error);
      return [tournament];
    }
  }

  static classifyTournament(tournament: Tournament): TournamentType {
    const code = tournament.Code || '';
    const name = tournament.Name || '';
    
    // Check for FIVB tournaments
    if (name.toLowerCase().includes('fivb') || 
        name.toLowerCase().includes('world tour') || 
        name.toLowerCase().includes('world championship')) {
      return 'FIVB';
    }
    
    // Check for BPT tournaments
    if (name.toLowerCase().includes('bpt') || 
        code.toLowerCase().includes('bpt') ||
        name.toLowerCase().includes('beach pro tour') ||
        name.toLowerCase().includes('challenge') ||
        name.toLowerCase().includes('elite16')) {
      return 'BPT';
    }
    
    // Check for CEV tournaments
    if (name.toLowerCase().includes('cev') || 
        code.toLowerCase().includes('cev') ||
        name.toLowerCase().includes('european') ||
        name.toLowerCase().includes('europa') ||
        name.toLowerCase().includes('championship')) {
      return 'CEV';
    }
    
    // Default to local tournament
    return 'LOCAL';
  }

  static async getTournamentListWithDetails(filterOptions?: {
    recentOnly?: boolean;
    year?: number;
    currentlyActive?: boolean;
    tournamentType?: TournamentType;
  }): Promise<Tournament[]> {
    try {
      // Initialize cache service if not already done
      CacheService.initialize();
      
      // Monitor cache performance
      const performanceResult = await CachePerformanceMonitor.monitorCacheTierPerformance(
        'cache_service',
        async () => CacheService.getTournaments(filterOptions)
      );
      
      if (performanceResult.result && performanceResult.result.data) {
        console.log(
          `Tournament data served from ${performanceResult.result.source} cache in ${performanceResult.duration.toFixed(2)}ms ` +
          `(performant: ${performanceResult.performant})`
        );
        
        // Log performance warning if cache is slow
        if (!performanceResult.performant) {
          console.warn(
            `Cache performance warning: ${performanceResult.duration.toFixed(2)}ms exceeds ${performanceResult.threshold}ms threshold`
          );
        }
        
        return performanceResult.result.data;
      }

      // If cache fails, fallback to direct API (should not happen as CacheService handles this)
      console.warn('Cache service failed, falling back to direct API');
      return await this.fetchDirectFromAPI(filterOptions);
    } catch (error) {
      console.error('Error in getTournamentListWithDetails:', error);
      
      // Final fallback to direct API with performance monitoring
      try {
        console.log('Attempting direct API fallback after cache error');
        const apiResult = await CachePerformanceMonitor.monitorCacheTierPerformance(
          'api',
          async () => this.fetchDirectFromAPI(filterOptions)
        );
        
        console.log(`Direct API fallback completed in ${apiResult.duration.toFixed(2)}ms`);
        return apiResult.result;
      } catch (fallbackError) {
        console.error('Direct API fallback also failed:', fallbackError);
        throw new Error('Failed to fetch active tournaments');
      }
    }
  }

  /**
   * Direct API fetch method - used as fallback when cache is unavailable
   * This preserves the exact original implementation behavior
   */
  static async fetchDirectFromAPI(filterOptions?: {
    recentOnly?: boolean;
    year?: number;
    currentlyActive?: boolean;
    tournamentType?: TournamentType;
  }): Promise<Tournament[]> {
    try {
      // Use the proper VIS API call for active beach volleyball tournaments
      const xmlRequest = "<Request Type='GetBeachTournamentList' Fields='No Code Name StartDate EndDate'><Filter Statuses='Running' /></Request>";
      const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
      
      console.log('Fetching currently running beach volleyball tournaments from direct API...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const allTournaments = this.parseBeachTournamentList(xmlText);
      
      // Filter tournaments to only show those within +/- 1 month from today
      const today = new Date();
      const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      const oneMonthFromNow = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      
      const recentTournaments = allTournaments.filter(tournament => {
        if (!tournament.StartDate) return false;
        
        try {
          const startDate = new Date(tournament.StartDate);
          const isWithinRange = startDate >= oneMonthAgo && startDate <= oneMonthFromNow;
          
          if (!isWithinRange) {
            console.log(`Filtering out old tournament: ${tournament.Name} (${tournament.StartDate})`);
          }
          
          return isWithinRange;
        } catch (error) {
          console.warn(`Invalid date for tournament ${tournament.No}: ${tournament.StartDate}`);
          return false;
        }
      });
      
      // Sort tournaments by start date (ascending - earliest first)
      const sortedTournaments = recentTournaments.sort((a, b) => {
        if (!a.StartDate) return 1;
        if (!b.StartDate) return -1;
        
        try {
          const dateA = new Date(a.StartDate);
          const dateB = new Date(b.StartDate);
          return dateA.getTime() - dateB.getTime();
        } catch {
          return 0;
        }
      });
      
      console.log(`Found ${allTournaments.length} running tournaments, ${sortedTournaments.length} within +/-1 month (sorted by date):`);
      sortedTournaments.forEach(t => console.log(`- ${t.Name} (${t.Code}) - ${t.StartDate} to ${t.EndDate}`));
      
      // Apply tournament type filtering if specified
      if (filterOptions?.tournamentType && filterOptions.tournamentType !== 'ALL') {
        const filteredByType = sortedTournaments.filter(tournament => 
          this.classifyTournament(tournament) === filterOptions.tournamentType
        );
        
        console.log(`Filtered by type ${filterOptions.tournamentType}: ${filteredByType.length} tournaments`);
        return filteredByType;
      }
      
      return sortedTournaments;
    } catch (error) {
      console.error('Error fetching active tournaments from direct API:', error);
      
      // Provide fallback mock data to prevent app from hanging
      console.log('Using fallback mock data to prevent app hanging');
      return [
        {
          No: '1001',
          Code: 'MBPT2024-01',
          Name: 'Beach Pro Tour - Elite 16 Men',
          Title: 'Beach Pro Tour Elite 16',
          StartDate: '2024-01-15',
          EndDate: '2024-01-21',
          Country: 'International',
          City: 'Demo City',
          Status: 'Running',
          Version: 1
        },
        {
          No: '1002', 
          Code: 'WBPT2024-01',
          Name: 'Beach Pro Tour - Elite 16 Women',
          Title: 'Beach Pro Tour Elite 16',
          StartDate: '2024-01-15',
          EndDate: '2024-01-21',
          Country: 'International', 
          City: 'Demo City',
          Status: 'Running',
          Version: 1
        }
      ] as Tournament[];
    }
  }

  static async getBeachMatchList(tournamentNo: string): Promise<BeachMatch[]> {
    try {
      // Initialize cache service if not already done
      CacheService.initialize();
      
      // Monitor cache performance
      const performanceResult = await CachePerformanceMonitor.monitorCacheTierPerformance(
        'cache_service',
        async () => CacheService.getMatches(tournamentNo)
      );
      
      if (performanceResult.result && performanceResult.result.data) {
        console.log(
          `Match data served from ${performanceResult.result.source} cache in ${performanceResult.duration.toFixed(2)}ms ` +
          `(performant: ${performanceResult.performant})`
        );
        
        // Log performance warning if cache is slow
        if (!performanceResult.performant) {
          console.warn(
            `Cache performance warning: ${performanceResult.duration.toFixed(2)}ms exceeds ${performanceResult.threshold}ms threshold`
          );
        }
        
        // Check for live matches and establish real-time subscriptions
        await this.handleLiveMatchSubscriptions(performanceResult.result.data);
        
        return performanceResult.result.data;
      }

      // If cache fails, fallback to direct API (should not happen as CacheService handles this)
      console.warn('Cache service failed, falling back to direct API');
      return await this.fetchMatchesDirectFromAPI(tournamentNo);
    } catch (error) {
      console.error(`Error in getBeachMatchList for tournament ${tournamentNo}:`, error);
      
      // Final fallback to direct API with performance monitoring
      try {
        console.log('Attempting direct API fallback after cache error');
        const apiResult = await CachePerformanceMonitor.monitorCacheTierPerformance(
          'api',
          async () => this.fetchMatchesDirectFromAPI(tournamentNo)
        );
        
        console.log(`Direct API fallback completed in ${apiResult.duration.toFixed(2)}ms`);
        return apiResult.result;
      } catch (fallbackError) {
        console.error('Direct API fallback also failed:', fallbackError);
        throw new Error('Failed to fetch tournament matches');
      }
    }
  }

  /**
   * Direct API fetch method for matches - used as fallback when cache is unavailable
   * This preserves the exact original implementation behavior
   */
  static async fetchMatchesDirectFromAPI(tournamentNo: string): Promise<BeachMatch[]> {
    try {
      // Build the XML request including referee data
      const fields = 'No NoInTournament LocalDate LocalTime TeamAName TeamBName Court MatchPointsA MatchPointsB PointsTeamASet1 PointsTeamBSet1 PointsTeamASet2 PointsTeamBSet2 PointsTeamASet3 PointsTeamBSet3 DurationSet1 DurationSet2 DurationSet3 Status Round NoReferee1 NoReferee2 Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode';
      const xmlRequest = `<Request Type='GetBeachMatchList' Fields='${fields}'><Filter NoTournament='${tournamentNo}' /></Request>`;
      const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
      
      console.log(`Fetching matches for tournament ${tournamentNo} from direct API...`);
      
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
      const matches = this.parseBeachMatchList(xmlText);
      
      console.log(`Found ${matches.length} matches for tournament ${tournamentNo}`);
      matches.forEach(m => console.log(`- Match ${m.NoInTournament}: ${m.TeamAName} vs ${m.TeamBName} on ${m.LocalDate} at ${m.LocalTime}`));
      
      return matches;
    } catch (error) {
      console.error(`Error fetching matches for tournament ${tournamentNo} from direct API:`, error);
      throw new Error('Failed to fetch tournament matches');
    }
  }

  /**
   * Handle real-time subscriptions for live matches
   */
  static async handleLiveMatchSubscriptions(matches: BeachMatch[]): Promise<void> {
    try {
      const liveMatches = matches.filter(match => this.isLiveMatch(match));
      if (liveMatches.length > 0) {
        console.log(`Found ${liveMatches.length} live matches, establishing real-time subscriptions`);
        await RealtimeSubscriptionService.subscribeLiveMatches(liveMatches);
      }
    } catch (error) {
      console.warn('Failed to establish live match subscriptions:', error);
      // Non-blocking error - match data should still be served
    }
  }

  /**
   * Check if a match is live and requires real-time updates
   */
  static isLiveMatch(match: BeachMatch): boolean {
    const status = match.Status?.toLowerCase();
    return status === 'live' || 
           status === 'inprogress' || 
           status === 'running';
  }

  private static parseBeachMatchList(xmlText: string): BeachMatch[] {
    try {
      // Parse the BeachMatches XML format
      const matchMatches = xmlText.match(/<BeachMatch[^>]*\/>/g);
      
      if (!matchMatches) {
        return [];
      }

      return matchMatches.map((match) => {
        const extractAttribute = (name: string): string | undefined => {
          const attrMatch = match.match(new RegExp(`${name}="([^"]*)"`, 'i'));
          return attrMatch ? attrMatch[1] : undefined;
        };

        const beachMatch = {
          No: extractAttribute('No') || '',
          NoInTournament: extractAttribute('NoInTournament'),
          LocalDate: extractAttribute('LocalDate'),
          LocalTime: extractAttribute('LocalTime'),
          TeamAName: extractAttribute('TeamAName'),
          TeamBName: extractAttribute('TeamBName'),
          Court: extractAttribute('Court'),
          MatchPointsA: extractAttribute('MatchPointsA'),
          MatchPointsB: extractAttribute('MatchPointsB'),
          PointsTeamASet1: extractAttribute('PointsTeamASet1'),
          PointsTeamBSet1: extractAttribute('PointsTeamBSet1'),
          PointsTeamASet2: extractAttribute('PointsTeamASet2'),
          PointsTeamBSet2: extractAttribute('PointsTeamBSet2'),
          PointsTeamASet3: extractAttribute('PointsTeamASet3'),
          PointsTeamBSet3: extractAttribute('PointsTeamBSet3'),
          DurationSet1: extractAttribute('DurationSet1'),
          DurationSet2: extractAttribute('DurationSet2'),
          DurationSet3: extractAttribute('DurationSet3'),
          Version: extractAttribute('Version'),
          Status: extractAttribute('Status'),
          Round: extractAttribute('Round'),
          NoReferee1: extractAttribute('NoReferee1'),
          NoReferee2: extractAttribute('NoReferee2'),
          Referee1Name: extractAttribute('Referee1Name'),
          Referee2Name: extractAttribute('Referee2Name'),
          Referee1FederationCode: extractAttribute('Referee1FederationCode'),
          Referee2FederationCode: extractAttribute('Referee2FederationCode'),
        };
        
        return beachMatch;
      });
    } catch (error) {
      console.error('Error parsing BeachMatches XML:', error);
      return [];
    }
  }

  private static parseBeachTournamentList(xmlText: string): Tournament[] {
    try {
      // Parse the BeachTournaments XML format
      const tournamentMatches = xmlText.match(/<BeachTournament[^>]*\/>/g);
      
      if (!tournamentMatches) {
        return [];
      }

      return tournamentMatches.map((match) => {
        const extractAttribute = (name: string): string | undefined => {
          const attrMatch = match.match(new RegExp(`${name}="([^"]*)"`, 'i'));
          return attrMatch ? attrMatch[1] : undefined;
        };

        return {
          No: extractAttribute('No') || '',
          Code: extractAttribute('Code'),
          Name: extractAttribute('Name'),
          StartDate: extractAttribute('StartDate'),
          EndDate: extractAttribute('EndDate'),
          Version: extractAttribute('Version'),
        };
      });
    } catch (error) {
      console.error('Error parsing BeachTournaments XML:', error);
      return [];
    }
  }
}