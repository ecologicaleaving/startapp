import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Tournament } from '../types/tournament';
import { BeachMatch } from '../types/match';
import { TournamentStorageService } from '../services/TournamentStorageService';
import { VisApiService } from '../services/visApi';
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import NavigationHeader from '../components/navigation/NavigationHeader';
import { designTokens } from '../theme/tokens';

const TournamentDetailScreenContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [matches, setMatches] = useState<BeachMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [allMatches, setAllMatches] = useState<BeachMatch[]>([]);
  const [showMoreLoading, setShowMoreLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const router = useRouter();
  const { tournamentData } = useLocalSearchParams<{ tournamentData: string }>();

  const tournament: Tournament = React.useMemo(() => {
    try {
      return JSON.parse(tournamentData || '{}') as Tournament;
    } catch {
      return {} as Tournament;
    }
  }, [tournamentData]);

  // Assignment status management
  const { 
    currentAssignmentStatus,
    statusCounts,
    isOnline,
    syncStatus
  } = useAssignmentStatus();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getLocation = () => {
    // Try different combinations of available location data
    const city = tournament.City;
    const country = tournament.CountryName || tournament.Country;
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    return tournament.Location || city || country || 'Location not specified';
  };

  const getDateRange = () => {
    if (tournament.Dates) {
      return tournament.Dates;
    }
    if (tournament.StartDate && tournament.EndDate) {
      const start = formatDate(tournament.StartDate);
      const end = formatDate(tournament.EndDate);
      if (start === end) return start;
      return `${start} to ${end}`;
    }
    return formatDate(tournament.StartDate) || formatDate(tournament.EndDate) || 'Dates TBD';
  };

  const getTournamentStatus = () => {
    if (!tournament.StartDate) return 'Scheduled';
    
    const now = new Date();
    const start = new Date(tournament.StartDate);
    
    // If we have both start and end dates
    if (tournament.EndDate) {
      const end = new Date(tournament.EndDate);
      
      if (start <= now && now <= end) {
        return 'Live';
      } else if (start > now) {
        return 'Upcoming';
      } else {
        return 'Completed';
      }
    }
    
    // If we only have start date, use simple logic
    if (start > now) {
      return 'Upcoming';
    } else {
      // If start date is in the past, assume it's completed
      return 'Completed';
    }
  };

  const getStatusColor = () => {
    const status = getTournamentStatus();
    switch (status) {
      case 'Live':
        return '#2E8B57';
      case 'Upcoming':
        return '#FF6B35';
      case 'Completed':
        return '#6B7280';
      default:
        return '#4A90A4';
    }
  };

  const handleSwitchToTournament = async () => {
    if (!tournament.No) {
      Alert.alert('Error', 'Invalid tournament data. Please go back and try again.');
      return;
    }

    setIsLoading(true);
    try {
      // Save tournament selection
      await TournamentStorageService.saveSelectedTournament(tournament);
      
      // Mark onboarding as completed
      await TournamentStorageService.completeOnboarding();
      
      // Navigate to referee dashboard
      router.replace({
        pathname: '/referee-dashboard',
        params: { tournamentData: JSON.stringify(tournament) }
      });
    } catch (error) {
      console.error('Failed to switch tournament:', error);
      Alert.alert(
        'Error', 
        'Failed to save tournament selection. Please check your device storage and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  // Load matches for active or completed tournaments
  const loadMatches = async () => {
    if (!tournament.No) return;
    
    const status = getTournamentStatus();
    if (status !== 'Live' && status !== 'Completed') return;
    
    setMatchesLoading(true);
    try {
      let allTournamentMatches: BeachMatch[] = [];
      
      // Load matches from current tournament
      const currentMatches = await VisApiService.getBeachMatchList(tournament.No);
      const currentGender = VisApiService.extractGenderFromCode(tournament.Code);
      
      // Add metadata to current tournament matches
      const currentMatchesWithMeta = currentMatches.map(match => ({
        ...match,
        tournamentGender: currentGender,
        tournamentNo: tournament.No,
        tournamentCode: tournament.Code
      }));
      
      allTournamentMatches = [...currentMatchesWithMeta];
      
      // Find related tournaments (men's/women's versions)
      if (tournament.Code) {
        try {
          const relatedTournaments = await VisApiService.findRelatedTournaments(tournament);
          console.log(`Found ${relatedTournaments.length} related tournaments for ${tournament.Code}`);
          
          // Load matches from related tournaments (excluding current one)
          for (const relatedTournament of relatedTournaments) {
            if (relatedTournament.No !== tournament.No) {
              console.log(`Loading matches from related tournament: ${relatedTournament.Code} (${relatedTournament.No})`);
              try {
                const relatedMatches = await VisApiService.getBeachMatchList(relatedTournament.No);
                const relatedGender = VisApiService.extractGenderFromCode(relatedTournament.Code);
                
                // Add metadata to related tournament matches
                const relatedMatchesWithMeta = relatedMatches.map(match => ({
                  ...match,
                  tournamentGender: relatedGender,
                  tournamentNo: relatedTournament.No,
                  tournamentCode: relatedTournament.Code
                }));
                
                allTournamentMatches = [...allTournamentMatches, ...relatedMatchesWithMeta];
              } catch (relatedError) {
                console.warn(`Failed to load matches from ${relatedTournament.Code}:`, relatedError);
              }
            }
          }
        } catch (relatedError) {
          console.warn('Failed to find related tournaments:', relatedError);
        }
      }
      
      console.log(`Total matches loaded: ${allTournamentMatches.length}`);
      
      // Sort matches by tournament phase importance (Finals first, then by date)
      const sortedMatches = allTournamentMatches.sort((a, b) => {
        // Define phase importance (higher number = more important)
        const getPhaseImportance = (round?: string) => {
          if (!round) return 0;
          const roundLower = round.toLowerCase();
          if (roundLower.includes('final') && !roundLower.includes('semi')) return 100; // Final
          if (roundLower.includes('semi')) return 90; // Semifinal
          if (roundLower.includes('bronze') || roundLower.includes('3rd')) return 85; // Bronze medal
          if (roundLower.includes('quarter')) return 80; // Quarterfinal
          if (roundLower.includes('round of 16') || roundLower.includes('1/8')) return 70;
          if (roundLower.includes('round of 32') || roundLower.includes('1/16')) return 60;
          if (roundLower.includes('pool') || roundLower.includes('group')) return 30;
          if (roundLower.includes('qualification')) return 10;
          return 50; // Default for unknown rounds
        };
        
        const phaseA = getPhaseImportance(a.Round);
        const phaseB = getPhaseImportance(b.Round);
        
        // If different phases, sort by importance (descending)
        if (phaseA !== phaseB) {
          return phaseB - phaseA;
        }
        
        // If same phase, sort by date (most recent first)
        const dateA = a.LocalDate ? new Date(a.LocalDate).getTime() : 0;
        const dateB = b.LocalDate ? new Date(b.LocalDate).getTime() : 0;
        return dateB - dateA;
      });
      
      setAllMatches(sortedMatches);
      
      // Get unique dates and set first date as selected
      const uniqueDates = [...new Set(sortedMatches.map(match => match.LocalDate || 'Unknown Date'))];
      if (uniqueDates.length > 0 && !selectedDate) {
        setSelectedDate(uniqueDates[0]);
      }
      
      // Filter matches by selected date if we have one
      const filteredMatches = selectedDate 
        ? sortedMatches.filter(match => (match.LocalDate || 'Unknown Date') === selectedDate)
        : sortedMatches;
      
      setMatches(filteredMatches.slice(0, 5)); // Show first 5 matches of selected date
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setMatchesLoading(false);
    }
  };

  // Load more matches for selected date
  const loadMoreMatches = async () => {
    const filteredMatches = selectedDate 
      ? allMatches.filter(match => (match.LocalDate || 'Unknown Date') === selectedDate)
      : allMatches;
      
    if (matches.length >= filteredMatches.length) return;
    
    setShowMoreLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const nextBatch = filteredMatches.slice(0, matches.length + 5);
      setMatches(nextBatch);
      setShowMoreLoading(false);
    }, 500);
  };

  // Handle date tab change
  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    const filteredMatches = allMatches.filter(match => (match.LocalDate || 'Unknown Date') === date);
    setMatches(filteredMatches.slice(0, 5)); // Reset to first 5 matches of new date
  };

  // Get unique dates for tabs
  const getUniqueDates = () => {
    return [...new Set(allMatches.map(match => match.LocalDate || 'Unknown Date'))];
  };

  // Format date as weekday and day number
  const formatDateWithoutYear = (dateStr: string) => {
    if (dateStr === 'Unknown Date') return dateStr;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  // Render date tabs
  const renderDateTabs = () => {
    const dates = getUniqueDates();
    
    // Debug: log available dates
    console.log('Available dates for tabs:', dates);
    
    return (
      <View style={styles.dateTabsContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateTabsContent}
        >
          {dates.map((date) => (
            <TouchableOpacity
              key={date}
              style={[
                styles.dateTab,
                selectedDate === date && styles.activeDateTab
              ]}
              onPress={() => handleDateChange(date)}
            >
              <Text style={[
                styles.dateTabText,
                selectedDate === date && styles.activeDateTabText
              ]}>
                {formatDateWithoutYear(date)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  useEffect(() => {
    loadMatches();
  }, [tournament.No]);

  // Handle status bar press - navigate to assignments if available
  const handleStatusPress = () => {
    if (currentAssignmentStatus) {
      router.push('/my-assignments');
    }
  };


  if (!tournament.No) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Tournament data not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Navigation Header with Status Integration */}
      <NavigationHeader
        title="Tournament Details"
        showBackButton={true}
        showStatusBar={true}
        onStatusPress={handleStatusPress}
        rightComponent={
          <View style={styles.headerActions}>
            {/* Status Badge Indicators */}
            {statusCounts.current > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: designTokens.colors.success }]}>
                <Text style={styles.statusBadgeText}>{statusCounts.current}</Text>
              </View>
            )}
            {statusCounts.upcoming > 0 && (
              <View style={[styles.statusBadge, { backgroundColor: designTokens.colors.secondary }]}>
                <Text style={styles.statusBadgeText}>{statusCounts.upcoming}</Text>
              </View>
            )}
            
            {/* Network Status Indicator */}
            {(!isOnline || syncStatus !== 'synced') && (
              <View style={[styles.networkStatus, { 
                backgroundColor: !isOnline ? designTokens.colors.error : designTokens.colors.warning 
              }]}>
                <Text style={styles.networkStatusText}>
                  {!isOnline ? '📴' : '🔄'}
                </Text>
              </View>
            )}
          </View>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* Tournament Card */}
        <View style={styles.tournamentCard}>
          <View style={styles.cardHeader}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
              <Text style={styles.statusText}>{getTournamentStatus().toUpperCase()}</Text>
            </View>
          </View>

          <Text style={styles.tournamentName}>
            {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
          </Text>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📅</Text>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{getDateRange()}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Match Results Section */}
        {(getTournamentStatus() === 'Live' || getTournamentStatus() === 'Completed') && (
          <View style={styles.matchResultsSection}>
            <Text style={styles.matchResultsTitle}>
              {getTournamentStatus() === 'Live' ? 'Latest Results' : 'Final Results'}
            </Text>
            
            {matchesLoading ? (
              <View style={styles.matchesLoading}>
                <ActivityIndicator size="small" color="#FF6B35" />
                <Text style={styles.loadingText}>Loading results...</Text>
              </View>
            ) : matches.length > 0 ? (
              <>
                {/* Debug: Always show date tabs for testing */}
                <View style={styles.dateTabsContainer}>
                  <Text style={styles.debugText}>
                    Dates found: {getUniqueDates().length} | Selected: {selectedDate || 'none'}
                  </Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.dateTabsContent}
                  >
                    {getUniqueDates().map((date) => (
                      <TouchableOpacity
                        key={date}
                        style={[
                          styles.dateTab,
                          selectedDate === date && styles.activeDateTab
                        ]}
                        onPress={() => handleDateChange(date)}
                      >
                        <Text style={[
                          styles.dateTabText,
                          selectedDate === date && styles.activeDateTabText
                        ]}>
                          {formatDateWithoutYear(date)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                
                <View style={styles.matchesList}>
                  {matches.map((match, index) => {
                    const scoreA = parseInt(match.MatchPointsA || '0');
                    const scoreB = parseInt(match.MatchPointsB || '0');
                    const teamAWon = scoreA > scoreB;
                    const teamBWon = scoreB > scoreA;
                    
                    // Debug: log match round info
                    if (index === 0) {
                      console.log('Sample match data:', {
                        round: match.Round,
                        status: match.Status,
                        teamA: match.TeamAName,
                        teamB: match.TeamBName
                      });
                    }
                    
                    return (
                      <View key={match.No || index} style={styles.matchCard}>
                            {/* Gender Strip */}
                            {match.tournamentGender && (
                              <View style={[
                                styles.genderStrip,
                                match.tournamentGender === 'M' ? styles.menStrip : styles.womenStrip
                              ]} />
                            )}
                            
                            <View style={styles.matchTopInfo}>
                              <View style={styles.leftTopInfo}>
                                {match.Court && (
                                  <Text style={styles.courtInfoTop}>
                                    Court {match.Court}
                                  </Text>
                                )}
                              </View>
                              <Text style={styles.roundInfoTop}>
                                {match.Round || 'Match'}
                              </Text>
                            </View>
                            <View style={styles.matchHeader}>
                              <View style={styles.teamsColumn}>
                                <Text 
                                  style={[
                                    styles.teamName, 
                                    teamAWon && styles.winnerTeamName
                                  ]} 
                                  numberOfLines={2}
                                >
                                  {match.TeamAName || 'Team A'}
                                </Text>
                                <Text 
                                  style={[
                                    styles.teamName, 
                                    teamBWon && styles.winnerTeamName
                                  ]} 
                                  numberOfLines={2}
                                >
                                  {match.TeamBName || 'Team B'}
                                </Text>
                              </View>
                              
                              <View style={styles.scoreColumn}>
                                <View style={styles.matchScore}>
                                  <Text 
                                    style={[
                                      styles.scoreText,
                                      teamAWon && styles.winnerScoreText
                                    ]}
                                  >
                                    {match.MatchPointsA || '0'}
                                  </Text>
                                  <Text 
                                    style={[
                                      styles.scoreText,
                                      teamBWon && styles.winnerScoreText
                                    ]}
                                  >
                                    {match.MatchPointsB || '0'}
                                  </Text>
                                </View>
                              </View>
                            </View>
                        </View>
                      );
                    })}
                </View>
                
                {/* Load More Button */}
                {(() => {
                  const filteredMatches = selectedDate 
                    ? allMatches.filter(match => (match.LocalDate || 'Unknown Date') === selectedDate)
                    : allMatches;
                  return matches.length < filteredMatches.length;
                })() && (
                  <TouchableOpacity 
                    style={styles.loadMoreButton} 
                    onPress={loadMoreMatches}
                    disabled={showMoreLoading}
                  >
                    {showMoreLoading ? (
                      <View style={styles.loadMoreContent}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.loadMoreButtonText}>Loading...</Text>
                      </View>
                    ) : (
                      <Text style={styles.loadMoreButtonText}>
                        Load More ({(() => {
                          const filteredMatches = selectedDate 
                            ? allMatches.filter(match => (match.LocalDate || 'Unknown Date') === selectedDate)
                            : allMatches;
                          return filteredMatches.length - matches.length;
                        })()} remaining)
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <Text style={styles.noMatchesText}>No match results available</Text>
            )}
          </View>
        )}

      </ScrollView>

      {/* Bottom Action */}
      <View style={styles.bottomAction}>
        <TouchableOpacity 
          style={[styles.switchButton, isLoading && styles.switchButtonDisabled]} 
          onPress={handleSwitchToTournament}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.switchButtonText}>Switch to this Tournament</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 20,
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 24,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for fixed button
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    color: '#1B365D',
    fontWeight: '600',
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    margin: 24,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tournamentName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 24,
    lineHeight: 36,
  },
  detailsContainer: {
    gap: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailIcon: {
    fontSize: 20,
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: '#1B365D',
    fontWeight: '600',
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  switchButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  switchButtonDisabled: {
    backgroundColor: '#9CA3AF',
    shadowOpacity: 0,
    elevation: 0,
  },
  switchButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  
  // Status Integration Styles
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  
  statusBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  
  statusBadgeText: {
    color: designTokens.colors.background,
    fontSize: 11,
    fontWeight: 'bold',
  },
  
  networkStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  networkStatusText: {
    fontSize: 12,
  },
  
  // Match Results Styles
  matchResultsSection: {
    margin: 24,
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  matchResultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 16,
  },
  matchesLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4A90A4',
  },
  matchesList: {
    gap: 16,
  },
  dateGroup: {
    marginBottom: 8,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    minHeight: 80,
  },
  matchHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  teamsColumn: {
    flex: 2,
    paddingRight: 16,
    justifyContent: 'space-around',
    minHeight: 50,
  },
  teamName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1B365D',
    marginBottom: 6,
    lineHeight: 18,
    paddingVertical: 2,
  },
  scoreColumn: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchScore: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF6B35',
    minWidth: 24,
    textAlign: 'center',
    marginVertical: 2,
  },
  courtInfo: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  noMatchesText: {
    textAlign: 'center',
    fontSize: 14,
    color: '#6B7280',
    paddingVertical: 20,
  },
  winnerTeamName: {
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  winnerScoreText: {
    fontWeight: 'bold',
    color: '#2E8B57',
  },
  matchTopInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  leftTopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  courtInfoTop: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  genderBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 24,
    alignItems: 'center',
  },
  menBadge: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#1976D2',
  },
  womenBadge: {
    backgroundColor: '#FCE4EC',
    borderWidth: 1,
    borderColor: '#C2185B',
  },
  mixedBadge: {
    backgroundColor: '#F3E5F5',
    borderWidth: 1,
    borderColor: '#7B1FA2',
  },
  genderBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  roundInfoTop: {
    fontSize: 11,
    color: '#FF6B35',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  genderStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  menStrip: {
    backgroundColor: '#1976D2',
  },
  womenStrip: {
    backgroundColor: '#C2185B',
  },
  loadMoreButton: {
    backgroundColor: '#4A90A4',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    alignSelf: 'center',
    minWidth: 150,
  },
  loadMoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadMoreButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  // Date Tabs Styles (Carousel)
  dateTabsContainer: {
    marginBottom: 16,
  },
  dateTabsContent: {
    paddingLeft: 20,
    paddingRight: 20,
  },
  dateTab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#1B365D',
    backgroundColor: 'transparent',
    minHeight: 44,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activeDateTab: {
    backgroundColor: '#1B365D',
  },
  dateTabText: {
    color: '#1B365D',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  activeDateTabText: {
    color: '#FFFFFF',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
});

// Wrapper component with AssignmentStatusProvider
const TournamentDetailScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <TournamentDetailScreenContent />
    </AssignmentStatusProvider>
  );
};

export default TournamentDetailScreen;