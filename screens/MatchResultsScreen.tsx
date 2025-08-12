import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MatchResultsService } from '../services/MatchResultsService';
import { TournamentStorageService } from '../services/TournamentStorageService';
import { LiveMatchCard } from '../components/referee/LiveMatchCard';
import { CompletedMatchCard } from '../components/referee/CompletedMatchCard';
import { MatchResult, MatchResultsStatus } from '../types/MatchResults';
import { useRouter } from 'expo-router';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';

export default function MatchResultsScreen() {
  const router = useRouter();
  const [matchResults, setMatchResults] = useState<MatchResultsStatus>({
    live: [],
    completed: [],
    scheduled: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Define refreshMatchResults first to avoid hoisting issues
  const refreshMatchResults = useCallback(async (silent = false) => {
    if (!selectedTournament) return;

    try {
      if (!silent) {
        setRefreshing(true);
      }
      setError(null);

      const results = await MatchResultsService.getMatchResults(selectedTournament, true);
      setMatchResults(results);
    } catch (error) {
      console.error('Failed to refresh match results:', error);
      if (!silent) {
        Alert.alert(
          'Refresh Failed',
          'Unable to refresh match results. Please check your connection.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      if (!silent) {
        setRefreshing(false);
      }
    }
  }, [selectedTournament]);

  // Load tournament context
  useEffect(() => {
    loadSelectedTournament();
  }, []);

  // Auto-refresh for live matches
  useEffect(() => {
    const liveMatchCount = matchResults.live?.length || 0;
    if (selectedTournament && liveMatchCount > 0) {
      const refreshInterval = MatchResultsService.getRefreshInterval(matchResults);
      
      const interval = setInterval(() => {
        refreshMatchResults(true); // Silent refresh for live updates
      }, refreshInterval);

      setAutoRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      // Clear interval when no live matches
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        setAutoRefreshInterval(null);
      }
    }
  }, [selectedTournament, matchResults.live?.length, refreshMatchResults]);

  // Clean up auto-refresh on component unmount
  useEffect(() => {
    return () => {
      if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
      }
    };
  }, [autoRefreshInterval]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (selectedTournament) {
        loadMatchResults(false);
      }
    }, [selectedTournament])
  );

  const loadSelectedTournament = async () => {
    try {
      console.log('MatchResults: Loading selected tournament...');
      const tournament = await TournamentStorageService.getSelectedTournament();
      if (tournament) {
        console.log(`MatchResults: Found tournament ${tournament.No} - ${tournament.Name || tournament.Title}`);
        setSelectedTournament(tournament.No); // Fixed: Use capital N
        await loadMatchResults(true);
      } else {
        console.log('MatchResults: No tournament selected');
        setError('No tournament selected. Please select a tournament first.');
        setLoading(false);
      }
    } catch (error) {
      console.error('MatchResults: Failed to load selected tournament:', error);
      setError('Failed to load tournament information');
      setLoading(false);
    }
  };

  const loadMatchResults = async (showLoading = true) => {
    if (!selectedTournament) {
      console.log('MatchResults: No tournament selected');
      if (showLoading) {
        setLoading(false);
      }
      return;
    }

    try {
      if (showLoading) {
        console.log('MatchResults: Setting loading to true');
        setLoading(true);
      }
      setError(null);

      console.log(`MatchResults: Loading match results for tournament ${selectedTournament}`);
      // Force refresh to ensure updated status processing takes effect
      const results = await MatchResultsService.getMatchResults(selectedTournament, true);
      console.log(`MatchResults: Loaded ${results.live.length} live matches, ${results.completed.length} completed matches`);
      
      // Check if we got sample data (for debugging)
      if (results.live.some(match => match.no === 'M001') || results.completed.some(match => match.no === 'M002')) {
        console.log('MatchResults: Using sample/fallback data due to network issues');
      }
      
      setMatchResults(results);
      console.log('MatchResults: Match results set successfully');
    } catch (error) {
      console.error('MatchResults: Failed to load match results:', error);
      console.error('MatchResults: Error details:', error instanceof Error ? error.message : String(error));
      
      // Try to provide fallback data or more specific error messaging
      if (error instanceof Error && error.message.includes('Premature close')) {
        setError('Network connection interrupted. Trying again...');
        // Retry once after a short delay
        setTimeout(() => {
          console.log('MatchResults: Retrying after network error...');
          loadMatchResults(false);
        }, 2000);
        return; // Don't set loading to false yet, retry is coming
      } else {
        setError('Failed to load match results. Please check your connection and try again.');
      }
    } finally {
      if (showLoading) {
        console.log('MatchResults: Setting loading to false');
        setLoading(false);
      }
    }
  };

  const handleMatchPress = (match: MatchResult) => {
    // Navigate to match detail screen
    router.push({
      pathname: '/match-detail',
      params: { matchNo: match.no, tournamentNo: match.tournamentNo },
    });
  };

  const renderLoadingState = () => (
    <View style={styles.centerContainer}>
      <ActivityIndicator size="large" color="#10B981" />
      <Text style={styles.loadingText}>Loading match results...</Text>
    </View>
  );

  const renderErrorState = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.errorText}>{error}</Text>
      <Text style={styles.errorSubtext}>Pull down to retry</Text>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.centerContainer}>
      <Text style={styles.emptyText}>No match results available</Text>
      <Text style={styles.emptySubtext}>
        {selectedTournament 
          ? 'No matches found for this tournament. Pull down to refresh.'
          : 'Please select a tournament first.'}
      </Text>
    </View>
  );

  const renderLiveMatchesSection = () => {
    const liveMatches = matchResults.live || [];
    console.log(`MatchResults: renderLiveMatchesSection called with ${liveMatches.length} live matches`);
    if (liveMatches.length === 0) {
      console.log('MatchResults: No live matches, returning null');
      return null;
    }

    console.log('MatchResults: Rendering live matches section');
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live Matches</Text>
          <View style={styles.liveIndicator}>
            <View style={styles.liveIndicatorDot} />
            <Text style={styles.liveIndicatorText}>{liveMatches.length} Live</Text>
          </View>
        </View>
        {liveMatches.map((match) => {
          console.log(`MatchResults: Rendering live match ${match.no}: ${match.teamAName} vs ${match.teamBName}`);
          return (
            <LiveMatchCard
              key={match.no}
              match={match}
              onPress={handleMatchPress}
            />
          );
        })}
      </View>
    );
  };

  const renderCompletedMatchesSection = () => {
    const completedMatches = matchResults.completed || [];
    console.log(`MatchResults: renderCompletedMatchesSection called with ${completedMatches.length} completed matches`);
    if (completedMatches.length === 0) {
      console.log('MatchResults: No completed matches, returning null');
      return null;
    }

    console.log('MatchResults: Rendering completed matches section');
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Completed Matches</Text>
        {completedMatches.map((match) => {
          console.log(`MatchResults: Rendering completed match ${match.no}: ${match.teamAName} vs ${match.teamBName}`);
          return (
            <CompletedMatchCard
              key={match.no}
              match={match}
              onPress={handleMatchPress}
            />
          );
        })}
      </View>
    );
  };

  // Debug match results structure
  console.log('MatchResults: Match results structure:', {
    live: matchResults.live,
    liveLength: matchResults.live?.length,
    completed: matchResults.completed,
    completedLength: matchResults.completed?.length,
    scheduled: matchResults.scheduled,
    scheduledLength: matchResults.scheduled?.length,
  });

  const hasAnyMatches = 
    (matchResults.live?.length || 0) > 0 || 
    (matchResults.completed?.length || 0) > 0 || 
    (matchResults.scheduled?.length || 0) > 0;

  // Debug current state
  console.log('MatchResults: Current render state:', {
    loading,
    refreshing,
    selectedTournament,
    hasAnyMatches,
    liveMatches: matchResults.live?.length || 0,
    completedMatches: matchResults.completed?.length || 0,
    scheduledMatches: matchResults.scheduled?.length || 0,
    error
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="Match Results"
          showBackButton={true}
        />
        {renderLoadingState()}
        <BottomTabNavigation currentTab="results" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Match Results"
        showBackButton={true}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => refreshMatchResults(false)}
            colors={['#10B981']}
            tintColor="#10B981"
            title="Pull to refresh"
            titleColor="#6B7280"
          />
        }
        accessibilityLabel="Match results list"
      >
        {(() => {
          console.log('MatchResults: Making render decision:', { error, hasAnyMatches });
          
          if (error && !hasAnyMatches) {
            console.log('MatchResults: Rendering error state');
            return renderErrorState();
          } else if (!hasAnyMatches) {
            console.log('MatchResults: Rendering empty state');
            return renderEmptyState();
          } else {
            console.log('MatchResults: Rendering match sections');
            return (
              <>
                {renderLiveMatchesSection()}
                {renderCompletedMatchesSection()}
                {/* Temporarily show scheduled matches for debugging */}
                {(matchResults.scheduled?.length || 0) > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Scheduled Matches ({matchResults.scheduled?.length})</Text>
                    <Text style={styles.debugText}>Debug: These should be completed matches with status code 15</Text>
                  </View>
                )}
              </>
            );
          }
        })()}
      </ScrollView>
      
      {/* Auto-refresh indicator for live matches */}
      {(matchResults.live?.length || 0) > 0 && (
        <View style={styles.autoRefreshIndicator}>
          <View style={styles.refreshIndicatorDot} />
          <Text style={styles.autoRefreshText}>Auto-refreshing every 30s</Text>
        </View>
      )}
      <BottomTabNavigation currentTab="results" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Extra space for auto-refresh indicator
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    minHeight: 400,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  liveIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 8,
  },
  liveIndicatorText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  autoRefreshIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(107, 114, 128, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 20,
  },
  refreshIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 8,
  },
  autoRefreshText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  debugText: {
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
});