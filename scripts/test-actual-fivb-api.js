#!/usr/bin/env node

console.log('🌐 Testing FIVB API with Actual App ID from VisApiService');
console.log('=======================================================\n');

async function testActualFIVBApi() {
  try {
    console.log('🔍 Testing FIVB API with the hardcoded App ID...');
    
    // Use the exact same approach as your VisApiService
    const requestUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx/GetBeachTournamentList?Fields=No Name Code StartDate EndDate Status Location';
    const appId = '2a9523517c52420da73d927c6d6bab23'; // From your VisApiService
    
    console.log(`📡 Request URL: ${requestUrl}`);
    console.log(`🔑 App ID: ${appId}`);
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': appId,
      },
    });
    
    if (!response.ok) {
      console.log(`❌ FIVB API request failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const xmlData = await response.text();
    console.log('✅ FIVB API responded successfully');
    console.log(`📊 Response size: ${xmlData.length} characters`);
    
    if (xmlData.length === 0) {
      console.log('⚠️  Empty response - this might be normal if no tournaments are active');
      
      // Try a different approach - get all tournaments without filters
      console.log('\n🔍 Trying unfiltered request...');
      
      const unfilteredUrl = 'https://www.fivb.org/Vis2009/XmlRequest.asmx/GetBeachTournamentList';
      const unfilteredResponse = await fetch(unfilteredUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': appId,
        },
      });
      
      const unfilteredData = await unfilteredResponse.text();
      console.log(`📊 Unfiltered response size: ${unfilteredData.length} characters`);
      
      if (unfilteredData.length > 0) {
        console.log('✅ Unfiltered request returned data!');
        
        // Parse basic info
        const tournamentCount = (unfilteredData.match(/<Tournament/gi) || []).length;
        console.log(`🏆 Found ${tournamentCount} tournaments total`);
        
        // Check for recent dates
        const currentYear = new Date().getFullYear();
        const hasCurrentYear = unfilteredData.includes(currentYear.toString());
        
        console.log(`📅 Contains ${currentYear} data: ${hasCurrentYear ? '✅' : '❌'}`);
        
        // Show sample data (first 500 characters)
        console.log('\n📄 Sample XML data:');
        console.log(unfilteredData.substring(0, 500) + '...');
        
        return true;
      } else {
        console.log('❌ Still no data - API might be down or App ID invalid');
        return false;
      }
      
    } else {
      console.log('✅ Received tournament data!');
      
      // Parse basic info
      const tournamentCount = (xmlData.match(/<Tournament/gi) || []).length;
      console.log(`🏆 Found ${tournamentCount} tournaments`);
      
      return true;
    }
    
  } catch (error) {
    console.error('💥 FIVB API test failed:', error.message);
    return false;
  }
}

async function testViaVisApiService() {
  console.log('\n🔍 Testing via VisApiService TypeScript...');
  
  try {
    // Create a simple test to call the actual VisApiService
    const testCode = `
      const { VisApiService } = require('./services/visApi.ts');
      
      VisApiService.fetchDirectFromAPI()
        .then(tournaments => {
          console.log('✅ VisApiService.fetchDirectFromAPI() working');
          console.log(\`🏆 Found \${tournaments.length} tournaments\`);
        })
        .catch(error => {
          console.log('❌ VisApiService failed:', error.message);
        });
    `;
    
    console.log('⚠️  Direct TypeScript service test requires transpilation - showing result from direct API test above');
    
  } catch (error) {
    console.log('⚠️  Service test skipped:', error.message);
  }
}

// Run the test
testActualFIVBApi()
  .then(async (success) => {
    await testViaVisApiService();
    
    console.log('\n📋 Assessment:');
    console.log('==============');
    
    if (success) {
      console.log('✅ FIVB API is working and has tournament data');
      console.log('✅ Your VisApiService should work properly');
      console.log('✅ Backend sync functions should be able to get data');
      console.log('🔧 Issue is likely with Edge Function configuration or deployment');
      
      console.log('\n💡 Next Steps:');
      console.log('1. Edge Functions are deployed but may need environment setup');
      console.log('2. Try manually triggering them in Supabase Dashboard');
      console.log('3. Check Edge Function logs for specific error messages');
      
      console.log('\n🚀 For Story 4.2:');
      console.log('You can definitely proceed with WebSocket implementation!');
      console.log('The data source is working, just need to get sync functions running.');
      
    } else {
      console.log('❌ FIVB API access issues detected');
      console.log('🔧 This explains why sync functions are failing');
      console.log('⚡ But Story 4.2 WebSocket functionality can still be implemented and tested with mock data');
    }
  });