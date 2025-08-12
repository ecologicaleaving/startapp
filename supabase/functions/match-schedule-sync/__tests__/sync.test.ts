// Unit tests for match synchronization logic
import { assertEquals, assertArrayIncludes, assertThrows } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { MatchSynchronizer, type FIVBMatch, type ActiveTournament } from "../sync.ts";

// Mock Supabase client for testing
const mockSupabaseClient = {
  from: (table: string) => ({
    select: () => ({
      in: () => ({
        lte: () => ({
          gte: () => ({
            gte: () => ({
              order: () => Promise.resolve({
                data: mockActiveTournaments,
                error: null
              })
            })
          })
        })
      })
    }),
    upsert: () => Promise.resolve({
      data: null,
      error: null,
      count: 1
    })
  })
};

const mockActiveTournaments: ActiveTournament[] = [
  {
    no: "12345",
    code: "TEST2024",
    name: "Test Tournament 2024",
    status: "Running",
    start_date: "2025-01-08",
    end_date: "2025-01-10",
    last_synced: "2025-01-08T10:00:00.000Z"
  },
  {
    no: "12346",
    code: "LIVE2024",
    name: "Live Tournament 2024",
    status: "Live",
    start_date: "2025-01-08",
    end_date: "2025-01-09",
    last_synced: "2025-01-08T09:30:00.000Z"
  }
];

const mockXMLResponse = `
<BeachMatches>
  <BeachMatch>
    <No>654321</No>
    <NoInTournament>M001</NoInTournament>
    <TeamAName>Player A / Player B</TeamAName>
    <TeamBName>Player C / Player D</TeamBName>
    <LocalDate>2025-01-08</LocalDate>
    <LocalTime>09:00</LocalTime>
    <Court>Court 1</Court>
    <Status>Scheduled</Status>
    <Round>Qualification Round 1</Round>
    <MatchPointsA>0</MatchPointsA>
    <MatchPointsB>0</MatchPointsB>
    <NoReferee1>REF001</NoReferee1>
    <Referee1Name>John Referee</Referee1Name>
    <Referee1FederationCode>USA</Referee1FederationCode>
  </BeachMatch>
  <BeachMatch>
    <No>654322</No>
    <NoInTournament>M002</NoInTournament>
    <TeamAName>Player E / Player F</TeamAName>
    <TeamBName>Player G / Player H</TeamBName>
    <LocalDate>2025-01-08</LocalDate>
    <LocalTime>10:30</LocalTime>
    <Court>Court 2</Court>
    <Status>Running</Status>
    <Round>Qualification Round 1</Round>
    <MatchPointsA>1</MatchPointsA>
    <MatchPointsB>0</MatchPointsB>
    <PointsTeamASet1>21</PointsTeamASet1>
    <PointsTeamBSet1>18</PointsTeamBSet1>
  </BeachMatch>
</BeachMatches>
`;

Deno.test("MatchSynchronizer - discoverActiveTournaments", async () => {
  const synchronizer = new MatchSynchronizer(mockSupabaseClient);
  
  const activeTournaments = await synchronizer.discoverActiveTournaments();
  
  assertEquals(activeTournaments.length, 2);
  assertEquals(activeTournaments[0].status, "Live"); // Should be prioritized first
  assertEquals(activeTournaments[1].status, "Running");
});

Deno.test("MatchSynchronizer - parseXMLMatches", () => {
  const synchronizer = new MatchSynchronizer(mockSupabaseClient);
  
  const matches = synchronizer.parseXMLMatches(mockXMLResponse);
  
  assertEquals(matches.length, 2);
  
  // Test first match
  assertEquals(matches[0].No, "654321");
  assertEquals(matches[0].TeamAName, "Player A / Player B");
  assertEquals(matches[0].Status, "Scheduled");
  assertEquals(matches[0].Court, "Court 1");
  
  // Test second match
  assertEquals(matches[1].No, "654322");
  assertEquals(matches[1].Status, "Running");
  assertEquals(matches[1].MatchPointsA, 1);
  assertEquals(matches[1].PointsTeamASet1, 21);
});

Deno.test("MatchSynchronizer - parseXMLMatches with invalid XML", () => {
  const synchronizer = new MatchSynchronizer(mockSupabaseClient);
  
  assertThrows(
    () => synchronizer.parseXMLMatches("invalid xml"),
    Error,
    "XML match parsing failed"
  );
});

Deno.test("MatchSynchronizer - mapMatchToDatabase", () => {
  const synchronizer = new MatchSynchronizer(mockSupabaseClient);
  
  const fivbMatch: FIVBMatch = {
    No: "654321",
    NoInTournament: "M001",
    TeamAName: "Player A / Player B",
    TeamBName: "Player C / Player D",
    LocalDate: "2025-01-08",
    LocalTime: "09:00",
    Court: "Court 1",
    Status: "Scheduled",
    Round: "Qualification Round 1",
    MatchPointsA: 0,
    MatchPointsB: 0
  };
  
  const dbMatch = synchronizer.mapMatchToDatabase(fivbMatch, "12345");
  
  assertEquals(dbMatch.no, "654321");
  assertEquals(dbMatch.tournament_no, "12345");
  assertEquals(dbMatch.team_a_name, "Player A / Player B");
  assertEquals(dbMatch.local_date, "2025-01-08");
  assertEquals(dbMatch.local_time, "09:00:00");
  assertEquals(dbMatch.status, "Scheduled");
  assertEquals(dbMatch.match_points_a, 0);
});

Deno.test("MatchSynchronizer - normalizeMatchStatus", () => {
  const synchronizer = new MatchSynchronizer(mockSupabaseClient);
  
  // Test various status normalizations through mapMatchToDatabase
  const testCases = [
    { input: "scheduled", expected: "Scheduled" },
    { input: "RUNNING", expected: "Running" },
    { input: "live", expected: "Running" },
    { input: "finished", expected: "Finished" },
    { input: "completed", expected: "Finished" },
    { input: "cancelled", expected: "Cancelled" },
    { input: "postponed", expected: "Postponed" }
  ];
  
  testCases.forEach(({ input, expected }) => {
    const fivbMatch: FIVBMatch = {
      No: "1",
      NoInTournament: "M001",
      TeamAName: "Team A",
      TeamBName: "Team B",
      LocalDate: "2025-01-08",
      LocalTime: "09:00",
      Court: "Court 1",
      Status: input,
      Round: "Round 1"
    };
    
    const dbMatch = synchronizer.mapMatchToDatabase(fivbMatch, "12345");
    assertEquals(dbMatch.status, expected);
  });
});

Deno.test("MatchSynchronizer - validateMatch", () => {
  const synchronizer = new MatchSynchronizer(mockSupabaseClient);
  
  // Valid match
  const validMatch: FIVBMatch = {
    No: "654321",
    NoInTournament: "M001",
    TeamAName: "Player A / Player B",
    TeamBName: "Player C / Player D",
    LocalDate: "2025-01-08",
    LocalTime: "09:00",
    Court: "Court 1",
    Status: "Scheduled",
    Round: "Qualification Round 1"
  };
  
  const validMatches = synchronizer.parseXMLMatches(`
    <BeachMatches>
      <BeachMatch>
        <No>${validMatch.No}</No>
        <NoInTournament>${validMatch.NoInTournament}</NoInTournament>
        <TeamAName>${validMatch.TeamAName}</TeamAName>
        <TeamBName>${validMatch.TeamBName}</TeamBName>
        <LocalDate>${validMatch.LocalDate}</LocalDate>
        <LocalTime>${validMatch.LocalTime}</LocalTime>
        <Court>${validMatch.Court}</Court>
        <Status>${validMatch.Status}</Status>
        <Round>${validMatch.Round}</Round>
      </BeachMatch>
    </BeachMatches>
  `);
  
  assertEquals(validMatches.length, 1);
  
  // Invalid match (missing No)
  const invalidMatches = synchronizer.parseXMLMatches(`
    <BeachMatches>
      <BeachMatch>
        <TeamAName>Team A</TeamAName>
        <TeamBName>Team B</TeamBName>
        <Status>Scheduled</Status>
      </BeachMatch>
    </BeachMatches>
  `);
  
  assertEquals(invalidMatches.length, 0); // Should be filtered out
});

Deno.test("MatchSynchronizer - formatDateForDB", () => {
  const synchronizer = new MatchSynchronizer(mockSupabaseClient);
  
  const testCases = [
    { input: "2025-01-08", expected: "2025-01-08" },
    { input: "08/01/2025", expected: "2025-01-08" },
    { input: "01-08-2025", expected: "2025-01-08" },
    { input: "", expected: new Date().toISOString().split('T')[0] }, // Today
    { input: "invalid", expected: new Date().toISOString().split('T')[0] } // Today as fallback
  ];
  
  testCases.forEach(({ input, expected }) => {
    const fivbMatch: FIVBMatch = {
      No: "1",
      NoInTournament: "M001",
      TeamAName: "Team A",
      TeamBName: "Team B",
      LocalDate: input,
      LocalTime: "09:00",
      Court: "Court 1",
      Status: "Scheduled",
      Round: "Round 1"
    };
    
    const dbMatch = synchronizer.mapMatchToDatabase(fivbMatch, "12345");
    assertEquals(dbMatch.local_date, expected);
  });
});

Deno.test("MatchSynchronizer - formatTimeForDB", () => {
  const synchronizer = new MatchSynchronizer(mockSupabaseClient);
  
  const testCases = [
    { input: "09:00", expected: "09:00:00" },
    { input: "14:30:45", expected: "14:30:45" },
    { input: "", expected: "00:00:00" },
    { input: "invalid", expected: "00:00:00" }
  ];
  
  testCases.forEach(({ input, expected }) => {
    const fivbMatch: FIVBMatch = {
      No: "1",
      NoInTournament: "M001",
      TeamAName: "Team A",
      TeamBName: "Team B",
      LocalDate: "2025-01-08",
      LocalTime: input,
      Court: "Court 1",
      Status: "Scheduled",
      Round: "Round 1"
    };
    
    const dbMatch = synchronizer.mapMatchToDatabase(fivbMatch, "12345");
    assertEquals(dbMatch.local_time, expected);
  });
});

Deno.test("MatchSynchronizer - sanitizeString", () => {
  const synchronizer = new MatchSynchronizer(mockSupabaseClient);
  
  const testCases = [
    { input: "Normal Team Name", expected: "Normal Team Name" },
    { input: "  Trimmed  Team  Name  ", expected: "Trimmed Team Name" },
    { input: "Team\x00With\x1FControl\x7FChars", expected: "TeamWithControlChars" },
    { input: "A".repeat(300), expected: "A".repeat(252) + "..." }, // Length limit
    { input: "", expected: null },
    { input: null, expected: null },
    { input: undefined, expected: null }
  ];
  
  testCases.forEach(({ input, expected }) => {
    const fivbMatch: FIVBMatch = {
      No: "1",
      NoInTournament: "M001",
      TeamAName: input as string,
      TeamBName: "Team B",
      LocalDate: "2025-01-08",
      LocalTime: "09:00",
      Court: "Court 1",
      Status: "Scheduled",
      Round: "Round 1"
    };
    
    const dbMatch = synchronizer.mapMatchToDatabase(fivbMatch, "12345");
    assertEquals(dbMatch.team_a_name, expected || "Team A"); // Fallback applied
  });
});

Deno.test("MatchSynchronizer - processMatchBatch", async () => {
  const mockSupabaseWithQuery = {
    from: (table: string) => ({
      select: () => ({
        in: () => Promise.resolve({
          data: [], // No existing matches
          error: null
        })
      }),
      upsert: () => Promise.resolve({
        data: null,
        error: null,
        count: 2
      })
    })
  };
  
  const synchronizer = new MatchSynchronizer(mockSupabaseWithQuery);
  
  const matches: FIVBMatch[] = [
    {
      No: "1",
      NoInTournament: "M001",
      TeamAName: "Team A1",
      TeamBName: "Team B1",
      LocalDate: "2025-01-08",
      LocalTime: "09:00",
      Court: "Court 1",
      Status: "Scheduled",
      Round: "Round 1"
    },
    {
      No: "2",
      NoInTournament: "M002",
      TeamAName: "Team A2",
      TeamBName: "Team B2",
      LocalDate: "2025-01-08",
      LocalTime: "10:00",
      Court: "Court 2",
      Status: "Running",
      Round: "Round 1"
    }
  ];
  
  const result = await synchronizer.processMatchBatch(matches, "12345", 10);
  
  assertEquals(result.processed, 2);
  assertEquals(result.errors, 0);
  assertEquals(result.matchNumbers.length, 2);
  assertArrayIncludes(result.matchNumbers, ["1", "2"]);
});

Deno.test("MatchSynchronizer - getMatchSyncStatistics", async () => {
  const mockSupabaseWithStats = {
    from: (table: string) => ({
      select: (columns: string, options?: any) => {
        if (options?.count === 'exact' && options?.head === true) {
          return Promise.resolve({ count: 5, error: null });
        }
        if (columns === 'status') {
          return {
            not: () => Promise.resolve({
              data: [
                { status: 'Scheduled' },
                { status: 'Scheduled' },
                { status: 'Running' },
                { status: 'Finished' },
                { status: 'Finished' }
              ],
              error: null
            })
          };
        }
        if (columns === 'tournament_no') {
          return {
            not: () => Promise.resolve({
              data: [
                { tournament_no: '12345' },
                { tournament_no: '12345' },
                { tournament_no: '12346' }
              ],
              error: null
            })
          };
        }
        return Promise.resolve({ data: [], error: null });
      },
      gte: () => ({
        eq: () => Promise.resolve({ count: 2, error: null })
      }),
      eq: () => ({
        gte: () => Promise.resolve({ count: 2, error: null })
      })
    })
  };
  
  const synchronizer = new MatchSynchronizer(mockSupabaseWithStats);
  
  const stats = await synchronizer.getMatchSyncStatistics();
  
  assertEquals(stats.totalMatches, 5);
  assertEquals(stats.recentlyUpdated, 5); // Mock returns same count
  assertEquals(stats.statusBreakdown['Scheduled'], 2);
  assertEquals(stats.statusBreakdown['Running'], 1);
  assertEquals(stats.statusBreakdown['Finished'], 2);
  assertEquals(stats.tournamentBreakdown!['12345'], 2);
  assertEquals(stats.tournamentBreakdown!['12346'], 1);
});