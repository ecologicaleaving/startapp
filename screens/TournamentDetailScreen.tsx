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
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import NavigationHeader from '../components/navigation/NavigationHeader';
import { designTokens } from '../theme/tokens';

const TournamentDetailScreenContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [matches, setMatches] = useState<BeachMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [allMatches, setAllMatches] = useState<BeachMatch[]>([]);
  const [showMoreLoading, setShowMoreLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
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
      
      // Get unique dates and sort them (earliest first)
      const uniqueDates = [...new Set(allTournamentMatches.map(match => 
        match.Date || match.LocalDate || match.MatchDate || match.StartDate
      ).filter(Boolean))].sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
      
      setAvailableDates(uniqueDates);
      
      // Set default date to last day of tournament if not already set
      const defaultDate = uniqueDates.length > 0 ? uniqueDates[uniqueDates.length - 1] : '';
      const effectiveSelectedDate = selectedDate || defaultDate;
      
      if (!selectedDate && defaultDate) {
        setSelectedDate(defaultDate);
      }
      
      setAllMatches(allTournamentMatches);
      
      // Filter and sort matches by selected date
      const filteredMatches = effectiveSelectedDate 
        ? allTournamentMatches.filter(match => {
            const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
            return matchDate === effectiveSelectedDate;
          })
        : allTournamentMatches;
      
      // Sort matches by time ascending (earliest first)
      const sortedMatches = [...filteredMatches].sort((a, b) => {
        const timeA = a.LocalTime || a.Time || '00:00';
        const timeB = b.LocalTime || b.Time || '00:00';
        
        // Convert time strings (HH:MM) to comparable numbers
        const getTimeNumber = (timeStr: string) => {
          const parts = timeStr.split(':');
          const hours = parseInt(parts[0] || '0', 10);
          const minutes = parseInt(parts[1] || '0', 10);
          return hours * 60 + minutes; // Total minutes from midnight
        };
        
        return getTimeNumber(timeA) - getTimeNumber(timeB);
      });
      
      setMatches(sortedMatches.slice(0, 5)); // Show first 5 matches of selected date
    } catch (error) {
      console.error('Failed to load matches:', error);
    } finally {
      setMatchesLoading(false);
    }
  };

  // Load more matches for selected date
  const loadMoreMatches = async () => {
    const filteredMatches = selectedDate 
      ? allMatches.filter(match => {
          const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
          return matchDate === selectedDate;
        })
      : allMatches;
      
    // Sort by time ascending
    const sortedMatches = [...filteredMatches].sort((a, b) => {
      const timeA = a.LocalTime || a.Time || '00:00';
      const timeB = b.LocalTime || b.Time || '00:00';
      
      const getTimeNumber = (timeStr: string) => {
        const parts = timeStr.split(':');
        const hours = parseInt(parts[0] || '0', 10);
        const minutes = parseInt(parts[1] || '0', 10);
        return hours * 60 + minutes;
      };
      
      return getTimeNumber(timeA) - getTimeNumber(timeB);
    });
      
    if (matches.length >= sortedMatches.length) return;
    
    setShowMoreLoading(true);
    
    // Simulate loading delay for better UX
    setTimeout(() => {
      const nextBatch = sortedMatches.slice(0, matches.length + 5);
      setMatches(nextBatch);
      setShowMoreLoading(false);
    }, 500);
  };

  // Handle date navigation
  const navigateToDate = (direction: 'prev' | 'next') => {
    const currentIndex = availableDates.indexOf(selectedDate);
    let newIndex = currentIndex;
    
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < availableDates.length - 1) {
      newIndex = currentIndex + 1;
    }
    
    if (newIndex !== currentIndex && newIndex >= 0 && newIndex < availableDates.length) {
      const newDate = availableDates[newIndex];
      setSelectedDate(newDate);
      
      // Filter and sort matches for new date
      const filteredMatches = allMatches.filter(match => {
        const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
        return matchDate === newDate;
      });
      
      const sortedMatches = [...filteredMatches].sort((a, b) => {
        const timeA = a.LocalTime || a.Time || '00:00';
        const timeB = b.LocalTime || b.Time || '00:00';
        
        const getTimeNumber = (timeStr: string) => {
          const parts = timeStr.split(':');
          const hours = parseInt(parts[0] || '0', 10);
          const minutes = parseInt(parts[1] || '0', 10);
          return hours * 60 + minutes;
        };
        
        return getTimeNumber(timeA) - getTimeNumber(timeB);
      });
      
      setMatches(sortedMatches.slice(0, 5));
    }
  };

  // Format match date for display
  const formatMatchDate = (dateStr: string) => {
    if (!dateStr || dateStr === 'Unknown Date') return dateStr;
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Render date navigator with left/right arrows (same as monitor screens)
  const renderDateNavigator = () => {
    const currentIndex = availableDates.indexOf(selectedDate);
    const currentDate = selectedDate || (availableDates.length > 0 ? availableDates[0] : '');
    
    if (availableDates.length <= 1) return null; // Don't show navigator for single date
    
    // Check if we're at the boundaries
    const isAtFirst = currentIndex <= 0;
    const isAtLast = currentIndex >= availableDates.length - 1;
    
    // Get match count for current date
    const matchCount = allMatches.filter(match => {
      const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
      return matchDate === currentDate;
    }).length;
    
    const displayDate = currentDate ? formatMatchDate(currentDate) : 'All Days';
    const isToday = currentDate && new Date(currentDate).toDateString() === new Date().toDateString();
    const dateInfo = isToday ? '📅 Today' : displayDate;
    
    return (
      <View style={styles.dateNavigator}>
        <TouchableOpacity 
          style={[
            styles.dateNavButton,
            isAtFirst && styles.dateNavButtonDisabled
          ]}
          onPress={() => !isAtFirst && navigateToDate('prev')}
          disabled={isAtFirst}
        >
          <Text style={[
            styles.dateNavButtonText,
            isAtFirst && styles.dateNavButtonTextDisabled
          ]}>◀</Text>
        </TouchableOpacity>
        
        <View style={styles.dateDisplayContainer}>
          <Text style={styles.dateDisplayText}>{dateInfo}</Text>
          <Text style={styles.datePositionText}>
            {matchCount} matches • {currentIndex + 1} of {availableDates.length}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={[
            styles.dateNavButton,
            isAtLast && styles.dateNavButtonDisabled
          ]}
          onPress={() => !isAtLast && navigateToDate('next')}
          disabled={isAtLast}
        >
          <Text style={[
            styles.dateNavButtonText,
            isAtLast && styles.dateNavButtonTextDisabled
          ]}>▶</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render match card (same style as monitor screens)
  const renderMatchCard = (match: BeachMatch, index: number) => {
    const teamAScore = parseInt(match.MatchPointsA || '0');
    const teamBScore = parseInt(match.MatchPointsB || '0');
    const teamAWon = teamAScore > teamBScore && teamAScore > 0;
    const teamBWon = teamBScore > teamAScore && teamBScore > 0;

    return (
      <View key={match.No || index} style={styles.matchCard}>
        {/* Gender Strip */}
        {match.tournamentGender && (
          <View style={[
            styles.genderStrip,
            match.tournamentGender === 'M' ? styles.menStrip : styles.womenStrip
          ]} />
        )}
        
        {/* Top Info */}
        <View style={styles.matchTopInfo}>
          <View style={styles.leftTopInfo}>
            {match.Court && (
              <Text style={styles.courtInfoTop}>
                Court {match.Court}
              </Text>
            )}
            {match.LocalTime && (
              <Text style={styles.timeInfoTop}>
                {match.LocalTime.substring(0, 5)}
              </Text>
            )}
          </View>
          <Text style={styles.roundInfoTop}>
            {match.Round || 'Match'}
          </Text>
        </View>
        
        {/* Teams Section */}
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
        
        {/* Referees Section */}
        {(match.Referee1Name || match.Referee2Name) && (
          <View style={styles.refereesSection}>
            {match.Referee1Name && (
              <Text style={styles.refereeText}>
                1° {match.Referee1Name}
                {match.Referee1FederationCode && ` (${match.Referee1FederationCode})`}
              </Text>
            )}
            {match.Referee2Name && (
              <Text style={styles.refereeText}>
                2° {match.Referee2Name}
                {match.Referee2FederationCode && ` (${match.Referee2FederationCode})`}
              </Text>
            )}
          </View>
        )}
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
      {/* Navigation Header without Status Bar */}
      <NavigationHeader
        title="Tournament Details"
        showBackButton={true}
        showStatusBar={false}
        rightComponent={
          <TouchableOpacity 
            style={styles.tournamentSelectButton}
            onPress={() => router.push('/tournament-selection')}
          >
            <Text style={styles.tournamentSelectButtonText}>📋</Text>
          </TouchableOpacity>
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
                {/* Date Navigator (same as monitor screens) */}
                {renderDateNavigator()}
                
                <View style={styles.matchesList}>
                  {matches.map((match, index) => renderMatchCard(match, index))}
                </View>
                
                {/* Load More Button */}
                {(() => {
                  const filteredMatches = selectedDate 
                    ? allMatches.filter(match => {
                        const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
                        return matchDate === selectedDate;
                      })
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
                            ? allMatches.filter(match => {
                                const matchDate = match.Date || match.LocalDate || match.MatchDate || match.StartDate;
                                return matchDate === selectedDate;
                              })
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

      <BottomTabNavigation 
        currentTab="details" 
        onTabPress={(tab) => {
          if (tab === 'details' && tournament) {
            // Already on details page, do nothing
            return;
          } else if (tab === 'monitor' && tournament) {
            router.push({
              pathname: '/referee-settings',
              params: { tournamentData: JSON.stringify(tournament) }
            });
          }
        }}
      />
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
  
  tournamentSelectButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B365D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  
  tournamentSelectButtonText: {
    fontSize: 18,
    color: '#FFFFFF',
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
  // Date Navigator Styles (same as monitor screens)
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B365D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  dateNavButtonDisabled: {
    backgroundColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  dateNavButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dateNavButtonTextDisabled: {
    color: '#9CA3AF',
  },
  dateDisplayContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  dateDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 2,
  },
  datePositionText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  // Additional styles for match cards (same as monitor screens)
  leftTopInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInfoTop: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
  },
  refereesSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  refereeText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '500',
    marginBottom: 2,
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