import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { TournamentStorageService, UserPreferences } from '../services/TournamentStorageService';
import { VisApiService } from '../services/visApi';
import { AssignmentStatusProvider, useAssignmentStatus } from '../hooks/useAssignmentStatus';
import { StatusIndicator } from '../components/Status/StatusIndicator';
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';
import { designTokens } from '../theme/tokens';

interface RefereeFromDB {
  No: string;
  Name: string;
  FederationCode?: string;
  Level?: string;
  isSelected?: boolean;
}

interface RefereeProfile {
  refereeNo: string;
  name: string;
  certificationLevel: string;
  federationCode: string;
  languages: string[];
}

const RefereeSettingsScreenContent: React.FC = () => {
  const router = useRouter();
  const [profile, setProfile] = useState<RefereeProfile>({
    refereeNo: '',
    name: '',
    certificationLevel: '',
    federationCode: '',
    languages: [],
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    notificationsEnabled: true,
    onboardingCompleted: true,
  });
  const [loading, setLoading] = useState(true);
  const [refereeList, setRefereeList] = useState<RefereeFromDB[]>([]);
  const [loadingReferees, setLoadingReferees] = useState(false);
  const [showRefereeList, setShowRefereeList] = useState(false);
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null);

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

  // Additional status notification preferences
  const [statusNotifications, setStatusNotifications] = useState({
    urgencyAlerts: true,
    statusChanges: true,
    offlineSync: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load user preferences
      const userPrefs = await TournamentStorageService.getUserPreferences();
      setPreferences(userPrefs);
      
      // Load selected tournament
      const tournament = await TournamentStorageService.getSelectedTournament();
      if (tournament) {
        setSelectedTournament(tournament.No);
      }
      
      // Load saved referee profile
      const savedProfile = await loadSavedRefereeProfile();
      if (savedProfile) {
        setProfile(savedProfile);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadSavedRefereeProfile = async (): Promise<RefereeProfile | null> => {
    try {
      // TODO: Load from secure storage/AsyncStorage
      // For now return null, will be implemented when referee is selected from list
      return null;
    } catch (error) {
      console.error('Failed to load saved referee profile:', error);
      return null;
    }
  };

  const loadRefereeList = async () => {
    if (!selectedTournament) {
      Alert.alert('Error', 'No tournament selected');
      return;
    }

    setLoadingReferees(true);
    try {
      console.log(`Loading referee list for tournament ${selectedTournament}...`);
      
      // Get matches for the tournament to extract referee information
      const matches = await VisApiService.fetchMatchesDirectFromAPI(selectedTournament);
      
      // Extract unique referees from matches
      const refereeMap = new Map<string, RefereeFromDB>();
      
      matches.forEach(match => {
        // Add Referee 1 if present
        if (match.NoReferee1 && match.Referee1Name) {
          refereeMap.set(match.NoReferee1, {
            No: match.NoReferee1,
            Name: match.Referee1Name,
            FederationCode: match.Referee1FederationCode,
          });
        }
        
        // Add Referee 2 if present
        if (match.NoReferee2 && match.Referee2Name) {
          refereeMap.set(match.NoReferee2, {
            No: match.NoReferee2,
            Name: match.Referee2Name,
            FederationCode: match.Referee2FederationCode,
          });
        }
      });
      
      const referees = Array.from(refereeMap.values()).sort((a, b) => a.Name.localeCompare(b.Name));
      console.log(`Found ${referees.length} referees in tournament ${selectedTournament}`);
      referees.forEach(ref => console.log(`- ${ref.Name} (${ref.No}) [${ref.FederationCode || 'N/A'}]`));
      
      setRefereeList(referees);
      setShowRefereeList(true);
    } catch (error) {
      console.error('Failed to load referee list:', error);
      Alert.alert('Error', 'Failed to load referee list. Please check your connection and try again.');
    } finally {
      setLoadingReferees(false);
    }
  };

  const handleSelectReferee = async (referee: RefereeFromDB) => {
    try {
      const updatedProfile: RefereeProfile = {
        refereeNo: referee.No,
        name: referee.Name,
        federationCode: referee.FederationCode || '',
        certificationLevel: referee.Level || '',
        languages: [],
      };
      
      setProfile(updatedProfile);
      setShowRefereeList(false);
      
      // TODO: Save to secure storage
      console.log('Selected referee:', updatedProfile);
      Alert.alert('Success', `Selected referee: ${referee.Name}`);
    } catch (error) {
      console.error('Failed to select referee:', error);
      Alert.alert('Error', 'Failed to select referee');
    }
  };

  const handleSaveProfile = async () => {
    try {
      // TODO: Save referee profile to storage/API
      console.log('Saving referee profile:', profile);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    }
  };

  const handleToggleNotifications = async (enabled: boolean) => {
    try {
      await TournamentStorageService.updatePreference('notificationsEnabled', enabled);
      setPreferences(prev => ({ ...prev, notificationsEnabled: enabled }));
    } catch (error) {
      console.error('Failed to update notification setting:', error);
      Alert.alert('Error', 'Failed to update notification setting');
    }
  };

  // Handle status notification preferences
  const handleToggleStatusNotification = (type: keyof typeof statusNotifications, enabled: boolean) => {
    setStatusNotifications(prev => ({ ...prev, [type]: enabled }));
    // TODO: Save to storage or sync with assignment status service
    console.log(`Status notification ${type} set to:`, enabled);
  };

  // Handle status bar press
  const handleStatusPress = () => {
    if (currentAssignmentStatus) {
      router.push('/my-assignments');
    }
  };

  // Handle assignment status data management  
  const handleClearStatusData = () => {
    Alert.alert(
      'Clear Assignment Status Data',
      'This will clear all assignment status tracking data. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            // TODO: Clear assignment status data
            refreshStatuses();
            Alert.alert('Success', 'Assignment status data cleared.');
          },
        },
      ]
    );
  };

  const handleResetApp = async () => {
    Alert.alert(
      'Reset App Data',
      'This will clear all your settings and tournament selection. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              await TournamentStorageService.clearAllData();
              Alert.alert('Success', 'App data cleared. Please restart the app.');
            } catch (error) {
              Alert.alert('Error', 'Failed to reset app data');
            }
          },
        },
      ]
    );
  };

  const renderRefereeListModal = () => {
    if (!showRefereeList) return null;

    return (
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Your Referee Profile</Text>
            <TouchableOpacity onPress={() => setShowRefereeList(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {loadingReferees ? (
            <View style={styles.modalLoadingContainer}>
              <ActivityIndicator size="large" color="#FF6B35" />
              <Text style={styles.loadingText}>Loading referee list...</Text>
            </View>
          ) : (
            <FlatList
              data={refereeList}
              keyExtractor={(item) => item.No}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.refereeItem}
                  onPress={() => handleSelectReferee(item)}
                >
                  <View style={styles.refereeInfo}>
                    <Text style={styles.refereeName}>{item.Name}</Text>
                    <Text style={styles.refereeDetails}>
                      #{item.No} • {item.FederationCode || 'N/A'}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              style={styles.refereeList}
            />
          )}
        </View>
      </View>
    );
  };

  const renderProfileSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Referee Profile</Text>
      
      {!selectedTournament ? (
        <Text style={styles.warningText}>
          Please select a tournament first to load the referee list.
        </Text>
      ) : (
        <>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Selected Referee</Text>
            {profile.name ? (
              <View style={styles.selectedRefereeCard}>
                <Text style={styles.selectedRefereeName}>{profile.name}</Text>
                <Text style={styles.selectedRefereeDetails}>
                  #{profile.refereeNo} • {profile.federationCode || 'N/A'}
                </Text>
              </View>
            ) : (
              <Text style={styles.noRefereeSelected}>No referee selected</Text>
            )}
            
            <TouchableOpacity
              style={styles.selectRefereeButton}
              onPress={loadRefereeList}
              disabled={loadingReferees}
            >
              {loadingReferees ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.selectRefereeButtonText}>
                  {profile.name ? 'Change Referee' : 'Select from Tournament Referee List'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {profile.name && (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Federation Code</Text>
                <Text style={styles.readOnlyText}>{profile.federationCode || 'N/A'}</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Referee Number</Text>
                <Text style={styles.readOnlyText}>#{profile.refereeNo}</Text>
              </View>
            </>
          )}

          {profile.name && (
            <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
              <Text style={styles.saveButtonText}>Save Referee Selection</Text>
            </TouchableOpacity>
          )}
        </>
      )}
    </View>
  );

  const renderAssignmentStatusSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Assignment Status</Text>
      
      {/* Current Status Display */}
      {currentAssignmentStatus ? (
        <View style={styles.statusDisplay}>
          <StatusIndicator
            type={currentAssignmentStatus.status}
            size="large"
            variant="prominent"
            showIcon={true}
            showText={true}
            customLabel={`Court ${currentAssignmentStatus.courtNumber}`}
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
          
          {/* Network Status */}
          <View style={styles.networkStatusDisplay}>
            <Text style={styles.networkLabel}>Status Sync:</Text>
            <Text style={[styles.networkValue, { 
              color: isOnline ? designTokens.colors.success : designTokens.colors.error 
            }]}>
              {isOnline ? (syncStatus === 'synced' ? '✅ Synced' : '🔄 Syncing...') : '📴 Offline'}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.noStatusText}>No active assignment status</Text>
      )}
      
      {/* Status Management Actions */}
      <TouchableOpacity style={styles.statusAction} onPress={() => router.push('/my-assignments')}>
        <Text style={styles.statusActionText}>View All Assignments</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.statusAction, styles.dangerStatusAction]} onPress={handleClearStatusData}>
        <Text style={[styles.statusActionText, styles.dangerActionText]}>Clear Status Data</Text>
      </TouchableOpacity>
    </View>
  );

  const renderPreferencesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Notification Preferences</Text>
      
      <View style={styles.preferenceRow}>
        <View style={styles.preferenceInfo}>
          <Text style={styles.preferenceTitle}>Match Notifications</Text>
          <Text style={styles.preferenceDescription}>
            Get notified when your next match is about to start
          </Text>
        </View>
        <Switch
          value={preferences.notificationsEnabled}
          onValueChange={handleToggleNotifications}
          trackColor={{ false: '#ccc', true: designTokens.colors.accent }}
          thumbColor={preferences.notificationsEnabled ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.preferenceRow}>
        <View style={styles.preferenceInfo}>
          <Text style={styles.preferenceTitle}>Urgency Alerts</Text>
          <Text style={styles.preferenceDescription}>
            Critical warnings for time-sensitive assignments
          </Text>
        </View>
        <Switch
          value={statusNotifications.urgencyAlerts}
          onValueChange={(enabled) => handleToggleStatusNotification('urgencyAlerts', enabled)}
          trackColor={{ false: '#ccc', true: designTokens.colors.error }}
          thumbColor={statusNotifications.urgencyAlerts ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.preferenceRow}>
        <View style={styles.preferenceInfo}>
          <Text style={styles.preferenceTitle}>Status Change Alerts</Text>
          <Text style={styles.preferenceDescription}>
            Notifications when assignment status changes
          </Text>
        </View>
        <Switch
          value={statusNotifications.statusChanges}
          onValueChange={(enabled) => handleToggleStatusNotification('statusChanges', enabled)}
          trackColor={{ false: '#ccc', true: designTokens.colors.secondary }}
          thumbColor={statusNotifications.statusChanges ? '#fff' : '#f4f3f4'}
        />
      </View>

      <View style={styles.preferenceRow}>
        <View style={styles.preferenceInfo}>
          <Text style={styles.preferenceTitle}>Offline Sync Alerts</Text>
          <Text style={styles.preferenceDescription}>
            Notifications about offline data sync status
          </Text>
        </View>
        <Switch
          value={statusNotifications.offlineSync}
          onValueChange={(enabled) => handleToggleStatusNotification('offlineSync', enabled)}
          trackColor={{ false: '#ccc', true: designTokens.colors.warning }}
          thumbColor={statusNotifications.offlineSync ? '#fff' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderAppSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>App Management</Text>
      
      <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/tournament-selection')}>
        <Text style={styles.actionButtonText}>Switch Tournament</Text>
      </TouchableOpacity>
      
      <TouchableOpacity style={[styles.actionButton, styles.dangerButton]} onPress={handleResetApp}>
        <Text style={[styles.actionButtonText, styles.dangerButtonText]}>Reset App Data</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <NavigationHeader
          title="Settings"
          showBackButton={true}
          showStatusBar={true}
          onStatusPress={handleStatusPress}
        />
        <View style={styles.centerContainer}>
          <Text>Loading settings...</Text>
        </View>
        <BottomTabNavigation currentTab="settings" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <NavigationHeader
        title="Settings"
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
        {renderAssignmentStatusSection()}
        {renderProfileSection()}
        {renderPreferencesSection()}
        {renderAppSection()}
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>Referee Tournament App v1.0</Text>
          <Text style={styles.footerText}>Built for beach volleyball referees</Text>
        </View>
      </ScrollView>
      
      {renderRefereeListModal()}
      <BottomTabNavigation currentTab="settings" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#FF6B35',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  preferenceInfo: {
    flex: 1,
    marginRight: 16,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionButton: {
    backgroundColor: '#4A90A4',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#dc3545',
  },
  dangerButtonText: {
    color: '#fff',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  
  // Referee selection styles
  warningText: {
    fontSize: 14,
    color: '#f59e0b',
    textAlign: 'center',
    fontStyle: 'italic',
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 8,
  },
  selectedRefereeCard: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#0ea5e9',
    marginBottom: 8,
  },
  selectedRefereeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c4a6e',
  },
  selectedRefereeDetails: {
    fontSize: 14,
    color: '#075985',
    marginTop: 4,
  },
  noRefereeSelected: {
    fontSize: 14,
    color: '#6b7280',
    fontStyle: 'italic',
    padding: 12,
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 8,
  },
  selectRefereeButton: {
    backgroundColor: '#0ea5e9',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  selectRefereeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  readOnlyText: {
    fontSize: 16,
    color: '#374151',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1B365D',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    paddingLeft: 16,
  },
  modalLoadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  refereeList: {
    maxHeight: 400,
  },
  refereeItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  refereeInfo: {
    flex: 1,
  },
  refereeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  refereeDetails: {
    fontSize: 14,
    color: '#6b7280',
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
  
  statusDisplay: {
    alignItems: 'center',
    marginBottom: designTokens.spacing.md,
  },
  
  statusGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: designTokens.spacing.md,
    gap: designTokens.spacing.sm,
  },
  
  statusItem: {
    flex: 1,
    alignItems: 'center',
    padding: designTokens.spacing.sm,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
  },
  
  statusCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: designTokens.colors.primary,
    marginBottom: 4,
  },
  
  statusLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
    textTransform: 'uppercase',
  },
  
  networkStatusDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.xs,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
  },
  
  networkLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.textPrimary,
  },
  
  networkValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  noStatusText: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    fontStyle: 'italic',
    padding: designTokens.spacing.md,
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
    marginBottom: designTokens.spacing.md,
  },
  
  statusAction: {
    backgroundColor: designTokens.colors.secondary,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  
  statusActionText: {
    color: designTokens.colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  
  dangerStatusAction: {
    backgroundColor: designTokens.colors.error,
  },
  
  dangerActionText: {
    color: designTokens.colors.background,
  },
});

// Wrapper component with AssignmentStatusProvider
const RefereeSettingsScreen: React.FC = () => {
  return (
    <AssignmentStatusProvider>
      <RefereeSettingsScreenContent />
    </AssignmentStatusProvider>
  );
};

export default RefereeSettingsScreen;