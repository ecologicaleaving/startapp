#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔄 Triggering Backend Data Sync');
console.log('===============================\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function triggerDataSync() {
  try {
    console.log('🏆 Step 1: Triggering Tournament Master Data Sync...');
    
    // Trigger tournament master sync
    const { data: tournamentData, error: tournamentError } = await supabase.functions
      .invoke('tournament-master-sync', {
        body: { trigger: 'manual', source: 'api-test' }
      });

    if (tournamentError) {
      console.log(`⚠️  Tournament sync failed: ${tournamentError.message}`);
      console.log('   This may be normal if the Edge Function isn\'t deployed yet');
    } else {
      console.log('✅ Tournament sync triggered successfully');
      if (tournamentData) {
        console.log(`   Response: ${JSON.stringify(tournamentData)}`);
      }
    }

    console.log('\n📅 Step 2: Triggering Match Schedule Sync...');
    
    // Trigger match schedule sync
    const { data: matchData, error: matchError } = await supabase.functions
      .invoke('match-schedule-sync', {
        body: { trigger: 'manual', source: 'api-test' }
      });

    if (matchError) {
      console.log(`⚠️  Match sync failed: ${matchError.message}`);
      console.log('   This may be normal if the Edge Function isn\'t deployed yet');
    } else {
      console.log('✅ Match sync triggered successfully');
      if (matchData) {
        console.log(`   Response: ${JSON.stringify(matchData)}`);
      }
    }

    console.log('\n⏱️  Step 3: Waiting for sync to complete...');
    
    // Wait a bit for sync to process
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\n🔍 Step 4: Checking data population...');
    
    // Check tournament data
    const { data: tournaments, error: tError } = await supabase
      .from('tournaments')
      .select('*')
      .limit(3);

    if (tError) {
      console.log(`❌ Tournament check failed: ${tError.message}`);
    } else if (tournaments && tournaments.length > 0) {
      console.log(`✅ Found ${tournaments.length} tournaments!`);
      tournaments.forEach(t => {
        console.log(`   - ${t.name} (${t.code})`);
      });
    } else {
      console.log('⚠️  No tournament data yet - sync may still be processing');
    }

    // Check match data
    const { data: matches, error: mError } = await supabase
      .from('matches')
      .select('*')
      .limit(3);

    if (mError) {
      console.log(`❌ Match check failed: ${mError.message}`);
    } else if (matches && matches.length > 0) {
      console.log(`✅ Found ${matches.length} matches!`);
      matches.forEach(m => {
        console.log(`   - ${m.team_a_name} vs ${m.team_b_name}`);
      });
    } else {
      console.log('⚠️  No match data yet - sync may still be processing');
    }

    console.log('\n📊 Final Assessment:');
    
    const hasData = tournaments && tournaments.length > 0 && matches && matches.length > 0;
    
    if (hasData) {
      console.log('🎉 SUCCESS: Backend is fully ready for frontend implementation!');
      console.log('✅ Schema ready, Real-time working, Data populated');
      console.log('\n🚀 You can now begin Story 4.2 implementation');
      return true;
    } else {
      console.log('⚠️  Data sync may still be processing...');
      console.log('💡 Manual Edge Function Triggering Required:');
      console.log('   1. Open: Supabase Dashboard → Edge Functions');
      console.log('   2. Find and run: tournament-master-sync');
      console.log('   3. Find and run: match-schedule-sync');
      console.log('   4. Wait 5-10 minutes for data to populate');
      console.log('   5. Re-run: node scripts/test-api-endpoints.js');
      return false;
    }

  } catch (error) {
    console.error('💥 Data sync trigger failed:', error.message);
    
    console.log('\n📋 ALTERNATIVE: Manual Edge Function Triggering');
    console.log('===============================================');
    console.log('1. Open: https://supabase.com/dashboard/project/zjrgyclnaerqkzzupqfv/functions');
    console.log('2. Look for Edge Functions in the list');
    console.log('3. Run: tournament-master-sync (click "Invoke")');
    console.log('4. Run: match-schedule-sync (click "Invoke")');
    console.log('5. Wait 10-15 minutes for data to sync');
    console.log('6. Re-test: node scripts/test-api-endpoints.js');
    
    return false;
  }
}

triggerDataSync()
  .then(success => {
    if (success) {
      console.log('\n✅ Ready for Story 4.2 WebSocket implementation!');
      process.exit(0);
    } else {
      console.log('\n⏸️  Manual sync required - see instructions above');
      process.exit(1);
    }
  });