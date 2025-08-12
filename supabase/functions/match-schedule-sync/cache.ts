// Dynamic Caching Strategy Module
// Handles TTL calculation based on match status and real-time subscription management

import type { FIVBMatch } from './sync.ts';

export interface CacheTTLConfig {
  liveMatches: string;
  scheduledMatches: string;
  finishedMatches: string;
  defaultTTL: string;
}

export interface CacheInvalidationTrigger {
  matchNo: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string;
}

export class CacheManager {
  private ttlConfig: CacheTTLConfig;
  
  constructor(config?: Partial<CacheTTLConfig>) {
    this.ttlConfig = {
      liveMatches: '30 seconds',
      scheduledMatches: '15 minutes',
      finishedMatches: '24 hours',
      defaultTTL: '15 minutes',
      ...config
    };
  }

  /**
   * Calculate dynamic TTL based on match statuses
   */
  calculateMatchesTTL(matches: FIVBMatch[]): string {
    try {
      if (!matches || matches.length === 0) {
        return this.ttlConfig.defaultTTL;
      }

      // Check for live matches (highest priority)
      const hasLiveMatches = matches.some(m => this.isLiveStatus(m.Status));
      if (hasLiveMatches) {
        console.log('Live matches detected, setting short TTL for real-time updates');
        return this.ttlConfig.liveMatches;
      }

      // Check for scheduled matches
      const hasScheduledMatches = matches.some(m => this.isScheduledStatus(m.Status));
      if (hasScheduledMatches) {
        console.log('Scheduled matches detected, setting medium TTL');
        return this.ttlConfig.scheduledMatches;
      }

      // Check for recent matches (finished today)
      const hasRecentMatches = matches.some(m => this.isRecentFinishedMatch(m));
      if (hasRecentMatches) {
        console.log('Recent finished matches detected, setting medium TTL');
        return this.ttlConfig.scheduledMatches;
      }

      // All matches are finished and old
      console.log('All matches are finished, setting long TTL');
      return this.ttlConfig.finishedMatches;

    } catch (error) {
      console.error('Error calculating TTL:', error);
      return this.ttlConfig.defaultTTL;
    }
  }

  /**
   * Calculate TTL for individual match based on its status and timing
   */
  calculateIndividualMatchTTL(match: FIVBMatch): string {
    try {
      // Live/running matches need frequent updates
      if (this.isLiveStatus(match.Status)) {
        return this.ttlConfig.liveMatches;
      }

      // Scheduled matches for today need more frequent updates
      if (this.isScheduledStatus(match.Status) && this.isToday(match.LocalDate)) {
        return '5 minutes'; // More frequent for today's scheduled matches
      }

      // Future scheduled matches
      if (this.isScheduledStatus(match.Status)) {
        return this.ttlConfig.scheduledMatches;
      }

      // Recent finished matches
      if (this.isFinishedStatus(match.Status) && this.isRecentFinishedMatch(match)) {
        return '1 hour'; // Medium TTL for recent results
      }

      // Old finished matches
      return this.ttlConfig.finishedMatches;

    } catch (error) {
      console.error('Error calculating individual match TTL:', error);
      return this.ttlConfig.defaultTTL;
    }
  }

  /**
   * Check if match status indicates live/running match
   */
  private isLiveStatus(status: string): boolean {
    if (!status) return false;
    
    const liveStatuses = ['running', 'live', 'in progress', 'playing'];
    return liveStatuses.includes(status.toLowerCase().trim());
  }

  /**
   * Check if match status indicates scheduled/future match
   */
  private isScheduledStatus(status: string): boolean {
    if (!status) return true; // Default to scheduled if no status
    
    const scheduledStatuses = ['scheduled', 'pending', 'upcoming', 'future'];
    return scheduledStatuses.includes(status.toLowerCase().trim());
  }

  /**
   * Check if match status indicates finished match
   */
  private isFinishedStatus(status: string): boolean {
    if (!status) return false;
    
    const finishedStatuses = ['finished', 'completed', 'ended', 'final'];
    return finishedStatuses.includes(status.toLowerCase().trim());
  }

  /**
   * Check if match date is today
   */
  private isToday(matchDate: string): boolean {
    try {
      if (!matchDate) return false;
      
      const today = new Date().toISOString().split('T')[0];
      const normalizedMatchDate = new Date(matchDate).toISOString().split('T')[0];
      
      return normalizedMatchDate === today;
    } catch {
      return false;
    }
  }

  /**
   * Check if match is a recent finished match (finished today or yesterday)
   */
  private isRecentFinishedMatch(match: FIVBMatch): boolean {
    try {
      if (!this.isFinishedStatus(match.Status) || !match.LocalDate) {
        return false;
      }

      const matchDate = new Date(match.LocalDate);
      const now = new Date();
      const daysDifference = Math.floor((now.getTime() - matchDate.getTime()) / (24 * 60 * 60 * 1000));
      
      // Consider matches finished within last 2 days as "recent"
      return daysDifference <= 2;
    } catch {
      return false;
    }
  }

  /**
   * Generate cache invalidation triggers for status changes
   */
  generateInvalidationTriggers(
    oldMatches: FIVBMatch[], 
    newMatches: FIVBMatch[]
  ): CacheInvalidationTrigger[] {
    const triggers: CacheInvalidationTrigger[] = [];
    
    try {
      // Create maps for quick lookup
      const oldMatchMap = new Map(oldMatches.map(m => [m.No, m]));
      const newMatchMap = new Map(newMatches.map(m => [m.No, m]));
      
      // Check for status changes
      for (const [matchNo, newMatch] of newMatchMap) {
        const oldMatch = oldMatchMap.get(matchNo);
        
        if (oldMatch && oldMatch.Status !== newMatch.Status) {
          triggers.push({
            matchNo: matchNo,
            oldStatus: oldMatch.Status,
            newStatus: newMatch.Status,
            timestamp: new Date().toISOString()
          });
        }
      }
      
      console.log(`Generated ${triggers.length} cache invalidation triggers`);
      return triggers;
      
    } catch (error) {
      console.error('Error generating invalidation triggers:', error);
      return [];
    }
  }

  /**
   * Determine if cache should be invalidated based on status change
   */
  shouldInvalidateCache(trigger: CacheInvalidationTrigger): boolean {
    try {
      // Always invalidate when transitioning to/from live status
      if (this.isLiveStatus(trigger.oldStatus) || this.isLiveStatus(trigger.newStatus)) {
        return true;
      }

      // Invalidate when match goes from scheduled to finished
      if (this.isScheduledStatus(trigger.oldStatus) && this.isFinishedStatus(trigger.newStatus)) {
        return true;
      }

      // Invalidate when match status changes significantly
      const significantChanges = [
        'scheduled -> running',
        'running -> finished',
        'scheduled -> cancelled',
        'running -> suspended',
        'suspended -> running',
        'postponed -> scheduled'
      ];

      const changePattern = `${trigger.oldStatus.toLowerCase()} -> ${trigger.newStatus.toLowerCase()}`;
      
      return significantChanges.some(pattern => {
        const [from, to] = pattern.split(' -> ');
        return this.matchesStatus(trigger.oldStatus, from) && this.matchesStatus(trigger.newStatus, to);
      });

    } catch (error) {
      console.error('Error determining cache invalidation:', error);
      return true; // Default to invalidating on error
    }
  }

  /**
   * Helper to check if a status matches a category
   */
  private matchesStatus(status: string, category: string): boolean {
    const normalizedStatus = status.toLowerCase().trim();
    const normalizedCategory = category.toLowerCase().trim();
    
    switch (normalizedCategory) {
      case 'scheduled':
        return this.isScheduledStatus(normalizedStatus);
      case 'running':
        return this.isLiveStatus(normalizedStatus);
      case 'finished':
        return this.isFinishedStatus(normalizedStatus);
      case 'cancelled':
        return ['cancelled', 'canceled'].includes(normalizedStatus);
      case 'suspended':
        return ['suspended', 'paused'].includes(normalizedStatus);
      case 'postponed':
        return ['postponed', 'delayed'].includes(normalizedStatus);
      default:
        return normalizedStatus.includes(normalizedCategory);
    }
  }

  /**
   * Get cache statistics and health information
   */
  getCacheStatistics(matches: FIVBMatch[]): {
    totalMatches: number;
    liveMatches: number;
    scheduledMatches: number;
    finishedMatches: number;
    recommendedTTL: string;
    cacheEfficiency: string;
    nextRecommendedSync: string;
  } {
    try {
      const totalMatches = matches.length;
      const liveMatches = matches.filter(m => this.isLiveStatus(m.Status)).length;
      const scheduledMatches = matches.filter(m => this.isScheduledStatus(m.Status)).length;
      const finishedMatches = matches.filter(m => this.isFinishedStatus(m.Status)).length;
      
      const recommendedTTL = this.calculateMatchesTTL(matches);
      
      // Calculate cache efficiency based on match distribution
      let cacheEfficiency = 'High';
      if (liveMatches > 0) {
        cacheEfficiency = 'Low'; // Need frequent updates
      } else if (scheduledMatches > totalMatches * 0.5) {
        cacheEfficiency = 'Medium'; // Moderate update frequency
      }
      
      // Calculate next recommended sync time
      const ttlMillis = this.parseTTLToMilliseconds(recommendedTTL);
      const nextSync = new Date(Date.now() + ttlMillis).toISOString();
      
      return {
        totalMatches,
        liveMatches,
        scheduledMatches,
        finishedMatches,
        recommendedTTL,
        cacheEfficiency,
        nextRecommendedSync: nextSync
      };
      
    } catch (error) {
      console.error('Error calculating cache statistics:', error);
      return {
        totalMatches: 0,
        liveMatches: 0,
        scheduledMatches: 0,
        finishedMatches: 0,
        recommendedTTL: this.ttlConfig.defaultTTL,
        cacheEfficiency: 'Unknown',
        nextRecommendedSync: new Date().toISOString()
      };
    }
  }

  /**
   * Parse TTL string to milliseconds for calculations
   */
  private parseTTLToMilliseconds(ttl: string): number {
    try {
      const ttlLower = ttl.toLowerCase().trim();
      
      if (ttlLower.includes('second')) {
        const seconds = parseInt(ttlLower.match(/\d+/)?.[0] || '30');
        return seconds * 1000;
      }
      
      if (ttlLower.includes('minute')) {
        const minutes = parseInt(ttlLower.match(/\d+/)?.[0] || '15');
        return minutes * 60 * 1000;
      }
      
      if (ttlLower.includes('hour')) {
        const hours = parseInt(ttlLower.match(/\d+/)?.[0] || '1');
        return hours * 60 * 60 * 1000;
      }
      
      // Default to 15 minutes
      return 15 * 60 * 1000;
      
    } catch {
      return 15 * 60 * 1000; // Default to 15 minutes
    }
  }

  /**
   * Create cache key for tournament matches
   */
  createCacheKey(tournamentNo: string, additionalData?: Record<string, string>): string {
    try {
      let key = `matches:tournament:${tournamentNo}`;
      
      if (additionalData) {
        const additionalKeys = Object.entries(additionalData)
          .map(([k, v]) => `${k}:${v}`)
          .join(':');
        key += `:${additionalKeys}`;
      }
      
      return key;
    } catch (error) {
      console.error('Error creating cache key:', error);
      return `matches:tournament:${tournamentNo}`;
    }
  }

  /**
   * Update TTL configuration
   */
  updateTTLConfig(newConfig: Partial<CacheTTLConfig>): void {
    this.ttlConfig = {
      ...this.ttlConfig,
      ...newConfig
    };
    console.log('Cache TTL configuration updated:', this.ttlConfig);
  }

  /**
   * Get current TTL configuration
   */
  getTTLConfig(): CacheTTLConfig {
    return { ...this.ttlConfig };
  }
}