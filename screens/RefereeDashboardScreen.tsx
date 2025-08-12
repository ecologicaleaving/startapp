import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Tournament } from '../types/tournament';
import { TournamentStorageService } from '../services/TournamentStorageService';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';

const RefereeDashboardScreen: React.FC = () => {
  const { tournamentData } = useLocalSearchParams<{ tournamentData: string }>();
  const router = useRouter();
  const [tournament, setTournament] = React.useState<Tournament>({} as Tournament);
  const [loading, setLoading] = React.useState(true);

  // Load tournament from params or storage
  React.useEffect(() => {
    const loadTournament = async () => {
      try {
        // First try to get from navigation params
        if (tournamentData) {
          console.log('RefereeDashboard: Loading tournament from navigation params');
          const parsedTournament = JSON.parse(tournamentData) as Tournament;
          setTournament(parsedTournament);
          setLoading(false);
          return;
        }

        // Fallback to storage
        console.log('RefereeDashboard: Loading tournament from storage');
        const storedTournament = await TournamentStorageService.getSelectedTournament();
        if (storedTournament) {
          console.log(`RefereeDashboard: Loaded tournament ${storedTournament.No} from storage`);
          setTournament(storedTournament);
        } else {
          console.log('RefereeDashboard: No tournament found in storage');
          // Navigate back to tournament selection if no tournament is available
          router.replace('/tournament-selection');
          return;
        }
      } catch (error) {
        console.error('RefereeDashboard: Failed to load tournament:', error);
        // Navigate back to tournament selection on error
        router.replace('/tournament-selection');
        return;
      } finally {
        setLoading(false);
      }
    };

    loadTournament();
  }, [tournamentData, router]);

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
    return tournament.Location || tournament.City || tournament.CountryName || 'Location TBD';
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
    return formatDate(tournament.StartDate) || formatDate(tournament.EndDate) || 'Dates TBD';
  };

  const handleSwitchTournament = () => {
    console.log('RefereeDashboard: Switching tournament - navigating to tournament selection');
    router.push('/tournament-selection');
  };

  const handleSettings = () => {
    router.push('/referee-settings');
  };

  const handleAssignments = () => {
    router.push('/my-assignments');
  };

  const handleResults = () => {
    router.push('/match-results');
  };

  const dashboardItems = [
    {
      title: 'Assignments',
      icon: '📋',
      description: 'View your match assignments',
      onPress: handleAssignments,
    },
    {
      title: 'Results',
      icon: '🏆',
      description: 'Check latest match results',
      onPress: handleResults,
    },
    {
      title: 'Court Information',
      icon: '🏐',
      description: 'View court details and updates',
      onPress: () => console.log('Courts pressed'),
    },
    {
      title: 'Settings',
      icon: '⚙️',
      description: 'Adjust your preferences',
      onPress: handleSettings,
    },
  ];

  if (loading) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="Referee Dashboard"
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <Text>Loading tournament...</Text>
        </View>
        <BottomTabNavigation currentTab="tournament" />
      </View>
    );
  }

  if (!tournament.No) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="Referee Dashboard"
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <Text>No tournament selected</Text>
        </View>
        <BottomTabNavigation currentTab="tournament" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Referee Dashboard"
        showBackButton={true}
        rightComponent={
          <TouchableOpacity style={styles.switchButton} onPress={handleSwitchTournament}>
            <Text style={styles.switchButtonText}>Switch</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Tournament Info Card */}
        <View style={styles.tournamentCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.currentTournamentLabel}>Current Tournament</Text>
            <Text style={styles.tournamentNumber}>#{tournament.No}</Text>
          </View>
          
          <Text style={styles.tournamentName}>
            {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
          </Text>
          
          <View style={styles.tournamentDetails}>
            <Text style={styles.tournamentLocation}>📍 {getLocation()}</Text>
            <Text style={styles.tournamentDate}>📅 {getDateRange()}</Text>
          </View>
        </View>

        {/* Dashboard Items */}
        <View style={styles.dashboardGrid}>
          {dashboardItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.dashboardItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <Text style={styles.dashboardIcon}>{item.icon}</Text>
              <Text style={styles.dashboardTitle}>{item.title}</Text>
              <Text style={styles.dashboardDescription}>{item.description}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Quick Information</Text>
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Welcome to the referee interface! This dashboard provides quick access to your match assignments, 
              results, and court information optimized for outdoor visibility.
            </Text>
          </View>
        </View>
      </ScrollView>
      
      <BottomTabNavigation currentTab="tournament" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  switchButton: {
    backgroundColor: '#4A90A4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: 36,
    justifyContent: 'center',
  },
  switchButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    margin: 24,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
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
  currentTournamentLabel: {
    fontSize: 14,
    color: '#4A90A4',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tournamentNumber: {
    fontSize: 16,
    color: '#4A90A4',
    fontWeight: 'bold',
  },
  tournamentName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 12,
    lineHeight: 28,
  },
  tournamentDetails: {
    gap: 4,
  },
  tournamentLocation: {
    fontSize: 16,
    color: '#4A90A4',
  },
  tournamentDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  dashboardGrid: {
    paddingHorizontal: 24,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  dashboardItem: {
    backgroundColor: '#FFFFFF',
    width: '47%',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
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
    minHeight: 120,
    justifyContent: 'center',
  },
  dashboardIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  dashboardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B365D',
    textAlign: 'center',
    marginBottom: 4,
  },
  dashboardDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 16,
  },
  infoSection: {
    margin: 24,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoText: {
    fontSize: 16,
    color: '#4A90A4',
    lineHeight: 24,
  },
});

export default RefereeDashboardScreen;