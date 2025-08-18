import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { VisApiService } from '../services/visApi';
import { BeachMatch } from '../types/match';

interface RefereeFromDB {
  No: string;
  Name: string;
  FederationCode?: string;
  Level?: string;
  isSelected?: boolean;
}

interface UseRefereeManagementState {
  refereeList: RefereeFromDB[];
  loadingReferees: boolean;
  showRefereeList: boolean;
  selectedReferee: RefereeFromDB | null;
  refereeMatches: BeachMatch[];
  loadingRefereeMatches: boolean;
  showRefereeMatches: boolean;
  refereeCacheKey: string | null;
}

interface UseRefereeManagementActions {
  loadRefereeList: (tournamentNo: string) => Promise<void>;
  selectReferee: (referee: RefereeFromDB) => Promise<void>;
  setShowRefereeList: (show: boolean) => void;
  setShowRefereeMatches: (show: boolean) => void;
  clearRefereeData: () => void;
}

export interface UseRefereeManagement extends UseRefereeManagementState, UseRefereeManagementActions {}

export const useRefereeManagement = (): UseRefereeManagement => {
  const [refereeList, setRefereeList] = useState<RefereeFromDB[]>([]);
  const [loadingReferees, setLoadingReferees] = useState(false);
  const [showRefereeList, setShowRefereeList] = useState(false);
  const [selectedReferee, setSelectedReferee] = useState<RefereeFromDB | null>(null);
  const [refereeMatches, setRefereeMatches] = useState<BeachMatch[]>([]);
  const [loadingRefereeMatches, setLoadingRefereeMatches] = useState(false);
  const [showRefereeMatches, setShowRefereeMatches] = useState(false);
  const [refereeCacheKey, setRefereeCacheKey] = useState<string | null>(null);

  const findOppositeGenderTournament = useCallback(async (tournamentNo: string): Promise<string | null> => {
    try {
      console.log(`🏐 DEBUG: Looking for opposite gender tournament for ${tournamentNo}...`);
      
      const tournaments = await VisApiService.fetchDirectFromAPI();
      console.log(`🏐 DEBUG: Fetched ${tournaments.length} tournaments from API`);
      
      const currentTournament = tournaments.find(t => t.No === tournamentNo);
      
      if (!currentTournament || !currentTournament.Code) {
        console.log(`🏐 DEBUG: Current tournament not found or has no code`);
        return null;
      }
      
      const currentCode = currentTournament.Code;
      console.log(`🏐 DEBUG: Current tournament code: ${currentCode}`);
      
      let oppositeCode: string | null = null;
      
      if (currentCode.startsWith('M')) {
        oppositeCode = 'W' + currentCode.substring(1);
      } else if (currentCode.startsWith('W')) {
        oppositeCode = 'M' + currentCode.substring(1);
      }
      
      if (oppositeCode) {
        const oppositeTournament = tournaments.find(t => t.Code === oppositeCode);
        if (oppositeTournament) {
          console.log(`🏐 DEBUG: Found opposite gender tournament: ${oppositeTournament.Code} (${oppositeTournament.No})`);
          return oppositeTournament.No;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to find opposite gender tournament:', error);
      return null;
    }
  }, []);

  const loadRefereeList = useCallback(async (tournamentNo: string) => {
    if (!tournamentNo) {
      Alert.alert('Error', 'No tournament selected');
      return;
    }

    // Check cache first for faster loading
    if (refereeCacheKey === tournamentNo && refereeList.length > 0) {
      console.log(`🏐 DEBUG: Using cached referee list for tournament ${tournamentNo}`);
      setShowRefereeList(true);
      return;
    }

    setLoadingReferees(true);
    try {
      console.log(`🏐 DEBUG: Loading referees for tournament ${tournamentNo} (optimized)...`);
      
      // Skip tournament details call for faster loading - get matches directly
      const matches = await VisApiService.fetchMatchesDirectFromAPI(tournamentNo);
      console.log(`🏐 DEBUG: Found ${matches.length} matches for tournament ${tournamentNo}`);
      
      if (matches.length === 0) {
        console.log(`🏐 DEBUG: No matches found - tournament may not have started yet or no matches scheduled`);
        Alert.alert('No Referees Found', 'This tournament has no matches scheduled yet, so referee assignments are not available. Referees are typically assigned closer to the tournament start date.');
        return;
      }
      
      // Quick sample check for referee data availability
      const sampleMatch = matches[0];
      console.log(`🏐 DEBUG: Sample referee data - R1: ${sampleMatch?.Referee1Name}, R2: ${sampleMatch?.Referee2Name}`);
      
      // Extract unique referees from matches
      const refereeMap = new Map<string, RefereeFromDB>();
      
      matches.forEach(match => {
        // Add Referee 1 if present
        if (match.NoReferee1 && match.Referee1Name) {
          refereeMap.set(match.NoReferee1, {
            No: match.NoReferee1,
            Name: match.Referee1Name,
            FederationCode: match.Referee1FederationCode,
          });
        }
        
        // Add Referee 2 if present
        if (match.NoReferee2 && match.Referee2Name) {
          refereeMap.set(match.NoReferee2, {
            No: match.NoReferee2,
            Name: match.Referee2Name,
            FederationCode: match.Referee2FederationCode,
          });
        }
      });
      
      const referees = Array.from(refereeMap.values()).sort((a, b) => a.Name.localeCompare(b.Name));
      console.log(`🏐 DEBUG: Extracted ${referees.length} unique referees from matches`);
      
      if (referees.length === 0) {
        console.log(`🏐 DEBUG: No referees found in match data - matches may not have referee assignments yet`);
        Alert.alert('No Referees Found', 'The matches for this tournament do not have referee assignments yet. Referees are typically assigned closer to the tournament start date.');
        return;
      }
      
      setRefereeList(referees);
      setRefereeCacheKey(tournamentNo); // Cache the result
      setShowRefereeList(true);
    } catch (error) {
      console.error('Failed to load referee list:', error);
      Alert.alert('Error', 'Failed to load referee list. Please check your connection and try again.');
    } finally {
      setLoadingReferees(false);
    }
  }, [refereeCacheKey, refereeList.length]);

  const loadRefereeMatches = useCallback(async (referee: RefereeFromDB, tournamentNo: string) => {
    setLoadingRefereeMatches(true);
    try {
      console.log(`🏐 DEBUG: Loading matches for referee ${referee.Name} in tournament ${tournamentNo}...`);
      
      // Get all matches for the tournament (including both male and female if applicable)
      let allMatches = await VisApiService.getBeachMatchList(tournamentNo);
      console.log(`🏐 DEBUG: Found ${allMatches.length} matches for tournament ${tournamentNo}`);
      
      // Try to load opposite gender tournament matches
      try {
        const oppositeGenderTournamentNo = await findOppositeGenderTournament(tournamentNo);
        if (oppositeGenderTournamentNo) {
          console.log(`🏐 DEBUG: Loading matches from opposite gender tournament ${oppositeGenderTournamentNo}...`);
          const oppositeMatches = await VisApiService.getBeachMatchList(oppositeGenderTournamentNo);
          console.log(`🏐 DEBUG: Found ${oppositeMatches.length} matches from opposite gender tournament`);
          
          // Add source metadata to distinguish tournaments
          const oppositeMatchesWithMeta = oppositeMatches.map(match => ({
            ...match,
            sourceType: 'opposite_gender',
            sourceTournament: oppositeGenderTournamentNo,
          }));
          
          allMatches = [...allMatches, ...oppositeMatchesWithMeta];
          console.log(`🏐 DEBUG: Total matches after combining: ${allMatches.length}`);
        }
      } catch (error) {
        console.error('Failed to load opposite gender tournament matches:', error);
      }
      
      // TEMPORARY: Show all matches for debugging
      console.log(`🏐 DEBUG: Temporarily showing all ${allMatches.length} matches for debugging purposes...`);
      setRefereeMatches(allMatches);
      
      setShowRefereeMatches(true);
    } catch (error) {
      console.error(`Error loading referee matches for ${referee.Name}:`, error);
      Alert.alert('Error', 'Failed to load referee matches');
    } finally {
      setLoadingRefereeMatches(false);
    }
  }, [findOppositeGenderTournament]);

  const selectReferee = useCallback(async (referee: RefereeFromDB, tournamentNo: string) => {
    try {
      setSelectedReferee(referee);
      setShowRefereeList(false);
      await loadRefereeMatches(referee, tournamentNo);
    } catch (error) {
      console.error('Failed to select referee:', error);
      Alert.alert('Error', 'Failed to load referee matches');
    }
  }, [loadRefereeMatches]);

  const clearRefereeData = useCallback(() => {
    setRefereeList([]);
    setSelectedReferee(null);
    setRefereeMatches([]);
    setShowRefereeList(false);
    setShowRefereeMatches(false);
    setRefereeCacheKey(null);
  }, []);

  return {
    // State
    refereeList,
    loadingReferees,
    showRefereeList,
    selectedReferee,
    refereeMatches,
    loadingRefereeMatches,
    showRefereeMatches,
    refereeCacheKey,
    // Actions
    loadRefereeList,
    selectReferee,
    setShowRefereeList,
    setShowRefereeMatches,
    clearRefereeData,
  };
};