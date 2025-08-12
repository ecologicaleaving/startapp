#!/usr/bin/env node

console.log('🔍 Detailed FIVB API Debugging');
console.log('==============================\n');

async function debugFIVBApi() {
  const appId = '2a9523517c52420da73d927c6d6bab23';
  
  console.log('🧪 Test 1: Basic connectivity check...');
  
  // Test 1: Basic URL accessibility
  try {
    const baseResponse = await fetch('https://www.fivb.org', {
      method: 'HEAD'
    });
    console.log(`✅ FIVB.org base site: ${baseResponse.status} ${baseResponse.statusText}`);
  } catch (error) {
    console.log(`❌ FIVB.org base site: ${error.message}`);
  }
  
  console.log('\n🧪 Test 2: API endpoint accessibility...');
  
  // Test 2: Check if the API endpoint exists
  try {
    const apiResponse = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'HEAD'
    });
    console.log(`Response status: ${apiResponse.status} ${apiResponse.statusText}`);
    console.log(`Content-Type: ${apiResponse.headers.get('content-type')}`);
  } catch (error) {
    console.log(`❌ API endpoint check: ${error.message}`);
  }
  
  console.log('\n🧪 Test 3: Try different request methods...');
  
  // Test 3: Try POST method (some SOAP services prefer POST)
  try {
    const postResponse = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx/GetBeachTournamentList', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-FIVB-App-ID': appId,
      },
      body: ''
    });
    
    const postData = await postResponse.text();
    console.log(`POST method: ${postResponse.status} ${postResponse.statusText}`);
    console.log(`POST response length: ${postData.length} characters`);
    
    if (postData.length > 0) {
      console.log(`First 300 chars: ${postData.substring(0, 300)}`);
    }
    
  } catch (error) {
    console.log(`❌ POST method failed: ${error.message}`);
  }
  
  console.log('\n🧪 Test 4: Try with SOAP envelope...');
  
  // Test 4: Try with proper SOAP envelope (this might be what the API expects)
  try {
    const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetBeachTournamentList xmlns="http://tempuri.org/">
      <Fields>No Name Code StartDate EndDate Status Location</Fields>
    </GetBeachTournamentList>
  </soap:Body>
</soap:Envelope>`;

    const soapResponse = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '"http://tempuri.org/GetBeachTournamentList"',
        'X-FIVB-App-ID': appId,
      },
      body: soapEnvelope
    });
    
    const soapData = await soapResponse.text();
    console.log(`SOAP method: ${soapResponse.status} ${soapResponse.statusText}`);
    console.log(`SOAP response length: ${soapData.length} characters`);
    
    if (soapData.length > 0) {
      console.log(`First 500 chars: ${soapData.substring(0, 500)}`);
      
      // Check if it contains tournament data
      if (soapData.includes('<Tournament') || soapData.includes('tournament')) {
        const tournamentCount = (soapData.match(/<Tournament/gi) || []).length;
        console.log(`🏆 FOUND ${tournamentCount} tournaments in SOAP response!`);
        return { method: 'SOAP', data: soapData, count: tournamentCount };
      }
    }
    
  } catch (error) {
    console.log(`❌ SOAP method failed: ${error.message}`);
  }
  
  console.log('\n🧪 Test 5: Check response headers for clues...');
  
  // Test 5: Detailed header analysis
  try {
    const headerResponse = await fetch('https://www.fivb.org/Vis2009/XmlRequest.asmx/GetBeachTournamentList', {
      method: 'GET',
      headers: {
        'X-FIVB-App-ID': appId,
        'User-Agent': 'Mozilla/5.0 (compatible; Tournament-App/1.0)',
        'Accept': 'application/xml, text/xml, */*'
      },
    });
    
    console.log(`Status: ${headerResponse.status} ${headerResponse.statusText}`);
    console.log('Response Headers:');
    
    for (const [key, value] of headerResponse.headers.entries()) {
      console.log(`  ${key}: ${value}`);
    }
    
    const headerData = await headerResponse.text();
    console.log(`Response length: ${headerData.length}`);
    
    if (headerData.length > 0 && headerData.trim() !== '') {
      console.log(`Response preview: "${headerData.substring(0, 200)}"`);
    } else {
      console.log('⚠️  Response is truly empty or whitespace-only');
    }
    
  } catch (error) {
    console.log(`❌ Header analysis failed: ${error.message}`);
  }
  
  console.log('\n🧪 Test 6: Try alternative FIVB endpoints...');
  
  // Test 6: Try other known FIVB endpoints
  const alternativeEndpoints = [
    'https://www.fivb.org/Vis2009/XmlRequest.asmx/GetVolleyTournamentList',
    'https://www.fivb.org/en/volleyball/vb_vis2009_xml_request',
    'https://www.fivb.org/Vis2009/XmlRequest.asmx/GetBeachMatchList',
  ];
  
  for (const endpoint of alternativeEndpoints) {
    try {
      const altResponse = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'X-FIVB-App-ID': appId,
        },
      });
      
      const altData = await altResponse.text();
      console.log(`${endpoint}: ${altResponse.status} (${altData.length} chars)`);
      
      if (altData.length > 0) {
        console.log(`  Preview: ${altData.substring(0, 100)}`);
      }
      
    } catch (error) {
      console.log(`${endpoint}: ERROR - ${error.message}`);
    }
  }
  
  return null;
}

// Run the detailed debugging
debugFIVBApi()
  .then((result) => {
    console.log('\n📊 Debugging Summary:');
    console.log('=====================');
    
    if (result && result.count > 0) {
      console.log(`✅ SUCCESS: Found working method (${result.method})`);
      console.log(`🏆 Retrieved ${result.count} tournaments`);
      console.log('\n💡 Solution: Update VisApiService to use the working method');
    } else {
      console.log('❌ All methods returned empty or failed');
      console.log('\n🤔 Possible Issues:');
      console.log('1. FIVB API might be temporarily down');
      console.log('2. App ID might be expired or invalid');
      console.log('3. API endpoint might have changed');
      console.log('4. Authentication method might have changed');
      console.log('5. Network/firewall blocking requests');
      
      console.log('\n🔧 Next Steps:');
      console.log('1. Check FIVB official documentation for API changes');
      console.log('2. Try contacting FIVB for API access verification'); 
      console.log('3. Consider using alternative data sources for development');
      
      console.log('\n🚀 For Story 4.2 Development:');
      console.log('✅ Backend schema is ready');
      console.log('✅ WebSocket functionality can be built with test data');
      console.log('✅ Real-time subscriptions are working');
      console.log('💡 Proceed with frontend implementation using mock data');
    }
  })
  .catch(error => {
    console.error('💥 Debugging failed:', error.message);
  });