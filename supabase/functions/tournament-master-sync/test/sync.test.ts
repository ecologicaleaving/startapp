// Tests for Tournament Data Synchronization Module
import { assertEquals, assertExists, assertFalse } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { TournamentSynchronizer, type FIVBTournament } from "../sync.ts";

// Mock Supabase client for testing
const mockSupabase = {
  from: (table: string) => ({
    select: (columns: string) => ({
      in: (column: string, values: any[]) => Promise.resolve({ data: [], error: null }),
      single: () => Promise.resolve({ data: null, error: null }),
      order: (column: string, options: any) => ({
        limit: (count: number) => Promise.resolve({ data: [], error: null })
      }),
      not: (column: string, operator: string, value: any) => Promise.resolve({ data: [], error: null }),
      gte: (column: string, value: any) => Promise.resolve({ count: 0 }),
      lt: (column: string, value: any) => ({ 
        delete: (options: any) => Promise.resolve({ count: 0, error: null }) 
      })
    }),
    upsert: (data: any, options: any) => Promise.resolve({ data, error: null }),
    delete: (options: any) => ({
      lt: (column: string, value: any) => Promise.resolve({ count: 0, error: null })
    })
  })
};

const mockTournament: FIVBTournament = {
  No: "123456",
  Code: "MWBVT2025",
  Name: "Beach Volleyball World Tour 2025",
  StartDate: "2025-06-15",
  EndDate: "2025-06-22",
  Status: "Running",
  Location: "Rio de Janeiro, Brazil"
};

const mockXmlResponse = `
<Tournaments>
  <Tournament>
    <No>123456</No>
    <Code>MWBVT2025</Code>
    <Name>Beach Volleyball World Tour 2025</Name>
    <StartDate>2025-06-15</StartDate>
    <EndDate>2025-06-22</EndDate>
    <Status>Running</Status>
    <Location>Rio de Janeiro, Brazil</Location>
  </Tournament>
  <Tournament>
    <No>789012</No>
    <Code>WBVT2025</Code>
    <Name>Women Beach Volleyball Tour 2025</Name>
    <StartDate>2025-07-10</StartDate>
    <EndDate>2025-07-17</EndDate>
    <Status>Upcoming</Status>
    <Location>Barcelona, Spain</Location>
  </Tournament>
</Tournaments>
`;

Deno.test("TournamentSynchronizer - Constructor", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  assertExists(synchronizer);
});

Deno.test("TournamentSynchronizer - Parse XML Tournaments", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  const tournaments = synchronizer.parseXMLTournaments(mockXmlResponse);
  
  assertEquals(tournaments.length, 2);
  
  // Verify first tournament
  assertEquals(tournaments[0].No, "123456");
  assertEquals(tournaments[0].Code, "MWBVT2025");
  assertEquals(tournaments[0].Name, "Beach Volleyball World Tour 2025");
  assertEquals(tournaments[0].Status, "Running");
  assertEquals(tournaments[0].Location, "Rio de Janeiro, Brazil");
  
  // Verify second tournament
  assertEquals(tournaments[1].No, "789012");
  assertEquals(tournaments[1].Code, "WBVT2025");
  assertEquals(tournaments[1].Status, "Upcoming");
});

Deno.test("TournamentSynchronizer - Parse Empty XML", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  const tournaments = synchronizer.parseXMLTournaments("<Tournaments></Tournaments>");
  
  assertEquals(tournaments.length, 0);
});

Deno.test("TournamentSynchronizer - Parse Malformed XML", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  try {
    synchronizer.parseXMLTournaments("invalid xml content");
    throw new Error("Should have thrown an error");
  } catch (error) {
    assertExists(error);
    assertEquals(error.message.includes("XML parsing failed"), true);
  }
});

Deno.test("TournamentSynchronizer - Map Tournament to Database", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  const dbTournament = synchronizer.mapTournamentToDatabase(mockTournament);
  
  assertEquals(dbTournament.no, "123456");
  assertEquals(dbTournament.code, "MWBVT2025");
  assertEquals(dbTournament.name, "Beach Volleyball World Tour 2025");
  assertEquals(dbTournament.start_date, "2025-06-15");
  assertEquals(dbTournament.end_date, "2025-06-22");
  assertEquals(dbTournament.status, "Running");
  assertEquals(dbTournament.location, "Rio de Janeiro, Brazil");
  assertExists(dbTournament.last_synced);
  assertExists(dbTournament.updated_at);
});

Deno.test("TournamentSynchronizer - Status Normalization", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  // Test various status mappings
  const testCases = [
    { input: "running", expected: "Running" },
    { input: "LIVE", expected: "Running" },
    { input: "finished", expected: "Finished" },
    { input: "COMPLETED", expected: "Finished" },
    { input: "upcoming", expected: "Upcoming" },
    { input: "SCHEDULED", expected: "Upcoming" },
    { input: "cancelled", expected: "Cancelled" },
    { input: "CANCELED", expected: "Cancelled" },
    { input: "unknown_status", expected: "unknown_status" } // Should pass through unknown
  ];
  
  for (const testCase of testCases) {
    const tournament = { ...mockTournament, Status: testCase.input };
    const dbTournament = synchronizer.mapTournamentToDatabase(tournament);
    assertEquals(dbTournament.status, testCase.expected, `Failed for status: ${testCase.input}`);
  }
});

Deno.test("TournamentSynchronizer - Date Formatting", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  // Test various date formats
  const testCases = [
    { input: "2025-06-15", expected: "2025-06-15" },
    { input: "15/06/2025", expected: "2025-06-15" },
    { input: "06-15-2025", expected: "2025-06-15" },
    { input: "", expected: new Date().toISOString().split('T')[0] }, // Should default to today
    { input: "invalid-date", expected: new Date().toISOString().split('T')[0] } // Should default to today
  ];
  
  for (const testCase of testCases) {
    const tournament = { ...mockTournament, StartDate: testCase.input };
    const dbTournament = synchronizer.mapTournamentToDatabase(tournament);
    assertEquals(dbTournament.start_date, testCase.expected, `Failed for date: ${testCase.input}`);
  }
});

Deno.test("TournamentSynchronizer - String Sanitization", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  // Test string sanitization
  const testCases = [
    { 
      input: "  Tournament Name  ", 
      expected: "Tournament Name" 
    },
    { 
      input: "Tournament\x00\x08Name", 
      expected: "TournamentName" 
    },
    { 
      input: "A".repeat(300), 
      expected: "A".repeat(252) + "..." 
    },
    {
      input: null,
      expected: "Unnamed Tournament" // Default name
    }
  ];
  
  for (const testCase of testCases) {
    const tournament = { ...mockTournament, Name: testCase.input as string };
    const dbTournament = synchronizer.mapTournamentToDatabase(tournament);
    assertEquals(dbTournament.name, testCase.expected, `Failed for name: ${testCase.input}`);
  }
});

Deno.test("TournamentSynchronizer - Tournament Validation", async () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  // Valid tournament should parse
  const validXml = `
    <Tournaments>
      <Tournament>
        <No>123456</No>
        <Code>VALID2025</Code>
        <Name>Valid Tournament</Name>
        <Status>Running</Status>
      </Tournament>
    </Tournaments>
  `;
  
  const validTournaments = synchronizer.parseXMLTournaments(validXml);
  assertEquals(validTournaments.length, 1);
  
  // Invalid tournament should be filtered out
  const invalidXml = `
    <Tournaments>
      <Tournament>
        <No></No>
        <Code></Code>
        <Name>Invalid Tournament</Name>
        <Status>Running</Status>
      </Tournament>
    </Tournaments>
  `;
  
  const invalidTournaments = synchronizer.parseXMLTournaments(invalidXml);
  assertEquals(invalidTournaments.length, 0);
});

Deno.test("TournamentSynchronizer - Batch Processing", async () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  const tournaments: FIVBTournament[] = [
    { ...mockTournament, No: "1", Code: "T1" },
    { ...mockTournament, No: "2", Code: "T2" },
    { ...mockTournament, No: "3", Code: "T3" },
    { ...mockTournament, No: "4", Code: "T4" },
    { ...mockTournament, No: "5", Code: "T5" }
  ];
  
  const result = await synchronizer.processTournamentBatch(tournaments, 2); // Batch size 2
  
  assertEquals(result.processed, 5);
  assertEquals(result.errors, 0);
  assertEquals(result.tournamentNumbers.length, 5);
  assertExists(result.errorMessages);
});

Deno.test("TournamentSynchronizer - XML Cleaning", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  // Test XML with BOM and processing instructions
  const messyXml = `\uFEFF<?xml version="1.0" encoding="UTF-8"?>
    <Tournaments>
      <Tournament>
        <No>123456</No>
        <Name><![CDATA[Beach Volleyball World Tour 2025]]></Name>
      </Tournament>
    </Tournaments>`;
  
  const tournaments = synchronizer.parseXMLTournaments(messyXml);
  assertEquals(tournaments.length, 1);
  assertEquals(tournaments[0].Name, "Beach Volleyball World Tour 2025");
});

Deno.test("TournamentSynchronizer - Self-Closing XML Tags", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  const selfClosingXml = `
    <Tournaments>
      <Tournament>
        <No>123456</No>
        <Code>TEST2025</Code>
        <Name value="Self Closing Test"/>
        <EmptyTag/>
        <Status>Running</Status>
      </Tournament>
    </Tournaments>
  `;
  
  const tournaments = synchronizer.parseXMLTournaments(selfClosingXml);
  assertEquals(tournaments.length, 1);
  assertEquals(tournaments[0].No, "123456");
  assertEquals(tournaments[0].Code, "TEST2025");
  assertEquals(tournaments[0].Status, "Running");
});

Deno.test("TournamentSynchronizer - Large Tournament List Performance", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  // Generate large XML with 1000 tournaments
  let largeXml = "<Tournaments>";
  for (let i = 1; i <= 1000; i++) {
    largeXml += `
      <Tournament>
        <No>${i}</No>
        <Code>TOUR${i}</Code>
        <Name>Tournament ${i}</Name>
        <StartDate>2025-06-15</StartDate>
        <EndDate>2025-06-22</EndDate>
        <Status>Running</Status>
        <Location>Location ${i}</Location>
      </Tournament>
    `;
  }
  largeXml += "</Tournaments>";
  
  const startTime = Date.now();
  const tournaments = synchronizer.parseXMLTournaments(largeXml);
  const duration = Date.now() - startTime;
  
  assertEquals(tournaments.length, 1000);
  console.log(`Parsed 1000 tournaments in ${duration}ms`);
  
  // Performance assertion - should parse 1000 tournaments in under 2 seconds
  assertEquals(duration < 2000, true, `XML parsing took too long: ${duration}ms`);
});

Deno.test("TournamentSynchronizer - Memory Efficiency", () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  // Test with various tournament name lengths
  const testTournaments: FIVBTournament[] = [];
  
  for (let i = 0; i < 100; i++) {
    testTournaments.push({
      ...mockTournament,
      No: i.toString(),
      Name: `Tournament ${i} - ${'Data'.repeat(100)}`, // Long name
      Location: `Location ${i} - ${'Place'.repeat(50)}` // Long location
    });
  }
  
  const startMemory = performance.memory?.usedJSHeapSize || 0;
  
  const dbTournaments = testTournaments.map(t => synchronizer.mapTournamentToDatabase(t));
  
  const endMemory = performance.memory?.usedJSHeapSize || 0;
  const memoryUsed = endMemory - startMemory;
  
  assertEquals(dbTournaments.length, 100);
  console.log(`Memory used for processing 100 tournaments: ${memoryUsed} bytes`);
  
  // Verify all tournaments have properly sanitized names (not exceeding 255 chars)
  for (const tournament of dbTournaments) {
    assertEquals(tournament.name!.length <= 255, true, `Tournament name too long: ${tournament.name!.length} chars`);
  }
});

// Integration test placeholder - would require real database connection
Deno.test("TournamentSynchronizer - Database Integration (Mock)", async () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  // Test statistics gathering (mocked)
  const stats = await synchronizer.getSyncStatistics();
  
  assertExists(stats);
  assertEquals(stats.totalTournaments, 0); // Mock returns 0
  assertEquals(stats.recentlyUpdated, 0);
  assertEquals(stats.oldestSync, null);
  assertEquals(stats.newestSync, null);
  assertExists(stats.statusBreakdown);
});

Deno.test("TournamentSynchronizer - Cleanup Stale Tournaments (Mock)", async () => {
  const synchronizer = new TournamentSynchronizer(mockSupabase);
  
  // Test cleanup functionality (mocked)
  const cleanedCount = await synchronizer.cleanupStaleTournaments(90);
  
  assertEquals(cleanedCount, 0); // Mock returns 0
});