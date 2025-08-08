const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testConnection() {
  try {
    console.log('Testing Supabase connection...');
    
    // Test connection with a simple query that should always work
    const { error } = await supabase
      .from('_test')
      .select('*')
      .limit(1);
    
    if (error && (error.code === 'PGRST116' || error.message.includes('does not exist'))) {
      // Table doesn't exist, but connection is working
      console.log('✅ Supabase connection successful (expected table not found)');
      return true;
    } else if (error) {
      console.error('Connection test failed:', error.message);
      console.error('Full error:', error);
      return false;
    } else {
      console.log('✅ Supabase connection successful');
      return true;
    }
  } catch (err) {
    console.error('Connection test failed:', err.message);
    // Connection might still be working, let's be optimistic
    if (err.message && err.message.includes('does not exist')) {
      console.log('✅ Supabase connection successful (table not found is expected)');
      return true;
    }
    return false;
  }
}

async function showMigrationInstructions() {
  const migration1Path = path.join(__dirname, '../supabase/migrations/001_enable_rls_and_realtime.sql');
  const migration2Path = path.join(__dirname, '../supabase/migrations/002_create_database_schema.sql');
  
  console.log('\n📋 Manual Database Setup Instructions:');
  console.log('==========================================');
  console.log('Since the Supabase JavaScript client cannot execute raw SQL,');
  console.log('please follow these steps to complete the database setup:');
  console.log('');
  console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard/projects/zjrgyclnaerqkzzupqfv');
  console.log('2. Navigate to SQL Editor');
  console.log('');
  console.log('3. FIRST: Execute Migration 001 (if not already done):');
  console.log(`   Copy and paste SQL from: ${migration1Path}`);
  console.log('   This sets up RLS helper functions and real-time configuration.');
  console.log('');
  console.log('4. SECOND: Execute Migration 002 (Database Schema):');
  console.log(`   Copy and paste SQL from: ${migration2Path}`);
  console.log('   This creates the complete database schema.');
  console.log('');
  console.log('Migration 002 will create:');
  console.log('- tournaments, matches, sync_status, and schema_versions tables');
  console.log('- Performance indexes for optimized querying');
  console.log('- Row Level Security policies for all tables');
  console.log('- Data retention and cleanup functions');
  console.log('- Real-time subscriptions for tournaments and matches');
  console.log('- Initial sync_status data and schema version tracking');
  console.log('- Scheduled cleanup job (if pg_cron extension available)');
  
  // Show a preview of the new migration
  try {
    const migrationSQL = fs.readFileSync(migration2Path, 'utf8');
    const preview = migrationSQL.substring(0, 600);
    console.log('\n📄 Migration 002 Preview:');
    console.log('==========================');
    console.log(preview + '...');
    
    console.log('\n🔍 Migration includes validation to ensure all components are created successfully.');
  } catch (err) {
    console.error('Could not read migration file:', err.message);
  }
}

async function main() {
  console.log('🚀 Setting up Supabase Configuration...\n');
  
  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Cannot connect to Supabase. Please check your credentials.');
    process.exit(1);
  }
  
  // Show manual setup instructions
  await showMigrationInstructions();
  
  console.log('\n✅ Connection verified! Please complete the manual SQL setup above.');
}

main().catch(console.error);