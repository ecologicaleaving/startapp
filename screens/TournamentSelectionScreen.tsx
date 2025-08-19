import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock } from 'lucide-react';
import { Tournament } from '../types/tournament';
import { VisApiService, TournamentType } from '../services/visApi';

interface TournamentCardProps {
  tournament: Tournament;
  onPress: () => void;
}

const TournamentCard: React.FC<TournamentCardProps> = ({ tournament, onPress }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper function to infer country from tournament name
  const inferCountryFromName = (name?: string): string | undefined => {
    if (!name) return undefined;
    const nameLower = name.toLowerCase();
    
    if (nameLower.includes('dusseldorf') || nameLower.includes('düsseldorf')) return 'Germany';
    if (nameLower.includes('hamburg') || nameLower.includes('berlin') || nameLower.includes('munich')) return 'Germany';
    if (nameLower.includes('rome') || nameLower.includes('roma') || nameLower.includes('italy')) return 'Italy';
    if (nameLower.includes('paris') || nameLower.includes('france')) return 'France';
    if (nameLower.includes('madrid') || nameLower.includes('spain')) return 'Spain';
    if (nameLower.includes('vienna') || nameLower.includes('austria')) return 'Austria';
    if (nameLower.includes('doha') || nameLower.includes('qatar')) return 'Qatar';
    if (nameLower.includes('tokyo') || nameLower.includes('japan')) return 'Japan';
    if (nameLower.includes('sydney') || nameLower.includes('australia')) return 'Australia';
    if (nameLower.includes('toronto') || nameLower.includes('vancouver') || nameLower.includes('canada') || nameLower.includes('montreal')) return 'Canada';
    if (nameLower.includes('brazil') || nameLower.includes('rio') || nameLower.includes('sao paulo')) return 'Brazil';
    if (nameLower.includes('usa') || nameLower.includes('america') || nameLower.includes('miami') || nameLower.includes('los angeles') || nameLower.includes('new york')) return 'USA';
    if (nameLower.includes('poland') || nameLower.includes('warsaw') || nameLower.includes('krakow')) return 'Poland';
    if (nameLower.includes('netherlands') || nameLower.includes('amsterdam') || nameLower.includes('den haag')) return 'Netherlands';
    if (nameLower.includes('norway') || nameLower.includes('oslo')) return 'Norway';
    if (nameLower.includes('sweden') || nameLower.includes('stockholm')) return 'Sweden';
    if (nameLower.includes('denmark') || nameLower.includes('copenhagen')) return 'Denmark';
    if (nameLower.includes('finland') || nameLower.includes('helsinki')) return 'Finland';
    if (nameLower.includes('turkey') || nameLower.includes('istanbul') || nameLower.includes('ankara')) return 'Turkey';
    if (nameLower.includes('mexico') || nameLower.includes('cancun') || nameLower.includes('acapulco')) return 'Mexico';
    if (nameLower.includes('argentina') || nameLower.includes('buenos aires')) return 'Argentina';
    if (nameLower.includes('chile') || nameLower.includes('santiago') || nameLower.includes('viña del mar')) return 'Chile';
    
    return undefined;
  };

  const getLocation = () => {
    // Try different combinations of available location data
    const city = tournament.City;
    const country = tournament.CountryName || tournament.Country;
    const inferredCountry = inferCountryFromName(tournament.Name);
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    // If we inferred a country, show it
    if (inferredCountry) {
      const suffix = !country ? ` [Inferred: ${inferredCountry}]` : '';
      return city ? `${city}, ${inferredCountry}${suffix}` : `${inferredCountry}${suffix}`;
    }
    
    return tournament.Location || city || country || 'Unknown Location';
  };

  const getDateRange = () => {
    if (tournament.Dates) {
      return tournament.Dates;
    }
    if (tournament.StartDate && tournament.EndDate) {
      const start = formatDate(tournament.StartDate);
      const end = formatDate(tournament.EndDate);
      if (start === end) return start;
      return `${start} - ${end}`;
    }
    return formatDate(tournament.StartDate) || formatDate(tournament.EndDate);
  };

  const getStatusIndicator = () => {
    if (!tournament.StartDate || !tournament.EndDate) return null;
    
    const now = new Date();
    const start = new Date(tournament.StartDate);
    const end = new Date(tournament.EndDate);
    
    if (start <= now && now <= end) {
      return <View style={styles.liveIndicator}><Text style={styles.liveText}>LIVE</Text></View>;
    }
    return null;
  };

  return (
    <TouchableOpacity style={styles.tournamentCard} onPress={onPress} activeOpacity={0.8}>
      {getStatusIndicator() && (
        <View style={styles.cardHeader}>
          {getStatusIndicator()}
        </View>
      )}
      
      <Text style={styles.tournamentName}>
        {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
      </Text>
      
      {getLocation() && (
        <Text style={styles.tournamentLocation}>📍 {getLocation()}</Text>
      )}
      
      {getDateRange() && (
        <Text style={styles.tournamentDate}>📅 {getDateRange()}</Text>
      )}
    </TouchableOpacity>
  );
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CAROUSEL_CARD_WIDTH = SCREEN_WIDTH * 0.75;
const CAROUSEL_CARD_MARGIN = 12;

interface LiveTournamentCardProps {
  tournament: Tournament;
  onPress: () => void;
}

const LiveTournamentCard: React.FC<LiveTournamentCardProps> = ({ tournament, onPress }) => {
  const getLocation = () => {
    // Try different combinations of available location data
    const city = tournament.City;
    const country = tournament.CountryName || tournament.Country;
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    return tournament.Location || city || country;
  };

  return (
    <TouchableOpacity 
      style={styles.liveCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.liveCardHeader}>
        <View style={styles.liveBadge}>
          <View style={styles.liveIndicatorPulse} />
          <Text style={styles.liveBadgeText}>🔴 IN CORSO</Text>
        </View>
      </View>
      
      <Text style={styles.liveTournamentName} numberOfLines={2}>
        {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
      </Text>
      
      {getLocation() && (
        <Text style={styles.liveTournamentLocation} numberOfLines={1}>
          📍 {getLocation()}
        </Text>
      )}
    </TouchableOpacity>
  );
};

interface WeekTournamentCardProps {
  tournament: Tournament;
  onPress: () => void;
}

const WeekTournamentCard: React.FC<WeekTournamentCardProps> = ({ tournament, onPress }) => {
  const getLocation = () => {
    const city = tournament.City;
    const country = tournament.CountryName || tournament.Country;
    
    if (city && country) {
      return `${city}, ${country}`;
    }
    
    return tournament.Location || city || country;
  };

  const getStatus = () => {
    if (!tournament.StartDate || !tournament.EndDate) return null;
    
    const now = new Date();
    const start = new Date(tournament.StartDate);
    const end = new Date(tournament.EndDate);
    
    if (start <= now && now <= end) {
      return { text: '🔴 LIVE', color: '#2E8B57' };
    } else if (start > now) {
      return { text: '📅 UPCOMING', color: '#4A90A4' };
    } else {
      return { text: '✅ COMPLETED', color: '#6B7280' };
    }
  };

  const status = getStatus();

  return (
    <TouchableOpacity 
      style={styles.liveCard} 
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.liveCardHeader}>
        {status && (
          <View style={[styles.liveBadge, { backgroundColor: status.color }]}>
            <Text style={styles.liveBadgeText}>{status.text}</Text>
          </View>
        )}
      </View>
      
      <Text style={styles.liveTournamentName} numberOfLines={2}>
        {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
      </Text>
      
      {getLocation() && (
        <Text style={styles.liveTournamentLocation} numberOfLines={1}>
          📍 {getLocation()}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const TournamentSelectionScreen: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TournamentType>('BPT');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getWeekStart(new Date()));
  const router = useRouter();

  // Helper function to get Monday of current week
  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff));
  }

  // Helper function to format week range
  function formatWeekRange(weekStart: Date): string {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
    const startDay = weekStart.getDate();
    const endDay = weekEnd.getDate();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
    }
  }

  const loadTournaments = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Loading tournaments, force refresh: ${forceRefresh}`);
      
      // Force fresh data by bypassing cache system - load ALL tournaments
      const tournamentList = await VisApiService.fetchDirectFromAPI({ 
        recentOnly: false,  // Get all tournaments, not just recent
        tournamentType: undefined,  // Get all types, filter client-side
        year: 2025  // Only this year's tournaments
      });
      
      console.log(`Loaded ${tournamentList.length} total tournaments`);
      console.log('Tournament sample:', tournamentList.slice(0, 2));
      setTournaments(tournamentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      Alert.alert('Error', 'Failed to load tournaments. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);  // Remove selectedType dependency

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  // Separate effect for category changes - only update filtered results, don't reload API
  useEffect(() => {
    // This will automatically trigger re-filtering when selectedType changes
    // No need to reload tournaments from API
  }, [selectedType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTournaments(true);
    } finally {
      setRefreshing(false);
    }
  }, [loadTournaments]);

  const handleTournamentPress = (tournament: Tournament) => {
    router.push({
      pathname: '/tournament-detail',
      params: { tournamentData: JSON.stringify(tournament) }
    });
  };

  // Filter tournaments for current week and selected type
  const filteredTournaments = tournaments.filter(tournament => {
    if (!tournament.StartDate) return false;
    
    // Exclude cancelled tournaments
    if (tournament.Status && tournament.Status.toLowerCase().includes('cancelled')) {
      return false;
    }
    
    // Week filtering
    const tournamentStart = new Date(tournament.StartDate);
    const tournamentEnd = tournament.EndDate ? new Date(tournament.EndDate) : tournamentStart;
    const weekStart = new Date(currentWeekStart);
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const weekOverlap = tournamentStart <= weekEnd && tournamentEnd >= weekStart;
    
    // Type filtering
    if (selectedType === 'ALL') {
      return weekOverlap;
    }
    
    // Tournament type filtering - more flexible matching
    if (selectedType === 'BPT') {
      // Match BPT tournaments
      const name = (tournament.Name || tournament.Title || '').toLowerCase();
      const type = (tournament.Type || tournament.Category || '').toLowerCase();
      return weekOverlap && (name.includes('bpt') || type.includes('bpt') || name.includes('beach') || name.includes('pro tour'));
    } else if (selectedType === 'CEV') {
      // Match CEV tournaments
      const name = (tournament.Name || tournament.Title || '').toLowerCase();
      const type = (tournament.Type || tournament.Category || '').toLowerCase();
      return weekOverlap && (name.includes('cev') || type.includes('cev') || name.includes('european'));
    }
    
    return weekOverlap;
  });

  // Navigate to previous/next week
  const navigateWeek = (direction: 'prev' | 'next') => {
    const newWeekStart = new Date(currentWeekStart);
    const daysToMove = direction === 'next' ? 7 : -7;
    newWeekStart.setDate(currentWeekStart.getDate() + daysToMove);
    setCurrentWeekStart(newWeekStart);
  };

  // Navigate to current week (today)
  const goToCurrentWeek = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  const renderTournament = ({ item }: { item: Tournament }) => (
    <TournamentCard 
      tournament={item} 
      onPress={() => handleTournamentPress(item)} 
    />
  );

  const renderFilterTabs = () => {
    const filterTypes: TournamentType[] = ['ALL', 'BPT', 'CEV'];
    
    return (
      <View style={styles.filterContainer}>
        {filterTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              selectedType === type && styles.activeFilterButton
            ]}
            onPress={() => setSelectedType(type)}
          >
            <Text style={[
              styles.filterButtonText,
              selectedType === type && styles.activeFilterButtonText
            ]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderWeekNavigator = () => {
    const isCurrentWeek = getWeekStart(new Date()).getTime() === currentWeekStart.getTime();
    const weekInfo = isCurrentWeek ? '📅 This Week' : formatWeekRange(currentWeekStart);
    
    return (
      <View style={styles.weekNavigatorContainer}>
        <View style={styles.weekNavigator}>
          <TouchableOpacity 
            style={styles.weekNavButton}
            onPress={() => navigateWeek('prev')}
          >
            <Text style={styles.weekNavButtonText}>◀</Text>
          </TouchableOpacity>
          
          <View style={styles.weekDisplayContainer}>
            <Text style={styles.weekDisplayText}>{weekInfo}</Text>
            <Text style={styles.weekTournamentCount}>
              {filteredTournaments.length} tournaments • {selectedType}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={styles.weekNavButton}
            onPress={() => navigateWeek('next')}
          >
            <Text style={styles.weekNavButtonText}>▶</Text>
          </TouchableOpacity>
        </View>
        
        {!isCurrentWeek && (
          <TouchableOpacity 
            style={styles.todayButton}
            onPress={goToCurrentWeek}
          >
            <Text style={styles.todayButtonText}>Today</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
        <Text style={styles.loadingText}>Loading tournaments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Unable to load tournaments</Text>
        <Text style={styles.errorSubtext}>Please check your internet connection</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadTournaments}>
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose a Tournament</Text>
      </View>
      
      {renderWeekNavigator()}
      
      {renderFilterTabs()}
      
      <FlatList
        data={filteredTournaments}
        renderItem={renderTournament}
        keyExtractor={(item) => item.No}
        style={styles.list}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B35']}
            tintColor="#FF6B35"
          />
        }
      />
      
      {filteredTournaments.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Clock size={48} color="#9CA3AF" strokeWidth={2} />
          <Text style={styles.emptyText}>No tournaments found</Text>
          <Text style={styles.emptySubtext}>
            {tournaments.length === 0 
              ? 'No tournaments available for any week'
              : 'No tournaments for this week and category'
            }
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 32,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#4A90A4',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: '#4A90A4',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 24,
    color: '#1B365D',
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 18,
    color: '#4A90A4',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 24,
  },
  filterButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#1B365D',
    backgroundColor: 'transparent',
    minHeight: 44,
    justifyContent: 'center',
  },
  activeFilterButton: {
    backgroundColor: '#1B365D',
  },
  filterButtonText: {
    color: '#1B365D',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  activeFilterButtonText: {
    color: '#FFFFFF',
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 8,
  },
  liveIndicator: {
    backgroundColor: '#2E8B57',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tournamentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 6,
    lineHeight: 24,
  },
  tournamentLocation: {
    fontSize: 14,
    color: '#4A90A4',
    marginBottom: 2,
  },
  tournamentDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#4A90A4',
    textAlign: 'center',
  },
  // Week Tournament Carousel Styles
  carouselSection: {
    marginBottom: 24,
  },
  weekNavigatorContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  weekNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  weekNavButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  weekNavButtonText: {
    fontSize: 16,
    color: '#4A90A4',
    fontWeight: 'bold',
  },
  weekDisplayContainer: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 16,
  },
  weekDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 2,
  },
  weekTournamentCount: {
    fontSize: 14,
    color: '#4A90A4',
    fontWeight: '500',
  },
  todayButton: {
    backgroundColor: '#FF6B35',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'center',
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  carouselContainer: {
    paddingLeft: 24,
    paddingRight: 12,
  },
  carouselCardWrapper: {
    marginRight: CAROUSEL_CARD_MARGIN,
    width: CAROUSEL_CARD_WIDTH,
  },
  liveCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#2E8B57',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#2E8B57',
    minHeight: 110,
  },
  liveCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E8B57',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveIndicatorPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
    marginRight: 6,
    // Animation would be handled by Animated API in a real implementation
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  liveTournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 6,
    lineHeight: 20,
  },
  liveTournamentLocation: {
    fontSize: 13,
    color: '#4A90A4',
    marginBottom: 4,
  },
  // Empty Badge Styles
  emptyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  emptyBadgeText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 6,
  },
});

export default TournamentSelectionScreen;