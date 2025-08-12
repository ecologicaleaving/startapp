import { assertEquals, assertExists, assertRejects } from 'std/testing/asserts.ts';
import { describe, it, beforeEach, afterEach } from 'std/testing/bdd.ts';
import { stub, Stub } from 'std/testing/mock.ts';

// Mock Supabase client for testing
const mockSupabaseClient = {
  from: (table: string) => ({
    select: () => ({ data: [], error: null }),
    update: () => ({ error: null }),
    upsert: () => ({ error: null }),
    eq: () => ({ data: [], error: null }),
    in: () => ({ data: [], error: null }),
    gte: () => ({ data: [], error: null }),
    order: () => ({ data: [], error: null }),
  }),
};

// Mock environment variables
const mockEnv = {
  'SUPABASE_URL': 'https://test.supabase.co',
  'SUPABASE_SERVICE_ROLE_KEY': 'test-service-key',
  'FIVB_API_KEY': 'test-fivb-key',
};

describe('Live Score Sync Edge Function', () => {
  let fetchStub: Stub<typeof fetch>;
  let consoleStub: Stub<typeof console.log>;
  
  beforeEach(() => {
    // Mock fetch for API calls
    fetchStub = stub(globalThis, 'fetch');
    consoleStub = stub(console, 'log');
    
    // Mock Deno.env
    Object.entries(mockEnv).forEach(([key, value]) => {
      stub(Deno.env, 'get', (key: string) => mockEnv[key as keyof typeof mockEnv]);
    });
  });

  afterEach(() => {
    fetchStub.restore();
    consoleStub.restore();
  });

  describe('Tournament Hour Detection', () => {
    it('should identify active tournament hours correctly', async () => {
      // Mock database response with active tournaments
      const mockTournaments = [
        {
          no: '12345',
          code: 'M-TEST2024',
          name: 'Test Tournament',
          start_date: '2024-01-10',
          end_date: '2024-01-15',
          status: 'Running',
        },
      ];

      // Set current time to within tournament dates
      const testDate = new Date('2024-01-12T14:00:00Z');
      stub(Date, 'now', () => testDate.getTime());
      
      // Import and test the tournament hour detector
      const { TournamentHourDetector } = await import('../tournament-hour-detector.ts');
      const detector = new TournamentHourDetector(mockSupabaseClient as any);
      
      // Mock the database call to return active tournaments
      stub(mockSupabaseClient, 'from', () => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => ({
                data: mockTournaments,
                error: null,
              }),
            }),
          }),
        }),
      }));

      const isActive = await detector.isActiveTournamentHour();
      assertEquals(isActive, true);
    });

    it('should return false when no active tournaments exist', async () => {
      const { TournamentHourDetector } = await import('../tournament-hour-detector.ts');
      const detector = new TournamentHourDetector(mockSupabaseClient as any);
      
      // Mock empty tournament response
      stub(mockSupabaseClient, 'from', () => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => ({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      }));

      const isActive = await detector.isActiveTournamentHour();
      assertEquals(isActive, false);
    });

    it('should handle database errors gracefully', async () => {
      const { TournamentHourDetector } = await import('../tournament-hour-detector.ts');
      const detector = new TournamentHourDetector(mockSupabaseClient as any);
      
      // Mock database error
      stub(mockSupabaseClient, 'from', () => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => ({
                data: null,
                error: { message: 'Database connection failed' },
              }),
            }),
          }),
        }),
      }));

      // Should default to true (allow sync) on error
      const isActive = await detector.isActiveTournamentHour();
      assertEquals(isActive, true);
    });
  });

  describe('Live Score Sync', () => {
    it('should sync active tournament scores successfully', async () => {
      const { LiveScoreSync } = await import('../sync.ts');
      const syncService = new LiveScoreSync(mockSupabaseClient as any);

      // Mock active tournaments
      const mockTournaments = [
        {
          no: '12345',
          code: 'M-TEST2024',
          name: 'Test Tournament',
          status: 'Running',
        },
      ];

      // Mock live matches
      const mockMatches = [
        {
          no: 'M001',
          tournament_no: '12345',
          no_in_tournament: '1',
          team_a_name: 'Team A',
          team_b_name: 'Team B',
          status: 'live',
          match_points_a: 1,
          match_points_b: 0,
        },
      ];

      // Mock FIVB API response
      const mockApiResponse = `<BeachMatch No="M001" MatchPointsA="2" MatchPointsB="0" PointsTeamASet1="21" PointsTeamBSet1="19" Status="live" />`;
      
      fetchStub.returns(
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockApiResponse),
        } as Response)
      );

      // Mock database responses
      let callCount = 0;
      stub(mockSupabaseClient, 'from', (table: string) => {
        if (table === 'tournaments') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    data: mockTournaments,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'matches') {
          callCount++;
          if (callCount === 1) {
            // First call - get live matches
            return {
              select: () => ({
                eq: () => ({
                  in: () => ({
                    order: () => ({
                      data: mockMatches,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          } else {
            // Second call - update match
            return {
              update: () => ({
                eq: () => ({
                  error: null,
                }),
              }),
            };
          }
        } else {
          return {
            upsert: () => ({ error: null }),
          };
        }
      });

      const result = await syncService.executeLiveScoreSync();
      
      assertEquals(result.totalTournaments, 1);
      assertEquals(result.totalMatches, 1);
      assertEquals(result.updatedMatches, 1);
      assertEquals(result.errors.length, 0);
      assertExists(result.duration);
    });

    it('should handle API failures gracefully', async () => {
      const { LiveScoreSync } = await import('../sync.ts');
      const syncService = new LiveScoreSync(mockSupabaseClient as any);

      // Mock tournaments and matches
      const mockTournaments = [{ no: '12345', code: 'TEST', name: 'Test', status: 'Running' }];
      const mockMatches = [{ 
        no: 'M001', 
        tournament_no: '12345', 
        status: 'live',
        match_points_a: 1,
        match_points_b: 0,
      }];

      // Mock API failure
      fetchStub.returns(Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response));

      // Mock database responses
      stub(mockSupabaseClient, 'from', (table: string) => {
        if (table === 'tournaments') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({ data: mockTournaments, error: null }),
                }),
              }),
            }),
          };
        } else if (table === 'matches') {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => ({ data: mockMatches, error: null }),
                }),
              }),
            }),
          };
        }
        return { upsert: () => ({ error: null }) };
      });

      const result = await syncService.executeLiveScoreSync();
      
      assertEquals(result.totalTournaments, 1);
      assertEquals(result.totalMatches, 1);
      assertEquals(result.updatedMatches, 0);
      assertEquals(result.errors.length, 1);
    });

    it('should skip inactive tournaments', async () => {
      const { LiveScoreSync } = await import('../sync.ts');
      const syncService = new LiveScoreSync(mockSupabaseClient as any);

      // Mock empty tournaments response
      stub(mockSupabaseClient, 'from', () => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => ({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
        upsert: () => ({ error: null }),
      }));

      const result = await syncService.executeLiveScoreSync();
      
      assertEquals(result.totalTournaments, 0);
      assertEquals(result.totalMatches, 0);
      assertEquals(result.updatedMatches, 0);
      assertEquals(result.errors.length, 0);
    });

    it('should handle individual match failures without stopping sync', async () => {
      const { LiveScoreSync } = await import('../sync.ts');
      const syncService = new LiveScoreSync(mockSupabaseClient as any);

      // Mock tournaments and matches (2 matches, one will fail)
      const mockTournaments = [{ no: '12345', code: 'TEST', name: 'Test', status: 'Running' }];
      const mockMatches = [
        { no: 'M001', tournament_no: '12345', status: 'live', match_points_a: 1, match_points_b: 0 },
        { no: 'M002', tournament_no: '12345', status: 'live', match_points_a: 0, match_points_b: 1 },
      ];

      // Mock API responses - first succeeds, second fails
      let fetchCallCount = 0;
      fetchStub.callsFake(() => {
        fetchCallCount++;
        if (fetchCallCount === 1) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(`<BeachMatch No="M001" MatchPointsA="2" MatchPointsB="0" />`),
          } as Response);
        } else {
          return Promise.resolve({
            ok: false,
            status: 404,
            statusText: 'Not Found',
          } as Response);
        }
      });

      // Mock database responses
      let dbCallCount = 0;
      stub(mockSupabaseClient, 'from', (table: string) => {
        if (table === 'tournaments') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({ data: mockTournaments, error: null }),
                }),
              }),
            }),
          };
        } else if (table === 'matches') {
          dbCallCount++;
          if (dbCallCount === 1) {
            return {
              select: () => ({
                eq: () => ({
                  in: () => ({
                    order: () => ({ data: mockMatches, error: null }),
                  }),
                }),
              }),
            };
          } else {
            return {
              update: () => ({
                eq: () => ({ error: null }),
              }),
            };
          }
        }
        return { upsert: () => ({ error: null }) };
      });

      const result = await syncService.executeLiveScoreSync();
      
      // Should have processed both matches, with one success and one error
      assertEquals(result.totalMatches, 2);
      assertEquals(result.updatedMatches, 1);
      assertEquals(result.errors.length, 1);
    });
  });

  describe('Error Handling', () => {
    it('should categorize errors correctly', async () => {
      const { ErrorHandler } = await import('../error-handler.ts');
      const errorHandler = new ErrorHandler();

      // Test API error categorization
      const apiError = new Error('FIVB API connection failed');
      const apiResult = await errorHandler.handleSyncError(apiError, {
        function: 'test',
        timestamp: new Date().toISOString(),
      });
      
      assertExists(apiResult.message);
      assertEquals(apiResult.shouldRetry, false);

      // Test network error categorization
      const networkError = new Error('network timeout');
      const networkResult = await errorHandler.handleSyncError(networkError, {
        function: 'test',
        timestamp: new Date().toISOString(),
      });
      
      assertEquals(networkResult.shouldRetry, true);
    });

    it('should handle match errors without throwing', async () => {
      const { ErrorHandler } = await import('../error-handler.ts');
      const errorHandler = new ErrorHandler();

      const matchError = new Error('Match sync failed');
      
      // Should not throw
      await errorHandler.handleMatchError(matchError, {
        matchNo: 'M001',
        tournamentNo: '12345',
        teamNames: 'Team A vs Team B',
      });
      
      // Test passes if no exception is thrown
      assertEquals(true, true);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete sync workflow', async () => {
      // This is a higher-level test that verifies the complete workflow
      const { LiveScoreSync } = await import('../sync.ts');
      const { TournamentHourDetector } = await import('../tournament-hour-detector.ts');
      
      const syncService = new LiveScoreSync(mockSupabaseClient as any);
      const hourDetector = new TournamentHourDetector(mockSupabaseClient as any);

      // Mock successful tournament hour detection
      stub(mockSupabaseClient, 'from', (table: string) => {
        if (table === 'tournaments') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    data: [{
                      no: '12345',
                      name: 'Test Tournament',
                      status: 'Running',
                      start_date: '2024-01-10',
                      end_date: '2024-01-15',
                    }],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        } else if (table === 'matches') {
          return {
            select: () => ({
              eq: () => ({
                in: () => ({
                  order: () => ({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return { upsert: () => ({ error: null }) };
      });

      // Set time within tournament hours
      const testDate = new Date('2024-01-12T14:00:00Z');
      stub(Date, 'now', () => testDate.getTime());

      const shouldRun = await hourDetector.isActiveTournamentHour();
      assertEquals(shouldRun, true);

      if (shouldRun) {
        const result = await syncService.executeLiveScoreSync();
        assertEquals(result.totalTournaments, 1);
        assertEquals(result.errors.length, 0);
      }
    });
  });
});