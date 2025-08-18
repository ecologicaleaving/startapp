import React, { useState, useEffect } from 'react';
import { TournamentStorageService } from '../services/TournamentStorageService';
import TournamentSelection from './tournament-selection';
import RefereeDashboard from './referee-dashboard';

export default function Index() {
  const [navigationState, setNavigationState] = useState<'selection' | 'dashboard'>('selection');

  useEffect(() => {
    // Check in background if user has a previously selected tournament
    const checkForStoredTournament = async () => {
      try {
        const navState = await TournamentStorageService.getNavigationState();
        // Only switch to dashboard if user has a stored tournament
        if (navState === 'dashboard') {
          setNavigationState('dashboard');
        }
        // Otherwise, stay on tournament selection (first-time user experience)
      } catch (error) {
        console.error('Index: Error checking stored tournament:', error);
        // Stay on selection screen for first-time users
      }
    };

    checkForStoredTournament();
  }, []);

  if (navigationState === 'selection') {
    return <TournamentSelection onTournamentSelected={() => setNavigationState('dashboard')} />;
  }

  return <RefereeDashboard onSwitchTournament={() => setNavigationState('selection')} />;
}