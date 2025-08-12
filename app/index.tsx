import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { TournamentStorageService } from '../services/TournamentStorageService';
import { BrandLoadingState, BrandSplashScreen } from '../components/Brand';
import { colors } from '../theme/tokens';
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
      <BrandLoadingState 
        variant="logo"
        message="Initializing Referee Tool..."
        size="large"
      />
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
    backgroundColor: colors.background,
  },
});