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
import NavigationHeader from '../components/navigation/NavigationHeader';
import BottomTabNavigation from '../components/navigation/BottomTabNavigation';

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

const RefereeSettingsScreen: React.FC = () => {
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

  const renderPreferencesSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>App Preferences</Text>
      
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
          trackColor={{ false: '#ccc', true: '#FF6B35' }}
          thumbColor={preferences.notificationsEnabled ? '#fff' : '#f4f3f4'}
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
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
});

export default RefereeSettingsScreen;