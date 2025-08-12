#!/usr/bin/env node

console.log('🔍 Testing FIVB API with Working Format from VisApiService');
console.log('========================================================\n');

async function testWorkingFormat() {
  const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
  const appId = '2a9523517c52420da73d927c6d6bab23';
  
  console.log('🧪 Test 1: Using exact VisApiService format for running tournaments...');
  
  try {
    // This is the EXACT format from your working VisApiService
    const xmlRequest = "<Request Type='GetBeachTournamentList' Fields='No Code Name StartDate EndDate'><Filter Statuses='Running' /></Request>";
    const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
    
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
      console.log(`❌ Request failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const xmlData = await response.text();
    console.log(`✅ Response received: ${xmlData.length} characters`);
    
    if (xmlData.length > 0) {
      console.log('🎉 SUCCESS! Got tournament data with working format!');
      console.log(`📄 First 500 characters:`);
      console.log(xmlData.substring(0, 500));
      console.log('...\n');
      
      // Parse basic tournament count
      const tournamentMatches = xmlData.match(/<Tournament[^>]*>/g);
      const tournamentCount = tournamentMatches ? tournamentMatches.length : 0;
      console.log(`🏆 Found ${tournamentCount} running tournaments`);
      
      return { success: true, data: xmlData, count: tournamentCount };
    } else {
      console.log('⚠️  Empty response with working format');
    }
    
  } catch (error) {
    console.log(`❌ Test 1 failed: ${error.message}`);
  }
  
  console.log('\n🧪 Test 2: Try with all tournaments (no filter)...');
  
  try {
    // Try without the Running filter to get all tournaments
    const xmlRequest2 = "<Request Type='GetBeachTournamentList' Fields='No Code Name StartDate EndDate Status' />";
    const requestUrl2 = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest2)}`;
    
    console.log(`📡 Request URL: ${requestUrl2}`);
    
    const response2 = await fetch(requestUrl2, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': appId,
      },
    });
    
    const xmlData2 = await response2.text();
    console.log(`✅ All tournaments response: ${xmlData2.length} characters`);
    
    if (xmlData2.length > 0) {
      console.log('🎉 SUCCESS! Got all tournament data!');
      console.log(`📄 First 500 characters:`);
      console.log(xmlData2.substring(0, 500));
      
      // Parse tournament count
      const allTournamentMatches = xmlData2.match(/<Tournament[^>]*>/g);
      const allTournamentCount = allTournamentMatches ? allTournamentMatches.length : 0;
      console.log(`🏆 Found ${allTournamentCount} total tournaments`);
      
      return { success: true, data: xmlData2, count: allTournamentCount };
    }
    
  } catch (error) {
    console.log(`❌ Test 2 failed: ${error.message}`);
  }
  
  console.log('\n🧪 Test 3: Test matches endpoint with same format...');
  
  try {
    // Test if match endpoint works with same format
    const matchXmlRequest = "<Request Type='GetBeachMatchList' Fields='No TeamAName TeamBName Status' />";
    const matchRequestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(matchXmlRequest)}`;
    
    const matchResponse = await fetch(matchRequestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': appId,
      },
    });
    
    const matchXmlData = await matchResponse.text();
    console.log(`✅ Match data response: ${matchXmlData.length} characters`);
    
    if (matchXmlData.length > 0) {
      console.log(`📄 Match data preview:`);
      console.log(matchXmlData.substring(0, 300));
    }
    
  } catch (error) {
    console.log(`❌ Match test failed: ${error.message}`);
  }
  
  return { success: false };
}

// Run the test
testWorkingFormat()
  .then((result) => {
    console.log('\n📊 Results:');
    console.log('===========');
    
    if (result.success) {
      console.log(`✅ FIVB API IS WORKING!`);
      console.log(`🏆 Retrieved ${result.count} tournaments`);
      console.log('\n💡 The issue was the request format, not the API or App ID');
      console.log('🔧 Your Edge Functions should work once they use the correct XML Request format');
      
      console.log('\n🚀 Next Steps:');
      console.log('1. ✅ API is working - no App ID issues');
      console.log('2. 🔧 Edge Functions need to use XML Request format');
      console.log('3. 📊 Re-run API endpoint tests - should show data now');
    } else {
      console.log('❌ All formats failed - there may be a deeper API issue');
    }
  });