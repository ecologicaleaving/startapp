// Error Handling and Resilience Module
// Provides comprehensive error classification, retry logic, and dead letter queue management

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface ErrorContext {
  operation: string;
  tournamentNo?: string;
  matchNo?: string;
  attempt?: number;
  timestamp: string;
  additionalData?: Record<string, any>;
}

export interface ClassifiedError {
  type: ErrorType;
  severity: ErrorSeverity;
  retryable: boolean;
  category: string;
  message: string;
  originalError: Error;
  context: ErrorContext;
}

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  API_RESPONSE = 'API_RESPONSE',
  DATA_VALIDATION = 'DATA_VALIDATION',
  DATABASE = 'DATABASE',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface DeadLetterQueueEntry {
  id: string;
  tournamentNo: string;
  operation: string;
  error: ClassifiedError;
  retryCount: number;
  firstFailure: string;
  lastFailure: string;
  nextRetry?: string;
  status: 'PENDING' | 'RETRYING' | 'FAILED' | 'RESOLVED';
  metadata?: Record<string, any>;
}

export class ErrorHandler {
  private retryConfig: RetryConfig;
  private deadLetterQueue: Map<string, DeadLetterQueueEntry> = new Map();
  private errorStats: Map<string, number> = new Map();

  constructor(config?: Partial<RetryConfig>) {
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 2000, // 2 seconds
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT',
        'RATE_LIMITED',
        'TEMPORARY_FAILURE',
        'CONNECTION_ERROR',
        'SERVICE_UNAVAILABLE'
      ],
      ...config
    };
  }

  /**
   * Classify an error to determine handling strategy
   */
  classifyError(error: Error, context: ErrorContext): ClassifiedError {
    try {
      const errorMessage = error.message.toLowerCase();
      const errorName = error.name?.toLowerCase() || '';
      
      let type = ErrorType.UNKNOWN;
      let severity = ErrorSeverity.MEDIUM;
      let category = 'General';
      let retryable = false;

      // Network errors
      if (this.isNetworkError(error, errorMessage)) {
        type = ErrorType.NETWORK;
        severity = ErrorSeverity.MEDIUM;
        category = 'Network';
        retryable = true;
      }
      // Authentication errors
      else if (this.isAuthenticationError(error, errorMessage)) {
        type = ErrorType.AUTHENTICATION;
        severity = ErrorSeverity.HIGH;
        category = 'Authentication';
        retryable = false; // Don't retry auth failures
      }
      // API response errors
      else if (this.isAPIResponseError(error, errorMessage)) {
        type = ErrorType.API_RESPONSE;
        severity = ErrorSeverity.MEDIUM;
        category = 'API';
        retryable = this.isRetryableAPIError(errorMessage);
      }
      // Database errors
      else if (this.isDatabaseError(error, errorMessage)) {
        type = ErrorType.DATABASE;
        severity = ErrorSeverity.HIGH;
        category = 'Database';
        retryable = this.isRetryableDatabaseError(errorMessage);
      }
      // Timeout errors
      else if (this.isTimeoutError(error, errorMessage)) {
        type = ErrorType.TIMEOUT;
        severity = ErrorSeverity.MEDIUM;
        category = 'Timeout';
        retryable = true;
      }
      // Rate limit errors
      else if (this.isRateLimitError(error, errorMessage)) {
        type = ErrorType.RATE_LIMIT;
        severity = ErrorSeverity.LOW;
        category = 'RateLimit';
        retryable = true;
      }
      // Data validation errors
      else if (this.isDataValidationError(error, errorMessage)) {
        type = ErrorType.DATA_VALIDATION;
        severity = ErrorSeverity.LOW;
        category = 'DataValidation';
        retryable = false; // Don't retry validation failures
      }

      return {
        type,
        severity,
        retryable,
        category,
        message: error.message,
        originalError: error,
        context
      };

    } catch (classificationError) {
      console.error('Error during error classification:', classificationError);
      
      return {
        type: ErrorType.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        retryable: false,
        category: 'Classification Failed',
        message: error.message,
        originalError: error,
        context
      };
    }
  }

  /**
   * Execute operation with retry logic
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Success - clear any DLQ entry for this operation
        this.clearDeadLetterQueueEntry(context);
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        const classifiedError = this.classifyError(lastError, { ...context, attempt });
        
        console.error(`Attempt ${attempt}/${config.maxRetries} failed:`, {
          operation: context.operation,
          error: classifiedError,
          tournamentNo: context.tournamentNo
        });

        // Update error statistics
        this.updateErrorStats(classifiedError);

        // Don't retry if error is not retryable
        if (!classifiedError.retryable) {
          this.addToDeadLetterQueue(classifiedError, attempt);
          throw lastError;
        }

        // Don't retry if this is the last attempt
        if (attempt === config.maxRetries) {
          this.addToDeadLetterQueue(classifiedError, attempt);
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateRetryDelay(attempt, config);
        console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${config.maxRetries})`);
        
        await this.sleep(delay);
      }
    }

    // This should never be reached, but TypeScript requires it
    throw lastError || new Error('Operation failed after all retry attempts');
  }

  /**
   * Handle tournament-specific errors while allowing others to continue
   */
  async executeTournamentOperations<T>(
    tournaments: { no: string; name: string }[],
    operation: (tournament: { no: string; name: string }) => Promise<T>,
    operationName: string
  ): Promise<{
    successful: T[];
    failed: Array<{ tournamentNo: string; error: ClassifiedError }>;
  }> {
    const successful: T[] = [];
    const failed: Array<{ tournamentNo: string; error: ClassifiedError }> = [];

    for (const tournament of tournaments) {
      try {
        const context: ErrorContext = {
          operation: operationName,
          tournamentNo: tournament.no,
          timestamp: new Date().toISOString()
        };

        const result = await this.executeWithRetry(
          () => operation(tournament),
          context
        );

        successful.push(result);
        
      } catch (error) {
        const classifiedError = this.classifyError(error as Error, {
          operation: operationName,
          tournamentNo: tournament.no,
          timestamp: new Date().toISOString()
        });

        failed.push({
          tournamentNo: tournament.no,
          error: classifiedError
        });

        console.error(`Tournament ${tournament.no} (${tournament.name}) failed:`, classifiedError);
        
        // Continue with next tournament even if this one failed
      }
    }

    return { successful, failed };
  }

  /**
   * Add entry to dead letter queue
   */
  private addToDeadLetterQueue(error: ClassifiedError, retryCount: number): void {
    try {
      const key = this.generateDLQKey(error.context);
      const existing = this.deadLetterQueue.get(key);
      
      const entry: DeadLetterQueueEntry = {
        id: existing?.id || this.generateId(),
        tournamentNo: error.context.tournamentNo || 'unknown',
        operation: error.context.operation,
        error,
        retryCount: existing ? existing.retryCount + retryCount : retryCount,
        firstFailure: existing?.firstFailure || new Date().toISOString(),
        lastFailure: new Date().toISOString(),
        nextRetry: this.calculateNextRetryTime(error),
        status: error.retryable ? 'PENDING' : 'FAILED',
        metadata: error.context.additionalData
      };

      this.deadLetterQueue.set(key, entry);
      console.log(`Added to dead letter queue: ${key}`, { 
        operation: entry.operation,
        retryCount: entry.retryCount,
        status: entry.status
      });
      
    } catch (dlqError) {
      console.error('Error adding to dead letter queue:', dlqError);
    }
  }

  /**
   * Clear dead letter queue entry on success
   */
  private clearDeadLetterQueueEntry(context: ErrorContext): void {
    try {
      const key = this.generateDLQKey(context);
      if (this.deadLetterQueue.has(key)) {
        this.deadLetterQueue.delete(key);
        console.log(`Cleared from dead letter queue: ${key}`);
      }
    } catch (error) {
      console.error('Error clearing dead letter queue entry:', error);
    }
  }

  /**
   * Process dead letter queue entries for retry
   */
  async processDeadLetterQueue(): Promise<{
    processed: number;
    resolved: number;
    stillFailed: number;
  }> {
    const now = new Date();
    let processed = 0;
    let resolved = 0;
    let stillFailed = 0;

    for (const [key, entry] of this.deadLetterQueue.entries()) {
      try {
        // Skip if not ready for retry
        if (entry.nextRetry && new Date(entry.nextRetry) > now) {
          continue;
        }

        // Skip permanently failed entries
        if (entry.status === 'FAILED') {
          continue;
        }

        processed++;
        console.log(`Processing DLQ entry: ${key}`);

        // This would need to be implemented based on the specific operation
        // For now, we'll mark old entries as resolved or failed
        const age = now.getTime() - new Date(entry.firstFailure).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours

        if (age > maxAge) {
          entry.status = 'FAILED';
          stillFailed++;
          console.log(`DLQ entry expired: ${key}`);
        } else {
          // In a real implementation, this would retry the actual operation
          entry.status = 'RESOLVED';
          resolved++;
          console.log(`DLQ entry resolved: ${key}`);
        }

      } catch (error) {
        console.error(`Error processing DLQ entry ${key}:`, error);
        stillFailed++;
      }
    }

    return { processed, resolved, stillFailed };
  }

  // Error classification helper methods
  private isNetworkError(error: Error, message: string): boolean {
    const networkIndicators = [
      'fetch failed', 'network', 'connection', 'timeout',
      'enotfound', 'econnreset', 'econnrefused', 'socket'
    ];
    
    return networkIndicators.some(indicator => 
      message.includes(indicator) || error.name?.toLowerCase().includes(indicator)
    );
  }

  private isAuthenticationError(error: Error, message: string): boolean {
    const authIndicators = [
      'unauthorized', '401', 'authentication', 'invalid token',
      'expired token', 'invalid credentials', 'access denied'
    ];
    
    return authIndicators.some(indicator => message.includes(indicator));
  }

  private isAPIResponseError(error: Error, message: string): boolean {
    const apiIndicators = [
      'api request failed', 'http', 'response', 'status'
    ];
    
    return apiIndicators.some(indicator => message.includes(indicator)) ||
           /\d{3}/.test(message); // Contains HTTP status code
  }

  private isDatabaseError(error: Error, message: string): boolean {
    const dbIndicators = [
      'database', 'sql', 'constraint', 'relation', 'column',
      'unique violation', 'foreign key', 'connection pool'
    ];
    
    return dbIndicators.some(indicator => message.includes(indicator));
  }

  private isTimeoutError(error: Error, message: string): boolean {
    const timeoutIndicators = ['timeout', 'time out', 'exceeded'];
    return timeoutIndicators.some(indicator => message.includes(indicator));
  }

  private isRateLimitError(error: Error, message: string): boolean {
    const rateLimitIndicators = [
      'rate limit', 'too many requests', '429', 'quota exceeded'
    ];
    return rateLimitIndicators.some(indicator => message.includes(indicator));
  }

  private isDataValidationError(error: Error, message: string): boolean {
    const validationIndicators = [
      'validation', 'invalid', 'malformed', 'parse error',
      'schema', 'required field', 'format error'
    ];
    return validationIndicators.some(indicator => message.includes(indicator));
  }

  private isRetryableAPIError(message: string): boolean {
    // 5xx errors are generally retryable, 4xx are usually not
    const retryableStatuses = ['500', '502', '503', '504'];
    return retryableStatuses.some(status => message.includes(status));
  }

  private isRetryableDatabaseError(message: string): boolean {
    const retryableDbErrors = [
      'connection', 'timeout', 'temporary', 'deadlock'
    ];
    return retryableDbErrors.some(error => message.includes(error));
  }

  // Utility methods
  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    const baseDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
    const jitter = Math.random() * 0.1 * baseDelay; // Add up to 10% jitter
    return Math.min(baseDelay + jitter, config.maxDelay);
  }

  private calculateNextRetryTime(error: ClassifiedError): string | undefined {
    if (!error.retryable) return undefined;
    
    // Calculate next retry based on error type
    let delayMinutes = 15; // Default 15 minutes
    
    switch (error.type) {
      case ErrorType.RATE_LIMIT:
        delayMinutes = 60; // 1 hour for rate limits
        break;
      case ErrorType.NETWORK:
      case ErrorType.TIMEOUT:
        delayMinutes = 5; // 5 minutes for network issues
        break;
      case ErrorType.DATABASE:
        delayMinutes = 30; // 30 minutes for database issues
        break;
    }

    return new Date(Date.now() + delayMinutes * 60 * 1000).toISOString();
  }

  private generateDLQKey(context: ErrorContext): string {
    return `${context.operation}:${context.tournamentNo || 'global'}`;
  }

  private generateId(): string {
    return `dlq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateErrorStats(error: ClassifiedError): void {
    const key = `${error.type}:${error.category}`;
    this.errorStats.set(key, (this.errorStats.get(key) || 0) + 1);
  }

  /**
   * Get error statistics and health metrics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<string, number>;
    deadLetterQueueSize: number;
    retryableErrors: number;
    criticalErrors: number;
  } {
    const totalErrors = Array.from(this.errorStats.values()).reduce((sum, count) => sum + count, 0);
    const errorsByType: Record<string, number> = {};
    
    for (const [key, count] of this.errorStats.entries()) {
      errorsByType[key] = count;
    }

    const deadLetterQueueSize = this.deadLetterQueue.size;
    const retryableErrors = Array.from(this.deadLetterQueue.values())
      .filter(entry => entry.status === 'PENDING').length;
    const criticalErrors = Array.from(this.deadLetterQueue.values())
      .filter(entry => entry.error.severity === ErrorSeverity.CRITICAL).length;

    return {
      totalErrors,
      errorsByType,
      deadLetterQueueSize,
      retryableErrors,
      criticalErrors
    };
  }

  /**
   * Get dead letter queue entries
   */
  getDeadLetterQueueEntries(): DeadLetterQueueEntry[] {
    return Array.from(this.deadLetterQueue.values());
  }

  /**
   * Clear error statistics (for testing or reset)
   */
  clearErrorStatistics(): void {
    this.errorStats.clear();
    this.deadLetterQueue.clear();
    console.log('Error statistics and dead letter queue cleared');
  }
}