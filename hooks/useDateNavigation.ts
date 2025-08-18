import { useState, useCallback } from 'react';
import { BeachMatch } from '../types/match';

interface UseDateNavigationState {
  selectedDate: string;
}

interface UseDateNavigationActions {
  setSelectedDate: (date: string) => void;
  getAvailableDates: (matches: BeachMatch[], showCourtSelection: boolean, getCourtUniqueDates: () => string[]) => string[];
  getCurrentDateIndex: (dates: string[]) => number;
  navigateToDate: (direction: 'prev' | 'next', dates: string[]) => void;
  formatMatchDate: (dateStr: string) => string;
}

export interface UseDateNavigation extends UseDateNavigationState, UseDateNavigationActions {}

export const useDateNavigation = (): UseDateNavigation => {
  const [selectedDate, setSelectedDate] = useState<string>('');

  const getAvailableDates = useCallback((
    matches: BeachMatch[], 
    showCourtSelection: boolean, 
    getCourtUniqueDates: () => string[]
  ): string[] => {
    if (showCourtSelection) {
      // For court monitor
      return getCourtUniqueDates();
    } else {
      // For referee monitor
      const allDates = matches.map(match => 
        match.Date || match.LocalDate || match.MatchDate || match.StartDate
      ).filter(Boolean);
      return [...new Set(allDates)].sort((a, b) => new Date(a).getTime() - new Date(b).getTime()); // Ascending order for proper navigation
    }
  }, []);

  const getCurrentDateIndex = useCallback((dates: string[]): number => {
    if (!selectedDate) return -1;
    return dates.indexOf(selectedDate);
  }, [selectedDate]);

  const navigateToDate = useCallback((direction: 'prev' | 'next', dates: string[]) => {
    const currentIndex = getCurrentDateIndex(dates);
    
    if (currentIndex === -1) {
      // No date selected, select the last day (most recent in the tournament)
      if (dates.length > 0) {
        setSelectedDate(dates[dates.length - 1]);
      }
      return;
    }
    
    let newIndex;
    if (direction === 'prev') {
      newIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex; // Stop at first (earliest date)
    } else {
      newIndex = currentIndex < dates.length - 1 ? currentIndex + 1 : currentIndex; // Stop at last (latest date)
    }
    
    // Only change if we actually moved
    if (newIndex !== currentIndex) {
      setSelectedDate(dates[newIndex]);
    }
  }, [getCurrentDateIndex]);

  const formatMatchDate = useCallback((dateStr: string): string => {
    if (!dateStr) return 'Unknown Date';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, []);

  return {
    // State
    selectedDate,
    // Actions
    setSelectedDate,
    getAvailableDates,
    getCurrentDateIndex,
    navigateToDate,
    formatMatchDate,
  };
};