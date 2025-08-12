#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

console.log('🔄 Applying Migration 005: Live Score Enhancements');
console.log('==================================================\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration005() {
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '005_live_score_enhancements.sql');
    
    if (!fs.existsSync(migrationPath)) {
      console.log('❌ Migration file not found:', migrationPath);
      return false;
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('📄 Loaded migration file (367 lines)');
    
    // Execute the migration
    console.log('🔄 Executing migration SQL...');
    
    // Split the SQL into statements and execute them
    // Note: This is a simplified approach - in production, consider using proper migration tools
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql_query: migrationSQL 
    }).catch(async () => {
      // If exec_sql doesn't exist, try direct SQL execution
      // For complex migrations like this, we'll need to inform the user to run it manually
      console.log('⚠️  Cannot execute migration programmatically.');
      console.log('   This migration contains complex PL/pgSQL that needs to be run in Supabase Dashboard.\n');
      
      console.log('📋 MANUAL MIGRATION STEPS:');
      console.log('=========================');
      console.log('1. Open Supabase Dashboard → SQL Editor');
      console.log('2. Copy and paste the entire contents of:');
      console.log('   supabase/migrations/005_live_score_enhancements.sql');
      console.log('3. Click "Run" to execute the migration');
      console.log('4. Verify the migration completed successfully');
      
      return { manual: true };
    });

    if (data && data.manual) {
      return { manual: true };
    }

    if (error) {
      console.log('❌ Migration execution failed:', error.message);
      
      // Provide manual instructions
      console.log('\n📋 MANUAL MIGRATION REQUIRED:');
      console.log('=============================');
      console.log('1. Open Supabase Dashboard → SQL Editor');
      console.log('2. Copy and paste the entire contents of:');
      console.log('   supabase/migrations/005_live_score_enhancements.sql');
      console.log('3. Click "Run" to execute the migration');
      console.log('4. Re-run the API endpoint tests');
      
      return false;
    }

    console.log('✅ Migration executed successfully');
    return true;

  } catch (error) {
    console.error('💥 Migration application failed:', error.message);
    return false;
  }
}

// Run the migration
applyMigration005()
  .then((result) => {
    if (result && result.manual) {
      console.log('\n⚠️  Manual migration required - see instructions above');
      process.exit(0);
    } else if (result) {
      console.log('\n✅ Migration completed successfully');
      console.log('   You can now re-run the API endpoint tests');
      process.exit(0);
    } else {
      console.log('\n❌ Migration failed - see instructions above');
      process.exit(1);
    }
  });