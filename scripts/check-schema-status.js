#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔍 Database Schema Status Check');
console.log('================================\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchemaStatus() {
  try {
    // Check tables by trying to query them
    console.log('📋 Checking existing tables...');
    const tablesToCheck = ['tournaments', 'matches', 'sync_status', 'schema_versions'];
    
    for (const table of tablesToCheck) {
      try {
        const { data, error } = await supabase.from(table).select('*').limit(0);
        if (error) {
          console.log(`❌ Table '${table}' - Error: ${error.message}`);
        } else {
          console.log(`✅ Table '${table}' exists`);
        }
      } catch (e) {
        console.log(`❌ Table '${table}' - ${e.message}`);
      }
    }

    // Check matches table columns specifically
    console.log('\n🔍 Checking matches table structure...');
    try {
      // Try to get column information by running a query
      const { data: matchColumns, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .limit(1);
      
      if (matchError) {
        console.log(`❌ Matches table issue: ${matchError.message}`);
      } else {
        console.log('✅ Matches table accessible');
        
        // Check if live score columns exist by trying to query them
        const { data: liveCheck, error: liveError } = await supabase
          .from('matches')
          .select('points_a, points_b, set_scores, live_updated_at')
          .limit(1);
        
        if (liveError) {
          console.log(`⚠️  Live score columns missing: ${liveError.message}`);
          console.log('   Migration 005_live_score_enhancements.sql may not be applied');
        } else {
          console.log('✅ Live score columns exist (points_a, points_b, set_scores, live_updated_at)');
        }
      }
    } catch (e) {
      console.log(`❌ Cannot check matches table: ${e.message}`);
    }

    // Check schema versions
    console.log('\n📚 Checking applied schema versions...');
    try {
      const { data: versions, error: versionsError } = await supabase
        .from('schema_versions')
        .select('*')
        .order('applied_at', { ascending: false });
      
      if (versionsError) {
        console.log(`❌ Cannot read schema versions: ${versionsError.message}`);
      } else if (versions && versions.length > 0) {
        console.log('✅ Schema versions found:');
        versions.forEach(v => {
          console.log(`   - ${v.version}: ${v.description} (${new Date(v.applied_at).toLocaleString()})`);
        });
      } else {
        console.log('⚠️  No schema versions recorded - migrations may not be fully applied');
      }
    } catch (e) {
      console.log(`❌ Schema version check failed: ${e.message}`);
    }

    // Check sync status initialization
    console.log('\n⏱️  Checking sync system initialization...');
    try {
      const { data: syncData, error: syncError } = await supabase
        .from('sync_status')
        .select('*');
      
      if (syncError) {
        console.log(`❌ Sync status check failed: ${syncError.message}`);
      } else if (syncData && syncData.length > 0) {
        console.log('✅ Sync system initialized:');
        syncData.forEach(s => {
          console.log(`   - ${s.entity_type}: ${s.last_sync ? 'Synced' : 'Never synced'}`);
        });
      } else {
        console.log('⚠️  Sync system not initialized');
      }
    } catch (e) {
      console.log(`❌ Sync status failed: ${e.message}`);
    }

    console.log('\n💡 Next Steps Recommendation:');
    console.log('================================');
    console.log('1. ✅ Database connection is working');
    console.log('2. ⚠️  Run missing migrations in Supabase Dashboard:');
    console.log('   - supabase/migrations/005_live_score_enhancements.sql');
    console.log('3. 🔄 Trigger initial sync by running Edge Functions:');
    console.log('   - tournament-master-sync');
    console.log('   - match-schedule-sync');
    console.log('4. 🧪 Re-run API endpoint tests');

  } catch (error) {
    console.error('💥 Schema check failed:', error.message);
  }
}

checkSchemaStatus();