const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create clients for different roles
const supabaseService = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

async function testTableCreation() {
  console.log('🔍 Testing Table Creation...');
  
  const tables = ['tournaments', 'matches', 'sync_status', 'schema_versions'];
  let allTablesExist = true;
  
  for (const table of tables) {
    try {
      const { error } = await supabaseService.from(table).select('*').limit(1);
      if (error && error.code === 'PGRST116') {
        console.log(`❌ Table '${table}' does not exist`);
        allTablesExist = false;
      } else {
        console.log(`✅ Table '${table}' exists`);
      }
    } catch (err) {
      console.log(`❌ Error testing table '${table}': ${err.message}`);
      allTablesExist = false;
    }
  }
  
  return allTablesExist;
}

async function testIndexes() {
  console.log('\n🔍 Testing Performance Indexes...');
  
  try {
    // Test if indexes exist by querying pg_indexes
    const { data, error } = await supabaseService.rpc('exec', {
      sql: `
        SELECT indexname, tablename 
        FROM pg_indexes 
        WHERE tablename IN ('tournaments', 'matches') 
        AND schemaname = 'public'
        ORDER BY tablename, indexname;
      `
    });
    
    if (error) {
      console.log('⚠️  Cannot verify indexes directly (may require SQL execution)');
      console.log('   Indexes should include: tournaments(code, start_date, status), matches(tournament_no, local_date, status)');
      return false;
    }
    
    console.log('✅ Found indexes:', data.length);
    data.forEach(idx => console.log(`   - ${idx.tablename}.${idx.indexname}`));
    return true;
    
  } catch (err) {
    console.log('⚠️  Cannot verify indexes:', err.message);
    return false;
  }
}

async function testRLSPolicies() {
  console.log('\n🔍 Testing Row Level Security...');
  
  try {
    // Test anon read access (should work)
    const { error: anonReadError } = await supabaseAnon.from('tournaments').select('*').limit(1);
    
    if (!anonReadError || anonReadError.code === 'PGRST116') {
      console.log('✅ Anonymous read access working');
    } else {
      console.log('❌ Anonymous read access failed:', anonReadError.message);
      return false;
    }
    
    // Test service role access (should work)
    const { error: serviceError } = await supabaseService.from('tournaments').select('*').limit(1);
    
    if (!serviceError || serviceError.code === 'PGRST116') {
      console.log('✅ Service role access working');
    } else {
      console.log('❌ Service role access failed:', serviceError.message);
      return false;
    }
    
    return true;
    
  } catch (err) {
    console.log('❌ RLS testing error:', err.message);
    return false;
  }
}

async function testForeignKeyRelationships() {
  console.log('\n🔍 Testing Foreign Key Relationships...');
  
  try {
    // Try to insert a match without a valid tournament (should fail)
    const { error: fkError } = await supabaseService
      .from('matches')
      .insert([{
        no: 'test-match-001',
        tournament_no: 'nonexistent-tournament',
        team_a_name: 'Test Team A',
        team_b_name: 'Test Team B'
      }]);
    
    if (fkError && (fkError.code === '23503' || fkError.message.includes('foreign key'))) {
      console.log('✅ Foreign key constraints working (insert failed as expected)');
      return true;
    } else if (!fkError) {
      console.log('⚠️  Foreign key test: Insert succeeded (this may indicate missing constraints)');
      // Clean up the test record
      await supabaseService.from('matches').delete().eq('no', 'test-match-001');
      return false;
    } else {
      console.log('⚠️  Unexpected foreign key test result:', fkError.message);
      return false;
    }
    
  } catch (err) {
    console.log('❌ Foreign key testing error:', err.message);
    return false;
  }
}

async function testSyncStatusData() {
  console.log('\n🔍 Testing Initial Sync Status Data...');
  
  try {
    const { data, error } = await supabaseService.from('sync_status').select('*');
    
    if (error) {
      console.log('❌ Failed to read sync_status:', error.message);
      return false;
    }
    
    const expectedEntities = ['tournaments', 'matches_schedule', 'matches_live'];
    const foundEntities = data.map(row => row.entity_type);
    
    let allFound = true;
    for (const entity of expectedEntities) {
      if (foundEntities.includes(entity)) {
        console.log(`✅ Found sync_status record: ${entity}`);
      } else {
        console.log(`❌ Missing sync_status record: ${entity}`);
        allFound = false;
      }
    }
    
    return allFound;
    
  } catch (err) {
    console.log('❌ Sync status testing error:', err.message);
    return false;
  }
}

async function testSchemaVersion() {
  console.log('\n🔍 Testing Schema Version Tracking...');
  
  try {
    const { data, error } = await supabaseService.from('schema_versions').select('*').eq('version', '1.0.0');
    
    if (error) {
      console.log('❌ Failed to read schema_versions:', error.message);
      return false;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Schema version 1.0.0 recorded');
      console.log(`   Applied at: ${data[0].applied_at}`);
      console.log(`   Description: ${data[0].description}`);
      return true;
    } else {
      console.log('❌ Schema version 1.0.0 not found');
      return false;
    }
    
  } catch (err) {
    console.log('❌ Schema version testing error:', err.message);
    return false;
  }
}

async function main() {
  console.log('🧪 Database Schema Validation Tests');
  console.log('=====================================\n');
  
  const tests = [
    testTableCreation,
    testIndexes,
    testRLSPolicies,
    testForeignKeyRelationships,
    testSyncStatusData,
    testSchemaVersion
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    const result = await test();
    if (result) passedTests++;
  }
  
  console.log('\n📊 Test Results Summary');
  console.log('========================');
  console.log(`Passed: ${passedTests}/${totalTests} tests`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All database schema tests passed!');
    console.log('✅ Database is ready for caching operations.');
  } else {
    console.log('⚠️  Some tests failed. Please check the migration execution.');
    console.log('💡 Make sure to run both migrations in Supabase SQL Editor:');
    console.log('   1. 001_enable_rls_and_realtime.sql');
    console.log('   2. 002_create_database_schema.sql');
  }
}

main().catch(console.error);