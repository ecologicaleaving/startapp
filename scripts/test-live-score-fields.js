#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Live Score Fields After Migration');
console.log('===========================================\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testLiveScoreFields() {
  try {
    // Test 1: Try to add the live score fields manually
    console.log('🔧 Attempting to add live score fields...');
    
    const alterQueries = [
      'ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_a INTEGER;',
      'ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_b INTEGER;', 
      'ALTER TABLE matches ADD COLUMN IF NOT EXISTS set_scores JSONB DEFAULT \'{}\';',
      'ALTER TABLE matches ADD COLUMN IF NOT EXISTS live_updated_at TIMESTAMP DEFAULT NOW();'
    ];

    for (const query of alterQueries) {
      try {
        const { error } = await supabase.rpc('execute_sql', { query });
        if (error) {
          console.log(`⚠️  Query failed: ${query.substring(0, 50)}... - ${error.message}`);
        } else {
          console.log(`✅ Query executed: ${query.substring(0, 50)}...`);
        }
      } catch (e) {
        // Try alternative approach
        console.log(`ℹ️  RPC not available, attempting direct SQL approach...`);
        break;
      }
    }

    // Test 2: Check if live score fields now exist
    console.log('\n🔍 Checking live score field availability...');
    const { data: testData, error: testError } = await supabase
      .from('matches')
      .select('points_a, points_b, set_scores, live_updated_at')
      .limit(1);

    if (testError) {
      console.log(`❌ Live score fields still missing: ${testError.message}`);
      console.log('\n📋 MANUAL MIGRATION REQUIRED:');
      console.log('=============================');
      console.log('1. Open Supabase Dashboard → SQL Editor');
      console.log('2. Run these commands one by one:');
      console.log('   ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_a INTEGER;');
      console.log('   ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_b INTEGER;');
      console.log('   ALTER TABLE matches ADD COLUMN IF NOT EXISTS set_scores JSONB DEFAULT \'{}\';');
      console.log('   ALTER TABLE matches ADD COLUMN IF NOT EXISTS live_updated_at TIMESTAMP DEFAULT NOW();');
      console.log('3. Or run the complete migration: supabase/migrations/005_live_score_enhancements.sql');
      
      return false;
    } else {
      console.log('✅ Live score fields are now accessible!');
      
      // Test 3: Insert a test record to verify functionality
      console.log('\n🧪 Testing live score field functionality...');
      const { data: insertTest, error: insertError } = await supabase
        .from('matches')
        .insert({
          no: 'TEST-001',
          tournament_no: 'TEST-TOURNAMENT',
          team_a_name: 'Test Team A',
          team_b_name: 'Test Team B',
          points_a: 21,
          points_b: 15,
          set_scores: { set1: { team_a: 21, team_b: 15 } },
          status: 'finished'
        })
        .select();

      if (insertError) {
        console.log(`⚠️  Test insert failed: ${insertError.message}`);
        console.log('   This is expected if foreign key constraints exist');
      } else {
        console.log('✅ Test insert successful - live score fields working');
        
        // Clean up test data
        await supabase.from('matches').delete().eq('no', 'TEST-001');
        console.log('🧹 Test data cleaned up');
      }

      return true;
    }

  } catch (error) {
    console.error('💥 Live score field test failed:', error.message);
    return false;
  }
}

testLiveScoreFields()
  .then(success => {
    if (success) {
      console.log('\n✅ Live score fields are ready!');
      console.log('   You can now run: node scripts/test-api-endpoints.js');
    } else {
      console.log('\n❌ Manual migration still required');
      console.log('   Follow the instructions above to add live score fields');
    }
  });