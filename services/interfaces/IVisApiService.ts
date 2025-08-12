import { Tournament } from '../../types/tournament';
import { BeachMatch } from '../../types/match';
import { FilterOptions } from '../../types/cache';

/**
 * Interface for VisApiService to break circular dependency with CacheService
 * This allows CacheService to depend on an interface rather than the concrete implementation
 */
export interface IVisApiService {
  /**
   * Fetch tournaments directly from API without caching
   */
  fetchDirectFromAPI(filters?: FilterOptions): Promise<Tournament[]>;
  
  /**
   * Fetch matches directly from API without caching
   */
  fetchMatchesDirectFromAPI(tournamentNo: string): Promise<BeachMatch[]>;
  
  /**
   * Check if a match is live and requires real-time updates
   */
  isLiveMatch(match: BeachMatch): boolean;
}

/**
 * Factory function to get VisApiService instance
 * This allows lazy loading to prevent circular dependency issues
 */
export interface IVisApiServiceFactory {
  getInstance(): Promise<IVisApiService>;
}