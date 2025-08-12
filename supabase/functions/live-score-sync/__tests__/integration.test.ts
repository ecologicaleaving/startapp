import { assertEquals, assertExists, assert } from 'std/testing/asserts.ts';
import { describe, it, beforeEach } from 'std/testing/bdd.ts';
import { stub } from 'std/testing/mock.ts';

/**
 * Integration tests for Live Score Sync Edge Function
 * Tests the complete workflow with real-like data and scenarios
 */

describe('Live Score Sync Integration Tests', () => {
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

  beforeEach(() => {
    // Mock environment variables
    stub(Deno.env, 'get', (key: string) => {
      const envVars: { [key: string]: string } = {
        'SUPABASE_URL': 'https://test.supabase.co',
        'SUPABASE_SERVICE_ROLE_KEY': 'test-service-key',
        'FIVB_API_KEY': 'test-fivb-key',
      };
      return envVars[key];
    });
  });

  describe('End-to-End Live Score Workflow', () => {
    it('should handle multiple concurrent tournaments with live matches', async () => {
      const { LiveScoreSync } = await import('../sync.ts');
      const syncService = new LiveScoreSync(mockSupabaseClient as any);

      // Mock multiple active tournaments
      const mockTournaments = [
        {
          no: '12345',
          code: 'M-FIVB2024',
          name: 'FIVB Beach Volleyball World Tour',
          status: 'Running',
          start_date: '2024-01-10',
          end_date: '2024-01-15',
        },
        {
          no: '12346',
          code: 'W-FIVB2024',
          name: 'FIVB Beach Volleyball World Tour Women',
          status: 'Running',
          start_date: '2024-01-10',
          end_date: '2024-01-15',
        },
        {
          no: '12347',
          code: 'M-BPT2024',
          name: 'Beach Pro Tour Elite16',
          status: 'Running',
          start_date: '2024-01-12',
          end_date: '2024-01-14',
        },
      ];

      // Mock live matches for each tournament
      const mockMatches = [
        // Tournament 1 matches
        {
          no: 'M001',
          tournament_no: '12345',
          no_in_tournament: '1',
          team_a_name: 'Norway/Mol',
          team_b_name: 'Brazil/Evandro',
          status: 'live',
          match_points_a: 1,
          match_points_b: 1,
          points_team_a_set1: 21,
          points_team_b_set1: 19,
          points_team_a_set2: 18,
          points_team_b_set2: 21,
        },
        {
          no: 'M002',
          tournament_no: '12345',
          no_in_tournament: '2',
          team_a_name: 'USA/Partain',
          team_b_name: 'Germany/Ehlers',
          status: 'live',
          match_points_a: 0,
          match_points_b: 1,
          points_team_a_set1: 19,
          points_team_b_set1: 21,
        },
        // Tournament 2 matches
        {
          no: 'W001',
          tournament_no: '12346',
          no_in_tournament: '1',
          team_a_name: 'Brazil/Ana Patricia',
          team_b_name: 'USA/Kelly',
          status: 'live',
          match_points_a: 2,
          match_points_b: 0,
          points_team_a_set1: 21,
          points_team_b_set1: 18,
          points_team_a_set2: 21,
          points_team_b_set2: 16,
        },
        // Tournament 3 - no live matches
      ];

      // Mock API responses for each match with score updates
      const fetchStub = stub(globalThis, 'fetch');
      let fetchCallCount = 0;
      
      fetchStub.callsFake((url) => {
        fetchCallCount++;
        const urlStr = url.toString();
        
        if (urlStr.includes('M001')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(`<BeachMatch No="M001" MatchPointsA="2" MatchPointsB="1" PointsTeamASet1="21" PointsTeamBSet1="19" PointsTeamASet2="18" PointsTeamBSet2="21" PointsTeamASet3="15" PointsTeamBSet3="12" Status="live" />`),
          } as Response);
        } else if (urlStr.includes('M002')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(`<BeachMatch No="M002" MatchPointsA="1" MatchPointsB="1" PointsTeamASet1="19" PointsTeamBSet1="21" PointsTeamASet2="21" PointsTeamBSet2="18" Status="live" />`),
          } as Response);
        } else if (urlStr.includes('W001')) {
          // This match is already finished, no score change
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(`<BeachMatch No="W001" MatchPointsA="2" MatchPointsB="0" PointsTeamASet1="21" PointsTeamBSet1="18" PointsTeamASet2="21" PointsTeamBSet2="16" Status="finished" />`),
          } as Response);
        }
        
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        } as Response);
      });

      // Mock database responses
      let dbCallCount = 0;
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
          dbCallCount++;
          if (dbCallCount <= 3) {
            // First few calls - get live matches for each tournament
            const tournamentMatches = mockMatches.filter(m => {
              if (dbCallCount === 1) return m.tournament_no === '12345';
              if (dbCallCount === 2) return m.tournament_no === '12346';
              if (dbCallCount === 3) return m.tournament_no === '12347';
              return false;
            });
            
            return {
              select: () => ({
                eq: () => ({
                  in: () => ({
                    order: () => ({
                      data: tournamentMatches,
                      error: null,
                    }),
                  }),
                }),
              }),
            };
          } else {
            // Subsequent calls - update match scores
            return {
              update: () => ({
                eq: () => ({
                  error: null,
                }),
              }),
            };
          }
        } else {
          // sync_status updates
          return {
            upsert: () => ({ error: null }),
          };
        }
      });

      const result = await syncService.executeLiveScoreSync();

      // Verify results
      assertEquals(result.totalTournaments, 3);
      assertEquals(result.totalMatches, 3);
      assertEquals(result.updatedMatches, 3); // All matches should have updates
      assertEquals(result.errors.length, 0);
      
      // Verify API calls were made for each match
      assertEquals(fetchCallCount, 3);
      
      // Verify performance metrics
      assert(result.duration > 0, 'Sync duration should be recorded');
      assert(result.duration < 30000, 'Sync should complete within 30 seconds');

      fetchStub.restore();
    });

    it('should handle high-volume tournament with many live matches', async () => {
      const { LiveScoreSync } = await import('../sync.ts');
      const syncService = new LiveScoreSync(mockSupabaseClient as any);

      // Mock single tournament with many matches (simulate major tournament)
      const mockTournament = {
        no: '99999',
        code: 'M-WORLDCHAMP2024',
        name: 'Beach Volleyball World Championship',
        status: 'Running',
      };

      // Generate 50 live matches to test high-volume processing
      const mockMatches = Array.from({ length: 50 }, (_, index) => ({
        no: `WC${(index + 1).toString().padStart(3, '0')}`,
        tournament_no: '99999',
        no_in_tournament: (index + 1).toString(),
        team_a_name: `Team A${index + 1}`,
        team_b_name: `Team B${index + 1}`,
        status: 'live',
        match_points_a: Math.floor(Math.random() * 3),
        match_points_b: Math.floor(Math.random() * 3),
      }));

      // Mock API responses for all matches
      const fetchStub = stub(globalThis, 'fetch');
      fetchStub.returns(Promise.resolve({
        ok: true,
        text: () => Promise.resolve(`<BeachMatch No="WC001" MatchPointsA="1" MatchPointsB="0" Status="live" />`),
      } as Response));

      // Mock database responses
      let dbCallCount = 0;
      stub(mockSupabaseClient, 'from', (table: string) => {
        if (table === 'tournaments') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    data: [mockTournament],
                    error: null,
                  }),
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
                    order: () => ({
                      data: mockMatches,
                      error: null,
                    }),
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

      const startTime = Date.now();
      const result = await syncService.executeLiveScoreSync();
      const endTime = Date.now();

      // Verify high-volume processing
      assertEquals(result.totalTournaments, 1);
      assertEquals(result.totalMatches, 50);
      
      // Should handle large volume efficiently
      const processingTime = endTime - startTime;
      assert(processingTime < 60000, 'High-volume sync should complete within 1 minute');
      
      // Error rate should be acceptable
      const errorRate = result.errors.length / result.totalMatches;
      assert(errorRate < 0.1, 'Error rate should be less than 10%');

      fetchStub.restore();
    });

    it('should handle network failures and retry logic', async () => {
      const { LiveScoreSync } = await import('../sync.ts');
      const syncService = new LiveScoreSync(mockSupabaseClient as any);

      const mockTournament = { no: '12345', code: 'TEST', name: 'Test', status: 'Running' };
      const mockMatch = {
        no: 'M001',
        tournament_no: '12345',
        status: 'live',
        match_points_a: 0,
        match_points_b: 0,
      };

      // Mock API failures followed by success
      const fetchStub = stub(globalThis, 'fetch');
      let fetchAttempts = 0;
      
      fetchStub.callsFake(() => {
        fetchAttempts++;
        if (fetchAttempts <= 2) {
          // First two attempts fail
          return Promise.resolve({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
          } as Response);
        } else {
          // Third attempt succeeds
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(`<BeachMatch No="M001" MatchPointsA="1" MatchPointsB="0" Status="live" />`),
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
                  order: () => ({ data: [mockTournament], error: null }),
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
                    order: () => ({ data: [mockMatch], error: null }),
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

      // Should eventually succeed after retries
      assertEquals(result.totalMatches, 1);
      assertEquals(result.updatedMatches, 1);
      assertEquals(result.errors.length, 0);
      
      // Verify retry logic was exercised
      assertEquals(fetchAttempts, 3);

      fetchStub.restore();
    });

    it('should pause during non-tournament hours', async () => {
      const { TournamentHourDetector } = await import('../tournament-hour-detector.ts');
      const detector = new TournamentHourDetector(mockSupabaseClient as any);

      // Mock database response with tournaments
      stub(mockSupabaseClient, 'from', () => ({
        select: () => ({
          eq: () => ({
            gte: () => ({
              order: () => ({
                data: [{
                  no: '12345',
                  start_date: '2024-01-10',
                  end_date: '2024-01-15',
                  status: 'Running',
                }],
                error: null,
              }),
            }),
          }),
        }),
      }));

      // Test during early hours (3 AM UTC) - should be inactive
      const earlyMorning = new Date('2024-01-12T03:00:00Z');
      stub(Date, 'now', () => earlyMorning.getTime());

      const isActiveEarly = await detector.isActiveTournamentHour();
      assertEquals(isActiveEarly, false);

      // Test during typical playing hours (2 PM UTC) - should be active
      const afternoon = new Date('2024-01-12T14:00:00Z');
      stub(Date, 'now', () => afternoon.getTime());

      const isActiveAfternoon = await detector.isActiveTournamentHour();
      assertEquals(isActiveAfternoon, true);

      // Test late evening (11:30 PM UTC) - should still be active (within hours)
      const lateEvening = new Date('2024-01-12T23:30:00Z');
      stub(Date, 'now', () => lateEvening.getTime());

      const isActiveLate = await detector.isActiveTournamentHour();
      assertEquals(isActiveLate, true);
    });
  });

  describe('Real-Time Integration Scenarios', () => {
    it('should handle simultaneous score updates across multiple matches', async () => {
      const { LiveScoreSync } = await import('../sync.ts');
      const syncService = new LiveScoreSync(mockSupabaseClient as any);

      // Simulate concurrent matches finishing simultaneously
      const mockTournament = { no: '12345', code: 'FINAL', name: 'Finals', status: 'Running' };
      const mockMatches = [
        {
          no: 'F001',
          tournament_no: '12345',
          team_a_name: 'Semifinal 1 Winner',
          team_b_name: 'Semifinal 2 Winner',
          status: 'live',
          match_points_a: 1,
          match_points_b: 1,
        },
        {
          no: 'F002',
          tournament_no: '12345',
          team_a_name: 'Bronze Medal Match A',
          team_b_name: 'Bronze Medal Match B',
          status: 'live',
          match_points_a: 2,
          match_points_b: 1,
        },
      ];

      // Mock API responses with final scores
      const fetchStub = stub(globalThis, 'fetch');
      fetchStub.callsFake((url) => {
        const urlStr = url.toString();
        if (urlStr.includes('F001')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(`<BeachMatch No="F001" MatchPointsA="2" MatchPointsB="1" Status="finished" />`),
          } as Response);
        } else if (urlStr.includes('F002')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve(`<BeachMatch No="F002" MatchPointsA="2" MatchPointsB="1" Status="finished" />`),
          } as Response);
        }
        return Promise.resolve({ ok: false } as Response);
      });

      // Mock database responses
      stub(mockSupabaseClient, 'from', (table: string) => {
        if (table === 'tournaments') {
          return {
            select: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({ data: [mockTournament], error: null }),
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
            update: () => ({
              eq: () => ({ error: null }),
            }),
          };
        }
        return { upsert: () => ({ error: null }) };
      });

      const result = await syncService.executeLiveScoreSync();

      // Verify both matches were updated
      assertEquals(result.totalMatches, 2);
      assertEquals(result.updatedMatches, 2);
      assertEquals(result.errors.length, 0);

      fetchStub.restore();
    });
  });
});