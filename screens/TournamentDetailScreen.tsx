import React, { useState } from 'react';
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
import { TournamentStorageService } from '../services/TournamentStorageService';
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import { StatusIndicator } from '../components/Status/StatusIndicator';
import NavigationHeader from '../components/navigation/NavigationHeader';
import { designTokens } from '../theme/tokens';

const TournamentDetailScreenContent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
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
    allStatuses,
    statusCounts,
    isOnline,
    syncStatus,
    updateAssignmentStatus,
    getAssignmentsByStatus,
    refreshStatuses
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
      return `${start} to ${end}`;
    }
    return formatDate(tournament.StartDate) || formatDate(tournament.EndDate) || 'Dates TBD';
  };

  const getTournamentStatus = () => {
    if (!tournament.StartDate || !tournament.EndDate) return 'Scheduled';
    
    const now = new Date();
    const start = new Date(tournament.StartDate);
    const end = new Date(tournament.EndDate);
    
    if (start <= now && now <= end) {
      return 'Live';
    } else if (start > now) {
      return 'Upcoming';
    } else {
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

  // Handle status bar press - navigate to assignments if available
  const handleStatusPress = () => {
    if (currentAssignmentStatus) {
      router.push('/my-assignments');
    }
  };

  // Check if this tournament has active assignments
  const hasActiveAssignments = () => {
    if (!currentAssignmentStatus) return false;
    // Simple check - could be enhanced to check tournament context
    return statusCounts.current > 0 || statusCounts.upcoming > 0;
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
            <View style={styles.tournamentInfo}>
              <Text style={styles.tournamentNumber}>#{tournament.No}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                <Text style={styles.statusText}>{getTournamentStatus().toUpperCase()}</Text>
              </View>
            </View>
            {tournament.Code && (
              <Text style={styles.tournamentCode}>{tournament.Code}</Text>
            )}
          </View>

          <Text style={styles.tournamentName}>
            {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
          </Text>

          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📍</Text>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Location</Text>
                <Text style={styles.detailValue}>{getLocation()}</Text>
              </View>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailIcon}>📅</Text>
              <View style={styles.detailTextContainer}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{getDateRange()}</Text>
              </View>
            </View>

            {tournament.Code && (
              <View style={styles.detailItem}>
                <Text style={styles.detailIcon}>🏆</Text>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Tournament Code</Text>
                  <Text style={styles.detailValue}>{tournament.Code}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Assignment Status Context */}
        {hasActiveAssignments() && (
          <View style={styles.statusSection}>
            <StatusIndicator
              type={currentAssignmentStatus?.status || 'current'}
              size="large"
              variant="prominent"
              showIcon={true}
              showText={true}
              customLabel="Assignment Status for This Tournament"
            />
            <View style={styles.statusGrid}>
              <View style={styles.statusItem}>
                <Text style={styles.statusCount}>{statusCounts.current}</Text>
                <Text style={styles.statusLabel}>Current</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusCount}>{statusCounts.upcoming}</Text>
                <Text style={styles.statusLabel}>Upcoming</Text>
              </View>
              <View style={styles.statusItem}>
                <Text style={styles.statusCount}>{statusCounts.completed}</Text>
                <Text style={styles.statusLabel}>Completed</Text>
              </View>
            </View>
            
            {!isOnline && (
              <View style={styles.offlineWarning}>
                <Text style={styles.offlineText}>
                  📴 Offline Mode - Assignment status may not be current
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Information Section */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>Tournament Information</Text>
          <Text style={styles.infoText}>
            By selecting this tournament, you'll have access to:
          </Text>
          <View style={styles.featureList}>
            <Text style={styles.featureItem}>• Match assignments and schedules</Text>
            <Text style={styles.featureItem}>• Real-time match results</Text>
            <Text style={styles.featureItem}>• Court information and updates</Text>
            <Text style={styles.featureItem}>• Assignment status tracking</Text>
            <Text style={styles.featureItem}>• Push notifications for upcoming matches</Text>
          </View>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tournamentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tournamentNumber: {
    fontSize: 18,
    color: '#4A90A4',
    fontWeight: 'bold',
    marginRight: 12,
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
  tournamentCode: {
    fontSize: 16,
    color: '#6B7280',
    fontFamily: 'monospace',
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
  infoSection: {
    margin: 24,
    padding: 20,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#4A90A4',
    marginBottom: 16,
    lineHeight: 24,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    fontSize: 16,
    color: '#4A90A4',
    lineHeight: 24,
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
  
  statusSection: {
    margin: 24,
    padding: 20,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: designTokens.colors.primary,
    alignItems: 'center',
    gap: designTokens.spacing.md,
  },
  
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    gap: designTokens.spacing.md,
  },
  
  statusItem: {
    flex: 1,
    alignItems: 'center',
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.colors.background,
    borderRadius: 8,
  },
  
  statusCount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: designTokens.colors.primary,
    marginBottom: 4,
  },
  
  statusLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
    textTransform: 'uppercase',
  },
  
  offlineWarning: {
    backgroundColor: designTokens.colors.error,
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: 8,
    alignSelf: 'stretch',
  },
  
  offlineText: {
    color: designTokens.colors.background,
    fontSize: 14,
    fontWeight: '500',
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