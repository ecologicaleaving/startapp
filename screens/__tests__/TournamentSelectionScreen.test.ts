import { TournamentStorageService } from '../../services/TournamentStorageService';
import { Tournament } from '../../types/tournament';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
}));

describe('TournamentStorageService', () => {
  const mockTournament: Tournament = {
    No: '12345',
    Name: 'Test Tournament',
    Title: 'Test Beach Volleyball Tournament',
    StartDate: '2024-01-15',
    EndDate: '2024-01-20',
    City: 'Miami',
    CountryName: 'USA',
    Code: 'TEST2024',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Tournament Selection State Management', () => {
    it('should save selected tournament to storage', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      
      await TournamentStorageService.saveSelectedTournament(mockTournament);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@referee_selected_tournament',
        JSON.stringify(mockTournament)
      );
    });

    it('should retrieve selected tournament from storage', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockTournament));
      
      const result = await TournamentStorageService.getSelectedTournament();
      
      expect(result).toEqual(mockTournament);
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('@referee_selected_tournament');
    });

    it('should return null when no tournament is stored', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(null);
      
      const result = await TournamentStorageService.getSelectedTournament();
      
      expect(result).toBeNull();
    });

    it('should clear selected tournament from storage', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      
      await TournamentStorageService.clearSelectedTournament();
      
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@referee_selected_tournament');
    });
  });

  describe('Navigation State Transitions', () => {
    it('should return "dashboard" state when tournament is selected', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockTournament));
      
      const state = await TournamentStorageService.getNavigationState();
      
      expect(state).toBe('dashboard');
    });

    it('should return "selection" state when no tournament is selected', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(null);
      
      const state = await TournamentStorageService.getNavigationState();
      
      expect(state).toBe('selection');
    });

    it('should detect if user has selected tournament', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockTournament));
      
      const hasTournament = await TournamentStorageService.hasSelectedTournament();
      
      expect(hasTournament).toBe(true);
    });

    it('should detect when user has not selected tournament', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(null);
      
      const hasTournament = await TournamentStorageService.hasSelectedTournament();
      
      expect(hasTournament).toBe(false);
    });
  });

  describe('User Preferences Management', () => {
    it('should save user preferences', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const preferences = { notificationsEnabled: true, onboardingCompleted: true };
      
      await TournamentStorageService.saveUserPreferences(preferences);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@referee_user_preferences',
        JSON.stringify(preferences)
      );
    });

    it('should return default preferences for new users', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(null);
      
      const preferences = await TournamentStorageService.getUserPreferences();
      
      expect(preferences).toEqual({
        notificationsEnabled: true,
        onboardingCompleted: false,
      });
    });

    it('should identify new users correctly', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      // Mock no tournament and no completed onboarding
      AsyncStorage.getItem.mockResolvedValueOnce(null); // no tournament
      AsyncStorage.getItem.mockResolvedValueOnce(null); // no preferences
      
      const isNew = await TournamentStorageService.isNewUser();
      
      expect(isNew).toBe(true);
    });

    it('should identify returning users correctly', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      // Mock existing tournament
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockTournament)); // has tournament
      
      const isNew = await TournamentStorageService.isNewUser();
      
      expect(isNew).toBe(false);
    });
  });

  describe('Tournament Switching Functionality', () => {
    it('should update existing tournament selection', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const newTournament: Tournament = {
        ...mockTournament,
        No: '67890',
        Name: 'New Tournament',
      };
      
      await TournamentStorageService.saveSelectedTournament(newTournament);
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@referee_selected_tournament',
        JSON.stringify(newTournament)
      );
    });

    it('should complete onboarding process', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
        notificationsEnabled: true,
        onboardingCompleted: false,
      }));
      
      await TournamentStorageService.completeOnboarding();
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@referee_user_preferences',
        JSON.stringify({
          notificationsEnabled: true,
          onboardingCompleted: true,
        })
      );
    });

    it('should clear all data when requested', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getAllKeys.mockResolvedValueOnce([
        '@referee_selected_tournament',
        '@referee_user_preferences',
        '@referee_court_preferences_12345',
      ]);
      
      await TournamentStorageService.clearAllData();
      
      expect(AsyncStorage.multiRemove).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('should handle AsyncStorage errors gracefully when saving tournament', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));
      
      await expect(
        TournamentStorageService.saveSelectedTournament(mockTournament)
      ).rejects.toThrow('Failed to save tournament selection');
    });

    it('should handle AsyncStorage errors gracefully when loading tournament', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));
      
      const result = await TournamentStorageService.getSelectedTournament();
      
      expect(result).toBeNull();
    });

    it('should default to selection state on navigation errors', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));
      
      const state = await TournamentStorageService.getNavigationState();
      
      expect(state).toBe('selection');
    });
  });
});