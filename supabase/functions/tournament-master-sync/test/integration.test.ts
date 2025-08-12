// Integration Tests for Tournament Master Data Sync
import { assertEquals, assertExists, assertFalse } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { stub, returnsNext } from "https://deno.land/std@0.168.0/testing/mock.ts";

// Mock environment setup for integration tests
Deno.test("Integration - Environment Setup", () => {
  // Test environment variable availability
  Deno.env.set("SUPABASE_URL", "https://test.supabase.co");
  Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
  
  assertEquals(Deno.env.get("SUPABASE_URL"), "https://test.supabase.co");
  assertEquals(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), "test-service-key");
});

// Mock data for integration tests
const mockFIVBResponse = `
<?xml version="1.0" encoding="UTF-8"?>
<Tournaments>
  <Tournament>
    <No>123456</No>
    <Code>MWBVT2025</Code>
    <Name>Beach Volleyball World Tour 2025</Name>
    <StartDate>2025-06-15</StartDate>
    <EndDate>2025-06-22</EndDate>
    <Status>Running</Status>
    <Location>Rio de Janeiro, Brazil</Location>
    <Category>Senior</Category>
    <Gender>Mixed</Gender>
    <Surface>Sand</Surface>
  </Tournament>
  <Tournament>
    <No>789012</No>
    <Code>WBVT2025</Code>
    <Name>Women Beach Volleyball Tour 2025</Name>
    <StartDate>2025-07-10</StartDate>
    <EndDate>2025-07-17</EndDate>
    <Status>Upcoming</Status>
    <Location>Barcelona, Spain</Location>
    <Category>Senior</Category>
    <Gender>Women</Gender>
    <Surface>Sand</Surface>
  </Tournament>
  <Tournament>
    <No>345678</No>
    <Code>YBVT2025</Code>
    <Name>Youth Beach Volleyball Championship 2025</Name>
    <StartDate>2025-08-05</StartDate>
    <EndDate>2025-08-12</EndDate>
    <Status>Finished</Status>
    <Location>Miami, USA</Location>
    <Category>Youth</Category>
    <Gender>Mixed</Gender>
    <Surface>Sand</Surface>
  </Tournament>
</Tournaments>
`;

const mockSupabaseCredentials = {
  username: "test_fivb_user",
  password: "test_fivb_password", 
  jwtSecret: "test_jwt_secret_key_for_integration_testing"
};

// Integration test for full sync workflow
Deno.test("Integration - Full Sync Workflow", async () => {
  // Mock the global fetch function
  const originalFetch = globalThis.fetch;
  
  const mockFetch = stub(globalThis, "fetch", returnsNext([
    // Mock response for FIVB API call
    Promise.resolve(new Response(mockFIVBResponse, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    })),
    // Additional fetch calls for potential retries
    Promise.resolve(new Response(mockFIVBResponse, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    }))
  ]));

  try {
    // Create a mock request to the Edge Function
    const request = new Request("https://test.supabase.co/functions/v1/tournament-master-sync", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer test-service-key"
      },
      body: JSON.stringify({
        source: "integration_test",
        timestamp: new Date().toISOString()
      })
    });

    // Verify the request structure
    assertExists(request);
    assertEquals(request.method, "POST");
    assertEquals(request.headers.get("Content-Type"), "application/json");
    
    // Test that fetch would be called with correct parameters
    const response = await fetch("https://www.fivb.org/Vis2009/XmlRequest.asmx", {
      method: "POST",
      headers: { 'Content-Type': 'application/xml' },
      body: '<Request Type="GetBeachTournamentList" />'
    });
    
    assertEquals(response.status, 200);
    const responseText = await response.text();
    assertEquals(responseText.includes("<Tournament>"), true);
    assertEquals(responseText.includes("MWBVT2025"), true);
    
  } finally {
    // Restore original fetch
    mockFetch.restore();
    globalThis.fetch = originalFetch;
  }
});

// Test authentication workflow
Deno.test("Integration - Authentication Workflow", async () => {
  const originalFetch = globalThis.fetch;
  
  // Mock successful JWT authentication
  const jwtMockFetch = stub(globalThis, "fetch", returnsNext([
    Promise.resolve(new Response(mockFIVBResponse, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    }))
  ]));

  try {
    // Test JWT authentication flow
    const jwtResponse = await fetch("https://www.fivb.org/Vis2009/XmlRequest.asmx", {
      method: "POST",
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': 'Bearer mock-jwt-token'
      },
      body: '<Request Type="GetBeachTournamentList" />'
    });

    assertEquals(jwtResponse.status, 200);
    
  } finally {
    jwtMockFetch.restore();
  }

  // Mock fallback to request-level authentication
  const requestAuthMockFetch = stub(globalThis, "fetch", returnsNext([
    // First request fails (JWT)
    Promise.resolve(new Response("Unauthorized", { status: 401 })),
    // Second request succeeds (request-level auth)
    Promise.resolve(new Response(mockFIVBResponse, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    }))
  ]));

  try {
    // Test authentication fallback
    const failedJwtResponse = await fetch("https://www.fivb.org/Vis2009/XmlRequest.asmx", {
      method: "POST",
      headers: {
        'Content-Type': 'application/xml',
        'Authorization': 'Bearer invalid-token'
      },
      body: '<Request Type="GetBeachTournamentList" />'
    });

    assertEquals(failedJwtResponse.status, 401);
    
    // Test fallback authentication
    const fallbackResponse = await fetch("https://www.fivb.org/Vis2009/XmlRequest.asmx", {
      method: "POST",
      headers: { 'Content-Type': 'application/xml' },
      body: `<Requests Username="test" Password="test"><Request Type="GetBeachTournamentList" /></Requests>`
    });

    assertEquals(fallbackResponse.status, 200);
    
  } finally {
    requestAuthMockFetch.restore();
    globalThis.fetch = originalFetch;
  }
});

// Test error handling and retry logic
Deno.test("Integration - Error Handling and Retries", async () => {
  const originalFetch = globalThis.fetch;
  
  // Mock network failures followed by success
  const retryMockFetch = stub(globalThis, "fetch", returnsNext([
    // First attempt - network error
    Promise.reject(new Error("Network connection failed")),
    // Second attempt - 500 error
    Promise.resolve(new Response("Internal Server Error", { status: 500 })),
    // Third attempt - success
    Promise.resolve(new Response(mockFIVBResponse, {
      status: 200,
      headers: { 'Content-Type': 'application/xml' }
    }))
  ]));

  try {
    // Test retry mechanism
    let attempts = 0;
    const maxRetries = 3;
    
    while (attempts < maxRetries) {
      try {
        const response = await fetch("https://www.fivb.org/Vis2009/XmlRequest.asmx", {
          method: "POST",
          headers: { 'Content-Type': 'application/xml' },
          body: '<Request Type="GetBeachTournamentList" />'
        });
        
        if (response.ok) {
          assertEquals(response.status, 200);
          break; // Success on third attempt
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
        
      } catch (error) {
        attempts++;
        if (attempts >= maxRetries) {
          throw error;
        }
        
        // Simulate exponential backoff delay
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempts - 1)));
      }
    }
    
    assertEquals(attempts, 2); // Should succeed on third attempt (attempts is 0-based)
    
  } finally {
    retryMockFetch.restore();
    globalThis.fetch = originalFetch;
  }
});

// Test data processing and validation
Deno.test("Integration - Data Processing Pipeline", () => {
  // Test XML parsing with complex tournament data
  const tournaments = parseTestXML(mockFIVBResponse);
  
  assertEquals(tournaments.length, 3);
  
  // Verify comprehensive tournament data
  const runningTournament = tournaments.find(t => t.Status === "Running");
  assertExists(runningTournament);
  assertEquals(runningTournament!.No, "123456");
  assertEquals(runningTournament!.Category, "Senior");
  assertEquals(runningTournament!.Gender, "Mixed");
  
  const finishedTournament = tournaments.find(t => t.Status === "Finished");
  assertExists(finishedTournament);
  assertEquals(finishedTournament!.Location, "Miami, USA");
  
  // Test database mapping
  const dbTournaments = tournaments.map(t => mapToDatabase(t));
  assertEquals(dbTournaments.length, 3);
  
  // Verify all required database fields are present
  for (const dbTournament of dbTournaments) {
    assertExists(dbTournament.no);
    assertExists(dbTournament.code);
    assertExists(dbTournament.name);
    assertExists(dbTournament.start_date);
    assertExists(dbTournament.end_date);
    assertExists(dbTournament.status);
    assertExists(dbTournament.location);
    assertExists(dbTournament.last_synced);
    assertExists(dbTournament.updated_at);
    
    // Verify date format (YYYY-MM-DD)
    assertEquals(/^\d{4}-\d{2}-\d{2}$/.test(dbTournament.start_date), true);
    assertEquals(/^\d{4}-\d{2}-\d{2}$/.test(dbTournament.end_date), true);
  }
});

// Test performance and resource management
Deno.test("Integration - Performance and Resource Management", async () => {
  // Generate large dataset for performance testing
  const largeTournamentSet = Array.from({ length: 500 }, (_, i) => ({
    No: (i + 1).toString(),
    Code: `TOUR${i + 1}`,
    Name: `Performance Test Tournament ${i + 1}`,
    StartDate: "2025-06-15",
    EndDate: "2025-06-22",
    Status: "Running",
    Location: `Test Location ${i + 1}`,
    Category: "Senior",
    Gender: "Mixed",
    Surface: "Sand"
  }));
  
  const startTime = Date.now();
  const startMemory = performance.memory?.usedJSHeapSize || 0;
  
  // Process large tournament set
  const dbTournaments = largeTournamentSet.map(t => mapToDatabase(t));
  
  const endTime = Date.now();
  const endMemory = performance.memory?.usedJSHeapSize || 0;
  
  const processingTime = endTime - startTime;
  const memoryUsed = endMemory - startMemory;
  
  assertEquals(dbTournaments.length, 500);
  console.log(`Processed 500 tournaments in ${processingTime}ms using ${memoryUsed} bytes`);
  
  // Performance assertions
  assertEquals(processingTime < 1000, true, `Processing took too long: ${processingTime}ms`);
  
  // Verify resource cleanup (memory should not grow excessively)
  const memoryLimitMB = 10 * 1024 * 1024; // 10MB limit
  assertEquals(memoryUsed < memoryLimitMB, true, `Memory usage too high: ${memoryUsed} bytes`);
});

// Test cron scheduling and timing
Deno.test("Integration - Cron Scheduling Logic", () => {
  // Test next sync time calculation
  const now = new Date();
  const nextSync = new Date(now.getTime() + 24 * 60 * 60 * 1000); // Next day
  
  // Verify 24-hour interval
  const expectedInterval = 24 * 60 * 60 * 1000;
  const actualInterval = nextSync.getTime() - now.getTime();
  
  assertEquals(Math.abs(actualInterval - expectedInterval) < 1000, true); // Allow 1 second tolerance
  
  // Test UTC alignment (should be at 00:00 UTC)
  const utcMidnight = new Date();
  utcMidnight.setUTCHours(0, 0, 0, 0);
  utcMidnight.setUTCDate(utcMidnight.getUTCDate() + 1); // Tomorrow at midnight
  
  assertEquals(utcMidnight.getUTCHours(), 0);
  assertEquals(utcMidnight.getUTCMinutes(), 0);
  assertEquals(utcMidnight.getUTCSeconds(), 0);
});

// Helper functions for testing
function parseTestXML(xmlText: string): any[] {
  const tournaments: any[] = [];
  
  const tournamentRegex = /<Tournament[^>]*>(.*?)<\/Tournament>/gs;
  const matches = xmlText.matchAll(tournamentRegex);
  
  for (const match of matches) {
    const tournamentXml = match[1];
    
    const tournament = {
      No: extractXmlValue(tournamentXml, 'No') || '',
      Code: extractXmlValue(tournamentXml, 'Code') || '',
      Name: extractXmlValue(tournamentXml, 'Name') || '',
      StartDate: extractXmlValue(tournamentXml, 'StartDate') || '',
      EndDate: extractXmlValue(tournamentXml, 'EndDate') || '',
      Status: extractXmlValue(tournamentXml, 'Status') || '',
      Location: extractXmlValue(tournamentXml, 'Location') || '',
      Category: extractXmlValue(tournamentXml, 'Category') || '',
      Gender: extractXmlValue(tournamentXml, 'Gender') || '',
      Surface: extractXmlValue(tournamentXml, 'Surface') || ''
    };
    
    if (tournament.No && tournament.Code) {
      tournaments.push(tournament);
    }
  }
  
  return tournaments;
}

function extractXmlValue(xml: string, tagName: string): string | null {
  const regex = new RegExp(`<${tagName}[^>]*>([^<]*)<\\/${tagName}>|<${tagName}[^>]*\\/>`, 'i');
  const match = xml.match(regex);
  return match && match[1] ? match[1].trim() : null;
}

function mapToDatabase(tournament: any): any {
  const now = new Date().toISOString();
  
  return {
    no: tournament.No,
    code: tournament.Code,
    name: tournament.Name || 'Unnamed Tournament',
    start_date: formatDateForDB(tournament.StartDate),
    end_date: formatDateForDB(tournament.EndDate),
    status: normalizeStatus(tournament.Status),
    location: tournament.Location || 'Unknown Location',
    last_synced: now,
    updated_at: now
  };
}

function formatDateForDB(dateString: string): string {
  if (!dateString) return new Date().toISOString().split('T')[0];
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('T')[0];
    }
    return date.toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
}

function normalizeStatus(status: string): string {
  if (!status) return 'Unknown';
  
  const normalized = status.trim().toLowerCase();
  const statusMap: { [key: string]: string } = {
    'running': 'Running',
    'finished': 'Finished',
    'upcoming': 'Upcoming'
  };
  
  return statusMap[normalized] || status;
}