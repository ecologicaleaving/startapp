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
} from 'react-native';
import { useRouter } from 'expo-router';
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

  const getLocation = () => {
    if (tournament.City && tournament.CountryName) {
      return `${tournament.City}, ${tournament.CountryName}`;
    }
    return tournament.Location || tournament.City || tournament.CountryName;
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
      <View style={styles.cardHeader}>
        <View style={styles.tournamentInfo}>
          <Text style={styles.tournamentNumber}>#{tournament.No}</Text>
          {getStatusIndicator()}
        </View>
        {tournament.Code && (
          <Text style={styles.tournamentCode}>{tournament.Code}</Text>
        )}
      </View>
      
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

const TournamentSelectionScreen: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TournamentType>('ALL');
  const router = useRouter();

  const loadTournaments = useCallback(async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Loading tournaments for ${selectedType}, force refresh: ${forceRefresh}`);
      
      // Force fresh data by bypassing cache system
      const tournamentList = await VisApiService.fetchDirectFromAPI({ 
        recentOnly: true,  // Show this month's tournaments instead of only currently active
        tournamentType: selectedType,
        year: 2025  // Only this year's tournaments
      });
      
      console.log(`Loaded ${tournamentList.length} tournaments for type: ${selectedType}`);
      setTournaments(tournamentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      Alert.alert('Error', 'Failed to load tournaments. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

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

  const renderTournament = ({ item }: { item: Tournament }) => (
    <TournamentCard 
      tournament={item} 
      onPress={() => handleTournamentPress(item)} 
    />
  );

  const renderFilterTabs = () => {
    const filterTypes: TournamentType[] = ['ALL', 'FIVB', 'CEV', 'BPT'];
    
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
        <Text style={styles.subtitle}>
          Select the tournament you're officiating
        </Text>
      </View>
      
      {renderFilterTabs()}
      
      <FlatList
        data={tournaments}
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
      
      {tournaments.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No active tournaments found</Text>
          <Text style={styles.emptySubtext}>Check back later for new tournaments</Text>
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
    padding: 24,
    marginBottom: 16,
    borderRadius: 16,
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tournamentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tournamentNumber: {
    fontSize: 16,
    color: '#4A90A4',
    fontWeight: 'bold',
    marginRight: 12,
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
  tournamentCode: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  tournamentName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 8,
    lineHeight: 32,
  },
  tournamentLocation: {
    fontSize: 18,
    color: '#4A90A4',
    marginBottom: 4,
  },
  tournamentDate: {
    fontSize: 16,
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
});

export default TournamentSelectionScreen;