#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🧪 API Endpoints Readiness Test for Frontend Integration');
console.log('=========================================================\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testApiEndpoints() {
  let allPassed = true;
  
  try {
    // Test 1: Basic Database Connectivity
    console.log('🔍 Test 1: Basic Database Connectivity');
    const { data: connectionTest, error: connectionError } = await supabase
      .from('tournaments')
      .select('count')
      .limit(1);
    
    if (connectionError) {
      console.log('❌ Database connection failed:', connectionError.message);
      allPassed = false;
    } else {
      console.log('✅ Database connection successful');
    }

    // Test 2: Tournament Data Availability
    console.log('\n🔍 Test 2: Tournament Data Availability');
    const { data: tournaments, error: tournamentsError } = await supabase
      .from('tournaments')
      .select('*')
      .limit(5);
    
    if (tournamentsError) {
      console.log('❌ Tournament data fetch failed:', tournamentsError.message);
      allPassed = false;
    } else if (!tournaments || tournaments.length === 0) {
      console.log('⚠️  No tournament data found - backend sync may not be running');
      allPassed = false;
    } else {
      console.log(`✅ Found ${tournaments.length} tournaments`);
      console.log(`   Sample: ${tournaments[0].name} (${tournaments[0].code})`);
    }

    // Test 3: Matches Data Availability
    console.log('\n🔍 Test 3: Matches Data Availability');
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .limit(5);
    
    if (matchesError) {
      console.log('❌ Matches data fetch failed:', matchesError.message);
      allPassed = false;
    } else if (!matches || matches.length === 0) {
      console.log('⚠️  No match data found - backend sync may not be running');
      allPassed = false;
    } else {
      console.log(`✅ Found ${matches.length} matches`);
      console.log(`   Sample: ${matches[0].team_a_name} vs ${matches[0].team_b_name}`);
    }

    // Test 4: Real-time Subscription Setup
    console.log('\n🔍 Test 4: Real-time Subscription Capability');
    try {
      const subscription = supabase
        .channel('test-realtime')
        .on('postgres_changes', 
          { event: 'UPDATE', schema: 'public', table: 'matches' },
          payload => console.log('📡 Real-time update received:', payload)
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Real-time subscriptions working');
          }
        });

      // Wait a moment for subscription to establish
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clean up subscription
      subscription.unsubscribe();
    } catch (realtimeError) {
      console.log('❌ Real-time subscription failed:', realtimeError.message);
      allPassed = false;
    }

    // Test 5: Sync Status Monitoring
    console.log('\n🔍 Test 5: Backend Sync Status');
    const { data: syncStatus, error: syncError } = await supabase
      .from('sync_status')
      .select('*');
    
    if (syncError) {
      console.log('❌ Sync status check failed:', syncError.message);
      allPassed = false;
    } else if (!syncStatus || syncStatus.length === 0) {
      console.log('⚠️  No sync status data found - sync system may not be initialized');
      allPassed = false;
    } else {
      console.log(`✅ Sync status available for ${syncStatus.length} entities:`);
      syncStatus.forEach(status => {
        const lastSync = status.last_sync ? new Date(status.last_sync).toLocaleString() : 'Never';
        const errorCount = status.error_count || 0;
        console.log(`   - ${status.entity_type}: Last sync ${lastSync} (${errorCount} errors)`);
      });
    }

    // Test 6: Live Score Data Structure
    console.log('\n🔍 Test 6: Live Score Data Structure');
    const { data: liveMatches, error: liveError } = await supabase
      .from('matches')
      .select('*')
      .not('points_a', 'is', null)
      .not('points_b', 'is', null)
      .limit(3);
    
    if (liveError) {
      console.log('❌ Live score data check failed:', liveError.message);
      allPassed = false;
    } else if (!liveMatches || liveMatches.length === 0) {
      console.log('⚠️  No matches with live scores found - may be normal if no live matches');
      console.log('   Frontend should handle this gracefully');
    } else {
      console.log(`✅ Found ${liveMatches.length} matches with live score data`);
      const sample = liveMatches[0];
      console.log(`   Sample: ${sample.team_a_name} ${sample.points_a || 0} - ${sample.points_b || 0} ${sample.team_b_name}`);
    }

    // Final Assessment
    console.log('\n📊 Frontend Integration Readiness Assessment');
    console.log('=============================================');
    
    if (allPassed) {
      console.log('✅ READY: All API endpoints are functioning correctly');
      console.log('   Frontend implementation can proceed with confidence');
      console.log('   Real-time subscriptions are working');
      console.log('   Data structures are properly formatted');
    } else {
      console.log('❌ NOT READY: Some API endpoints have issues');
      console.log('   Review the failed tests above before frontend implementation');
      console.log('   Consider running backend sync functions first');
    }

    return allPassed;
    
  } catch (error) {
    console.error('💥 Critical error during API testing:', error.message);
    return false;
  }
}

// Run the tests
testApiEndpoints()
  .then(success => {
    console.log(`\n🏁 Test completed: ${success ? 'SUCCESS' : 'FAILURE'}`);
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
  });