/**
 * ErrorHandler - Centralized error handling for live score sync operations
 * Provides comprehensive logging and graceful error recovery
 */
export class ErrorHandler {
  /**
   * Handle sync errors with comprehensive logging
   */
  async handleSyncError(error: any, context: {
    function: string;
    timestamp: string;
    additionalData?: any;
  }): Promise<{
    message: string;
    details: any;
    shouldRetry: boolean;
  }> {
    const errorInfo = {
      message: this.extractErrorMessage(error),
      details: {
        originalError: error.message || error.toString(),
        stack: error.stack,
        context,
        timestamp: context.timestamp,
      },
      shouldRetry: this.shouldRetryError(error),
    };

    // Log error with context
    console.error('Sync Error Details:', JSON.stringify(errorInfo, null, 2));

    // Categorize error type
    const errorCategory = this.categorizeError(error);
    console.error(`Error Category: ${errorCategory}`);

    return errorInfo;
  }

  /**
   * Extract meaningful error message from various error types
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    if (error.error_description) {
      return error.error_description;
    }

    if (error.details) {
      return error.details;
    }

    return 'Unknown error occurred during live score sync';
  }

  /**
   * Determine if error is retryable
   */
  private shouldRetryError(error: any): boolean {
    const errorMessage = this.extractErrorMessage(error).toLowerCase();
    
    // Network-related errors that should be retried
    const retryableErrors = [
      'network error',
      'timeout',
      'connection refused',
      'temporarily unavailable',
      'rate limit',
      'service unavailable',
      '502',
      '503',
      '504',
    ];

    // Authentication or configuration errors should not be retried
    const nonRetryableErrors = [
      'unauthorized',
      'forbidden',
      'invalid api key',
      'missing environment variable',
      '401',
      '403',
      '404',
    ];

    // Check for non-retryable errors first
    for (const nonRetryable of nonRetryableErrors) {
      if (errorMessage.includes(nonRetryable)) {
        return false;
      }
    }

    // Check for retryable errors
    for (const retryable of retryableErrors) {
      if (errorMessage.includes(retryable)) {
        return true;
      }
    }

    // Default to not retrying for unknown errors to prevent infinite loops
    return false;
  }

  /**
   * Categorize error for monitoring and alerting
   */
  private categorizeError(error: any): string {
    const errorMessage = this.extractErrorMessage(error).toLowerCase();

    if (errorMessage.includes('api') || errorMessage.includes('fivb')) {
      return 'EXTERNAL_API_ERROR';
    }

    if (errorMessage.includes('database') || errorMessage.includes('supabase')) {
      return 'DATABASE_ERROR';
    }

    if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
      return 'NETWORK_ERROR';
    }

    if (errorMessage.includes('parse') || errorMessage.includes('xml')) {
      return 'DATA_PARSING_ERROR';
    }

    if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
      return 'AUTHENTICATION_ERROR';
    }

    if (errorMessage.includes('rate limit')) {
      return 'RATE_LIMIT_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  /**
   * Handle individual match sync errors
   */
  async handleMatchError(error: any, matchContext: {
    matchNo: string;
    tournamentNo: string;
    teamNames?: string;
  }): Promise<void> {
    const context = {
      function: 'match-sync',
      timestamp: new Date().toISOString(),
      additionalData: matchContext,
    };

    const errorResult = await this.handleSyncError(error, context);
    
    console.error(`Match ${matchContext.matchNo} sync error:`, errorResult.message);
    
    // Don't throw - allow other matches to continue processing
    // This implements the error isolation requirement
  }

  /**
   * Handle tournament-level sync errors
   */
  async handleTournamentError(error: any, tournamentContext: {
    tournamentNo: string;
    tournamentName?: string;
    tournamentCode?: string;
  }): Promise<void> {
    const context = {
      function: 'tournament-sync',
      timestamp: new Date().toISOString(),
      additionalData: tournamentContext,
    };

    const errorResult = await this.handleSyncError(error, context);
    
    console.error(`Tournament ${tournamentContext.tournamentNo} sync error:`, errorResult.message);
    
    // Don't throw - allow other tournaments to continue processing
    // This implements the error isolation requirement
  }
}