import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { TournamentStorageService } from '../services/TournamentStorageService';
import TournamentSelection from './tournament-selection';
import RefereeDashboard from './referee-dashboard';

export default function Index() {
  const [navigationState, setNavigationState] = useState<'selection' | 'dashboard' | 'loading'>('loading');

  useEffect(() => {
    const determineNavigationFlow = async () => {
      try {
        console.log('Index: Determining navigation flow...');
        const navState = await TournamentStorageService.getNavigationState();
        console.log('Index: Navigation state determined:', navState);
        setNavigationState(navState);
      } catch (error) {
        console.error('Index: Error determining navigation:', error);
        // Default to tournament selection for new users
        setNavigationState('selection');
      }
    };

    determineNavigationFlow();
  }, []);

  const handleTournamentSelected = () => {
    console.log('Index: Tournament selected, navigating to dashboard');
    setNavigationState('dashboard');
  };

  const handleSwitchTournament = () => {
    console.log('Index: Switching tournament, navigating to selection');
    setNavigationState('selection');
  };

  if (navigationState === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B35" />
      </View>
    );
  }

  if (navigationState === 'selection') {
    return <TournamentSelection onTournamentSelected={handleTournamentSelected} />;
  }

  return <RefereeDashboard onSwitchTournament={handleSwitchTournament} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});