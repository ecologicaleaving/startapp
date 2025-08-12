import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator,
  Alert,
  SafeAreaView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { RefereeAssignmentStatus } from '../types/RefereeAssignments';
import { RefereeAssignmentsService } from '../services/RefereeAssignmentsService';
import { TournamentStorageService } from '../services/TournamentStorageService';
import { CurrentAssignmentCard } from '../components/referee/CurrentAssignmentCard';
import { UpcomingAssignmentCard } from '../components/referee/UpcomingAssignmentCard';
import { CompletedAssignmentCard } from '../components/referee/CompletedAssignmentCard';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';

export const MyAssignmentsScreen: React.FC = () => {
  const router = useRouter();
  const [assignments, setAssignments] = useState<RefereeAssignmentStatus>({
    current: [],
    upcoming: [],
    completed: [],
    cancelled: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);

  // Auto-refresh timer
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const loadAssignments = useCallback(async (forceRefresh = false) => {
    try {
      setError(null);
      
      // Get selected tournament
      const tournament = await TournamentStorageService.getSelectedTournament();
      if (!tournament) {
        setError('No tournament selected. Please select a tournament first.');
        setIsLoading(false);
        return;
      }

      setSelectedTournament(tournament.No);

      // Check if referee profile exists
      const referee = await RefereeAssignmentsService.getCurrentReferee();
      if (!referee) {
        // For now, we'll use a default referee profile
        // In a real app, this would prompt the user to set up their profile
        await RefereeAssignmentsService.setCurrentReferee({
          name: 'Demo Referee',
          id: 'demo_referee_001'
        });
      }

      const assignmentsData = await RefereeAssignmentsService.getRefereeAssignments(
        tournament.No,
        forceRefresh
      );
      
      setAssignments(assignmentsData);
      
      // Set up auto-refresh based on assignment status
      const interval = RefereeAssignmentsService.getRefreshInterval(assignmentsData);
      setupAutoRefresh(interval);
      
    } catch (err) {
      console.error('Error loading assignments:', err);
      setError(err instanceof Error ? err.message : 'Failed to load assignments');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  const setupAutoRefresh = useCallback((interval: number) => {
    // Clear existing interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    // Set up new auto-refresh
    const newInterval = setInterval(() => {
      loadAssignments(true);
    }, interval);
    
    setRefreshInterval(newInterval);
  }, [refreshInterval, loadAssignments]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadAssignments(true);
  }, [loadAssignments]);

  const handleAssignmentPress = useCallback((assignment: any) => {
    // Navigate to assignment detail view
    router.push({
      pathname: '/assignment-detail',
      params: {
        assignmentData: JSON.stringify(assignment)
      }
    });
  }, [router]);

  // Load assignments when screen focuses
  useFocusEffect(
    useCallback(() => {
      loadAssignments();
      
      // Cleanup auto-refresh when screen loses focus
      return () => {
        if (refreshInterval) {
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
      };
    }, [loadAssignments])
  );

  // Initial load
  useEffect(() => {
    loadAssignments();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [refreshInterval]);

  if (isLoading && !isRefreshing) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="My Assignments"
          showBackButton={true}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading your assignments...</Text>
        </View>
        <BottomTabNavigation currentTab="assignments" />
      </View>
    );
  }

  if (error && !isRefreshing) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="My Assignments"
          showBackButton={true}
        />
        <ScrollView
          contentContainerStyle={styles.errorContainer}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
          }
        >
          <Text style={styles.errorTitle}>Unable to load assignments</Text>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.pullToRefreshText}>Pull down to retry</Text>
        </ScrollView>
        <BottomTabNavigation currentTab="assignments" />
      </View>
    );
  }

  const hasAnyAssignments = 
    assignments.current.length > 0 ||
    assignments.upcoming.length > 0 ||
    assignments.completed.length > 0;

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="My Assignments"
        showBackButton={true}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#3B82F6']}
            tintColor="#3B82F6"
          />
        }
        showsVerticalScrollIndicator={false}
        accessibilityLabel={error ? "Error retry" : "Assignments list"}
      >
        {/* Tournament Info */}
        {selectedTournament && (
          <View style={styles.tournamentHeader}>
            <Text style={styles.tournamentText}>Tournament: {selectedTournament}</Text>
          </View>
        )}

        {!hasAnyAssignments ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No assignments found</Text>
            <Text style={styles.emptyText}>
              You don't have any referee assignments for this tournament yet.
            </Text>
            <Text style={styles.pullToRefreshText}>Pull down to refresh</Text>
          </View>
        ) : (
          <>
            {/* Current Assignments */}
            {assignments.current.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Current Assignment</Text>
                {assignments.current.map((assignment) => (
                  <CurrentAssignmentCard
                    key={assignment.matchNo}
                    assignment={assignment}
                    onPress={() => handleAssignmentPress(assignment)}
                  />
                ))}
              </View>
            )}

            {/* Upcoming Assignments */}
            {assignments.upcoming.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Upcoming Assignments ({assignments.upcoming.length})
                </Text>
                {assignments.upcoming.map((assignment) => (
                  <UpcomingAssignmentCard
                    key={assignment.matchNo}
                    assignment={assignment}
                    onPress={() => handleAssignmentPress(assignment)}
                  />
                ))}
              </View>
            )}

            {/* Completed Assignments */}
            {assignments.completed.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Completed ({assignments.completed.length})
                </Text>
                {assignments.completed.slice(0, 10).map((assignment) => (
                  <CompletedAssignmentCard
                    key={assignment.matchNo}
                    assignment={assignment}
                    onPress={() => handleAssignmentPress(assignment)}
                  />
                ))}
                {assignments.completed.length > 10 && (
                  <Text style={styles.showMoreText}>
                    Showing 10 of {assignments.completed.length} completed assignments
                  </Text>
                )}
              </View>
            )}

            {/* Cancelled Assignments */}
            {assignments.cancelled.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  Cancelled ({assignments.cancelled.length})
                </Text>
                {assignments.cancelled.map((assignment) => (
                  <CompletedAssignmentCard
                    key={assignment.matchNo}
                    assignment={assignment}
                    onPress={() => handleAssignmentPress(assignment)}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* Footer spacing */}
        <View style={styles.footer} />
      </ScrollView>
      <BottomTabNavigation currentTab="assignments" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#6B7280',
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    minHeight: 400,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  tournamentHeader: {
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tournamentText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    textAlign: 'center',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginHorizontal: 16,
    marginBottom: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  pullToRefreshText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 12,
    marginHorizontal: 16,
  },
  footer: {
    height: 40,
  },
});