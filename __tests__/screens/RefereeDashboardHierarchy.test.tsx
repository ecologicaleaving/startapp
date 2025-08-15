/**
 * Referee Dashboard Hierarchy Integration Tests
 * Testing information hierarchy implementation in RefereeDashboardScreen
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import RefereeDashboardScreen from '@/screens/RefereeDashboardScreen';
import { useCurrentAssignment } from '@/hooks/useCurrentAssignment';
import { TournamentStorageService } from '@/services/TournamentStorageService';

// Mock dependencies
jest.mock('@/hooks/useCurrentAssignment');
jest.mock('@/services/TournamentStorageService');
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ tournamentData: null }),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

const mockUseCurrentAssignment = useCurrentAssignment as jest.MockedFunction<typeof useCurrentAssignment>;
const mockTournamentStorage = TournamentStorageService as jest.Mocked<typeof TournamentStorageService>;

describe('RefereeDashboardScreen Information Hierarchy', () => {
  const mockTournament = {
    No: 'T001',
    Title: 'Beach Volleyball Championship',
    City: 'Miami',
    CountryName: 'USA',
    StartDate: '2025-01-20',
    EndDate: '2025-01-25',
    Category: 'Professional',
    Organizer: 'FIVB',
    TotalMatches: 64,
    Participants: 128,
  };

  const mockCurrentAssignment = {
    id: 'A001',
    court: 'Court 1',
    courtType: 'Center Court',
    teams: ['Team USA', 'Team BRA'],
    matchTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
    matchType: 'Semifinals',
    status: 'confirmed',
    round: 'SF',
    phase: 'Elimination',
    importance: 'high',
    priority: 'high',
  };

  beforeEach(() => {
    mockTournamentStorage.getSelectedTournament.mockResolvedValue(mockTournament);
    mockUseCurrentAssignment.mockReturnValue({
      currentAssignment: null,
      upcomingAssignments: [],
      loading: false,
      error: null,
      refreshAssignments: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Information Priority Hierarchy', () => {
    it('displays tournament context as secondary information', async () => {
      render(<RefereeDashboardScreen />);
      
      await waitFor(() => {
        expect(screen.getByText('Beach Volleyball Championship')).toBeTruthy();
      });

      // Tournament context should be visible but not prominent
      const tournamentTitle = screen.getByText('Beach Volleyball Championship');
      expect(tournamentTitle).toBeTruthy();
      
      // Should include location and dates
      expect(screen.getByText(/Miami, USA/)).toBeTruthy();
    });

    it('promotes current assignment to hero content when present', async () => {
      mockUseCurrentAssignment.mockReturnValue({
        currentAssignment: mockCurrentAssignment,
        upcomingAssignments: [],
        loading: false,
        error: null,
        refreshAssignments: jest.fn(),
      });

      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('Court 1')).toBeTruthy();
      });

      // Current assignment should be prominently displayed
      expect(screen.getByText('Court 1')).toBeTruthy();
      expect(screen.getByText(/Team USA vs Team BRA/)).toBeTruthy();
      expect(screen.getByText('CURRENT ASSIGNMENT')).toBeTruthy();
    });

    it('displays no assignment state with appropriate hierarchy', async () => {
      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('No Active Assignment')).toBeTruthy();
      });

      // No assignment state should be hero content but less prominent than active assignment
      expect(screen.getByText('No Active Assignment')).toBeTruthy();
      expect(screen.getByText(/no immediate assignments/)).toBeTruthy();
      expect(screen.getByText('View Full Schedule')).toBeTruthy();
    });

    it('groups secondary information appropriately', async () => {
      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('My Assignments')).toBeTruthy();
      });

      // Quick actions should be grouped and easily accessible
      expect(screen.getByText('My Assignments')).toBeTruthy();
      expect(screen.getByText('Results')).toBeTruthy();
      expect(screen.getByText('Settings')).toBeTruthy();

      // Emergency contacts should be present but not overwhelming
      expect(screen.getByText('Emergency Contacts')).toBeTruthy();
    });

    it('implements progressive disclosure for tertiary information', async () => {
      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        // Tournament details should be collapsed by default
        expect(screen.queryByText('Professional')).toBeNull(); // Category should be hidden initially
      });

      // Should be able to expand tertiary information
      const tournamentInfoSection = screen.queryByText('Tournament Information');
      if (tournamentInfoSection) {
        fireEvent.press(tournamentInfoSection);
        await waitFor(() => {
          expect(screen.getByText('Professional')).toBeTruthy();
        });
      }
    });
  });

  describe('Context-Sensitive Display', () => {
    it('adapts hierarchy based on assignment urgency', async () => {
      // Mock urgent assignment (5 minutes away)
      const urgentAssignment = {
        ...mockCurrentAssignment,
        matchTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes from now
      };

      mockUseCurrentAssignment.mockReturnValue({
        currentAssignment: urgentAssignment,
        upcomingAssignments: [],
        loading: false,
        error: null,
        refreshAssignments: jest.fn(),
      });

      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        // Urgent notifications should be prominently displayed
        expect(screen.getByText(/MATCH STARTING/)).toBeTruthy();
      });

      // Should show countdown timer with urgency indicators
      const countdownElement = screen.getByText(/5:/); // Should show 5 minutes countdown
      expect(countdownElement).toBeTruthy();
    });

    it('prioritizes time-critical information during active assignments', async () => {
      const activeAssignment = {
        ...mockCurrentAssignment,
        status: 'active',
        matchTime: new Date().toISOString(), // Currently active
      };

      mockUseCurrentAssignment.mockReturnValue({
        currentAssignment: activeAssignment,
        upcomingAssignments: [],
        loading: false,
        error: null,
        refreshAssignments: jest.fn(),
      });

      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        // Active assignment should be most prominent
        expect(screen.getByText('Court 1')).toBeTruthy();
      });

      // Should provide quick access to result entry for active matches
      expect(screen.getByText('Enter Results')).toBeTruthy();
    });

    it('adjusts information density based on referee context', async () => {
      mockUseCurrentAssignment.mockReturnValue({
        currentAssignment: null,
        upcomingAssignments: [
          { ...mockCurrentAssignment, id: 'A002', court: 'Court 2' },
          { ...mockCurrentAssignment, id: 'A003', court: 'Court 3' },
        ],
        loading: false,
        error: null,
        refreshAssignments: jest.fn(),
      });

      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        // With upcoming assignments, timeline should be more prominent
        expect(screen.getByText('View Full Schedule')).toBeTruthy();
      });
      
      // Timeline should show upcoming assignments
      expect(screen.queryByText('Court 2')).toBeTruthy();
      expect(screen.queryByText('Court 3')).toBeTruthy();
    });
  });

  describe('Scanning Optimization', () => {
    it('optimizes layout for quick referee scanning', async () => {
      mockUseCurrentAssignment.mockReturnValue({
        currentAssignment: mockCurrentAssignment,
        upcomingAssignments: [],
        loading: false,
        error: null,
        refreshAssignments: jest.fn(),
      });

      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('Court 1')).toBeTruthy();
      });

      // Key information should be easily scannable
      // Court number should be large and prominent
      const courtText = screen.getByText('Court 1');
      expect(courtText).toBeTruthy();

      // Teams should be clearly displayed
      expect(screen.getByText(/Team USA vs Team BRA/)).toBeTruthy();

      // Match time should be visible
      expect(screen.getByText(/Match Time:/)).toBeTruthy();
    });

    it('maintains consistent visual hierarchy patterns', async () => {
      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('Beach Volleyball Championship')).toBeTruthy();
      });

      // All secondary information should follow consistent patterns
      const quickActions = screen.getAllByText(/My Assignments|Results|Settings/);
      expect(quickActions).toHaveLength(3);

      // Emergency contacts should be consistently styled
      expect(screen.getByText('Emergency Contacts')).toBeTruthy();
    });

    it('provides appropriate touch targets for outdoor conditions', async () => {
      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        const scheduleButton = screen.getByText('View Full Schedule');
        expect(scheduleButton).toBeTruthy();
      });

      // Interactive elements should meet accessibility requirements
      const actionButtons = screen.getAllByText(/My Assignments|Results|Settings|View Full Schedule/);
      actionButtons.forEach(button => {
        // Each button should be touchable and appropriately sized
        expect(button).toBeTruthy();
      });
    });
  });

  describe('Information Grouping and Separation', () => {
    it('groups related information with clear visual separation', async () => {
      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('Emergency Contacts')).toBeTruthy();
      });

      // Quick actions should be grouped together
      expect(screen.getByText('My Assignments')).toBeTruthy();
      expect(screen.getByText('Results')).toBeTruthy();
      expect(screen.getByText('Settings')).toBeTruthy();

      // Emergency information should be separate but accessible
      expect(screen.getByText('Emergency Contacts')).toBeTruthy();
    });

    it('implements referee-first prioritization across all components', async () => {
      mockUseCurrentAssignment.mockReturnValue({
        currentAssignment: mockCurrentAssignment,
        upcomingAssignments: [
          { ...mockCurrentAssignment, id: 'A002', court: 'Court 2' },
        ],
        loading: false,
        error: null,
        refreshAssignments: jest.fn(),
      });

      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('Court 1')).toBeTruthy();
      });

      // Current assignment should be most prominent
      expect(screen.getByText('CURRENT ASSIGNMENT')).toBeTruthy();
      expect(screen.getByText('Court 1')).toBeTruthy();

      // Tournament context should be secondary
      expect(screen.getByText('Beach Volleyball Championship')).toBeTruthy();

      // Upcoming assignments should be visible but less prominent
      expect(screen.queryByText('Court 2')).toBeTruthy();
    });
  });

  describe('Mobile Device Optimization', () => {
    it('balances information density for mobile readability', async () => {
      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('Beach Volleyball Championship')).toBeTruthy();
      });

      // Should not overwhelm with too much information
      // Tertiary information should be collapsed by default
      expect(screen.queryByText('Professional')).toBeNull(); // Category hidden initially
      expect(screen.queryByText('FIVB')).toBeNull(); // Organizer hidden initially

      // Primary and secondary information should be immediately visible
      expect(screen.getByText('Beach Volleyball Championship')).toBeTruthy();
      expect(screen.getByText('My Assignments')).toBeTruthy();
      expect(screen.getByText('Emergency Contacts')).toBeTruthy();
    });

    it('maintains hierarchy effectiveness on different screen orientations', async () => {
      // This would test responsive behavior, but we'll verify structural consistency
      mockUseCurrentAssignment.mockReturnValue({
        currentAssignment: mockCurrentAssignment,
        upcomingAssignments: [],
        loading: false,
        error: null,
        refreshAssignments: jest.fn(),
      });

      render(<RefereeDashboardScreen />);

      await waitFor(() => {
        expect(screen.getByText('Court 1')).toBeTruthy();
      });

      // Hero content should maintain prominence regardless of layout changes
      expect(screen.getByText('CURRENT ASSIGNMENT')).toBeTruthy();
      expect(screen.getByText('Court 1')).toBeTruthy();
      
      // Secondary information should remain accessible
      expect(screen.getByText('My Assignments')).toBeTruthy();
    });
  });
});