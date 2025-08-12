// Unit tests for error handling and resilience
import { assertEquals, assertThrows, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { ErrorHandler, ErrorType, ErrorSeverity, type ErrorContext, type ClassifiedError } from "../error-handler.ts";

Deno.test("ErrorHandler - classifyError for network errors", () => {
  const errorHandler = new ErrorHandler();
  
  const networkErrors = [
    new Error("fetch failed"),
    new Error("Network error occurred"),
    new Error("ENOTFOUND api.example.com"),
    new Error("Connection timeout")
  ];
  
  networkErrors.forEach(error => {
    const context: ErrorContext = {
      operation: "fetchMatches",
      tournamentNo: "12345",
      timestamp: new Date().toISOString()
    };
    
    const classified = errorHandler.classifyError(error, context);
    
    assertEquals(classified.type, ErrorType.NETWORK);
    assertEquals(classified.severity, ErrorSeverity.MEDIUM);
    assertEquals(classified.retryable, true);
    assertEquals(classified.category, "Network");
  });
});

Deno.test("ErrorHandler - classifyError for authentication errors", () => {
  const errorHandler = new ErrorHandler();
  
  const authErrors = [
    new Error("401 Unauthorized"),
    new Error("Authentication failed"),
    new Error("Invalid token provided"),
    new Error("Access denied")
  ];
  
  authErrors.forEach(error => {
    const context: ErrorContext = {
      operation: "authenticate",
      timestamp: new Date().toISOString()
    };
    
    const classified = errorHandler.classifyError(error, context);
    
    assertEquals(classified.type, ErrorType.AUTHENTICATION);
    assertEquals(classified.severity, ErrorSeverity.HIGH);
    assertEquals(classified.retryable, false);
    assertEquals(classified.category, "Authentication");
  });
});

Deno.test("ErrorHandler - classifyError for API response errors", () => {
  const errorHandler = new ErrorHandler();
  
  const context: ErrorContext = {
    operation: "apiCall",
    timestamp: new Date().toISOString()
  };
  
  // Retryable API error (5xx)
  const retryableError = new Error("API request failed: 500 Internal Server Error");
  const retryableClassified = errorHandler.classifyError(retryableError, context);
  
  assertEquals(retryableClassified.type, ErrorType.API_RESPONSE);
  assertEquals(retryableClassified.retryable, true);
  
  // Non-retryable API error (4xx)
  const nonRetryableError = new Error("API request failed: 404 Not Found");
  const nonRetryableClassified = errorHandler.classifyError(nonRetryableError, context);
  
  assertEquals(nonRetryableClassified.type, ErrorType.API_RESPONSE);
  assertEquals(nonRetryableClassified.retryable, false);
});

Deno.test("ErrorHandler - classifyError for database errors", () => {
  const errorHandler = new ErrorHandler();
  
  const context: ErrorContext = {
    operation: "databaseOperation",
    timestamp: new Date().toISOString()
  };
  
  // Retryable database error
  const retryableError = new Error("Connection timeout to database");
  const retryableClassified = errorHandler.classifyError(retryableError, context);
  
  assertEquals(retryableClassified.type, ErrorType.DATABASE);
  assertEquals(retryableClassified.retryable, true);
  
  // Non-retryable database error
  const nonRetryableError = new Error("Unique constraint violation");
  const nonRetryableClassified = errorHandler.classifyError(nonRetryableError, context);
  
  assertEquals(nonRetryableClassified.type, ErrorType.DATABASE);
  assertEquals(nonRetryableClassified.retryable, false);
});

Deno.test("ErrorHandler - classifyError for timeout errors", () => {
  const errorHandler = new ErrorHandler();
  
  const timeoutErrors = [
    new Error("Request timeout"),
    new Error("Operation timed out"),
    new Error("Timeout exceeded")
  ];
  
  timeoutErrors.forEach(error => {
    const context: ErrorContext = {
      operation: "timeoutOperation",
      timestamp: new Date().toISOString()
    };
    
    const classified = errorHandler.classifyError(error, context);
    
    assertEquals(classified.type, ErrorType.TIMEOUT);
    assertEquals(classified.severity, ErrorSeverity.MEDIUM);
    assertEquals(classified.retryable, true);
  });
});

Deno.test("ErrorHandler - classifyError for rate limit errors", () => {
  const errorHandler = new ErrorHandler();
  
  const rateLimitErrors = [
    new Error("429 Too Many Requests"),
    new Error("Rate limit exceeded"),
    new Error("Quota exceeded")
  ];
  
  rateLimitErrors.forEach(error => {
    const context: ErrorContext = {
      operation: "rateLimitedOperation",
      timestamp: new Date().toISOString()
    };
    
    const classified = errorHandler.classifyError(error, context);
    
    assertEquals(classified.type, ErrorType.RATE_LIMIT);
    assertEquals(classified.severity, ErrorSeverity.LOW);
    assertEquals(classified.retryable, true);
  });
});

Deno.test("ErrorHandler - classifyError for data validation errors", () => {
  const errorHandler = new ErrorHandler();
  
  const validationErrors = [
    new Error("Validation failed"),
    new Error("Invalid data format"),
    new Error("Schema validation error"),
    new Error("Required field missing")
  ];
  
  validationErrors.forEach(error => {
    const context: ErrorContext = {
      operation: "validateData",
      timestamp: new Date().toISOString()
    };
    
    const classified = errorHandler.classifyError(error, context);
    
    assertEquals(classified.type, ErrorType.DATA_VALIDATION);
    assertEquals(classified.severity, ErrorSeverity.LOW);
    assertEquals(classified.retryable, false);
  });
});

Deno.test("ErrorHandler - executeWithRetry successful operation", async () => {
  const errorHandler = new ErrorHandler();
  
  let attempts = 0;
  const successfulOperation = async () => {
    attempts++;
    return "success";
  };
  
  const context: ErrorContext = {
    operation: "testOperation",
    timestamp: new Date().toISOString()
  };
  
  const result = await errorHandler.executeWithRetry(successfulOperation, context);
  
  assertEquals(result, "success");
  assertEquals(attempts, 1);
});

Deno.test("ErrorHandler - executeWithRetry with retryable error", async () => {
  const errorHandler = new ErrorHandler({
    maxRetries: 3,
    baseDelay: 10, // Short delay for testing
    maxDelay: 100,
    backoffMultiplier: 2
  });
  
  let attempts = 0;
  const retryableOperation = async () => {
    attempts++;
    if (attempts < 3) {
      throw new Error("Network error occurred"); // Retryable
    }
    return "success after retries";
  };
  
  const context: ErrorContext = {
    operation: "retryableOperation",
    timestamp: new Date().toISOString()
  };
  
  const result = await errorHandler.executeWithRetry(retryableOperation, context);
  
  assertEquals(result, "success after retries");
  assertEquals(attempts, 3);
});

Deno.test("ErrorHandler - executeWithRetry with non-retryable error", async () => {
  const errorHandler = new ErrorHandler();
  
  let attempts = 0;
  const nonRetryableOperation = async () => {
    attempts++;
    throw new Error("401 Unauthorized"); // Non-retryable
  };
  
  const context: ErrorContext = {
    operation: "authOperation",
    timestamp: new Date().toISOString()
  };
  
  await assertRejects(
    () => errorHandler.executeWithRetry(nonRetryableOperation, context),
    Error,
    "401 Unauthorized"
  );
  
  assertEquals(attempts, 1); // Should not retry
});

Deno.test("ErrorHandler - executeWithRetry exceeds max retries", async () => {
  const errorHandler = new ErrorHandler({
    maxRetries: 2,
    baseDelay: 10,
    maxDelay: 100,
    backoffMultiplier: 2
  });
  
  let attempts = 0;
  const alwaysFailingOperation = async () => {
    attempts++;
    throw new Error("Network error occurred"); // Always retryable but always fails
  };
  
  const context: ErrorContext = {
    operation: "failingOperation",
    timestamp: new Date().toISOString()
  };
  
  await assertRejects(
    () => errorHandler.executeWithRetry(alwaysFailingOperation, context),
    Error,
    "Network error occurred"
  );
  
  assertEquals(attempts, 2); // maxRetries
});

Deno.test("ErrorHandler - executeTournamentOperations", async () => {
  const errorHandler = new ErrorHandler({
    maxRetries: 1,
    baseDelay: 10
  });
  
  const tournaments = [
    { no: "1", name: "Tournament 1" },
    { no: "2", name: "Tournament 2" },
    { no: "3", name: "Tournament 3" }
  ];
  
  const operation = async (tournament: { no: string; name: string }) => {
    if (tournament.no === "2") {
      throw new Error("401 Unauthorized"); // Non-retryable error for tournament 2
    }
    return `Success for ${tournament.name}`;
  };
  
  const result = await errorHandler.executeTournamentOperations(
    tournaments,
    operation,
    "processMatches"
  );
  
  assertEquals(result.successful.length, 2);
  assertEquals(result.failed.length, 1);
  assertEquals(result.successful[0], "Success for Tournament 1");
  assertEquals(result.successful[1], "Success for Tournament 3");
  assertEquals(result.failed[0].tournamentNo, "2");
  assertEquals(result.failed[0].error.type, ErrorType.AUTHENTICATION);
});

Deno.test("ErrorHandler - dead letter queue management", async () => {
  const errorHandler = new ErrorHandler();
  
  const context: ErrorContext = {
    operation: "failedOperation",
    tournamentNo: "12345",
    timestamp: new Date().toISOString()
  };
  
  // Simulate a failed operation that goes to DLQ
  await assertRejects(
    () => errorHandler.executeWithRetry(
      async () => { throw new Error("401 Unauthorized"); },
      context
    ),
    Error,
    "401 Unauthorized"
  );
  
  const dlqEntries = errorHandler.getDeadLetterQueueEntries();
  assertEquals(dlqEntries.length, 1);
  assertEquals(dlqEntries[0].tournamentNo, "12345");
  assertEquals(dlqEntries[0].operation, "failedOperation");
  assertEquals(dlqEntries[0].status, "FAILED"); // Non-retryable error
});

Deno.test("ErrorHandler - error statistics", async () => {
  const errorHandler = new ErrorHandler();
  
  const context: ErrorContext = {
    operation: "testOperation",
    timestamp: new Date().toISOString()
  };
  
  // Generate various types of errors
  const errors = [
    new Error("Network error occurred"),
    new Error("401 Unauthorized"),
    new Error("Network error occurred"), // Duplicate type
    new Error("Database connection failed")
  ];
  
  for (const error of errors) {
    try {
      await errorHandler.executeWithRetry(
        async () => { throw error; },
        context
      );
    } catch {
      // Expected to fail
    }
  }
  
  const stats = errorHandler.getErrorStatistics();
  
  assertEquals(stats.totalErrors, 4);
  assertEquals(stats.errorsByType["NETWORK:Network"], 2);
  assertEquals(stats.errorsByType["AUTHENTICATION:Authentication"], 1);
  assertEquals(stats.errorsByType["DATABASE:Database"], 1);
  assertEquals(stats.deadLetterQueueSize, 4); // All should be in DLQ
  assertEquals(stats.retryableErrors, 2); // Network and database errors
  assertEquals(stats.criticalErrors, 0); // None are critical severity
});

Deno.test("ErrorHandler - processDeadLetterQueue", async () => {
  const errorHandler = new ErrorHandler();
  
  // Add some entries to DLQ by failing operations
  const contexts = [
    { operation: "op1", tournamentNo: "1", timestamp: new Date().toISOString() },
    { operation: "op2", tournamentNo: "2", timestamp: new Date().toISOString() }
  ];
  
  for (const context of contexts) {
    try {
      await errorHandler.executeWithRetry(
        async () => { throw new Error("Network error occurred"); },
        context
      );
    } catch {
      // Expected to fail
    }
  }
  
  // Process the DLQ
  const result = await errorHandler.processDeadLetterQueue();
  
  assertEquals(result.processed, 2);
  // In the test implementation, entries are marked as resolved
  assertEquals(result.resolved, 2);
  assertEquals(result.stillFailed, 0);
});

Deno.test("ErrorHandler - custom retry configuration", () => {
  const customConfig = {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 60000,
    backoffMultiplier: 3
  };
  
  const errorHandler = new ErrorHandler(customConfig);
  
  // Test internal configuration is applied (we can't directly access private fields,
  // but we can test behavior that depends on the configuration)
  const context: ErrorContext = {
    operation: "configTest",
    timestamp: new Date().toISOString()
  };
  
  let attempts = 0;
  const testOperation = async () => {
    attempts++;
    if (attempts <= 5) {
      throw new Error("Network error occurred");
    }
    return "success";
  };
  
  // This test verifies the maxRetries configuration is respected
  // We expect it to fail after 5 attempts
  assertRejects(
    () => errorHandler.executeWithRetry(testOperation, context),
    Error,
    "Network error occurred"
  );
});

Deno.test("ErrorHandler - clearErrorStatistics", () => {
  const errorHandler = new ErrorHandler();
  
  const context: ErrorContext = {
    operation: "clearTest",
    timestamp: new Date().toISOString()
  };
  
  // Generate an error to populate statistics
  const error = new Error("Test error");
  errorHandler.classifyError(error, context);
  
  // Clear statistics
  errorHandler.clearErrorStatistics();
  
  const stats = errorHandler.getErrorStatistics();
  assertEquals(stats.totalErrors, 0);
  assertEquals(stats.deadLetterQueueSize, 0);
  assertEquals(Object.keys(stats.errorsByType).length, 0);
});