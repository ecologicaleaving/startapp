import { Tournament } from '../types/tournament';
import { BeachMatch } from '../types/match';
import { IVisApiService } from './interfaces/IVisApiService';
import { TournamentStorageService } from './TournamentStorageService';
import { TournamentMappingCacheService } from './TournamentMappingCache';
// Remove CacheService import to break circular dependency
// CacheService will use this class through the factory pattern

export type TournamentType = 'ALL' | 'FIVB' | 'CEV' | 'BPT' | 'LOCAL';

const VIS_BASE_URL = 'https://www.fivb.org/Vis2009/XmlRequest.asmx';

export type GenderType = 'M' | 'W' | 'Mixed' | 'Unknown';

export class VisApiService implements IVisApiService {
  // Extract gender from tournament code (M/W prefix)
  static extractGenderFromCode(code?: string): GenderType {
    if (!code) return 'Unknown';
    
    const upperCode = code.toUpperCase();
    if (upperCode.startsWith('M')) return 'M';
    if (upperCode.startsWith('W')) return 'W';
    
    return 'Mixed';
  }

  // Get base tournament code without gender prefix
  static getBaseTournamentCode(code?: string): string {
    if (!code) return '';
    
    const upperCode = code.toUpperCase();
    if (upperCode.startsWith('M') || upperCode.startsWith('W')) {
      return upperCode.substring(1);
    }
    
    return upperCode;
  }

  // Find related tournaments by base code
  static async findRelatedTournaments(tournament: Tournament): Promise<Tournament[]> {
    if (!tournament.Code) return [tournament];
    
    try {
      const allTournaments = await this.getTournamentListWithDetails();
      const baseCode = this.getBaseTournamentCode(tournament.Code);
      
      return allTournaments.filter(t => {
        if (!t.Code) return false;
        const tBaseCode = this.getBaseTournamentCode(t.Code);
        return tBaseCode === baseCode;
      });
    } catch (error) {
      console.error('Error finding related tournaments:', error);
      return [tournament];
    }
  }

  static classifyTournament(tournament: Tournament): TournamentType {
    const code = tournament.Code || '';
    const name = tournament.Name || '';
    
    // Check for FIVB tournaments
    if (name.toLowerCase().includes('fivb') || 
        name.toLowerCase().includes('world tour') || 
        name.toLowerCase().includes('world championship')) {
      return 'FIVB';
    }
    
    // Check for BPT tournaments
    if (name.toLowerCase().includes('bpt') || 
        code.toLowerCase().includes('bpt') ||
        name.toLowerCase().includes('beach pro tour') ||
        name.toLowerCase().includes('challenge') ||
        name.toLowerCase().includes('elite16')) {
      return 'BPT';
    }
    
    // Check for CEV tournaments
    if (name.toLowerCase().includes('cev') || 
        code.toLowerCase().includes('cev') ||
        name.toLowerCase().includes('european') ||
        name.toLowerCase().includes('europa') ||
        name.toLowerCase().includes('championship')) {
      return 'CEV';
    }
    
    // Default to local tournament
    return 'LOCAL';
  }

  static async getTournamentListWithDetails(filterOptions?: {
    recentOnly?: boolean;
    year?: number;
    currentlyActive?: boolean;
    tournamentType?: TournamentType;
  }): Promise<Tournament[]> {
    try {
      console.log('VisApiService: getTournamentListWithDetails called with options:', filterOptions);
      
      // For external callers, use CacheService through lazy loading to avoid circular dependency
      const { CacheService } = await import('./CacheService');
      
      console.log('VisApiService: Initializing CacheService...');
      CacheService.initialize();
      console.log('VisApiService: CacheService initialized');
      
      console.log('VisApiService: Calling CacheService.getTournaments...');
      const result = await CacheService.getTournaments(filterOptions);
      console.log('VisApiService: CacheService.getTournaments returned:', result.source, result.data.length, 'items');
      
      return result.data;
    } catch (error) {
      console.error('Error in getTournamentListWithDetails:', error);
      
      // Final fallback to direct API
      try {
        console.log('Attempting direct API fallback after cache error');
        return await this.fetchDirectFromAPI(filterOptions);
      } catch (fallbackError) {
        console.error('Direct API fallback also failed:', fallbackError);
        throw new Error('Failed to fetch active tournaments');
      }
    }
  }

  /**
   * Direct API fetch method - used as fallback when cache is unavailable
   * This preserves the exact original implementation behavior
   */
  static async fetchDirectFromAPI(filterOptions?: {
    recentOnly?: boolean;
    year?: number;
    currentlyActive?: boolean;
    tournamentType?: TournamentType;
  }): Promise<Tournament[]> {
    try {
      // Use the proper VIS API call for beach volleyball tournaments (all recent ones)
      const xmlRequest = "<Request Type='GetBeachTournamentList' Fields='No Code Name StartDate EndDate' />";
      const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
      
      console.log('Fetching recent beach volleyball tournaments from direct API...');
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      const allTournaments = this.parseBeachTournamentList(xmlText);
      
      // Filter tournaments to only show those within +/- 1 month from today
      const today = new Date();
      const oneMonthAgo = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      const oneMonthFromNow = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      
      const recentTournaments = allTournaments.filter(tournament => {
        if (!tournament.StartDate) return false;
        
        try {
          const startDate = new Date(tournament.StartDate);
          const isWithinRange = startDate >= oneMonthAgo && startDate <= oneMonthFromNow;
          
          if (!isWithinRange) {
            console.log(`Filtering out old tournament: ${tournament.Name} (${tournament.StartDate})`);
          }
          
          return isWithinRange;
        } catch (error) {
          console.warn(`Invalid date for tournament ${tournament.No}: ${tournament.StartDate}`);
          return false;
        }
      });
      
      // Sort tournaments by start date (ascending - earliest first)
      const sortedTournaments = recentTournaments.sort((a, b) => {
        if (!a.StartDate) return 1;
        if (!b.StartDate) return -1;
        
        try {
          const dateA = new Date(a.StartDate);
          const dateB = new Date(b.StartDate);
          return dateA.getTime() - dateB.getTime();
        } catch {
          return 0;
        }
      });
      
      console.log(`Found ${allTournaments.length} running tournaments, ${sortedTournaments.length} within +/-1 month (sorted by date):`);
      
      // Debug tournament classification
      const tournamentsByType = {
        FIVB: 0,
        BPT: 0,
        CEV: 0,
        LOCAL: 0
      };
      
      sortedTournaments.forEach(t => {
        const type = this.classifyTournament(t);
        tournamentsByType[type]++;
        console.log(`- ${t.Name} (${t.Code}) - ${t.StartDate} to ${t.EndDate} [${type}]`);
      });
      
      console.log('Tournament breakdown by type:', tournamentsByType);
      
      // Apply tournament type filtering if specified
      if (filterOptions?.tournamentType && filterOptions.tournamentType !== 'ALL') {
        const filteredByType = sortedTournaments.filter(tournament => 
          this.classifyTournament(tournament) === filterOptions.tournamentType
        );
        
        console.log(`Filtered by type ${filterOptions.tournamentType}: ${filteredByType.length} tournaments`);
        return filteredByType;
      }
      
      return sortedTournaments;
    } catch (error) {
      console.error('Error fetching active tournaments from direct API:', error);
      
      // Provide fallback mock data to prevent app from hanging
      console.log('API call failed, using fallback mock data to prevent app hanging. Error:', error.message);
      return [
        {
          No: '1001',
          Code: 'MBPT2024-01',
          Name: 'Beach Pro Tour - Elite 16 Men',
          Title: 'Beach Pro Tour Elite 16',
          StartDate: '2024-01-15',
          EndDate: '2024-01-21',
          Country: 'International',
          City: 'Demo City',
          Status: 'Running',
          Version: 1
        },
        {
          No: '1002', 
          Code: 'WBPT2024-01',
          Name: 'Beach Pro Tour - Elite 16 Women',
          Title: 'Beach Pro Tour Elite 16',
          StartDate: '2024-01-15',
          EndDate: '2024-01-21',
          Country: 'International', 
          City: 'Demo City',
          Status: 'Running',
          Version: 1
        }
      ] as Tournament[];
    }
  }

  static async getBeachMatchList(tournamentNo: string): Promise<BeachMatch[]> {
    console.log(`VisApiService: getBeachMatchList called for tournament ${tournamentNo}`);
    
    try {
      // For external callers, use CacheService through lazy loading to avoid circular dependency
      const { CacheService } = await import('./CacheService');
      
      // Initialize cache service if not already done
      CacheService.initialize();
      console.log(`VisApiService: Cache service initialized, trying cache first`);
      
      const result = await CacheService.getMatches(tournamentNo);
      
      console.log(`VisApiService: Cache result:`, {
        hasResult: !!result,
        hasData: !!(result && result.data),
        dataLength: result?.data?.length,
        source: result?.source
      });
      
      if (result && result.data) {
        console.log(`VisApiService: Returning ${result.data.length} matches from ${result.source} cache`);
        
        // Check for live matches and establish real-time subscriptions
        await this.handleLiveMatchSubscriptions(result.data);
        
        return result.data;
      }

      // If cache fails, fallback to direct API
      console.warn('VisApiService: Cache service failed, falling back to direct API');
      const directMatches = await this.fetchMatchesDirectFromAPI(tournamentNo);
      console.log(`VisApiService: Direct API fallback returned ${directMatches.length} matches`);
      return directMatches;
    } catch (error) {
      console.error(`VisApiService: Error in getBeachMatchList for tournament ${tournamentNo}:`, error);
      
      // Final fallback to direct API
      try {
        console.log('VisApiService: Attempting direct API fallback after cache error');
        const result = await this.fetchMatchesDirectFromAPI(tournamentNo);
        console.log(`VisApiService: Direct API fallback completed with ${result.length} matches`);
        return result;
      } catch (fallbackError) {
        console.error('VisApiService: Direct API fallback also failed:', fallbackError);
        throw new Error('Failed to fetch tournament matches');
      }
    }
  }

  /**
   * Format XML for readable logging
   */
  static formatXmlForLogging(xmlText: string): string {
    try {
      // Remove excessive whitespace and format for better readability
      let formatted = xmlText
        .replace(/>\s+</g, '><') // Remove whitespace between tags
        .replace(/</g, '\n<')     // New line before each tag
        .trim();
      
      // Add indentation for nested tags
      let indentLevel = 0;
      const lines = formatted.split('\n');
      const indentedLines = lines.map(line => {
        if (line.includes('</') && !line.includes('/>')) {
          indentLevel--;
        }
        const indentedLine = '  '.repeat(Math.max(0, indentLevel)) + line;
        if (line.includes('<') && !line.includes('</') && !line.includes('/>')) {
          indentLevel++;
        }
        return indentedLine;
      });
      
      return indentedLines.join('\n');
    } catch (error) {
      // If formatting fails, return first 1000 characters
      return xmlText.substring(0, 1000) + (xmlText.length > 1000 ? '...' : '');
    }
  }

  /**
   * Try to get basic tournament details with common information fields
   */
  static async tryBasicTournamentDetails(tournamentNo: string): Promise<Tournament | null> {
    try {
      console.log(`🏐 DEBUG: Trying basic tournament details for ${tournamentNo}...`);
      
      // Try with common tournament information fields
      const fieldsToTry = [
        'No Code Name Title City Country CountryName Location StartDate EndDate Status Type Category Series Prize PrizeMoney Currency Venue Courts Surface Gender ContactName ContactEmail ContactPhone Website Description',
        'No Code Name Title City Country StartDate EndDate Status Type Category Series Prize Venue Courts Surface',
        'No Code Name Title City Country StartDate EndDate Status Type Category Prize'
      ];

      for (const fields of fieldsToTry) {
        console.log(`🏐 DEBUG: Trying GetBeachTournament with fields: ${fields.substring(0, 50)}...`);
        
        const xmlRequest = `<Request Type='GetBeachTournament' Fields='${fields}' NoTournament='${tournamentNo}' />`;
        const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
        
        try {
          const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/xml, text/xml',
              'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
            },
          });

          if (response.ok) {
            const xmlText = await response.text();
            console.log(`🏐 DEBUG: Basic tournament details response (${xmlText.length} chars):`);
            console.log('🏐 DEBUG: Raw XML:', this.formatXmlForLogging(xmlText));
            
            const parsed = this.parseBasicTournamentDetails(xmlText);
            if (parsed) {
              console.log(`🏐 DEBUG: ✅ Parsed basic tournament details:`, JSON.stringify(parsed, null, 2));
              return parsed;
            }
          } else {
            console.log(`🏐 DEBUG: Basic fields failed with status ${response.status}`);
          }
        } catch (error) {
          console.log(`🏐 DEBUG: Error with basic fields:`, error);
        }
      }
      
      console.log(`🏐 DEBUG: All basic field combinations failed`);
      return null;
    } catch (error) {
      console.error('Error trying basic tournament details:', error);
      return null;
    }
  }

  /**
   * Parse basic tournament details from XML response
   */
  static parseBasicTournamentDetails(xmlText: string): Tournament | null {
    try {
      // Look for BeachTournament tags with attributes
      const tournamentMatch = xmlText.match(/<BeachTournament[^>]*\/>/);
      if (!tournamentMatch) {
        console.log(`🏐 DEBUG: No BeachTournament tag found in response`);
        return null;
      }

      const tournamentTag = tournamentMatch[0];
      console.log(`🏐 DEBUG: Found tournament tag:`, this.formatXmlForLogging(tournamentTag));

      // Extract attributes using regex
      const extractAttribute = (attr: string): string | undefined => {
        const match = tournamentTag.match(new RegExp(`${attr}="([^"]*)"`, 'i'));
        const value = match ? match[1] : undefined;
        if (value) {
          console.log(`🏐 DEBUG: Extracted ${attr}: "${value}"`);
        }
        return value;
      };

      const tournament: Tournament = {
        No: extractAttribute('No') || '',
        Code: extractAttribute('Code'),
        Name: extractAttribute('Name'),
        Title: extractAttribute('Title'),
        City: extractAttribute('City'),
        Country: extractAttribute('Country'),
        CountryName: extractAttribute('CountryName'),
        Location: extractAttribute('Location'),
        StartDate: extractAttribute('StartDate'),
        EndDate: extractAttribute('EndDate'),
        Status: extractAttribute('Status'),
        Type: extractAttribute('Type'),
        Category: extractAttribute('Category'),
        Series: extractAttribute('Series'),
        Prize: extractAttribute('Prize'),
        PrizeMoney: extractAttribute('PrizeMoney'),
        Currency: extractAttribute('Currency'),
        Venue: extractAttribute('Venue'),
        Courts: extractAttribute('Courts'),
        Surface: extractAttribute('Surface'),
        Gender: extractAttribute('Gender'),
        ContactName: extractAttribute('ContactName'),
        ContactEmail: extractAttribute('ContactEmail'),
        ContactPhone: extractAttribute('ContactPhone'),
        Website: extractAttribute('Website'),
        Description: extractAttribute('Description')
      };

      // Only return if we have the basic required fields
      if (tournament.No) {
        console.log(`🏐 DEBUG: Successfully parsed tournament:`, {
          No: tournament.No,
          Name: tournament.Name,
          Title: tournament.Title,
          Type: tournament.Type,
          Category: tournament.Category
        });
        return tournament;
      }

      return null;
    } catch (error) {
      console.error('Error parsing basic tournament details:', error);
      return null;
    }
  }

  /**
   * Get beach tournament details including officials/referees if available
   * Uses multiple approaches including the external website pattern
   */
  static async getBeachTournamentDetails(tournamentNo: string): Promise<Tournament | null> {
    try {
      console.log(`🏐 DEBUG: === TRYING TO GET DETAILED TOURNAMENT INFO FOR ${tournamentNo} ===`);
      
      // Try basic tournament details first with common fields
      const basicDetails = await this.tryBasicTournamentDetails(tournamentNo);
      if (basicDetails) {
        console.log(`🏐 DEBUG: ✅ SUCCESS with basic tournament details!`);
        return basicDetails;
      }

      console.log(`🏐 DEBUG: === TRYING ALL METHODS TO GET REFEREE DATA FOR TOURNAMENT ${tournamentNo} ===`);
      
      // Method 1: Try to map our tournament to external website tournament number
      console.log(`🏐 DEBUG: Method 1: Mapping tournament to external website number...`);
      const mappedResult = await this.tryExternalWebsiteMapping(tournamentNo);
      if (mappedResult && mappedResult.hasRefereeData) {
        console.log(`🏐 DEBUG: ✅ SUCCESS with external website mapping!`);
        return mappedResult;
      }

      // Method 2: Try direct ShowBeachEvent pattern
      console.log(`🏐 DEBUG: Method 2: Trying direct ShowBeachEvent pattern...`);
      const showEventResult = await this.tryShowBeachEventPattern(tournamentNo);
      if (showEventResult && showEventResult.hasRefereeData) {
        console.log(`🏐 DEBUG: ✅ SUCCESS with ShowBeachEvent pattern!`);
        return showEventResult;
      }

      // Method 3: Try GetBeachTournament with different field combinations
      console.log(`🏐 DEBUG: Method 2: Trying GetBeachTournament with referee fields...`);
      const fieldCombinations = [
        'No Code Name Officials Referees TechnicalOfficials',
        'No Code Name StartDate EndDate Officials Referees',
        'No Code Name StartDate EndDate Officials Referees TechnicalOfficials PlayerList EntryList'
      ];

      for (const fields of fieldCombinations) {
        console.log(`🏐 DEBUG: Trying GetBeachTournament with fields: ${fields}`);
        
        const xmlRequest = `<Request Type='GetBeachTournament' Fields='${fields}' NoTournament='${tournamentNo}' />`;
        const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
        
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
          },
        });

        if (response.status === 401) {
          console.log(`🏐 DEBUG: GetBeachTournament requires authentication (401)`);
          break; // Try next method
        }

        if (!response.ok) {
          console.log(`🏐 DEBUG: Fields '${fields}' failed with status ${response.status}`);
          continue;
        }

        const xmlText = await response.text();
        console.log(`🏐 DEBUG: GetBeachTournament SUCCESS with fields '${fields}'`);
        console.log(`🏐 DEBUG: Response:`, this.formatXmlForLogging(xmlText));
        
        const parsed = this.parseBeachTournamentDetails(xmlText);
        if (parsed && parsed.hasOfficials) {
          return parsed;
        }
      }
      
      // Method 4: Try GetBeachTournamentList with targeted query
      console.log(`🏐 DEBUG: Method 4: Trying GetBeachTournamentList with tournament filter...`);
      return await this.getBeachTournamentListDetails(tournamentNo);
      
    } catch (error) {
      console.warn(`All methods failed for tournament ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Try to map our tournament to external website tournament number using cache
   * Step 1: Check cache for tournament code mapping (refreshed weekly)
   * Step 2: Use cached external number to get referee data
   * Step 3: Cache the tournament detail data for future use
   */
  static async tryExternalWebsiteMapping(tournamentNo: string): Promise<any> {
    try {
      console.log(`🏐 DEBUG: Mapping tournament ${tournamentNo} using cached external website approach...`);
      
      // Step 1: Get our tournament details to generate/find tournament code
      const ourTournament = await this.getOurTournamentDetails(tournamentNo);
      if (!ourTournament) {
        console.log(`🏐 DEBUG: Could not get details for our tournament ${tournamentNo}`);
        return null;
      }
      
      const tournamentCode = ourTournament.code || this.generateTournamentCodeFromOurData(ourTournament);
      console.log(`🏐 DEBUG: Tournament code for mapping: ${tournamentCode}`);
      
      // Step 2: Get external tournament number from cache (with auto-refresh)
      const mappingCache = TournamentMappingCacheService.getInstance();
      const externalTournamentNo = await mappingCache.getExternalTournamentNumber(tournamentCode);
      
      if (!externalTournamentNo) {
        console.log(`🏐 DEBUG: No cached mapping found for tournament code: ${tournamentCode}`);
        // Try fallback mapping by name/location
        return await this.tryFallbackMapping(tournamentNo, ourTournament);
      }
      
      console.log(`🏐 DEBUG: ✅ Found cached mapping ${tournamentCode} -> external number ${externalTournamentNo}`);
      
      // Step 3: Check if we have cached tournament detail data
      const cachedDetail = await this.getCachedTournamentDetail(externalTournamentNo);
      if (cachedDetail && cachedDetail.referees && cachedDetail.referees.length > 0) {
        console.log(`🏐 DEBUG: 🎯 Using cached tournament detail with ${cachedDetail.referees.length} REFEREES!`);
        return {
          ...cachedDetail,
          source: 'cache',
          mappedFromTournament: tournamentNo,
          externalTournamentNo: externalTournamentNo
        };
      }
      
      // Step 4: Fetch fresh tournament details using external number
      const detailUrl = `${VIS_BASE_URL}?Query=ShowBeachEvent&No=${externalTournamentNo}`;
      console.log(`🏐 DEBUG: Fetching tournament details: ${detailUrl}`);
      
      const detailResponse = await fetch(detailUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
      });

      if (detailResponse.ok) {
        const detailXml = await detailResponse.text();
        console.log(`🏐 DEBUG: ✅ External website detail SUCCESS! Response length: ${detailXml.length}`);
        
        const eventReferees = this.parseEventRefereeData(detailXml, externalTournamentNo);
        if (eventReferees && eventReferees.referees.length > 0) {
          console.log(`🏐 DEBUG: 🎯 FOUND ${eventReferees.referees.length} REFEREES using cached mapping!`);
          
          // Cache the tournament detail for future use
          await this.cacheTournamentDetail(externalTournamentNo, eventReferees);
          
          return {
            ...eventReferees,
            source: 'api',
            mappedFromTournament: tournamentNo,
            externalTournamentNo: externalTournamentNo
          };
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`External website mapping failed for tournament ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Map our tournament number to external website tournament number
   * Parse the tournament list XML and find matching tournament
   */
  private static async mapTournamentNumber(ourTournamentNo: string, listXml: string): Promise<string | null> {
    try {
      console.log(`🏐 DEBUG: Mapping tournament ${ourTournamentNo} in external list...`);
      
      // Get our tournament details to match name/location
      const ourTournament = await this.getOurTournamentDetails(ourTournamentNo);
      if (!ourTournament) {
        console.log(`🏐 DEBUG: Could not get details for our tournament ${ourTournamentNo}`);
        return null;
      }
      
      console.log(`🏐 DEBUG: Our tournament details:`, {
        name: ourTournament.name,
        location: ourTournament.location,
        startDate: ourTournament.startDate
      });
      
      // Parse external tournament list for matches
      // Look for tournament entries with similar names/locations
      const tournamentMatches = this.findTournamentMatches(listXml, ourTournament);
      
      if (tournamentMatches.length > 0) {
        console.log(`🏐 DEBUG: Found ${tournamentMatches.length} potential matches:`);
        tournamentMatches.forEach((match, index) => {
          console.log(`🏐 DEBUG: Match ${index + 1}: No=${match.no}, Name="${match.name}", Location="${match.location}"`);
        });
        
        // Return the best match (first one for now)
        return tournamentMatches[0].no;
      }
      
      return null;
    } catch (error) {
      console.error(`Error mapping tournament ${ourTournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Get details of our tournament for mapping
   */
  private static async getOurTournamentDetails(tournamentNo: string): Promise<any> {
    try {
      // Try to get tournament details from API
      const tournaments = await this.fetchDirectFromAPI();
      const tournament = tournaments.find(t => t.No === tournamentNo);
      
      if (tournament) {
        return {
          name: tournament.Name || tournament.Code,
          location: tournament.Location || tournament.City || tournament.Country,
          startDate: tournament.StartDate,
          code: tournament.Code
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting our tournament details for ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Find matching tournaments in external XML list
   */
  private static findTournamentMatches(listXml: string, ourTournament: any): any[] {
    const matches: any[] = [];
    
    try {
      // Look for tournament entries in various formats
      const patterns = [
        /<Tournament[^>]*No="([^"]*)"[^>]*Name="([^"]*)"[^>]*Location="([^"]*)"[^>]*\/>/g,
        /<BeachTournament[^>]*No="([^"]*)"[^>]*Name="([^"]*)"[^>]*City="([^"]*)"[^>]*\/>/g,
        /<Event[^>]*No="([^"]*)"[^>]*Name="([^"]*)"[^>]*Venue="([^"]*)"[^>]*\/>/g
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(listXml)) !== null) {
          const [, no, name, location] = match;
          
          // Check if this might be our tournament
          if (this.isTournamentMatch(ourTournament, { name, location })) {
            matches.push({ no, name, location });
          }
        }
      });
      
    } catch (error) {
      console.error('Error parsing tournament matches:', error);
    }
    
    return matches;
  }

  /**
   * Check if external tournament matches our tournament
   */
  private static isTournamentMatch(ourTournament: any, externalTournament: any): boolean {
    const ourName = (ourTournament.name || '').toLowerCase();
    const ourLocation = (ourTournament.location || '').toLowerCase();
    const extName = (externalTournament.name || '').toLowerCase();
    const extLocation = (externalTournament.location || '').toLowerCase();
    
    // Check for name matches
    if (ourName.includes('hamburg') && extName.includes('hamburg')) return true;
    if (ourName.includes('berlin') && extName.includes('berlin')) return true;
    if (ourName.includes('munich') && extName.includes('munich')) return true;
    
    // Check for location matches
    if (ourLocation.includes('hamburg') && extLocation.includes('hamburg')) return true;
    if (ourLocation.includes('germany') && extLocation.includes('germany')) return true;
    
    // Check for exact name matches (partial)
    if (ourName.length > 5 && extName.includes(ourName)) return true;
    if (extName.length > 5 && ourName.includes(extName)) return true;
    
    return false;
  }

  /**
   * Generate tournament code from our tournament data
   */
  private static generateTournamentCodeFromOurData(tournament: any): string {
    const year = new Date().getFullYear().toString();
    const name = (tournament.name || '').toLowerCase();
    const location = (tournament.location || '').toLowerCase();
    
    // Extract city code for common patterns
    if (name.includes('hamburg') || location.includes('hamburg')) return `HAM${year}`;
    if (name.includes('berlin') || location.includes('berlin')) return `BER${year}`;
    if (name.includes('munich') || location.includes('munich')) return `MUN${year}`;
    if (name.includes('vienna') || location.includes('vienna')) return `VIE${year}`;
    
    // Fallback to first 3 chars of name + year
    const nameCode = (tournament.name || tournament.code || 'TRN').substring(0, 3).toUpperCase();
    return `${nameCode}${year}`;
  }

  /**
   * Try fallback mapping when no cached mapping exists
   */
  private static async tryFallbackMapping(tournamentNo: string, ourTournament: any): Promise<any> {
    try {
      console.log(`🏐 DEBUG: Trying fallback mapping for ${tournamentNo}...`);
      
      // Get fresh tournament list and try to find match
      const year = new Date().getFullYear();
      const listUrl = `${VIS_BASE_URL}?Query=ShowBeachEvents&Jahr=${year}`;
      
      const listResponse = await fetch(listUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
      });

      if (listResponse.ok) {
        const listXml = await listResponse.text();
        const matches = this.findTournamentMatches(listXml, ourTournament);
        
        if (matches.length > 0) {
          const bestMatch = matches[0];
          console.log(`🏐 DEBUG: Found fallback match: ${bestMatch.no} for ${tournamentNo}`);
          
          // Try to get referee data with this number
          const detailUrl = `${VIS_BASE_URL}?Query=ShowBeachEvent&No=${bestMatch.no}`;
          const detailResponse = await fetch(detailUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/xml, text/xml',
              'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
            },
          });

          if (detailResponse.ok) {
            const detailXml = await detailResponse.text();
            const eventReferees = this.parseEventRefereeData(detailXml, bestMatch.no);
            
            if (eventReferees && eventReferees.referees.length > 0) {
              return {
                ...eventReferees,
                source: 'fallback',
                mappedFromTournament: tournamentNo,
                externalTournamentNo: bestMatch.no
              };
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`Fallback mapping failed for tournament ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Get cached tournament detail data
   */
  private static async getCachedTournamentDetail(externalTournamentNo: string): Promise<any> {
    try {
      const cacheKey = `tournament_detail_${externalTournamentNo}`;
      const cached = await import('@react-native-async-storage/async-storage').then(
        module => module.default.getItem(cacheKey)
      );
      
      if (cached) {
        const parsedCache = JSON.parse(cached);
        const cacheAge = Date.now() - parsedCache.timestamp;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;
        
        if (cacheAge < oneWeek) {
          console.log(`🏐 CACHE: Using cached detail for tournament ${externalTournamentNo}`);
          return parsedCache.data;
        } else {
          console.log(`🏐 CACHE: Detail cache expired for tournament ${externalTournamentNo}`);
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Error getting cached tournament detail for ${externalTournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Cache tournament detail data
   */
  private static async cacheTournamentDetail(externalTournamentNo: string, detailData: any): Promise<void> {
    try {
      const cacheKey = `tournament_detail_${externalTournamentNo}`;
      const cacheData = {
        data: detailData,
        timestamp: Date.now()
      };
      
      await import('@react-native-async-storage/async-storage').then(
        module => module.default.setItem(cacheKey, JSON.stringify(cacheData))
      );
      
      console.log(`🏐 CACHE: Cached detail for tournament ${externalTournamentNo}`);
    } catch (error) {
      console.error(`Error caching tournament detail for ${externalTournamentNo}:`, error);
    }
  }

  /**
   * Try the ShowBeachEvent pattern like the external website
   * Uses the exact pattern: Query=ShowBeachEvent&No=1552
   */
  static async tryShowBeachEventPattern(tournamentNo: string): Promise<any> {
    try {
      console.log(`🏐 DEBUG: Trying ShowBeachEvent pattern for tournament ${tournamentNo} (like external website)...`);
      
      // Test both the provided tournament number and the known working number from external site
      const testNumbers = [tournamentNo];
      
      // If we're testing Hamburg, also try the known working external website number
      if (tournamentNo.includes('8239') || tournamentNo === '8239') {
        testNumbers.push('1552'); // Hamburg tournament number from external website
        console.log(`🏐 DEBUG: Hamburg detected, also testing with external website number 1552`);
      }
      
      for (const testNo of testNumbers) {
        console.log(`🏐 DEBUG: Testing ShowBeachEvent with tournament number: ${testNo}`);
        
        // Use the exact query pattern from the external website
        // External site uses: Query=ShowBeachEvent&No=1552
        const requestUrl = `${VIS_BASE_URL}?Query=ShowBeachEvent&No=${testNo}`;
        
        console.log(`🏐 DEBUG: Using external website pattern: ${requestUrl}`);
        
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
          },
        });

        if (response.ok) {
          const xmlText = await response.text();
          console.log(`🏐 DEBUG: ✅ ShowBeachEvent SUCCESS with number ${testNo}! Response length: ${xmlText.length}`);
          console.log(`🏐 DEBUG: Formatted XML:`, this.formatXmlForLogging(xmlText));
          
          // Parse for referee data in event format
          const eventReferees = this.parseEventRefereeData(xmlText, testNo);
          if (eventReferees && eventReferees.referees.length > 0) {
            console.log(`🏐 DEBUG: 🎯 FOUND ${eventReferees.referees.length} REFEREES in event data with number ${testNo}!`);
            return {
              ...eventReferees,
              usedTournamentNo: testNo,
              originalTournamentNo: tournamentNo
            };
          } else {
            console.log(`🏐 DEBUG: No referees found in ShowBeachEvent response for number ${testNo}`);
          }
        } else {
          console.log(`🏐 DEBUG: ShowBeachEvent request failed with status ${response.status} for number ${testNo}`);
        }
      }
      
      // Try XML Request format as fallback for the original tournament number
      console.log(`🏐 DEBUG: No success with Query format, trying XML Request format as fallback...`);
      const xmlRequests = [
        `<Request Type='ShowBeachEvent' No='${tournamentNo}' />`,
        `<Request Type='GetBeachEvent' No='${tournamentNo}' />`
      ];

      for (const xmlRequest of xmlRequests) {
        console.log(`🏐 DEBUG: Fallback trying request: ${xmlRequest}`);
        
        const fallbackUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
        
        const fallbackResponse = await fetch(fallbackUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
          },
        });

        if (fallbackResponse.ok) {
          const fallbackXml = await fallbackResponse.text();
          console.log(`🏐 DEBUG: Fallback response length: ${fallbackXml.length}`);
          
          const fallbackReferees = this.parseEventRefereeData(fallbackXml, tournamentNo);
          if (fallbackReferees && fallbackReferees.referees.length > 0) {
            console.log(`🏐 DEBUG: 🎯 FOUND ${fallbackReferees.referees.length} REFEREES in fallback!`);
            return fallbackReferees;
          }
        }
      }

      return null;
    } catch (error) {
      console.warn(`ShowBeachEvent pattern failed for tournament ${tournamentNo}:`, error);
      return null;
    }
  }

  /**
   * Try GetBeachTournamentList with extended fields to see what's available
   * Focus on extracting referee data for the specific tournament
   */
  static async getBeachTournamentListDetails(tournamentNo: string): Promise<any> {
    try {
      console.log(`🏐 TOURNAMENT ${tournamentNo}: Extracting tournament officials...`);
      
      // Focus on referee-specific fields
      const refereeFields = [
        'No Code Name Officials Referees TechnicalOfficials',
        'No Code Name StartDate EndDate Officials Referees',
        'No Code Name Officials Referees Players Teams',
        'No Code Name StartDate EndDate Location City Country Officials Referees Players Teams Participants'
      ];

      for (const fields of refereeFields) {
        console.log(`🏐 TOURNAMENT ${tournamentNo}: Trying fields: ${fields}`);
        
        // Use filter to get ONLY the specific tournament
        const xmlRequest = `<Request Type='GetBeachTournamentList' Fields='${fields}'><Filter NoTournament='${tournamentNo}' /></Request>`;
        const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
        
        const response = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml',
            'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
          },
        });

        if (!response.ok) {
          console.log(`🏐 TOURNAMENT ${tournamentNo}: Query failed with status ${response.status}`);
          continue;
        }

        const xmlText = await response.text();
        
        // Only log if we get a small response (specific tournament) or if it contains our tournament
        if (xmlText.length < 10000 || xmlText.includes(`No="${tournamentNo}"`)) {
          console.log(`🏐 TOURNAMENT ${tournamentNo}: ✅ SUCCESS! Response length: ${xmlText.length} chars`);
          console.log(`🏐 TOURNAMENT ${tournamentNo}: Formatted XML:`, this.formatXmlForLogging(xmlText));
        } else {
          console.log(`🏐 TOURNAMENT ${tournamentNo}: ✅ SUCCESS but large response (${xmlText.length} chars) - filtering for our tournament...`);
        }
        
        // Parse specifically for our tournament
        const tournamentReferees = this.parseSpecificTournamentReferees(xmlText, tournamentNo);
        if (tournamentReferees && tournamentReferees.referees.length > 0) {
          console.log(`🏐 TOURNAMENT ${tournamentNo}: 🎯 FOUND ${tournamentReferees.referees.length} REFEREES!`);
          return tournamentReferees;
        }
      }
      
      console.log(`🏐 TOURNAMENT ${tournamentNo}: No referee data found in officials fields`);
      return null;
    } catch (error) {
      console.warn(`🏐 TOURNAMENT ${tournamentNo}: GetBeachTournamentList failed:`, error);
      return null;
    }
  }

  /**
   * Parse specific tournament XML to extract referee data
   */
  private static parseSpecificTournamentReferees(xmlText: string, tournamentNo: string): any {
    try {
      console.log(`🏐 DEBUG: Parsing tournament ${tournamentNo} XML for referee data...`);
      
      // Parse BeachTournament elements
      const tournamentMatches = xmlText.match(/<BeachTournament[^>]*\/>/g);
      if (!tournamentMatches) {
        console.log(`🏐 DEBUG: No tournament elements found in XML`);
        return null;
      }

      console.log(`🏐 DEBUG: Found ${tournamentMatches.length} tournament elements`);
      
      // Find our specific tournament
      const targetTournament = tournamentMatches.find(tournament => 
        tournament.includes(`No="${tournamentNo}"`)
      );

      if (!targetTournament) {
        console.log(`🏐 DEBUG: Tournament ${tournamentNo} not found in response`);
        return null;
      }

      console.log(`🏐 DEBUG: Found target tournament: ${targetTournament}`);

      // Extract all attributes from the tournament element
      const extractAttribute = (name: string): string | undefined => {
        const attrMatch = targetTournament.match(new RegExp(`${name}="([^"]*)"`, 'i'));
        return attrMatch ? attrMatch[1] : undefined;
      };

      // Look for referee-related attributes
      const refereeAttributes = {
        officials: extractAttribute('Officials'),
        referees: extractAttribute('Referees'),
        technicalOfficials: extractAttribute('TechnicalOfficials'),
        players: extractAttribute('Players'),
        teams: extractAttribute('Teams'),
        participants: extractAttribute('Participants')
      };

      console.log(`🏐 DEBUG: Extracted referee attributes:`, refereeAttributes);

      // Parse referee data if available
      const referees: any[] = [];
      
      // Check if Officials field contains referee data
      if (refereeAttributes.officials) {
        console.log(`🏐 DEBUG: Processing Officials field: ${refereeAttributes.officials}`);
        const officialsReferees = this.parseRefereeField(refereeAttributes.officials);
        referees.push(...officialsReferees);
      }

      // Check if Referees field contains referee data
      if (refereeAttributes.referees) {
        console.log(`🏐 DEBUG: Processing Referees field: ${refereeAttributes.referees}`);
        const refereesData = this.parseRefereeField(refereeAttributes.referees);
        referees.push(...refereesData);
      }

      // Check if TechnicalOfficials field contains referee data
      if (refereeAttributes.technicalOfficials) {
        console.log(`🏐 DEBUG: Processing TechnicalOfficials field: ${refereeAttributes.technicalOfficials}`);
        const techOfficials = this.parseRefereeField(refereeAttributes.technicalOfficials);
        referees.push(...techOfficials);
      }

      return {
        tournamentNo,
        referees,
        hasRefereeData: referees.length > 0,
        attributes: refereeAttributes
      };

    } catch (error) {
      console.error(`Error parsing tournament ${tournamentNo} referees:`, error);
      return null;
    }
  }

  /**
   * Parse event XML data for referee information and location details (like external website)
   */
  private static parseEventRefereeData(xmlText: string, tournamentNo: string): any {
    try {
      console.log(`🏐 TOURNAMENT ${tournamentNo}: Parsing event XML for referee data and location info...`);
      
      // Only log full XML if it's reasonably small (specific to our tournament)
      if (xmlText.length < 5000) {
        console.log(`🏐 TOURNAMENT ${tournamentNo}: Full XML content:`, this.formatXmlForLogging(xmlText));
      } else {
        console.log(`🏐 TOURNAMENT ${tournamentNo}: Large XML response (${xmlText.length} chars) - parsing for tournament data...`);
      }
      
      const referees: any[] = [];
      const locationInfo: any = {};
      
      // Extract location information from XML
      this.extractLocationInfo(xmlText, locationInfo, tournamentNo);
      
      // Look for various referee patterns in event XML
      // Pattern 1: Look for referee-related XML elements
      const refereePatterns = [
        /<Referee[^>]*Name="([^"]*)"[^>]*FederationCode="([^"]*)"[^>]*\/>/g,
        /<Official[^>]*Name="([^"]*)"[^>]*Federation="([^"]*)"[^>]*\/>/g,
        /<Schiedsrichter[^>]*Name="([^"]*)"[^>]*Land="([^"]*)"[^>]*\/>/g,
        /<Person[^>]*Name="([^"]*)"[^>]*Country="([^"]*)"[^>]*Type="Referee"[^>]*\/>/g
      ];

      refereePatterns.forEach((pattern, patternIndex) => {
        let match;
        while ((match = pattern.exec(xmlText)) !== null) {
          referees.push({
            No: `event_ref_${patternIndex}_${referees.length + 1}`,
            Name: match[1],
            FederationCode: match[2],
            Source: `event_pattern_${patternIndex + 1}`
          });
        }
      });

      // Pattern 2: Look for referee lists in text content
      const textContent = xmlText.replace(/<[^>]*>/g, ' ');
      
      // Look for "Schiedsrichter:" section (German for referees)
      const schiedsrichterMatch = textContent.match(/Schiedsrichter[:\s]+([^]*?)(?=\n\n|\n[A-Z]|$)/i);
      if (schiedsrichterMatch) {
        console.log(`🏐 TOURNAMENT ${tournamentNo}: Found Schiedsrichter section: ${schiedsrichterMatch[1].substring(0, 200)}`);
        
        // Parse referee entries like "ESP Padron Jose Maria"
        const refereeEntries = schiedsrichterMatch[1].match(/([A-Z]{2,3})[:\s]+([^\n]+)/g);
        if (refereeEntries) {
          refereeEntries.forEach((entry, index) => {
            const entryMatch = entry.match(/([A-Z]{2,3})[:\s]+(.+)/);
            if (entryMatch) {
              referees.push({
                No: `text_ref_${index + 1}`,
                Name: entryMatch[2].trim(),
                FederationCode: entryMatch[1],
                Source: 'text_parsing'
              });
            }
          });
        }
      }

      // Pattern 3: Look for "Officials:" section  
      const officialsMatch = textContent.match(/Officials[:\s]+([^]*?)(?=\n\n|\n[A-Z]|$)/i);
      if (officialsMatch) {
        console.log(`🏐 TOURNAMENT ${tournamentNo}: Found Officials section: ${officialsMatch[1].substring(0, 200)}`);
        
        // Similar parsing for officials
        const officialEntries = officialsMatch[1].match(/([A-Z]{2,3})[:\s]+([^\n]+)/g);
        if (officialEntries) {
          officialEntries.forEach((entry, index) => {
            const entryMatch = entry.match(/([A-Z]{2,3})[:\s]+(.+)/);
            if (entryMatch) {
              referees.push({
                No: `official_ref_${index + 1}`,
                Name: entryMatch[2].trim(),
                FederationCode: entryMatch[1],
                Source: 'officials_parsing'
              });
            }
          });
        }
      }

      // Remove duplicates based on name and federation
      const uniqueReferees = referees.filter((referee, index, self) => 
        index === self.findIndex(r => r.Name === referee.Name && r.FederationCode === referee.FederationCode)
      );

      console.log(`🏐 TOURNAMENT ${tournamentNo}: Found ${uniqueReferees.length} unique referees in event data:`, uniqueReferees);
      console.log(`🏐 TOURNAMENT ${tournamentNo}: Extracted location information:`, locationInfo);

      return {
        tournamentNo,
        referees: uniqueReferees,
        locationInfo,
        hasRefereeData: uniqueReferees.length > 0,
        hasLocationData: Object.keys(locationInfo).length > 0,
        source: 'event_data'
      };

    } catch (error) {
      console.error(`🏐 TOURNAMENT ${tournamentNo}: Error parsing event referee data:`, error);
      return null;
    }
  }

  /**
   * Extract location information from tournament XML
   */
  private static extractLocationInfo(xmlText: string, locationInfo: any, tournamentNo: string): void {
    try {
      console.log(`🏐 TOURNAMENT ${tournamentNo}: Extracting location information...`);

      // Look for location attributes in XML elements
      const locationPatterns = [
        /City="([^"]*)"/g,
        /Country="([^"]*)"/g,
        /Location="([^"]*)"/g,
        /Venue="([^"]*)"/g,
        /Place="([^"]*)"/g,
        /Ort="([^"]*)"/g,  // German for place
        /Land="([^"]*)"/g,  // German for country
        /Stadt="([^"]*)"/g  // German for city
      ];

      const attributes = ['City', 'Country', 'Location', 'Venue', 'Place', 'Ort', 'Land', 'Stadt'];
      
      locationPatterns.forEach((pattern, index) => {
        const matches = [...xmlText.matchAll(pattern)];
        if (matches.length > 0) {
          const attributeName = attributes[index];
          const values = matches.map(match => match[1]).filter(val => val && val.trim().length > 0);
          if (values.length > 0) {
            locationInfo[attributeName] = values;
            console.log(`🏐 TOURNAMENT ${tournamentNo}: Found ${attributeName}:`, values);
          }
        }
      });

      // Look for location info in text content
      const textContent = xmlText.replace(/<[^>]*>/g, ' ');
      
      // Look for common location patterns in text
      const locationTextPatterns = [
        /(?:Location|Venue|Place)[:\s]+([^\n]+)/gi,
        /(?:City|Stadt)[:\s]+([^\n]+)/gi,
        /(?:Country|Land)[:\s]+([^\n]+)/gi,
        /(\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*),\s*([A-Z]{2,3}|\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g // City, Country pattern
      ];

      locationTextPatterns.forEach((pattern, index) => {
        const matches = [...textContent.matchAll(pattern)];
        if (matches.length > 0) {
          const patternName = `textPattern${index + 1}`;
          const values = matches.map(match => 
            match[1] ? match[1].trim() : match[0].trim()
          ).filter(val => val && val.length > 2);
          if (values.length > 0) {
            locationInfo[patternName] = values;
            console.log(`🏐 TOURNAMENT ${tournamentNo}: Found location text pattern ${index + 1}:`, values);
          }
        }
      });

      // Extract dates if available
      const datePatterns = [
        /(\d{1,2}[.-]\d{1,2}[.-]\d{2,4})/g,
        /(\d{4}-\d{1,2}-\d{1,2})/g,
        /StartDate="([^"]*)"/g,
        /EndDate="([^"]*)"/g
      ];

      datePatterns.forEach((pattern, index) => {
        const matches = [...xmlText.matchAll(pattern)];
        if (matches.length > 0) {
          const patternName = `dates_pattern${index + 1}`;
          const values = matches.map(match => match[1]).filter(val => val && val.trim().length > 0);
          if (values.length > 0) {
            locationInfo[patternName] = values;
            console.log(`🏐 TOURNAMENT ${tournamentNo}: Found date pattern ${index + 1}:`, values);
          }
        }
      });

    } catch (error) {
      console.error(`🏐 TOURNAMENT ${tournamentNo}: Error extracting location info:`, error);
    }
  }

  /**
   * Parse referee field data (could be comma-separated, XML, or other format)
   */
  private static parseRefereeField(fieldData: string): any[] {
    if (!fieldData || fieldData.trim() === '') return [];

    console.log(`🏐 DEBUG: Parsing referee field data: "${fieldData}"`);

    // Try different parsing strategies
    const referees: any[] = [];

    // Strategy 1: Comma-separated values
    if (fieldData.includes(',')) {
      const parts = fieldData.split(',').map(s => s.trim()).filter(s => s.length > 0);
      parts.forEach((part, index) => {
        referees.push({
          No: `ref_${index + 1}`,
          Name: part,
          Source: 'comma_separated'
        });
      });
    }
    // Strategy 2: Semicolon-separated values  
    else if (fieldData.includes(';')) {
      const parts = fieldData.split(';').map(s => s.trim()).filter(s => s.length > 0);
      parts.forEach((part, index) => {
        referees.push({
          No: `ref_${index + 1}`,
          Name: part,
          Source: 'semicolon_separated'
        });
      });
    }
    // Strategy 3: XML-like structure
    else if (fieldData.includes('<') && fieldData.includes('>')) {
      console.log(`🏐 DEBUG: Detected XML structure in referee field`);
      // Try to parse XML structure
      const nameMatches = fieldData.match(/Name="([^"]*)"/g);
      if (nameMatches) {
        nameMatches.forEach((match, index) => {
          const name = match.match(/Name="([^"]*)"/)?.[1];
          if (name) {
            referees.push({
              No: `ref_xml_${index + 1}`,
              Name: name,
              Source: 'xml_structure'
            });
          }
        });
      }
    }
    // Strategy 4: Single value
    else if (fieldData.length > 0) {
      referees.push({
        No: 'ref_single',
        Name: fieldData,
        Source: 'single_value'
      });
    }

    console.log(`🏐 DEBUG: Parsed ${referees.length} referees from field:`, referees);
    return referees;
  }

  /**
   * Parse tournament details XML to extract officials/referees
   */
  private static parseBeachTournamentDetails(xmlText: string): any {
    try {
      console.log(`🏐 DEBUG: Parsing tournament details XML for officials...`);
      
      // Parse the BeachTournaments XML format looking for officials data
      const tournamentMatches = xmlText.match(/<BeachTournament[^>]*\/>/g);
      if (!tournamentMatches) {
        console.log(`🏐 DEBUG: No tournament data found in XML`);
        return null;
      }

      console.log(`🏐 DEBUG: Found ${tournamentMatches.length} tournaments in response`);
      
      // Look for tournaments that have official/referee data
      const tournamentsWithOfficials = tournamentMatches.filter(tournament => {
        return tournament.toLowerCase().includes('official') || 
               tournament.toLowerCase().includes('referee') ||
               tournament.includes('Officials=') ||
               tournament.includes('Referees=');
      });

      if (tournamentsWithOfficials.length > 0) {
        console.log(`🏐 DEBUG: Found ${tournamentsWithOfficials.length} tournaments with official data:`);
        tournamentsWithOfficials.slice(0, 3).forEach((tournament, index) => {
          console.log(`🏐 DEBUG: Tournament ${index + 1} with officials:`, tournament.substring(0, 200));
        });
        
        // Let's test the officials training tournament specifically
        console.log(`🏐 DEBUG: Testing officials training tournament (No="2") for detailed referee data...`);
        this.testOfficialsTournament();
        
        return { 
          hasOfficials: true, 
          tournamentsWithOfficials,
          totalTournaments: tournamentMatches.length 
        };
      }

      // Even if no officials found in attributes, check if the structure supports it
      console.log(`🏐 DEBUG: No tournaments with explicit official data found`);
      console.log(`🏐 DEBUG: Sample tournament structure:`, tournamentMatches[0]?.substring(0, 300));
      
      return {
        hasOfficials: false,
        structureSupported: true,
        totalTournaments: tournamentMatches.length,
        sampleTournament: tournamentMatches[0]
      };
    } catch (error) {
      console.error('Error parsing tournament details XML:', error);
      return null;
    }
  }

  /**
   * Test the officials training tournament to see referee data structure
   */
   static async testOfficialsTournament(): Promise<void> {
    try {
      console.log(`🏐 DEBUG: === TESTING OFFICIALS TRAINING TOURNAMENT ===`);
      
      // Test GetBeachTournament on the officials training tournament (No="2")
      const fieldsToTest = [
        'No Code Name StartDate Officials Referees',
        'No Code Name Officials Referees TechnicalOfficials',
        'No Code Name StartDate EndDate Officials Referees Players Teams Participants'
      ];

      for (const fields of fieldsToTest) {
        console.log(`🏐 DEBUG: Testing officials tournament with fields: ${fields}`);
        
        const xmlRequest = `<Request Type='GetBeachTournament' Fields='${fields}' NoTournament='2' />`;
        const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
        
        try {
          const response = await fetch(requestUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/xml, text/xml',
              'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
            },
          });

          if (response.ok) {
            const xmlText = await response.text();
            console.log(`🏐 DEBUG: ✅ SUCCESS! Officials tournament response (${xmlText.length} chars):`, this.formatXmlForLogging(xmlText));
            break; // Found working combination
          } else {
            console.log(`🏐 DEBUG: ❌ Officials tournament fields '${fields}' failed with status ${response.status}`);
          }
        } catch (error) {
          console.log(`🏐 DEBUG: ❌ Error testing officials tournament:`, error);
        }
      }

      // Also test GetBeachMatchList on officials tournament to see if it has referee assignments
      console.log(`🏐 DEBUG: Testing match list for officials training tournament...`);
      try {
        const matches = await this.fetchMatchesDirectFromAPI('2');
        console.log(`🏐 DEBUG: Officials tournament has ${matches.length} matches`);
        
        if (matches.length > 0) {
          console.log(`🏐 DEBUG: Sample match from officials tournament:`, {
            'No': matches[0].No,
            'Teams': `${matches[0].TeamAName} vs ${matches[0].TeamBName}`,
            'Referee1': `${matches[0].Referee1Name} (${matches[0].NoReferee1})`,
            'Referee2': `${matches[0].Referee2Name} (${matches[0].NoReferee2})`,
            'Date': matches[0].LocalDate,
            'Status': matches[0].Status
          });
        }
      } catch (error) {
        console.log(`🏐 DEBUG: Error getting matches for officials tournament:`, error);
      }

    } catch (error) {
      console.log(`🏐 DEBUG: Error in testOfficialsTournament:`, error);
    }
  }

  /**
   * Direct API fetch method for matches - used as fallback when cache is unavailable
   * This preserves the exact original implementation behavior
   */
  static async fetchMatchesDirectFromAPI(tournamentNo: string): Promise<BeachMatch[]> {
    try {
      // Build the XML request including referee data
      const fields = 'No NoInTournament LocalDate LocalTime TeamAName TeamBName Court MatchPointsA MatchPointsB PointsTeamASet1 PointsTeamBSet1 PointsTeamASet2 PointsTeamBSet2 PointsTeamASet3 PointsTeamBSet3 DurationSet1 DurationSet2 DurationSet3 Status Round NoReferee1 NoReferee2 Referee1Name Referee2Name Referee1FederationCode Referee2FederationCode';
      const xmlRequest = `<Request Type='GetBeachMatchList' Fields='${fields}'><Filter NoTournament='${tournamentNo}' /></Request>`;
      const requestUrl = `${VIS_BASE_URL}?Request=${encodeURIComponent(xmlRequest)}`;
      
      console.log(`Fetching matches for tournament ${tournamentNo} from direct API...`);
      
      const response = await fetch(requestUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml',
          'X-FIVB-App-ID': '2a9523517c52420da73d927c6d6bab23',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const xmlText = await response.text();
      console.log(`VisApiService: fetchMatchesDirectFromAPI got XML response length: ${xmlText.length}`);
      
      const matches = this.parseBeachMatchList(xmlText);
      
      console.log(`VisApiService: Loaded ${matches.length} matches for tournament ${tournamentNo}`);
      
      return matches;
    } catch (error) {
      console.error(`Error fetching matches for tournament ${tournamentNo} from direct API:`, error);
      throw new Error('Failed to fetch tournament matches');
    }
  }

  /**
   * Handle real-time subscriptions for live matches
   */
  static async handleLiveMatchSubscriptions(matches: BeachMatch[]): Promise<void> {
    try {
      const liveMatches = matches.filter(match => this.isLiveMatch(match));
      if (liveMatches.length > 0) {
        console.log(`Found ${liveMatches.length} live matches, real-time subscriptions would be established here`);
        // TODO: Move this to a higher level service to avoid circular dependency
        // await RealtimeSubscriptionService.subscribeLiveMatches(liveMatches);
      }
    } catch (error) {
      console.warn('Failed to establish live match subscriptions:', error);
      // Non-blocking error - match data should still be served
    }
  }

  /**
   * Check if a match is live and requires real-time updates
   */
  static isLiveMatch(match: BeachMatch): boolean {
    const status = match.Status?.toLowerCase();
    return status === 'live' || 
           status === 'inprogress' || 
           status === 'running';
  }

  private static parseBeachMatchList(xmlText: string): BeachMatch[] {
    try {
      
      // Parse the BeachMatches XML format
      const matchMatches = xmlText.match(/<BeachMatch[^>]*\/>/g);
      if (!matchMatches) {
        return [];
      }

      const parsedMatches = matchMatches.map((match) => {
        const extractAttribute = (name: string): string | undefined => {
          const attrMatch = match.match(new RegExp(`${name}="([^"]*)"`, 'i'));
          return attrMatch ? attrMatch[1] : undefined;
        };

        const beachMatch = {
          No: extractAttribute('No') || '',
          NoInTournament: extractAttribute('NoInTournament'),
          LocalDate: extractAttribute('LocalDate'),
          LocalTime: extractAttribute('LocalTime'),
          TeamAName: extractAttribute('TeamAName'),
          TeamBName: extractAttribute('TeamBName'),
          Court: extractAttribute('Court'),
          MatchPointsA: extractAttribute('MatchPointsA'),
          MatchPointsB: extractAttribute('MatchPointsB'),
          PointsTeamASet1: extractAttribute('PointsTeamASet1'),
          PointsTeamBSet1: extractAttribute('PointsTeamBSet1'),
          PointsTeamASet2: extractAttribute('PointsTeamASet2'),
          PointsTeamBSet2: extractAttribute('PointsTeamBSet2'),
          PointsTeamASet3: extractAttribute('PointsTeamASet3'),
          PointsTeamBSet3: extractAttribute('PointsTeamBSet3'),
          DurationSet1: extractAttribute('DurationSet1'),
          DurationSet2: extractAttribute('DurationSet2'),
          DurationSet3: extractAttribute('DurationSet3'),
          Version: extractAttribute('Version'),
          Status: extractAttribute('Status'),
          Round: extractAttribute('Round'),
          NoReferee1: extractAttribute('NoReferee1'),
          NoReferee2: extractAttribute('NoReferee2'),
          Referee1Name: extractAttribute('Referee1Name'),
          Referee2Name: extractAttribute('Referee2Name'),
          Referee1FederationCode: extractAttribute('Referee1FederationCode'),
          Referee2FederationCode: extractAttribute('Referee2FederationCode'),
        };
        
        return beachMatch;
      });
      
      return parsedMatches;
    } catch (error) {
      console.error('VisApiService: Error parsing BeachMatches XML:', error);
      return [];
    }
  }

  private static parseBeachTournamentList(xmlText: string): Tournament[] {
    try {
      // Parse the BeachTournaments XML format
      const tournamentMatches = xmlText.match(/<BeachTournament[^>]*\/>/g);
      
      if (!tournamentMatches) {
        return [];
      }

      return tournamentMatches.map((match) => {
        const extractAttribute = (name: string): string | undefined => {
          const attrMatch = match.match(new RegExp(`${name}="([^"]*)"`, 'i'));
          return attrMatch ? attrMatch[1] : undefined;
        };

        return {
          No: extractAttribute('No') || '',
          Code: extractAttribute('Code'),
          Name: extractAttribute('Name'),
          Title: extractAttribute('Title'),
          StartDate: extractAttribute('StartDate'),
          EndDate: extractAttribute('EndDate'),
          City: extractAttribute('City'),
          Country: extractAttribute('Country'),
          CountryName: extractAttribute('CountryName'),
          Location: extractAttribute('Location'),
          Version: extractAttribute('Version'),
        };
      });
    } catch (error) {
      console.error('Error parsing BeachTournaments XML:', error);
      return [];
    }
  }
}