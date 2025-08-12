import { SupabaseClient } from 'supabase';

interface PerformanceMetrics {
  operationName: string;
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  details?: any;
}

interface TournamentPriority {
  tournamentNo: string;
  priority: number;
  type: 'FIVB' | 'CEV' | 'BPT' | 'LOCAL';
  matchCount: number;
}

interface ResourceUsage {
  timestamp: string;
  concurrent_tournaments: number;
  total_matches: number;
  api_calls_per_minute: number;
  average_response_time: number;
  error_rate: number;
}

/**
 * PerformanceMonitor - Advanced monitoring and optimization for high-volume tournaments
 * Handles priority queuing, resource management, and bottleneck detection
 */
export class PerformanceMonitor {
  private supabase: SupabaseClient;
  private metrics: PerformanceMetrics[] = [];
  private apiCallTimes: number[] = [];
  private maxConcurrentLimit = 5;
  private apiRateLimit = 10; // calls per minute per tournament
  private apiCallCounts: Map<string, number[]> = new Map();

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Prioritize tournaments based on type and importance
   * FIVB > CEV > BPT > LOCAL
   */
  prioritizeTournaments(tournaments: any[]): TournamentPriority[] {
    return tournaments
      .map(tournament => ({
        tournamentNo: tournament.no,
        priority: this.calculateTournamentPriority(tournament),
        type: this.classifyTournamentType(tournament),
        matchCount: 0, // Will be updated when matches are loaded
      }))
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Calculate tournament priority score
   */
  private calculateTournamentPriority(tournament: any): number {
    const code = tournament.code?.toLowerCase() || '';
    const name = tournament.name?.toLowerCase() || '';

    // FIVB tournaments get highest priority (100-90)
    if (name.includes('fivb') || name.includes('world tour') || name.includes('world championship')) {
      return 100;
    }

    // CEV tournaments get high priority (89-80)
    if (name.includes('cev') || name.includes('european') || code.includes('cev')) {
      return 85;
    }

    // BPT tournaments get medium priority (79-70)
    if (name.includes('bpt') || name.includes('beach pro tour') || name.includes('elite16')) {
      return 75;
    }

    // Local/other tournaments get lower priority (69-60)
    return 65;
  }

  /**
   * Classify tournament type for monitoring
   */
  private classifyTournamentType(tournament: any): 'FIVB' | 'CEV' | 'BPT' | 'LOCAL' {
    const code = tournament.code?.toLowerCase() || '';
    const name = tournament.name?.toLowerCase() || '';

    if (name.includes('fivb') || name.includes('world tour')) {
      return 'FIVB';
    }
    if (name.includes('cev') || name.includes('european')) {
      return 'CEV';
    }
    if (name.includes('bpt') || name.includes('beach pro tour')) {
      return 'BPT';
    }
    return 'LOCAL';
  }

  /**
   * Check if tournament can be processed based on rate limits
   */
  canProcessTournament(tournamentNo: string): boolean {
    const now = Date.now();
    const minuteAgo = now - (60 * 1000);
    
    // Get API calls for this tournament in the last minute
    const calls = this.apiCallCounts.get(tournamentNo) || [];
    const recentCalls = calls.filter(time => time > minuteAgo);
    
    // Update the stored calls (keep only recent ones)
    this.apiCallCounts.set(tournamentNo, recentCalls);
    
    // Check if under rate limit
    return recentCalls.length < this.apiRateLimit;
  }

  /**
   * Record API call for rate limiting
   */
  recordApiCall(tournamentNo: string): void {
    const now = Date.now();
    const calls = this.apiCallCounts.get(tournamentNo) || [];
    calls.push(now);
    this.apiCallCounts.set(tournamentNo, calls);
  }

  /**
   * Start performance monitoring for an operation
   */
  startOperation(operationName: string): string {
    const operationId = `${operationName}_${Date.now()}_${Math.random()}`;
    const metric: PerformanceMetrics = {
      operationName,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      success: false,
    };
    
    this.metrics.push(metric);
    return operationId;
  }

  /**
   * End performance monitoring for an operation
   */
  endOperation(operationId: string, success: boolean = true, details?: any): void {
    const operationIndex = this.metrics.findIndex(m => 
      `${m.operationName}_${m.startTime}_` === operationId.substring(0, operationId.lastIndexOf('_'))
    );
    
    if (operationIndex >= 0) {
      const metric = this.metrics[operationIndex];
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.success = success;
      metric.details = details;
    }
  }

  /**
   * Monitor API response time
   */
  recordApiResponseTime(duration: number): void {
    this.apiCallTimes.push(duration);
    
    // Keep only recent API call times (last 100 calls)
    if (this.apiCallTimes.length > 100) {
      this.apiCallTimes = this.apiCallTimes.slice(-50);
    }
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): {
    averageOperationTime: number;
    successRate: number;
    averageApiResponseTime: number;
    totalOperations: number;
    recentOperations: PerformanceMetrics[];
  } {
    const recentOperations = this.metrics.filter(m => 
      Date.now() - m.startTime < 300000 // Last 5 minutes
    );

    const completedOperations = recentOperations.filter(m => m.endTime > 0);
    
    const averageOperationTime = completedOperations.length > 0
      ? completedOperations.reduce((sum, m) => sum + m.duration, 0) / completedOperations.length
      : 0;

    const successRate = completedOperations.length > 0
      ? completedOperations.filter(m => m.success).length / completedOperations.length
      : 1;

    const averageApiResponseTime = this.apiCallTimes.length > 0
      ? this.apiCallTimes.reduce((sum, time) => sum + time, 0) / this.apiCallTimes.length
      : 0;

    return {
      averageOperationTime,
      successRate,
      averageApiResponseTime,
      totalOperations: this.metrics.length,
      recentOperations,
    };
  }

  /**
   * Detect performance bottlenecks
   */
  detectBottlenecks(): {
    hasBottlenecks: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const metrics = this.getPerformanceMetrics();
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check average response time
    if (metrics.averageApiResponseTime > 5000) { // 5 seconds
      issues.push('High API response times detected');
      recommendations.push('Consider implementing request queuing or reducing concurrent requests');
    }

    // Check success rate
    if (metrics.successRate < 0.9) { // Below 90%
      issues.push('Low success rate detected');
      recommendations.push('Implement more robust retry logic and error handling');
    }

    // Check operation performance
    if (metrics.averageOperationTime > 30000) { // 30 seconds
      issues.push('Slow operation performance detected');
      recommendations.push('Optimize batch processing and reduce concurrent tournament limit');
    }

    // Check API call distribution
    const apiCallDistribution = Array.from(this.apiCallCounts.values());
    const maxCalls = Math.max(...apiCallDistribution.map(calls => calls.length));
    
    if (maxCalls > this.apiRateLimit * 0.9) {
      issues.push('Approaching API rate limits');
      recommendations.push('Implement tournament priority queuing to distribute load');
    }

    return {
      hasBottlenecks: issues.length > 0,
      issues,
      recommendations,
    };
  }

  /**
   * Get current resource usage
   */
  getCurrentResourceUsage(concurrentTournaments: number, totalMatches: number): ResourceUsage {
    const metrics = this.getPerformanceMetrics();
    
    // Calculate API calls per minute
    const oneMinuteAgo = Date.now() - (60 * 1000);
    const recentApiCalls = Array.from(this.apiCallCounts.values())
      .flatMap(calls => calls)
      .filter(time => time > oneMinuteAgo)
      .length;

    return {
      timestamp: new Date().toISOString(),
      concurrent_tournaments: concurrentTournaments,
      total_matches: totalMatches,
      api_calls_per_minute: recentApiCalls,
      average_response_time: metrics.averageApiResponseTime,
      error_rate: 1 - metrics.successRate,
    };
  }

  /**
   * Log performance metrics to database for monitoring
   */
  async logPerformanceMetrics(resourceUsage: ResourceUsage): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sync_performance_logs')
        .insert({
          timestamp: resourceUsage.timestamp,
          concurrent_tournaments: resourceUsage.concurrent_tournaments,
          total_matches: resourceUsage.total_matches,
          api_calls_per_minute: resourceUsage.api_calls_per_minute,
          average_response_time: resourceUsage.average_response_time,
          error_rate: resourceUsage.error_rate,
          function_type: 'live_score_sync',
        });

      if (error) {
        console.error('Failed to log performance metrics:', error);
      }
    } catch (error) {
      // Non-blocking - don't fail sync if logging fails
      console.warn('Performance logging failed:', error);
    }
  }

  /**
   * Suggest optimal batch size based on current performance
   */
  getOptimalBatchSize(): number {
    const metrics = this.getPerformanceMetrics();
    
    // Start with default batch size
    let optimalSize = this.maxConcurrentLimit;

    // Reduce batch size if performance is poor
    if (metrics.averageApiResponseTime > 3000) {
      optimalSize = Math.max(2, Math.floor(optimalSize * 0.7));
    }
    
    // Reduce further if success rate is low
    if (metrics.successRate < 0.85) {
      optimalSize = Math.max(1, Math.floor(optimalSize * 0.8));
    }

    // Increase batch size if performance is good
    if (metrics.averageApiResponseTime < 1000 && metrics.successRate > 0.95) {
      optimalSize = Math.min(8, optimalSize + 1);
    }

    console.log(`Optimal batch size calculated: ${optimalSize} (based on avg response: ${metrics.averageApiResponseTime}ms, success rate: ${(metrics.successRate * 100).toFixed(1)}%)`);
    
    return optimalSize;
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  cleanup(): void {
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    // Keep only recent metrics
    this.metrics = this.metrics.filter(m => m.startTime > fiveMinutesAgo);
    
    // Clean up API call tracking
    for (const [tournamentNo, calls] of this.apiCallCounts.entries()) {
      const recentCalls = calls.filter(time => time > fiveMinutesAgo);
      if (recentCalls.length === 0) {
        this.apiCallCounts.delete(tournamentNo);
      } else {
        this.apiCallCounts.set(tournamentNo, recentCalls);
      }
    }
    
    // Keep only recent API call times
    this.apiCallTimes = this.apiCallTimes.slice(-50);
  }
}