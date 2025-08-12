#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

console.log('🔄 Manually Triggering Data Sync with Correct API Format');
console.log('=======================================================\n');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function manualDataSync() {
  try {
    console.log('🏆 Step 1: Fetching tournaments using working API format...');
    
    // Use the WORKING format from your VisApiService
    const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';
    const appId = '2a9523517c52420da73d927c6d6bab23';
    
    // Get all tournaments (not just running ones)
    const xmlRequest = "<Request Type='GetBeachTournamentList' Fields='No Code Name StartDate EndDate Status Location' />";
    const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
    
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml',
        'X-FIVB-App-ID': appId,
      },
    });
    
    if (!response.ok) {
      throw new Error(`FIVB API failed: ${response.status} ${response.statusText}`);
    }
    
    const xmlData = await response.text();
    console.log(`✅ Received ${xmlData.length} characters from FIVB API`);
    
    // Simple XML parsing (basic approach)
    const tournaments = [];
    const tournamentRegex = /<BeachTournament[^>]*>/g;
    const matches = xmlData.match(tournamentRegex);
    
    if (matches) {
      console.log(`🏆 Found ${matches.length} tournaments to process`);
      
      for (const match of matches.slice(0, 10)) { // Process first 10 for testing
        // Extract attributes
        const no = match.match(/No="([^"]*)"'?/)?.[1];
        const code = match.match(/Code="([^"]*)"'?/)?.[1];
        const name = match.match(/Name="([^"]*)"'?/)?.[1];
        const startDate = match.match(/StartDate="([^"]*)"'?/)?.[1];
        const endDate = match.match(/EndDate="([^"]*)"'?/)?.[1];
        const status = match.match(/Status="([^"]*)"'?/)?.[1] || 'Unknown';
        const location = match.match(/Location="([^"]*)"'?/)?.[1] || 'Not specified';
        
        if (no && code && name) {
          tournaments.push({
            no,
            code, 
            name,
            start_date: startDate,
            end_date: endDate,
            status,
            location
          });
        }
      }
      
      console.log(`📊 Processed ${tournaments.length} tournaments for database insert`);
      
      // Insert into database
      if (tournaments.length > 0) {
        console.log('\n💾 Step 2: Inserting tournaments into database...');
        
        const { data: insertedTournaments, error: tourError } = await supabase
          .from('tournaments')
          .upsert(tournaments, { onConflict: 'no' })
          .select();
        
        if (tourError) {
          console.log(`⚠️  Tournament insert warning: ${tourError.message}`);
        } else {
          console.log(`✅ Successfully inserted/updated ${insertedTournaments?.length || tournaments.length} tournaments`);
        }
      }
    }
    
    console.log('\n🏐 Step 3: Trying to fetch some match data...');
    
    // Try to get matches for the first tournament
    if (tournaments.length > 0) {
      const firstTournament = tournaments[0];
      const matchXmlRequest = `<Request Type='GetBeachMatchList' Fields='No TeamAName TeamBName Status LocalDate LocalTime'><Filter TournamentNo='${firstTournament.no}' /></Request>`;
      const matchRequestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(matchXmlRequest)}`;
      
      const matchResponse = await fetch(matchRequestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': appId,
        },
      });
      
      if (matchResponse.ok) {
        const matchXmlData = await matchResponse.text();
        console.log(`✅ Match data for tournament ${firstTournament.code}: ${matchXmlData.length} characters`);
        
        if (matchXmlData.length > 100) { // If we got meaningful data
          // Simple match parsing
          const matchRegex = /<BeachMatch[^>]*>/g;
          const matchMatches = matchXmlData.match(matchRegex);
          
          if (matchMatches && matchMatches.length > 0) {
            console.log(`🏐 Found ${matchMatches.length} matches for ${firstTournament.code}`);
            
            // Process a few matches
            const matches = [];
            for (const matchStr of matchMatches.slice(0, 5)) {
              const matchNo = matchStr.match(/No="([^"]*)"'?/)?.[1];
              const teamA = matchStr.match(/TeamAName="([^"]*)"'?/)?.[1];
              const teamB = matchStr.match(/TeamBName="([^"]*)"'?/)?.[1];
              const status = matchStr.match(/Status="([^"]*)"'?/)?.[1] || 'Unknown';
              const localDate = matchStr.match(/LocalDate="([^"]*)"'?/)?.[1];
              const localTime = matchStr.match(/LocalTime="([^"]*)"'?/)?.[1];
              
              if (matchNo && teamA && teamB) {
                matches.push({
                  no: matchNo,
                  tournament_no: firstTournament.no,
                  team_a_name: teamA,
                  team_b_name: teamB,
                  status,
                  local_date: localDate,
                  local_time: localTime
                });
              }
            }
            
            if (matches.length > 0) {
              const { error: matchError } = await supabase
                .from('matches')
                .upsert(matches, { onConflict: 'no' });
              
              if (matchError) {
                console.log(`⚠️  Match insert warning: ${matchError.message}`);
              } else {
                console.log(`✅ Successfully inserted ${matches.length} matches`);
              }
            }
          }
        }
      }
    }
    
    console.log('\n📊 Step 4: Updating sync status...');
    
    // Update sync status
    const { error: syncError } = await supabase
      .from('sync_status')
      .update({
        last_sync: new Date().toISOString(),
        success_count: 1
      })
      .in('entity_type', ['tournaments', 'matches_schedule']);
    
    if (syncError) {
      console.log(`⚠️  Sync status update: ${syncError.message}`);
    } else {
      console.log('✅ Updated sync status');
    }
    
    return true;
    
  } catch (error) {
    console.error('💥 Manual sync failed:', error.message);
    return false;
  }
}

// Run manual sync
manualDataSync()
  .then(success => {
    if (success) {
      console.log('\n🎉 Manual sync completed!');
      console.log('📊 Now run: node scripts/test-api-endpoints.js');
      console.log('🚀 Backend should be ready for Story 4.2!');
    } else {
      console.log('\n❌ Manual sync failed');
    }
  });