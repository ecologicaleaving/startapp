#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

console.log('🌐 Testing FIVB API Access for Past Tournament Data');
console.log('==================================================\n');

async function testFIVBApiAccess() {
  try {
    console.log('🔍 Step 1: Testing FIVB API connectivity...');
    
    // Test the FIVB API endpoint directly
    const apiUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx/GetBeachTournamentList';
    const headers = {
      'X-FIVB-App-ID': process.env.FIVB_APP_ID || 'your-app-id-here',
      'Content-Type': 'application/json'
    };
    
    console.log(`📡 Making request to: ${apiUrl}`);
    console.log(`🔑 Using App ID: ${process.env.FIVB_APP_ID ? '✅ Found' : '❌ Missing'}`);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: headers
    });
    
    if (!response.ok) {
      console.log(`❌ FIVB API request failed: ${response.status} ${response.statusText}`);
      
      if (response.status === 401 || response.status === 403) {
        console.log('🔒 Authentication issue - check FIVB_APP_ID in .env.local');
      } else if (response.status === 404) {
        console.log('🔗 API endpoint not found - may have changed');
      } else {
        console.log('🌐 Network or server issue');
      }
      
      return false;
    }
    
    const data = await response.text();
    console.log('✅ FIVB API responded successfully');
    console.log(`📊 Response size: ${data.length} characters`);
    
    // Check if it's XML data
    if (data.includes('<?xml') || data.includes('<tournaments>')) {
      console.log('✅ Received XML tournament data');
      
      // Try to extract some basic info
      const tournamentCount = (data.match(/<tournament/gi) || []).length;
      console.log(`🏆 Found approximately ${tournamentCount} tournaments in response`);
      
      // Check for recent tournaments
      const currentYear = new Date().getFullYear();
      const hasCurrentYear = data.includes(currentYear.toString());
      const hasPastYear = data.includes((currentYear - 1).toString());
      
      console.log(`📅 Contains ${currentYear} tournaments: ${hasCurrentYear ? '✅' : '❌'}`);
      console.log(`📅 Contains ${currentYear - 1} tournaments: ${hasPastYear ? '✅' : '❌'}`);
      
      if (tournamentCount > 0) {
        console.log('\n🎯 FIVB API Access Assessment:');
        console.log('✅ API is accessible and returning tournament data');
        console.log('✅ Your sync functions should be able to populate the database');
        console.log('⚠️  The Edge Functions may need proper FIVB_APP_ID configuration');
        
        return true;
      } else {
        console.log('\n⚠️  API responded but no tournament data found');
        console.log('   This could be normal if no tournaments are currently active');
        return false;
      }
      
    } else {
      console.log('⚠️  Response doesn\'t appear to be XML tournament data');
      console.log('📄 First 200 characters of response:');
      console.log(data.substring(0, 200));
      return false;
    }
    
  } catch (error) {
    console.error('💥 FIVB API test failed:', error.message);
    
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('1. Check internet connection');
    console.log('2. Verify FIVB_APP_ID in .env.local');
    console.log('3. Confirm FIVB API endpoint is still valid');
    
    return false;
  }
}

async function testViaLocalService() {
  console.log('\n🔍 Step 2: Testing via local VisApiService...');
  
  try {
    // Import the local API service if it exists
    const path = require('path');
    const servicePath = path.join(__dirname, '..', 'services', 'visApi.ts');
    
    console.log('📂 Looking for VisApiService...');
    
    // Try to use Node to run TypeScript (if ts-node is available)
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout, stderr } = await execAsync('npx ts-node -e "console.log(\'TypeScript available\')"', {
        cwd: path.join(__dirname, '..')
      });
      console.log('✅ TypeScript execution available');
      
      // Create a simple test script
      const testScript = `
        import { VisApiService } from './services/visApi';
        
        VisApiService.getTournamentListWithDetails()
          .then(tournaments => {
            console.log('✅ VisApiService working');
            console.log(\`🏆 Found \${tournaments.length} tournaments\`);
            if (tournaments.length > 0) {
              console.log(\`   Sample: \${tournaments[0].Name} (\${tournaments[0].Code})\`);
            }
          })
          .catch(error => {
            console.log('❌ VisApiService failed:', error.message);
          });
      `;
      
      console.log('⚠️  Advanced service testing requires more setup - skipping');
      
    } catch (tsError) {
      console.log('⚠️  TypeScript execution not readily available - skipping service test');
    }
    
  } catch (error) {
    console.log('⚠️  Local service test not available:', error.message);
  }
}

// Run the tests
testFIVBApiAccess()
  .then(async (apiWorking) => {
    await testViaLocalService();
    
    console.log('\n📋 Summary:');
    console.log('===========');
    
    if (apiWorking) {
      console.log('✅ FIVB API is accessible and has tournament data');
      console.log('✅ Your backend sync functions should work once configured properly');
      console.log('🔧 Next step: Configure Edge Function environment variables');
      console.log('💡 Try manually running Edge Functions in Supabase Dashboard');
    } else {
      console.log('❌ FIVB API access issues detected');
      console.log('🔧 Check FIVB_APP_ID configuration and API availability');
    }
    
    console.log('\n🎯 For Story 4.2 Implementation:');
    console.log('================================');
    console.log('The WebSocket functionality can still be implemented and tested');
    console.log('You can proceed with frontend development even without live data');
  })
  .catch(error => {
    console.error('💥 Test runner failed:', error.message);
  });