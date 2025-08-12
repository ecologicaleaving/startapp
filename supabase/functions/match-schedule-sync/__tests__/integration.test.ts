// Integration tests for match schedule synchronization
import { assertEquals, assertGreaterOrEqual, assertArrayIncludes } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { MatchSynchronizer } from "../sync.ts";
import { CacheManager } from "../cache.ts";
import { ErrorHandler } from "../error-handler.ts";

// Mock FIVB API responses
const mockTournamentListXML = `
<Tournaments>
  <Tournament>
    <No>12345</No>
    <Code>TEST2024</Code>
    <Name>Test Beach Volleyball Tournament 2024</Name>
    <StartDate>2025-01-08</StartDate>
    <EndDate>2025-01-10</EndDate>
    <Status>Running</Status>
    <Location>Miami Beach, FL</Location>
  </Tournament>
</Tournaments>
`;

const mockMatchListXML = `
<BeachMatches>
  <BeachMatch>
    <No>654321</No>
    <NoInTournament>M001</NoInTournament>
    <TeamAName>Smith, J. / Johnson, M.</TeamAName>
    <TeamBName>Brown, K. / Wilson, L.</TeamBName>
    <LocalDate>2025-01-08</LocalDate>
    <LocalTime>09:00</LocalTime>
    <Court>Court 1</Court>
    <Status>Scheduled</Status>
    <Round>Pool Play - Group A</Round>
    <MatchPointsA>0</MatchPointsA>
    <MatchPointsB>0</MatchPointsB>
    <NoReferee1>REF001</NoReferee1>
    <Referee1Name>Martinez, Carlos</Referee1Name>
    <Referee1FederationCode>ESP</Referee1FederationCode>
  </BeachMatch>
  <BeachMatch>
    <No>654322</No>
    <NoInTournament>M002</NoInTournament>
    <TeamAName>Davis, R. / Miller, S.</TeamAName>
    <TeamBName>Garcia, A. / Rodriguez, P.</TeamBName>
    <LocalDate>2025-01-08</LocalDate>
    <LocalTime>10:30</LocalTime>
    <Court>Court 2</Court>
    <Status>Running</Status>
    <Round>Pool Play - Group B</Round>
    <MatchPointsA>1</MatchPointsA>
    <MatchPointsB>0</MatchPointsB>
    <PointsTeamASet1>21</PointsTeamASet1>
    <PointsTeamBSet1>18</PointsTeamBSet1>
    <PointsTeamASet2>15</PointsTeamASet2>
    <PointsTeamBSet2>10</PointsTeamBSet2>
    <NoReferee1>REF002</NoReferee1>
    <Referee1Name>Thompson, Mike</Referee1Name>
    <Referee1FederationCode>USA</Referee1FederationCode>
    <NoReferee2>REF003</NoReferee2>
    <Referee2Name>Andersson, Erik</Referee2Name>
    <Referee2FederationCode>SWE</Referee2FederationCode>
  </BeachMatch>
  <BeachMatch>
    <No>654323</No>
    <NoInTournament>M003</NoInTournament>
    <TeamAName>Lee, H. / Kim, J.</TeamAName>
    <TeamBName>Taylor, B. / Anderson, C.</TeamBName>
    <LocalDate>2025-01-08</LocalDate>
    <LocalTime>12:00</LocalTime>
    <Court>Court 1</Court>
    <Status>Finished</Status>
    <Round>Pool Play - Group A</Round>
    <MatchPointsA>2</MatchPointsA>
    <MatchPointsB>1</MatchPointsB>
    <PointsTeamASet1>21</PointsTeamASet1>
    <PointsTeamBSet1>15</PointsTeamBSet1>
    <PointsTeamASet2>19</PointsTeamASet2>
    <PointsTeamBSet2>21</PointsTeamBSet2>
    <PointsTeamASet3>15</PointsTeamASet3>
    <PointsTeamBSet3>11</PointsTeamBSet3>
    <DurationSet1>22:45</DurationSet1>
    <DurationSet2>28:12</DurationSet2>
    <DurationSet3>18:33</DurationSet3>
  </BeachMatch>
</BeachMatches>
`;

// Mock Supabase client for integration testing
const createMockSupabaseClient = (mockData?: any) => {
  const tournaments = mockData?.tournaments || [
    {
      no: "12345",
      code: "TEST2024",
      name: "Test Beach Volleyball Tournament 2024",
      status: "Running",
      start_date: "2025-01-08",
      end_date: "2025-01-10",
      last_synced: "2025-01-08T08:00:00.000Z"
    }
  ];
  
  const existingMatches = mockData?.existingMatches || [];
  
  return {
    from: (table: string) => ({
      select: (columns?: string, options?: any) => {
        if (table === 'tournaments') {
          return {
            in: () => ({
              lte: () => ({
                gte: () => ({
                  gte: () => ({
                    order: () => Promise.resolve({
                      data: tournaments,
                      error: null
                    })
                  })
                })
              })
            })
          };
        }
        
        if (table === 'matches') {
          if (options?.count === 'exact' && options?.head === true) {
            return Promise.resolve({ 
              count: existingMatches.length, 
              error: null 
            });
          }
          
          if (columns === 'no') {
            return {
              in: () => Promise.resolve({
                data: existingMatches.map((m: any) => ({ no: m.no })),
                error: null
              })
            };
          }
          
          if (columns === 'status') {
            return {
              not: () => Promise.resolve({
                data: existingMatches.map((m: any) => ({ status: m.status })),
                error: null
              })
            };
          }
        }
        
        return Promise.resolve({ data: [], error: null });
      },
      
      upsert: (data: any[], options?: any) => {
        return Promise.resolve({
          data: null,
          error: null,
          count: data.length
        });
      },
      
      eq: () => ({
        gte: () => Promise.resolve({ count: 1, error: null })
      }),
      
      gte: () => ({
        eq: () => Promise.resolve({ count: 1, error: null })
      })
    })
  };
};

Deno.test("Integration - Full match synchronization workflow", async () => {
  const mockSupabase = createMockSupabaseClient();
  const synchronizer = new MatchSynchronizer(mockSupabase);
  const cacheManager = new CacheManager();
  
  // Step 1: Discover active tournaments
  const activeTournaments = await synchronizer.discoverActiveTournaments();
  
  assertEquals(activeTournaments.length, 1);
  assertEquals(activeTournaments[0].no, "12345");
  assertEquals(activeTournaments[0].status, "Running");
  
  // Step 2: Parse match data from XML
  const matches = synchronizer.parseXMLMatches(mockMatchListXML);
  
  assertEquals(matches.length, 3);
  
  // Verify match parsing
  assertEquals(matches[0].Status, "Scheduled");
  assertEquals(matches[1].Status, "Running");
  assertEquals(matches[2].Status, "Finished");
  
  // Step 3: Process matches in batch
  const syncResult = await synchronizer.processMatchBatch(matches, "12345", 10);
  
  assertEquals(syncResult.processed, 3);
  assertEquals(syncResult.errors, 0);
  assertEquals(syncResult.inserts, 3); // All new matches
  assertArrayIncludes(syncResult.matchNumbers, ["654321", "654322", "654323"]);
  
  // Step 4: Calculate dynamic TTL
  const ttl = cacheManager.calculateMatchesTTL(matches);
  
  // Should return 30 seconds due to running match
  assertEquals(ttl, "30 seconds");
  
  // Step 5: Get cache statistics
  const cacheStats = cacheManager.getCacheStatistics(matches);
  
  assertEquals(cacheStats.totalMatches, 3);
  assertEquals(cacheStats.liveMatches, 1); // One running match
  assertEquals(cacheStats.scheduledMatches, 1); // One scheduled match
  assertEquals(cacheStats.finishedMatches, 1); // One finished match
  assertEquals(cacheStats.recommendedTTL, "30 seconds");
  assertEquals(cacheStats.cacheEfficiency, "Low"); // Due to live match
});

Deno.test("Integration - Match sync with existing matches (updates)", async () => {
  const existingMatches = [
    {
      no: "654321",
      status: "Running",
      match_points_a: 1,
      match_points_b: 0
    },
    {
      no: "654322",
      status: "Scheduled",
      match_points_a: 0,
      match_points_b: 0
    }
  ];
  
  const mockSupabase = createMockSupabaseClient({ existingMatches });
  const synchronizer = new MatchSynchronizer(mockSupabase);
  
  const matches = synchronizer.parseXMLMatches(mockMatchListXML);
  const syncResult = await synchronizer.processMatchBatch(matches, "12345", 10);
  
  assertEquals(syncResult.processed, 3);
  assertEquals(syncResult.errors, 0);
  assertEquals(syncResult.updates, 2); // Two existing matches updated
  assertEquals(syncResult.inserts, 1); // One new match inserted
});

Deno.test("Integration - Error handling during tournament processing", async () => {
  const errorHandler = new ErrorHandler({
    maxRetries: 2,
    baseDelay: 10,
    maxDelay: 100
  });
  
  const tournaments = [
    { no: "12345", name: "Good Tournament" },
    { no: "12346", name: "Failing Tournament" },
    { no: "12347", name: "Another Good Tournament" }
  ];
  
  let callCount = 0;
  const processOperation = async (tournament: { no: string; name: string }) => {
    callCount++;
    
    if (tournament.no === "12346") {
      throw new Error("API request failed: 500 Internal Server Error"); // Retryable
    }
    
    return {
      tournamentNo: tournament.no,
      matchesProcessed: 5,
      success: true
    };
  };
  
  const result = await errorHandler.executeTournamentOperations(
    tournaments,
    processOperation,
    "processMatches"
  );
  
  assertEquals(result.successful.length, 2);
  assertEquals(result.failed.length, 1);
  assertEquals(result.failed[0].tournamentNo, "12346");
  
  // Should retry the failing tournament
  assertGreaterOrEqual(callCount, 4); // 2 successes + 2 attempts for failure
});

Deno.test("Integration - Cache invalidation based on status changes", () => {
  const cacheManager = new CacheManager();
  
  // Simulate old match state
  const oldMatches = [
    {
      No: "654322",
      Status: "Scheduled",
      LocalDate: "2025-01-08",
      LocalTime: "10:30",
      TeamAName: "Team A",
      TeamBName: "Team B",
      NoInTournament: "M002",
      Court: "Court 2",
      Round: "Pool Play"
    }
  ];
  
  // Simulate new match state (status changed)
  const newMatches = [
    {
      ...oldMatches[0],
      Status: "Running",
      MatchPointsA: 1,
      MatchPointsB: 0
    }
  ];
  
  const triggers = cacheManager.generateInvalidationTriggers(oldMatches, newMatches);
  
  assertEquals(triggers.length, 1);
  assertEquals(triggers[0].matchNo, "654322");
  assertEquals(triggers[0].oldStatus, "Scheduled");
  assertEquals(triggers[0].newStatus, "Running");
  
  const shouldInvalidate = cacheManager.shouldInvalidateCache(triggers[0]);
  assertEquals(shouldInvalidate, true);
});

Deno.test("Integration - Complex tournament prioritization", async () => {
  const tournaments = [
    {
      no: "1",
      code: "FUTURE2024",
      name: "Future Tournament",
      status: "Running",
      start_date: "2025-01-10", // Future
      end_date: "2025-01-12",
      last_synced: "2025-01-08T10:00:00.000Z"
    },
    {
      no: "2",
      code: "LIVE2024",
      name: "Live Tournament",
      status: "Live",
      start_date: "2025-01-08", // Today
      end_date: "2025-01-09",
      last_synced: "2025-01-08T09:00:00.000Z"
    },
    {
      no: "3",
      code: "RUNNING2024",
      name: "Running Tournament",
      status: "Running",
      start_date: "2025-01-08", // Today
      end_date: "2025-01-10",
      last_synced: "2025-01-08T08:00:00.000Z"
    }
  ];
  
  const mockSupabase = createMockSupabaseClient({ tournaments });
  const synchronizer = new MatchSynchronizer(mockSupabase);
  
  const activeTournaments = await synchronizer.discoverActiveTournaments();
  
  assertEquals(activeTournaments.length, 3);
  
  // Should be prioritized: Live first, then Running (today's), then Running (future)
  assertEquals(activeTournaments[0].status, "Live");
  assertEquals(activeTournaments[0].no, "2");
  
  assertEquals(activeTournaments[1].status, "Running");
  assertEquals(activeTournaments[1].no, "3"); // Today's tournament
  
  assertEquals(activeTournaments[2].status, "Running");
  assertEquals(activeTournaments[2].no, "1"); // Future tournament
});

Deno.test("Integration - Comprehensive match data mapping", () => {
  const mockSupabase = createMockSupabaseClient();
  const synchronizer = new MatchSynchronizer(mockSupabase);
  
  const complexMatchXML = `
  <BeachMatches>
    <BeachMatch>
      <No>999888</No>
      <NoInTournament>QF-1</NoInTournament>
      <TeamAName>  Spaced   Team  Name  </TeamAName>
      <TeamBName>Team with / Special Chars</TeamBName>
      <LocalDate>08/01/2025</LocalDate>
      <LocalTime>14:30:45</LocalTime>
      <Court>Center Court</Court>
      <Status>FINISHED</Status>
      <Round>Quarter-Finals</Round>
      <MatchPointsA>2</MatchPointsA>
      <MatchPointsB>1</MatchPointsB>
      <PointsTeamASet1>21</PointsTeamASet1>
      <PointsTeamBSet1>19</PointsTeamBSet1>
      <PointsTeamASet2>18</PointsTeamASet2>
      <PointsTeamBSet2>21</PointsTeamBSet2>
      <PointsTeamASet3>15</PointsTeamASet3>
      <PointsTeamBSet3>12</PointsTeamBSet3>
      <DurationSet1>25:30</DurationSet1>
      <DurationSet2>28:45</DurationSet2>
      <DurationSet3>20:15</DurationSet3>
      <NoReferee1>REF123</NoReferee1>
      <Referee1Name>Smith, John</Referee1Name>
      <Referee1FederationCode>USA</Referee1FederationCode>
      <NoReferee2>REF456</NoReferee2>
      <Referee2Name>Müller, Hans</Referee2Name>
      <Referee2FederationCode>GER</Referee2FederationCode>
    </BeachMatch>
  </BeachMatches>
  `;
  
  const matches = synchronizer.parseXMLMatches(complexMatchXML);
  assertEquals(matches.length, 1);
  
  const match = matches[0];
  
  // Verify all fields are correctly parsed
  assertEquals(match.No, "999888");
  assertEquals(match.NoInTournament, "QF-1");
  assertEquals(match.TeamAName, "  Spaced   Team  Name  "); // Preserved as-is from XML
  assertEquals(match.TeamBName, "Team with / Special Chars");
  assertEquals(match.LocalDate, "08/01/2025");
  assertEquals(match.LocalTime, "14:30:45");
  assertEquals(match.Court, "Center Court");
  assertEquals(match.Status, "FINISHED");
  assertEquals(match.Round, "Quarter-Finals");
  assertEquals(match.MatchPointsA, 2);
  assertEquals(match.MatchPointsB, 1);
  assertEquals(match.PointsTeamASet3, 15);
  assertEquals(match.PointsTeamBSet3, 12);
  assertEquals(match.DurationSet2, "28:45");
  assertEquals(match.NoReferee2, "REF456");
  assertEquals(match.Referee2FederationCode, "GER");
  
  // Test database mapping
  const dbMatch = synchronizer.mapMatchToDatabase(match, "12345");
  
  assertEquals(dbMatch.no, "999888");
  assertEquals(dbMatch.tournament_no, "12345");
  assertEquals(dbMatch.team_a_name, "Spaced Team Name"); // Sanitized
  assertEquals(dbMatch.local_date, "2025-01-08"); // Converted from DD/MM/YYYY
  assertEquals(dbMatch.local_time, "14:30:45"); // Preserved HH:MM:SS
  assertEquals(dbMatch.status, "Finished"); // Normalized
  assertEquals(dbMatch.match_points_a, 2);
  assertEquals(dbMatch.points_team_a_set3, 15);
  assertEquals(dbMatch.duration_set2, "28:45");
  assertEquals(dbMatch.referee2_name, "Müller, Hans");
});

Deno.test("Integration - Batch processing with large dataset", async () => {
  const mockSupabase = createMockSupabaseClient();
  const synchronizer = new MatchSynchronizer(mockSupabase);
  
  // Generate a large number of mock matches
  const largeMatchCount = 250;
  const matches = [];
  
  for (let i = 1; i <= largeMatchCount; i++) {
    matches.push({
      No: i.toString(),
      NoInTournament: `M${i.toString().padStart(3, '0')}`,
      TeamAName: `Team A${i}`,
      TeamBName: `Team B${i}`,
      LocalDate: "2025-01-08",
      LocalTime: "10:00",
      Court: `Court ${(i % 4) + 1}`,
      Status: i % 3 === 0 ? "Running" : i % 3 === 1 ? "Scheduled" : "Finished",
      Round: "Pool Play"
    });
  }
  
  // Process with batch size of 100
  const syncResult = await synchronizer.processMatchBatch(matches, "12345", 100);
  
  assertEquals(syncResult.processed, largeMatchCount);
  assertEquals(syncResult.errors, 0);
  assertEquals(syncResult.matchNumbers.length, largeMatchCount);
  assertEquals(syncResult.inserts, largeMatchCount); // All new matches
});

Deno.test("Integration - Match sync statistics", async () => {
  const existingMatches = [
    { no: "1", status: "Running", tournament_no: "12345" },
    { no: "2", status: "Scheduled", tournament_no: "12345" },
    { no: "3", status: "Finished", tournament_no: "12346" },
    { no: "4", status: "Scheduled", tournament_no: "12346" },
    { no: "5", status: "Running", tournament_no: "12347" }
  ];
  
  const mockSupabase = createMockSupabaseClient({ existingMatches });
  const synchronizer = new MatchSynchronizer(mockSupabase);
  
  // Test overall statistics
  const overallStats = await synchronizer.getMatchSyncStatistics();
  
  assertEquals(overallStats.totalMatches, 5);
  assertEquals(overallStats.statusBreakdown["Running"], 2);
  assertEquals(overallStats.statusBreakdown["Scheduled"], 2);
  assertEquals(overallStats.statusBreakdown["Finished"], 1);
  assertEquals(overallStats.tournamentBreakdown!["12345"], 2);
  assertEquals(overallStats.tournamentBreakdown!["12346"], 2);
  assertEquals(overallStats.tournamentBreakdown!["12347"], 1);
  
  // Test tournament-specific statistics
  const tournamentStats = await synchronizer.getMatchSyncStatistics("12345");
  
  assertEquals(tournamentStats.totalMatches, 5); // Mock returns total for any query
  assertEquals(tournamentStats.tournamentBreakdown, undefined); // Not included for specific tournament
});