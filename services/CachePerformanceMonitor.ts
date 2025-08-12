/**
 * Cache Performance Monitor for validating cache tier performance requirements
 * Ensures Supabase cache serves data under 500ms and memory cache under 100ms
 */
export class CachePerformanceMonitor {
  private static performanceData: Map<string, number[]> = new Map();
  private static thresholds = {
    memory: 100, // sub-100ms requirement
    localStorage: 200, // reasonable local storage threshold
    supabase: 500, // under 500ms requirement
    api: 5000 // API fallback threshold
  };

  /**
   * Start performance measurement for a cache operation
   */
  static startMeasurement(source: string, operation: string): () => number {
    const key = `${source}_${operation}`;
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.recordPerformance(key, duration);
      return duration;
    };
  }

  /**
   * Record performance measurement
   */
  static recordPerformance(key: string, duration: number): void {
    if (!this.performanceData.has(key)) {
      this.performanceData.set(key, []);
    }
    
    const measurements = this.performanceData.get(key)!;
    measurements.push(duration);
    
    // Keep only last 100 measurements to prevent memory growth
    if (measurements.length > 100) {
      measurements.shift();
    }
  }

  /**
   * Validate cache tier performance against requirements
   */
  static validateCachePerformance(): {
    overall: 'PASS' | 'FAIL';
    details: {
      memory: { status: 'PASS' | 'FAIL'; avgMs: number; threshold: number; measurements: number };
      supabase: { status: 'PASS' | 'FAIL'; avgMs: number; threshold: number; measurements: number };
      localStorage: { status: 'PASS' | 'FAIL'; avgMs: number; threshold: number; measurements: number };
      api: { status: 'PASS' | 'FAIL'; avgMs: number; threshold: number; measurements: number };
    };
    recommendations: string[];
  } {
    const results = {
      memory: this.validateTierPerformance('memory'),
      supabase: this.validateTierPerformance('supabase'), 
      localStorage: this.validateTierPerformance('localStorage'),
      api: this.validateTierPerformance('api')
    };

    const allPassing = Object.values(results).every(result => result.status === 'PASS');
    const recommendations = this.generateRecommendations(results);

    return {
      overall: allPassing ? 'PASS' : 'FAIL',
      details: results,
      recommendations
    };
  }

  /**
   * Get performance statistics for a specific cache tier
   */
  static getTierStats(tier: string): {
    avgMs: number;
    minMs: number;
    maxMs: number;
    p50: number;
    p95: number;
    p99: number;
    measurements: number;
    threshold: number;
    isPerformant: boolean;
  } | null {
    const measurements = this.getMeasurementsForTier(tier);
    if (measurements.length === 0) return null;

    const sorted = [...measurements].sort((a, b) => a - b);
    const sum = measurements.reduce((acc, val) => acc + val, 0);
    const threshold = this.thresholds[tier as keyof typeof this.thresholds] || 1000;

    return {
      avgMs: sum / measurements.length,
      minMs: Math.min(...measurements),
      maxMs: Math.max(...measurements),
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      measurements: measurements.length,
      threshold,
      isPerformant: (sum / measurements.length) < threshold
    };
  }

  /**
   * Monitor cache tier performance in real-time
   */
  static async monitorCacheTierPerformance(tier: string, operation: () => Promise<any>): Promise<{
    result: any;
    duration: number;
    performant: boolean;
    threshold: number;
  }> {
    const endMeasurement = this.startMeasurement(tier, 'operation');
    
    try {
      const result = await operation();
      const duration = endMeasurement();
      const threshold = this.thresholds[tier as keyof typeof this.thresholds] || 1000;
      
      return {
        result,
        duration,
        performant: duration < threshold,
        threshold
      };
    } catch (error) {
      endMeasurement(); // Still record the time even on error
      throw error;
    }
  }

  /**
   * Generate performance report for all cache tiers
   */
  static generatePerformanceReport(): {
    timestamp: string;
    summary: {
      totalMeasurements: number;
      performantTiers: number;
      underperformingTiers: string[];
    };
    tierDetails: Record<string, any>;
    recommendations: string[];
  } {
    const tierDetails: Record<string, any> = {};
    const underperformingTiers: string[] = [];
    let totalMeasurements = 0;

    for (const tier of ['memory', 'localStorage', 'supabase', 'api']) {
      const stats = this.getTierStats(tier);
      if (stats) {
        tierDetails[tier] = stats;
        totalMeasurements += stats.measurements;
        
        if (!stats.isPerformant) {
          underperformingTiers.push(tier);
        }
      }
    }

    const performantTiers = Object.keys(tierDetails).length - underperformingTiers.length;
    const validation = this.validateCachePerformance();

    return {
      timestamp: new Date().toISOString(),
      summary: {
        totalMeasurements,
        performantTiers,
        underperformingTiers
      },
      tierDetails,
      recommendations: validation.recommendations
    };
  }

  /**
   * Clear all performance data
   */
  static clearPerformanceData(): void {
    this.performanceData.clear();
  }

  /**
   * Set custom performance thresholds
   */
  static setPerformanceThresholds(thresholds: Partial<typeof CachePerformanceMonitor.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Export performance data for analysis
   */
  static exportPerformanceData(): Record<string, number[]> {
    const exported: Record<string, number[]> = {};
    for (const [key, measurements] of this.performanceData.entries()) {
      exported[key] = [...measurements];
    }
    return exported;
  }

  // Private helper methods

  private static validateTierPerformance(tier: string): {
    status: 'PASS' | 'FAIL';
    avgMs: number;
    threshold: number;
    measurements: number;
  } {
    const measurements = this.getMeasurementsForTier(tier);
    const threshold = this.thresholds[tier as keyof typeof this.thresholds] || 1000;
    
    if (measurements.length === 0) {
      return {
        status: 'PASS', // No data means no failures
        avgMs: 0,
        threshold,
        measurements: 0
      };
    }

    const avgMs = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    
    return {
      status: avgMs < threshold ? 'PASS' : 'FAIL',
      avgMs,
      threshold,
      measurements: measurements.length
    };
  }

  private static getMeasurementsForTier(tier: string): number[] {
    const allMeasurements: number[] = [];
    
    for (const [key, measurements] of this.performanceData.entries()) {
      if (key.startsWith(tier)) {
        allMeasurements.push(...measurements);
      }
    }
    
    return allMeasurements;
  }

  private static generateRecommendations(results: Record<string, any>): string[] {
    const recommendations: string[] = [];

    if (results.memory.status === 'FAIL') {
      recommendations.push(
        `Memory cache averaging ${results.memory.avgMs.toFixed(1)}ms exceeds 100ms requirement. ` +
        'Consider increasing memory allocation or optimizing data structures.'
      );
    }

    if (results.supabase.status === 'FAIL') {
      recommendations.push(
        `Supabase cache averaging ${results.supabase.avgMs.toFixed(1)}ms exceeds 500ms requirement. ` +
        'Check network latency and consider database optimization.'
      );
    }

    if (results.localStorage.status === 'FAIL') {
      recommendations.push(
        `Local storage averaging ${results.localStorage.avgMs.toFixed(1)}ms is underperforming. ` +
        'Consider reducing stored data size or using more efficient serialization.'
      );
    }

    if (results.api.status === 'FAIL') {
      recommendations.push(
        `API calls averaging ${results.api.avgMs.toFixed(1)}ms are slow. ` +
        'This is expected but consider improving cache hit ratios to reduce API dependency.'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('All cache tiers are performing within acceptable thresholds.');
    }

    return recommendations;
  }
}