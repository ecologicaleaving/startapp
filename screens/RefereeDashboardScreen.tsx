import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Tournament } from '../types/tournament';
import { TournamentStorageService } from '../services/TournamentStorageService';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import { CurrentAssignmentCard, AssignmentTimeline } from '../components/Dashboard';
import { useCurrentAssignment } from '../hooks/useCurrentAssignment';
import { StatusIndicator } from '../components/Status';
import { designTokens } from '../theme/tokens';
import { getEmergencyContacts, EmergencyContact } from '../utils/assignmentDashboard';

const RefereeDashboardScreen: React.FC = () => {
  const { tournamentData } = useLocalSearchParams<{ tournamentData: string }>();
  const router = useRouter();
  const [tournament, setTournament] = React.useState<Tournament>({} as Tournament);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  
  // Assignment management
  const {
    currentAssignment,
    upcomingAssignments,
    loading: assignmentsLoading,
    error: assignmentsError,
    refreshAssignments,
  } = useCurrentAssignment();
  
  // Emergency contacts
  const emergencyContacts = React.useMemo(() => getEmergencyContacts(), []);

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
  
  const handleViewAssignmentDetails = () => {
    console.log('Viewing assignment details');
    router.push('/my-assignments');
  };
  
  const handleEnterResults = () => {
    console.log('Entering match results');
    router.push('/match-results');
  };
  
  const handleAssignmentPress = (assignment: any) => {
    console.log('Assignment pressed:', assignment.id);
    router.push('/my-assignments');
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAssignments();
    } finally {
      setRefreshing(false);
    }
  };
  
  const renderEmergencyContact = (contact: EmergencyContact, index: number) => (
    <TouchableOpacity key={index} style={styles.emergencyContact}>
      <View style={styles.emergencyContactInfo}>
        <Text style={styles.emergencyContactName}>{contact.name}</Text>
        <Text style={styles.emergencyContactRole}>{contact.role}</Text>
      </View>
      <Text style={styles.emergencyContactPhone}>{contact.phone}</Text>
    </TouchableOpacity>
  );

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

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[designTokens.colors.accent]}
            tintColor={designTokens.colors.accent}
          />
        }
      >
        {/* Assignment Status Bar */}
        <View style={styles.statusBar}>
          <StatusIndicator
            type={currentAssignment ? 'current' : 'completed'}
            size="medium"
            variant="prominent"
            showIcon={true}
            showText={true}
            customLabel={currentAssignment ? 'Active Assignment' : 'No Active Assignment'}
          />
          <Text style={styles.tournamentContext}>
            {tournament.Title || `Tournament ${tournament.No}`}
          </Text>
        </View>

        {/* Current Assignment Card - Primary Focal Point */}
        {currentAssignment ? (
          <CurrentAssignmentCard
            assignment={currentAssignment}
            onViewDetails={handleViewAssignmentDetails}
            onEnterResults={handleEnterResults}
          />
        ) : (
          <View style={styles.noCurrentAssignment}>
            <Text style={styles.noAssignmentTitle}>No Current Assignment</Text>
            <Text style={styles.noAssignmentText}>
              You have no immediate assignments. Check your upcoming schedule below.
            </Text>
            <TouchableOpacity style={styles.viewScheduleButton} onPress={handleAssignments}>
              <Text style={styles.viewScheduleButtonText}>View Full Schedule</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Assignment Timeline - Secondary Information */}
        <AssignmentTimeline
          assignments={[...upcomingAssignments, ...(currentAssignment ? [currentAssignment] : [])]}
          currentAssignmentId={currentAssignment?.id}
          onAssignmentPress={handleAssignmentPress}
        />

        {/* Quick Actions Grid */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleAssignments}>
            <Text style={styles.quickActionIcon}>📋</Text>
            <Text style={styles.quickActionText}>My Assignments</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleResults}>
            <Text style={styles.quickActionIcon}>🏆</Text>
            <Text style={styles.quickActionText}>Results</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickActionButton} onPress={handleSettings}>
            <Text style={styles.quickActionIcon}>⚙️</Text>
            <Text style={styles.quickActionText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Emergency Information - Always Accessible */}
        <View style={styles.emergencySection}>
          <Text style={styles.emergencySectionTitle}>Emergency Contacts</Text>
          <View style={styles.emergencyContacts}>
            {emergencyContacts.slice(0, 2).map(renderEmergencyContact)}
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
    backgroundColor: designTokens.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: designTokens.spacing.lg,
  },
  switchButton: {
    backgroundColor: designTokens.colors.secondary,
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: 6,
    borderRadius: 6,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  switchButtonText: {
    color: designTokens.colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: designTokens.spacing.xl,
  },
  // Assignment Status Bar - NEW
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
  },
  tournamentContext: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: designTokens.spacing.sm,
  },
  // No Current Assignment State - NEW
  noCurrentAssignment: {
    backgroundColor: designTokens.colors.background,
    margin: designTokens.spacing.md,
    padding: designTokens.spacing.xl,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: designTokens.colors.textSecondary,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  noAssignmentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: designTokens.spacing.sm,
  },
  noAssignmentText: {
    fontSize: 16,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: designTokens.spacing.md,
  },
  viewScheduleButton: {
    backgroundColor: designTokens.colors.secondary,
    paddingHorizontal: designTokens.spacing.lg,
    paddingVertical: designTokens.spacing.sm,
    borderRadius: 8,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  viewScheduleButtonText: {
    color: designTokens.colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  // Quick Actions Grid - UPDATED
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: designTokens.spacing.md,
    marginVertical: designTokens.spacing.sm,
    gap: designTokens.spacing.sm,
  },
  quickActionButton: {
    flex: 1,
    backgroundColor: designTokens.colors.background,
    padding: designTokens.spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget * 1.5,
    justifyContent: 'center',
    shadowColor: designTokens.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    textAlign: 'center',
  },
  // Emergency Section - NEW
  emergencySection: {
    backgroundColor: designTokens.colors.background,
    margin: designTokens.spacing.md,
    padding: designTokens.spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: designTokens.colors.error,
    borderStyle: 'solid',
  },
  emergencySectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: designTokens.colors.error,
    marginBottom: designTokens.spacing.sm,
    textAlign: 'center',
  },
  emergencyContacts: {
    gap: designTokens.spacing.xs,
  },
  emergencyContact: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: designTokens.spacing.xs,
    paddingHorizontal: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
  },
  emergencyContactInfo: {
    flex: 1,
  },
  emergencyContactName: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  emergencyContactRole: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  emergencyContactPhone: {
    fontSize: 14,
    fontWeight: 'bold',
    color: designTokens.colors.error,
  },
});

export default RefereeDashboardScreen;