import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Tournament } from '../types/tournament';
import { VisApiService, TournamentType } from '../services/visApi';
import TournamentDetail from './TournamentDetail';

interface TournamentItemProps {
  tournament: Tournament;
  onPress: () => void;
}

const TournamentItem: React.FC<TournamentItemProps> = ({ tournament, onPress }) => {
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

  return (
    <TouchableOpacity style={styles.tournamentItem} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.tournamentHeader}>
        <Text style={styles.tournamentNumber}>#{tournament.No}</Text>
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

const TournamentList: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TournamentType>('BPT');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Always load active tournaments with details and apply type filter
      const tournamentList = await VisApiService.getTournamentListWithDetails({ 
        currentlyActive: true, 
        tournamentType: selectedType 
      });
      
      setTournaments(tournamentList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      Alert.alert('Error', 'Failed to load tournaments');
    } finally {
      setLoading(false);
    }
  }, [selectedType]);

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const renderTournament = ({ item }: { item: Tournament }) => (
    <TournamentItem 
      tournament={item} 
      onPress={() => setSelectedTournament(item)} 
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

  // Show tournament detail if a tournament is selected
  if (selectedTournament) {
    return (
      <TournamentDetail 
        tournament={selectedTournament} 
        onBack={() => setSelectedTournament(null)} 
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <Text style={styles.loadingText}>Loading tournaments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.errorSubtext}>Please check your internet connection</Text>
      </View>
    );
  }

  const getSubtitle = () => {
    if (tournaments.length === 0) return 'No active tournaments found. Showing upcoming tournaments when available.';
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if any tournaments are actually happening today
    const happeningNow = tournaments.filter(t => {
      if (!t.StartDate || !t.EndDate) return false;
      try {
        const start = new Date(t.StartDate);
        const end = new Date(t.EndDate);
        return start <= today && today <= end;
      } catch {
        return false;
      }
    });
    
    if (happeningNow.length > 0) {
      return `${happeningNow.length} tournament${happeningNow.length > 1 ? 's' : ''} happening now`;
    }
    
    // Check if these are future tournaments
    const futureTournaments = tournaments.filter(t => {
      if (!t.StartDate) return false;
      try {
        const start = new Date(t.StartDate);
        return start > today;
      } catch {
        return false;
      }
    });
    
    if (futureTournaments.length > 0) {
      return `${futureTournaments.length} upcoming tournament${futureTournaments.length > 1 ? 's' : ''}`;
    }
    
    return `${tournaments.length} tournament${tournaments.length > 1 ? 's' : ''}`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Active Tournaments</Text>
      <Text style={styles.subtitle}>
        {getSubtitle()}
      </Text>
      
      {renderFilterTabs()}
      
      <FlatList
        data={tournaments}
        renderItem={renderTournament}
        keyExtractor={(item) => item.No}
        style={styles.list}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 18,
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  tournamentItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tournamentNumber: {
    fontSize: 12,
    color: '#0066cc',
    fontWeight: 'bold',
  },
  tournamentCode: {
    fontSize: 12,
    color: '#999',
    fontFamily: 'monospace',
  },
  tournamentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  tournamentLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  tournamentDate: {
    fontSize: 12,
    color: '#999',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0066cc',
    backgroundColor: 'transparent',
  },
  activeFilterButton: {
    backgroundColor: '#0066cc',
  },
  filterButtonText: {
    color: '#0066cc',
    fontWeight: '500',
    fontSize: 14,
  },
  activeFilterButtonText: {
    color: '#fff',
  },
});

export default TournamentList;