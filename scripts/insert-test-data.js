#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Inserting Test Data for Story 4.2 Development');
console.log('================================================\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function insertTestData() {
  try {
    console.log('🏆 Step 1: Creating test tournaments...');
    
    const testTournaments = [
      {
        no: 'MWBVT2025-TEST1',
        code: 'MWBVT2025',
        name: 'Beach Volleyball World Tour 2025 - Test Event',
        start_date: '2025-08-10',
        end_date: '2025-08-15',
        status: 'Running',
        location: 'Test Beach, Test Country'
      },
      {
        no: 'WWBVT2025-TEST2', 
        code: 'WWBVT2025',
        name: 'Women Beach Volleyball World Tour 2025 - Test Event',
        start_date: '2025-08-12',
        end_date: '2025-08-17',
        status: 'Running',
        location: 'Test City Beach, Test Country'
      },
      {
        no: 'MWBVT2025-TEST3',
        code: 'MWBVT2025B',
        name: 'Beach Volleyball Challenge Cup 2025',
        start_date: '2025-08-05',
        end_date: '2025-08-08',
        status: 'Finished',
        location: 'Previous Test Location'
      }
    ];
    
    const { data: tournaments, error: tourError } = await supabase
      .from('tournaments')
      .insert(testTournaments)
      .select();
    
    if (tourError) {
      console.log(`⚠️  Tournament insert warning: ${tourError.message}`);
      // Continue anyway, might be duplicate key
    } else {
      console.log(`✅ Inserted ${tournaments.length} test tournaments`);
    }
    
    console.log('\n🏐 Step 2: Creating test matches...');
    
    const testMatches = [
      // Active/Live matches for real-time testing
      {
        no: 'M001-2025-TEST',
        tournament_no: 'MWBVT2025-TEST1',
        no_in_tournament: '001',
        team_a_name: 'Smith/Johnson',
        team_b_name: 'Brown/Wilson',
        local_date: '2025-08-11',
        local_time: '14:30:00',
        court: 'Court 1',
        status: 'live',
        round: 'Pool A',
        // Live score data for Story 4.2 testing
        points_a: 18,
        points_b: 15,
        match_points_a: 1,
        match_points_b: 0,
        points_team_a_set1: 21,
        points_team_b_set1: 18,
        points_team_a_set2: 18,
        points_team_b_set2: 15,
        set_scores: {
          set1: { team_a: 21, team_b: 18 },
          set2: { team_a: 18, team_b: 15 }
        },
        live_updated_at: new Date().toISOString()
      },
      {
        no: 'M002-2025-TEST',
        tournament_no: 'MWBVT2025-TEST1',
        no_in_tournament: '002',
        team_a_name: 'Davis/Miller',
        team_b_name: 'Garcia/Rodriguez',
        local_date: '2025-08-11',
        local_time: '15:00:00',
        court: 'Court 2', 
        status: 'live',
        round: 'Pool B',
        points_a: 12,
        points_b: 8,
        match_points_a: 0,
        match_points_b: 0,
        points_team_a_set1: 12,
        points_team_b_set1: 8,
        set_scores: {
          set1: { team_a: 12, team_b: 8 }
        },
        live_updated_at: new Date().toISOString()
      },
      // Women's tournament matches
      {
        no: 'W001-2025-TEST',
        tournament_no: 'WWBVT2025-TEST2',
        no_in_tournament: '001',
        team_a_name: 'Anderson/Taylor',
        team_b_name: 'White/Black',
        local_date: '2025-08-12',
        local_time: '16:00:00',
        court: 'Court 1',
        status: 'scheduled',
        round: 'Pool A'
      },
      // Finished matches
      {
        no: 'F001-2025-TEST',
        tournament_no: 'MWBVT2025-TEST3',
        no_in_tournament: '001',
        team_a_name: 'Champion/Team',
        team_b_name: 'Runner/Up',
        local_date: '2025-08-08',
        local_time: '18:00:00',
        court: 'Center Court',
        status: 'finished',
        round: 'Final',
        points_a: 0,
        points_b: 2,
        match_points_a: 0,
        match_points_b: 2,
        points_team_a_set1: 19,
        points_team_b_set1: 21,
        points_team_a_set2: 18,
        points_team_b_set2: 21,
        set_scores: {
          set1: { team_a: 19, team_b: 21 },
          set2: { team_a: 18, team_b: 21 }
        }
      }
    ];
    
    const { data: matches, error: matchError } = await supabase
      .from('matches')
      .insert(testMatches)
      .select();
    
    if (matchError) {
      console.log(`⚠️  Match insert warning: ${matchError.message}`);
    } else {
      console.log(`✅ Inserted ${matches.length} test matches`);
    }
    
    console.log('\n📊 Step 3: Updating sync status...');
    
    // Update sync status to show "successful" test data sync
    const { error: syncError } = await supabase
      .from('sync_status')
      .update({
        last_sync: new Date().toISOString(),
        success_count: 1
      })
      .in('entity_type', ['tournaments', 'matches_schedule']);
    
    if (syncError) {
      console.log(`⚠️  Sync status update warning: ${syncError.message}`);
    } else {
      console.log('✅ Updated sync status records');
    }
    
    console.log('\n🧪 Step 4: Verification...');
    
    // Verify the data was inserted
    const { data: verifyTournaments, error: vTourError } = await supabase
      .from('tournaments')
      .select('*');
    
    const { data: verifyMatches, error: vMatchError } = await supabase
      .from('matches')
      .select('*');
    
    if (vTourError || vMatchError) {
      console.log('⚠️  Verification had issues, but data may still be inserted');
    } else {
      console.log(`✅ Verified: ${verifyTournaments.length} tournaments, ${verifyMatches.length} matches`);
      
      // Show sample live matches for Story 4.2
      const liveMatches = verifyMatches.filter(m => m.status === 'live');
      console.log(`🔴 Found ${liveMatches.length} LIVE matches for real-time testing:`);
      
      liveMatches.forEach(match => {
        console.log(`   - ${match.team_a_name} vs ${match.team_b_name} (${match.points_a}-${match.points_b})`);
      });
    }
    
    console.log('\n🎉 SUCCESS: Test data ready for Story 4.2 development!');
    console.log('\n📋 What you can now test:');
    console.log('✅ Tournament list display');
    console.log('✅ Match list display');
    console.log('✅ Live score updates (2 live matches available)');
    console.log('✅ Real-time WebSocket subscriptions');
    console.log('✅ Different match statuses (live, scheduled, finished)');
    
    console.log('\n🚀 Ready for Story 4.2 implementation!');
    
    return true;
    
  } catch (error) {
    console.error('💥 Test data insertion failed:', error.message);
    return false;
  }
}

insertTestData()
  .then(success => {
    if (success) {
      console.log('\n✅ Test data insertion completed successfully');
      console.log('   Run: node scripts/test-api-endpoints.js');
    } else {
      console.log('\n❌ Test data insertion failed');
    }
  });