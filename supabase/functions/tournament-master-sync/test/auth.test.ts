// Tests for FIVB API Authentication Module
import { assertEquals, assertExists, assertFalse } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { FIVBAuthenticator, type FIVBCredentials } from "../auth.ts";

const mockCredentials: FIVBCredentials = {
  username: "test_user",
  password: "test_password",
  jwtSecret: "test_jwt_secret_key_for_signing_tokens"
};

const mockCredentialsNoJWT: FIVBCredentials = {
  username: "test_user", 
  password: "test_password"
};

Deno.test("FIVBAuthenticator - Constructor", () => {
  const auth = new FIVBAuthenticator(mockCredentials);
  assertExists(auth);
  
  const status = auth.getAuthStatus();
  assertEquals(status.hasCredentials, true);
  assertEquals(status.hasJWTSecret, true);
  assertEquals(status.hasCachedToken, false);
});

Deno.test("FIVBAuthenticator - Constructor without JWT secret", () => {
  const auth = new FIVBAuthenticator(mockCredentialsNoJWT);
  assertExists(auth);
  
  const status = auth.getAuthStatus();
  assertEquals(status.hasCredentials, true);
  assertEquals(status.hasJWTSecret, false);
});

Deno.test("FIVBAuthenticator - Create XML Request", () => {
  const auth = new FIVBAuthenticator(mockCredentials);
  
  // Test basic request without parameters
  const basicRequest = auth.createAuthenticatedXMLRequest("GetBeachTournamentList");
  assertExists(basicRequest);
  assertEquals(
    basicRequest, 
    '<Requests Username="test_user" Password="test_password"><Request Type="GetBeachTournamentList" /></Requests>'
  );
  
  // Test request with parameters
  const parameterRequest = auth.createAuthenticatedXMLRequest("GetBeachTournamentList", { MaxResults: "10" });
  assertExists(parameterRequest);
  assertEquals(
    parameterRequest,
    '<Requests Username="test_user" Password="test_password"><Request Type="GetBeachTournamentList" MaxResults="10" /></Requests>'
  );
});

Deno.test("FIVBAuthenticator - JWT Token Generation", async () => {
  const auth = new FIVBAuthenticator(mockCredentials);
  
  const tokenResult = await auth.getJWTToken();
  assertEquals(tokenResult.success, true);
  assertExists(tokenResult.token);
  
  // Token should be a valid JWT format (three parts separated by dots)
  const tokenParts = tokenResult.token!.split('.');
  assertEquals(tokenParts.length, 3);
});

Deno.test("FIVBAuthenticator - JWT Token Caching", async () => {
  const auth = new FIVBAuthenticator(mockCredentials);
  
  // Get first token
  const firstResult = await auth.getJWTToken();
  assertEquals(firstResult.success, true);
  assertExists(firstResult.token);
  
  // Get second token - should be cached and same
  const secondResult = await auth.getJWTToken();
  assertEquals(secondResult.success, true);
  assertEquals(firstResult.token, secondResult.token);
  
  // Verify cache status
  const status = auth.getAuthStatus();
  assertEquals(status.hasCachedToken, true);
  assertEquals(status.tokenExpired, false);
});

Deno.test("FIVBAuthenticator - Clear Cache", async () => {
  const auth = new FIVBAuthenticator(mockCredentials);
  
  // Generate and cache a token
  await auth.getJWTToken();
  let status = auth.getAuthStatus();
  assertEquals(status.hasCachedToken, true);
  
  // Clear cache
  auth.clearCache();
  status = auth.getAuthStatus();
  assertEquals(status.hasCachedToken, false);
});

Deno.test("FIVBAuthenticator - JWT without secret", async () => {
  const auth = new FIVBAuthenticator(mockCredentialsNoJWT);
  
  const tokenResult = await auth.getJWTToken();
  assertEquals(tokenResult.success, false);
  assertExists(tokenResult.error);
});

Deno.test("FIVBAuthenticator - Auth Status", () => {
  const auth = new FIVBAuthenticator(mockCredentials);
  
  const status = auth.getAuthStatus();
  assertEquals(status.hasCredentials, true);
  assertEquals(status.hasJWTSecret, true);
  assertEquals(status.hasCachedToken, false);
  assertEquals(status.tokenExpired, false);
});

Deno.test("FIVBAuthenticator - Auth Status Invalid Credentials", () => {
  const invalidCredentials: FIVBCredentials = {
    username: "",
    password: ""
  };
  
  const auth = new FIVBAuthenticator(invalidCredentials);
  const status = auth.getAuthStatus();
  
  assertEquals(status.hasCredentials, false);
  assertEquals(status.hasJWTSecret, false);
});

// Mock test for authentication test (would require actual API in real scenario)
Deno.test("FIVBAuthenticator - Test Authentication Mock", async () => {
  const auth = new FIVBAuthenticator(mockCredentials);
  
  // Mock the fetch function to simulate successful authentication
  const originalFetch = globalThis.fetch;
  
  globalThis.fetch = async (url: string | Request | URL, init?: RequestInit): Promise<Response> => {
    // Simulate successful tournament response
    const mockResponse = `
      <Tournaments>
        <Tournament>
          <No>123456</No>
          <Code>TEST2025</Code>
          <Name>Test Tournament</Name>
        </Tournament>
      </Tournaments>
    `;
    
    return new Response(mockResponse, { 
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    });
  };
  
  try {
    const authResult = await auth.testAuthentication();
    assertEquals(authResult.success, true);
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  }
});

// Test error handling in authentication
Deno.test("FIVBAuthenticator - Test Authentication Failure", async () => {
  const auth = new FIVBAuthenticator(mockCredentials);
  
  // Mock the fetch function to simulate authentication failure
  const originalFetch = globalThis.fetch;
  
  globalThis.fetch = async (url: string | Request | URL, init?: RequestInit): Promise<Response> => {
    return new Response("Unauthorized", { status: 401 });
  };
  
  try {
    const authResult = await auth.testAuthentication();
    assertEquals(authResult.success, false);
    assertExists(authResult.error);
  } finally {
    // Restore original fetch
    globalThis.fetch = originalFetch;
  }
});

// Test XML request parameter handling with multiple parameters
Deno.test("FIVBAuthenticator - XML Request Multiple Parameters", () => {
  const auth = new FIVBAuthenticator(mockCredentials);
  
  const parameters = {
    MaxResults: "50",
    StartDate: "2025-01-01",
    EndDate: "2025-12-31"
  };
  
  const xmlRequest = auth.createAuthenticatedXMLRequest("GetBeachTournamentList", parameters);
  
  // Verify the request contains all parameters
  assertEquals(xmlRequest.includes('MaxResults="50"'), true);
  assertEquals(xmlRequest.includes('StartDate="2025-01-01"'), true);
  assertEquals(xmlRequest.includes('EndDate="2025-12-31"'), true);
  assertEquals(xmlRequest.includes('Username="test_user"'), true);
  assertEquals(xmlRequest.includes('Password="test_password"'), true);
});

// Test JWT token structure validation
Deno.test("FIVBAuthenticator - JWT Token Structure", async () => {
  const auth = new FIVBAuthenticator(mockCredentials);
  
  const tokenResult = await auth.getJWTToken();
  assertEquals(tokenResult.success, true);
  assertExists(tokenResult.token);
  
  // Decode the JWT token parts (without verification for testing)
  const [headerB64, payloadB64, signature] = tokenResult.token!.split('.');
  
  // Verify we have all three parts
  assertExists(headerB64);
  assertExists(payloadB64);  
  assertExists(signature);
  
  // Decode header and payload (base64url)
  const headerJson = atob(headerB64.replace(/-/g, '+').replace(/_/g, '/'));
  const payloadJson = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
  
  const header = JSON.parse(headerJson);
  const payload = JSON.parse(payloadJson);
  
  // Verify header structure
  assertEquals(header.alg, "HS256");
  assertEquals(header.typ, "JWT");
  
  // Verify payload structure
  assertEquals(payload.sub, "test_user");
  assertEquals(payload.aud, "fivb-vis-api");
  assertEquals(payload.iss, "tournament-sync-service");
  assertExists(payload.iat);
  assertExists(payload.exp);
});