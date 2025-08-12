#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('🔄 Applying Migration 005 via Supabase API');
console.log('==========================================\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigrationViaAPI() {
  try {
    console.log('📋 Step 1: Adding live score columns...');
    
    // Step 1: Add the basic columns (these are the most important for Story 4.2)
    const basicColumns = [
      'ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_a INTEGER;',
      'ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_b INTEGER;',
      'ALTER TABLE matches ADD COLUMN IF NOT EXISTS set_scores JSONB DEFAULT \'{}\';',
      'ALTER TABLE matches ADD COLUMN IF NOT EXISTS live_updated_at TIMESTAMP DEFAULT NOW();'
    ];

    for (const sql of basicColumns) {
      try {
        const { data, error } = await supabase.rpc('exec', { sql });
        if (error) {
          console.log(`⚠️  ${sql.substring(0, 50)}... - ${error.message}`);
        } else {
          console.log(`✅ ${sql.substring(0, 50)}...`);
        }
      } catch (e) {
        console.log(`⚠️  SQL execution via RPC failed, trying direct approach...`);
        break;
      }
    }

    console.log('\n📋 Step 2: Testing column availability...');
    
    // Test if the columns were added successfully
    const { data: testData, error: testError } = await supabase
      .from('matches')
      .select('points_a, points_b, set_scores, live_updated_at')
      .limit(1);

    if (testError && testError.message.includes('column matches.points_a does not exist')) {
      console.log('❌ Basic column addition failed - trying alternative approach...');
      
      // Alternative: Try to use raw SQL execution if available
      console.log('\n🔄 Attempting raw SQL execution...');
      
      const rawSQL = `
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'matches' AND column_name = 'points_a') THEN
            ALTER TABLE matches ADD COLUMN points_a INTEGER;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'matches' AND column_name = 'points_b') THEN
            ALTER TABLE matches ADD COLUMN points_b INTEGER;
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'matches' AND column_name = 'set_scores') THEN
            ALTER TABLE matches ADD COLUMN set_scores JSONB DEFAULT '{}';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'matches' AND column_name = 'live_updated_at') THEN
            ALTER TABLE matches ADD COLUMN live_updated_at TIMESTAMP DEFAULT NOW();
          END IF;
        END $$;
      `;

      const { data: rawData, error: rawError } = await supabase.rpc('exec', { sql: rawSQL });
      
      if (rawError) {
        console.log('❌ Raw SQL execution failed:', rawError.message);
        console.log('\n📋 MANUAL MIGRATION REQUIRED:');
        console.log('=============================');
        console.log('The API approach cannot execute the required DDL statements.');
        console.log('Please run this in Supabase Dashboard → SQL Editor:');
        console.log('');
        console.log('ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_a INTEGER;');
        console.log('ALTER TABLE matches ADD COLUMN IF NOT EXISTS points_b INTEGER;');
        console.log('ALTER TABLE matches ADD COLUMN IF NOT EXISTS set_scores JSONB DEFAULT \'{}\';');
        console.log('ALTER TABLE matches ADD COLUMN IF NOT EXISTS live_updated_at TIMESTAMP DEFAULT NOW();');
        console.log('');
        console.log('Or copy the full migration:');
        console.log('supabase/migrations/005_live_score_enhancements.sql');
        
        return false;
      } else {
        console.log('✅ Raw SQL execution successful');
      }
    } else if (testError) {
      console.log('❌ Unexpected error:', testError.message);
      return false;
    } else {
      console.log('✅ Live score columns are accessible!');
    }

    console.log('\n📋 Step 3: Adding schema version record...');
    
    // Add schema version record
    const { data: versionData, error: versionError } = await supabase
      .from('schema_versions')
      .insert({
        version: '4.1.0',
        description: 'Live Score Enhancement - Basic fields for real-time score sync (API applied)'
      });

    if (versionError && !versionError.message.includes('duplicate')) {
      console.log('⚠️  Schema version insert failed:', versionError.message);
    } else {
      console.log('✅ Schema version 4.1.0 recorded');
    }

    console.log('\n📋 Step 4: Final verification...');
    
    // Final test with actual data query
    const { data: finalTest, error: finalError } = await supabase
      .from('matches')
      .select('points_a, points_b, set_scores, live_updated_at')
      .limit(1);

    if (finalError) {
      console.log('❌ Final verification failed:', finalError.message);
      return false;
    }

    console.log('✅ Migration completed successfully via API!');
    console.log('\n📊 Next Steps:');
    console.log('==============');
    console.log('1. ✅ Live score schema is ready');
    console.log('2. 🔄 Run: node scripts/test-api-endpoints.js');
    console.log('3. 🚀 Trigger initial data sync (Edge Functions)');
    console.log('4. 💻 Begin Story 4.2 frontend implementation');
    
    return true;

  } catch (error) {
    console.error('💥 Migration via API failed:', error.message);
    return false;
  }
}

applyMigrationViaAPI()
  .then(success => {
    if (success) {
      console.log('\n🎉 SUCCESS: Backend is now ready for Story 4.2!');
    } else {
      console.log('\n❌ FAILED: Manual migration still required');
    }
  });