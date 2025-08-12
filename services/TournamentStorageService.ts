import AsyncStorage from '@react-native-async-storage/async-storage';
import { Tournament } from '../types/tournament';

const STORAGE_KEYS = {
  SELECTED_TOURNAMENT: '@referee_selected_tournament',
  USER_PREFERENCES: '@referee_user_preferences',
  COURT_PREFERENCES: '@referee_court_preferences',
} as const;

export interface UserPreferences {
  selectedCourt?: string;
  notificationsEnabled: boolean;
  lastAppVersion?: string;
  onboardingCompleted: boolean;
}

export class TournamentStorageService {
  /**
   * Save the selected tournament to AsyncStorage
   */
  static async saveSelectedTournament(tournament: Tournament): Promise<void> {
    try {
      const tournamentData = JSON.stringify(tournament);
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_TOURNAMENT, tournamentData);
      console.log('Tournament saved to storage:', tournament.No);
    } catch (error) {
      console.error('Failed to save selected tournament:', error);
      throw new Error('Failed to save tournament selection');
    }
  }

  /**
   * Retrieve the selected tournament from AsyncStorage
   */
  static async getSelectedTournament(): Promise<Tournament | null> {
    try {
      const tournamentData = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_TOURNAMENT);
      if (!tournamentData) {
        return null;
      }
      
      const tournament = JSON.parse(tournamentData) as Tournament;
      console.log('Tournament loaded from storage:', tournament.No);
      return tournament;
    } catch (error) {
      console.error('Failed to load selected tournament:', error);
      return null;
    }
  }

  /**
   * Clear the selected tournament from AsyncStorage
   */
  static async clearSelectedTournament(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_TOURNAMENT);
      console.log('Tournament selection cleared from storage');
    } catch (error) {
      console.error('Failed to clear selected tournament:', error);
      throw new Error('Failed to clear tournament selection');
    }
  }

  /**
   * Check if user has a tournament selected (determines navigation state)
   */
  static async hasSelectedTournament(): Promise<boolean> {
    try {
      const tournament = await this.getSelectedTournament();
      return tournament !== null;
    } catch (error) {
      console.error('Failed to check tournament selection:', error);
      return false;
    }
  }

  /**
   * Save user preferences
   */
  static async saveUserPreferences(preferences: UserPreferences): Promise<void> {
    try {
      const preferencesData = JSON.stringify(preferences);
      await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, preferencesData);
      console.log('User preferences saved');
    } catch (error) {
      console.error('Failed to save user preferences:', error);
      throw new Error('Failed to save user preferences');
    }
  }

  /**
   * Get user preferences with defaults
   */
  static async getUserPreferences(): Promise<UserPreferences> {
    try {
      const preferencesData = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
      if (!preferencesData) {
        // Return default preferences for new users
        return {
          notificationsEnabled: true,
          onboardingCompleted: false,
        };
      }
      
      return JSON.parse(preferencesData) as UserPreferences;
    } catch (error) {
      console.error('Failed to load user preferences:', error);
      // Return default preferences on error
      return {
        notificationsEnabled: true,
        onboardingCompleted: false,
      };
    }
  }

  /**
   * Update specific preference
   */
  static async updatePreference<K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ): Promise<void> {
    try {
      const preferences = await this.getUserPreferences();
      preferences[key] = value;
      await this.saveUserPreferences(preferences);
    } catch (error) {
      console.error(`Failed to update preference ${key}:`, error);
      throw new Error(`Failed to update ${key} preference`);
    }
  }

  /**
   * Save court preferences for the current tournament
   */
  static async saveCourtPreference(tournamentNo: string, court: string): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.COURT_PREFERENCES}_${tournamentNo}`;
      await AsyncStorage.setItem(key, court);
      console.log(`Court preference saved for tournament ${tournamentNo}: ${court}`);
    } catch (error) {
      console.error('Failed to save court preference:', error);
      throw new Error('Failed to save court preference');
    }
  }

  /**
   * Get court preference for a specific tournament
   */
  static async getCourtPreference(tournamentNo: string): Promise<string | null> {
    try {
      const key = `${STORAGE_KEYS.COURT_PREFERENCES}_${tournamentNo}`;
      return await AsyncStorage.getItem(key);
    } catch (error) {
      console.error('Failed to load court preference:', error);
      return null;
    }
  }

  /**
   * Check if this is a new user (no previous selections or preferences)
   */
  static async isNewUser(): Promise<boolean> {
    try {
      const hasSelectedTournament = await this.hasSelectedTournament();
      const preferences = await this.getUserPreferences();
      
      // User is considered new if they haven't selected a tournament 
      // and haven't completed onboarding
      return !hasSelectedTournament && !preferences.onboardingCompleted;
    } catch (error) {
      console.error('Failed to check if new user:', error);
      // Assume new user on error for safety
      return true;
    }
  }

  /**
   * Mark user as having completed initial setup/onboarding
   */
  static async completeOnboarding(): Promise<void> {
    try {
      await this.updatePreference('onboardingCompleted', true);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      throw new Error('Failed to complete onboarding');
    }
  }

  /**
   * Get navigation state for app launch
   * Returns 'selection' for new users, 'dashboard' for returning users
   */
  static async getNavigationState(): Promise<'selection' | 'dashboard'> {
    try {
      const hasSelectedTournament = await this.hasSelectedTournament();
      return hasSelectedTournament ? 'dashboard' : 'selection';
    } catch (error) {
      console.error('Failed to determine navigation state:', error);
      // Default to selection screen for safety
      return 'selection';
    }
  }

  /**
   * Clear all referee-related data (for testing or reset purposes)
   */
  static async clearAllData(): Promise<void> {
    try {
      const keys = Object.values(STORAGE_KEYS);
      await AsyncStorage.multiRemove(keys);
      
      // Also clear tournament-specific court preferences
      const allKeys = await AsyncStorage.getAllKeys();
      const courtPreferenceKeys = allKeys.filter(key => 
        key.startsWith(STORAGE_KEYS.COURT_PREFERENCES)
      );
      if (courtPreferenceKeys.length > 0) {
        await AsyncStorage.multiRemove(courtPreferenceKeys);
      }
      
      console.log('All referee data cleared from storage');
    } catch (error) {
      console.error('Failed to clear all data:', error);
      throw new Error('Failed to clear all data');
    }
  }
}