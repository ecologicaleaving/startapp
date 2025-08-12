import { CacheStats, CacheTier } from '../types/cache';

/**
 * Cache statistics and performance monitoring service
 * Tracks hit ratios, response times, and cache performance metrics
 */
export class CacheStatsService {
  private static instance: CacheStatsService;
  private stats: CacheStats = {
    memoryHits: 0,
    supabaseHits: 0,
    localHits: 0,
    offlineHits: 0,
    apiCalls: 0,
    totalRequests: 0,
    hitRatio: 0
  };

  private responseTimes: { [key in CacheTier]: number[] } = {
    memory: [],
    localStorage: [],
    offline: [],
    supabase: [],
    api: []
  };

  private startTimes: Map<string, number> = new Map();

  private constructor() {}

  static getInstance(): CacheStatsService {
    if (!CacheStatsService.instance) {
      CacheStatsService.instance = new CacheStatsService();
    }
    return CacheStatsService.instance;
  }

  /**
   * Record a cache hit for specific tier
   */
  recordHit(tier: CacheTier, requestId?: string): void {
    this.stats.totalRequests++;
    
    switch (tier) {
      case 'memory':
        this.stats.memoryHits++;
        break;
      case 'localStorage':
        this.stats.localHits++;
        break;
      case 'offline':
        this.stats.offlineHits++;
        break;
      case 'supabase':
        this.stats.supabaseHits++;
        break;
      case 'api':
        this.stats.apiCalls++;
        break;
    }

    this.updateHitRatio();
    
    if (requestId) {
      this.recordResponseTime(tier, requestId);
    }
  }

  /**
   * Start timing a request
   */
  startTimer(requestId: string): void {
    this.startTimes.set(requestId, Date.now());
  }

  /**
   * Record response time for a tier
   */
  recordResponseTime(tier: CacheTier, requestId: string): void {
    const startTime = this.startTimes.get(requestId);
    if (startTime) {
      const responseTime = Date.now() - startTime;
      this.responseTimes[tier].push(responseTime);
      
      // Keep only last 100 response times per tier
      if (this.responseTimes[tier].length > 100) {
        this.responseTimes[tier] = this.responseTimes[tier].slice(-100);
      }
      
      this.startTimes.delete(requestId);
    }
  }

  /**
   * Get current cache statistics
   */
  getStats(): CacheStats & {
    averageResponseTimes: { [key in CacheTier]: number };
    cacheEfficiency: number;
    apiReductionPercentage: number;
  } {
    const averageResponseTimes = this.calculateAverageResponseTimes();
    const cacheEfficiency = this.calculateCacheEfficiency();
    const apiReductionPercentage = this.calculateApiReductionPercentage();

    return {
      ...this.stats,
      averageResponseTimes,
      cacheEfficiency,
      apiReductionPercentage
    };
  }

  /**
   * Get detailed performance metrics
   */
  getDetailedMetrics() {
    const stats = this.getStats();
    
    return {
      ...stats,
      breakdown: {
        memoryHitPercentage: (this.stats.memoryHits / this.stats.totalRequests) * 100,
        localStorageHitPercentage: (this.stats.localHits / this.stats.totalRequests) * 100,
        offlineHitPercentage: (this.stats.offlineHits / this.stats.totalRequests) * 100,
        supabaseHitPercentage: (this.stats.supabaseHits / this.stats.totalRequests) * 100,
        apiCallPercentage: (this.stats.apiCalls / this.stats.totalRequests) * 100
      },
      responseTimes: {
        memory: {
          min: Math.min(...this.responseTimes.memory),
          max: Math.max(...this.responseTimes.memory),
          average: this.calculateAverage(this.responseTimes.memory),
          median: this.calculateMedian(this.responseTimes.memory)
        },
        localStorage: {
          min: Math.min(...this.responseTimes.localStorage),
          max: Math.max(...this.responseTimes.localStorage),
          average: this.calculateAverage(this.responseTimes.localStorage),
          median: this.calculateMedian(this.responseTimes.localStorage)
        },
        offline: {
          min: Math.min(...this.responseTimes.offline),
          max: Math.max(...this.responseTimes.offline),
          average: this.calculateAverage(this.responseTimes.offline),
          median: this.calculateMedian(this.responseTimes.offline)
        },
        supabase: {
          min: Math.min(...this.responseTimes.supabase),
          max: Math.max(...this.responseTimes.supabase),
          average: this.calculateAverage(this.responseTimes.supabase),
          median: this.calculateMedian(this.responseTimes.supabase)
        },
        api: {
          min: Math.min(...this.responseTimes.api),
          max: Math.max(...this.responseTimes.api),
          average: this.calculateAverage(this.responseTimes.api),
          median: this.calculateMedian(this.responseTimes.api)
        }
      }
    };
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.stats = {
      memoryHits: 0,
      supabaseHits: 0,
      localHits: 0,
      offlineHits: 0,
      apiCalls: 0,
      totalRequests: 0,
      hitRatio: 0
    };

    this.responseTimes = {
      memory: [],
      localStorage: [],
      offline: [],
      supabase: [],
      api: []
    };

    this.startTimes.clear();
  }

  /**
   * Export statistics for monitoring/analytics
   */
  exportStats() {
    return {
      timestamp: new Date().toISOString(),
      stats: this.getDetailedMetrics(),
      responseTimes: this.responseTimes
    };
  }

  /**
   * Check if cache performance meets targets
   */
  checkPerformanceTargets(): {
    hitRatioTarget: boolean; // > 80%
    apiReductionTarget: boolean; // > 70%
    memoryResponseTimeTarget: boolean; // < 50ms
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  } {
    const stats = this.getStats();
    const hitRatioTarget = stats.hitRatio > 0.8;
    const apiReductionTarget = stats.apiReductionPercentage > 0.7;
    const memoryResponseTime = stats.averageResponseTimes.memory;
    const memoryResponseTimeTarget = memoryResponseTime < 50;

    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    const targetsMet = [hitRatioTarget, apiReductionTarget, memoryResponseTimeTarget].filter(Boolean).length;
    
    if (targetsMet === 3) overallHealth = 'excellent';
    else if (targetsMet === 2) overallHealth = 'good';
    else if (targetsMet === 1) overallHealth = 'fair';
    else overallHealth = 'poor';

    return {
      hitRatioTarget,
      apiReductionTarget,
      memoryResponseTimeTarget,
      overallHealth
    };
  }

  /**
   * Update hit ratio calculation
   */
  private updateHitRatio(): void {
    const totalCacheHits = this.stats.memoryHits + this.stats.supabaseHits + this.stats.localHits + this.stats.offlineHits;
    this.stats.hitRatio = this.stats.totalRequests > 0 ? totalCacheHits / this.stats.totalRequests : 0;
  }

  /**
   * Calculate average response times for each tier
   */
  private calculateAverageResponseTimes(): { [key in CacheTier]: number } {
    return {
      memory: this.calculateAverage(this.responseTimes.memory),
      localStorage: this.calculateAverage(this.responseTimes.localStorage),
      offline: this.calculateAverage(this.responseTimes.offline),
      supabase: this.calculateAverage(this.responseTimes.supabase),
      api: this.calculateAverage(this.responseTimes.api)
    };
  }

  /**
   * Calculate cache efficiency (cache hits vs total requests)
   */
  private calculateCacheEfficiency(): number {
    if (this.stats.totalRequests === 0) return 0;
    const cacheHits = this.stats.totalRequests - this.stats.apiCalls;
    return (cacheHits / this.stats.totalRequests) * 100;
  }

  /**
   * Calculate API call reduction percentage
   */
  private calculateApiReductionPercentage(): number {
    if (this.stats.totalRequests === 0) return 0;
    return ((this.stats.totalRequests - this.stats.apiCalls) / this.stats.totalRequests) * 100;
  }

  /**
   * Calculate average of number array
   */
  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Calculate median of number array
   */
  private calculateMedian(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sorted = [...numbers].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }
}