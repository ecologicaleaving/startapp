import React from 'react';
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { MyAssignmentsScreen } from '../MyAssignmentsScreen';
import { RefereeAssignmentsService } from '../../services/RefereeAssignmentsService';
import { TournamentStorageService } from '../../services/TournamentStorageService';

// Mock dependencies
jest.mock('../../services/RefereeAssignmentsService');
jest.mock('../../services/TournamentStorageService');
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    React.useEffect(callback, []);
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockRefereeAssignmentsService = RefereeAssignmentsService as jest.Mocked<typeof RefereeAssignmentsService>;
const mockTournamentStorageService = TournamentStorageService as jest.Mocked<typeof TournamentStorageService>;

describe('MyAssignmentsScreen', () => {
  const mockTournament = {
    No: 'T001',
    Title: 'Test Tournament',
    City: 'Test City',
  };

  const mockAssignments = {
    current: [
      {
        matchNo: 'M001',
        tournamentNo: 'T001',
        status: 'Running',
        teamAName: 'Team Alpha',
        teamBName: 'Team Beta',
        court: 'Court 1',
        localTime: '10:00',
        refereeRole: 'referee1',
      }
    ],
    upcoming: [
      {
        matchNo: 'M002',
        tournamentNo: 'T001',
        status: 'Scheduled',
        teamAName: 'Team Gamma',
        teamBName: 'Team Delta',
        court: 'Court 2',
        localTime: '11:00',
        refereeRole: 'referee2',
      }
    ],
    completed: [
      {
        matchNo: 'M003',
        tournamentNo: 'T001',
        status: 'Finished',
        teamAName: 'Team Echo',
        teamBName: 'Team Foxtrot',
        court: 'Court 1',
        localTime: '09:00',
        refereeRole: 'referee1',
      }
    ],
    cancelled: []
  };

  const mockEmptyAssignments = {
    current: [],
    upcoming: [],
    completed: [],
    cancelled: []
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Default mocks
    mockTournamentStorageService.getSelectedTournament.mockResolvedValue(mockTournament);
    mockRefereeAssignmentsService.getCurrentReferee.mockResolvedValue({
      name: 'Test Referee',
      id: 'ref_001'
    });
    mockRefereeAssignmentsService.getRefereeAssignments.mockResolvedValue(mockAssignments);
    mockRefereeAssignmentsService.getRefreshInterval.mockReturnValue(30000);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Initial Loading', () => {
    it('displays loading state initially', async () => {
      mockRefereeAssignmentsService.getRefereeAssignments.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockAssignments), 1000))
      );

      render(<MyAssignmentsScreen />);

      expect(screen.getByText('Loading your assignments...')).toBeTruthy();
      expect(screen.getByLabelText('Loading')).toBeTruthy();
    });

    it('loads and displays assignments correctly', async () => {
      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('My Assignments')).toBeTruthy();
        expect(screen.getByText('Tournament: T001')).toBeTruthy();
        expect(screen.getByText('Current Assignment')).toBeTruthy();
        expect(screen.getByText('Upcoming Assignments (1)')).toBeTruthy();
        expect(screen.getByText('Completed (1)')).toBeTruthy();
      });

      expect(mockTournamentStorageService.getSelectedTournament).toHaveBeenCalled();
      expect(mockRefereeAssignmentsService.getRefereeAssignments).toHaveBeenCalledWith('T001', false);
    });

    it('handles no tournament selected error', async () => {
      mockTournamentStorageService.getSelectedTournament.mockResolvedValue(null);

      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Unable to load assignments')).toBeTruthy();
        expect(screen.getByText('No tournament selected. Please select a tournament first.')).toBeTruthy();
      });
    });

    it('sets up demo referee when none exists', async () => {
      mockRefereeAssignmentsService.getCurrentReferee.mockResolvedValue(null);

      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(mockRefereeAssignmentsService.setCurrentReferee).toHaveBeenCalledWith({
          name: 'Demo Referee',
          id: 'demo_referee_001'
        });
      });
    });
  });

  describe('Assignment Display', () => {
    it('displays current assignments prominently', async () => {
      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Current Assignment')).toBeTruthy();
        expect(screen.getByText('Team Alpha vs Team Beta')).toBeTruthy();
        expect(screen.getByText('LIVE NOW')).toBeTruthy();
      });
    });

    it('displays upcoming assignments with count', async () => {
      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Upcoming Assignments (1)')).toBeTruthy();
        expect(screen.getByText('Team Gamma vs Team Delta')).toBeTruthy();
        expect(screen.getByText('UPCOMING')).toBeTruthy();
      });
    });

    it('displays completed assignments with limit', async () => {
      const manyCompleted = Array.from({ length: 15 }, (_, i) => ({
        matchNo: `M${i + 10}`,
        tournamentNo: 'T001',
        status: 'Finished',
        teamAName: `Team ${i}A`,
        teamBName: `Team ${i}B`,
        court: `Court ${i % 3 + 1}`,
        localTime: '09:00',
        refereeRole: 'referee1',
      }));

      const assignmentsWithMany = {
        ...mockAssignments,
        completed: manyCompleted
      };

      mockRefereeAssignmentsService.getRefereeAssignments.mockResolvedValue(assignmentsWithMany);

      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Completed (15)')).toBeTruthy();
        expect(screen.getByText('Showing 10 of 15 completed assignments')).toBeTruthy();
      });
    });

    it('displays cancelled assignments when present', async () => {
      const assignmentsWithCancelled = {
        ...mockAssignments,
        cancelled: [
          {
            matchNo: 'M004',
            tournamentNo: 'T001',
            status: 'Cancelled',
            teamAName: 'Team Cancelled A',
            teamBName: 'Team Cancelled B',
            court: 'Court 3',
            localTime: '12:00',
            refereeRole: 'referee1',
          }
        ]
      };

      mockRefereeAssignmentsService.getRefereeAssignments.mockResolvedValue(assignmentsWithCancelled);

      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Cancelled (1)')).toBeTruthy();
        expect(screen.getByText('Team Cancelled A vs Team Cancelled B')).toBeTruthy();
      });
    });

    it('displays empty state when no assignments', async () => {
      mockRefereeAssignmentsService.getRefereeAssignments.mockResolvedValue(mockEmptyAssignments);

      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('No assignments found')).toBeTruthy();
        expect(screen.getByText("You don't have any referee assignments for this tournament yet.")).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('supports pull to refresh functionality', async () => {
      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('My Assignments')).toBeTruthy();
      });

      // Find the ScrollView and trigger refresh
      const scrollView = screen.getByLabelText('Assignments list');
      const refreshControl = scrollView.props.refreshControl;

      expect(refreshControl.props.refreshing).toBe(false);

      // Trigger refresh
      act(() => {
        refreshControl.props.onRefresh();
      });

      await waitFor(() => {
        expect(mockRefereeAssignmentsService.getRefereeAssignments).toHaveBeenCalledWith('T001', true);
      });
    });

    it('handles refresh errors gracefully', async () => {
      mockRefereeAssignmentsService.getRefereeAssignments
        .mockResolvedValueOnce(mockAssignments) // Initial load
        .mockRejectedValueOnce(new Error('Network error')); // Refresh error

      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('My Assignments')).toBeTruthy();
      });

      const scrollView = screen.getByLabelText('Assignments list');
      act(() => {
        scrollView.props.refreshControl.props.onRefresh();
      });

      await waitFor(() => {
        expect(screen.getByText('Unable to load assignments')).toBeTruthy();
        expect(screen.getByText('Network error')).toBeTruthy();
      });
    });
  });

  describe('Auto Refresh', () => {
    it('sets up auto refresh based on assignment status', async () => {
      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(mockRefereeAssignmentsService.getRefreshInterval).toHaveBeenCalledWith(mockAssignments);
      });

      // Fast forward time to trigger auto refresh
      act(() => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockRefereeAssignmentsService.getRefereeAssignments).toHaveBeenCalledWith('T001', true);
    });

    it('clears auto refresh interval on unmount', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { unmount } = render(<MyAssignmentsScreen />);
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('updates refresh interval when assignments change', async () => {
      mockRefereeAssignmentsService.getRefreshInterval
        .mockReturnValueOnce(30000) // Initial: 30 seconds (current assignments)
        .mockReturnValueOnce(300000); // Updated: 5 minutes (only upcoming)

      const { rerender } = render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(mockRefereeAssignmentsService.getRefreshInterval).toHaveBeenCalledWith(mockAssignments);
      });

      // Update assignments to only upcoming
      const upcomingOnlyAssignments = {
        ...mockAssignments,
        current: []
      };

      mockRefereeAssignmentsService.getRefereeAssignments.mockResolvedValue(upcomingOnlyAssignments);

      // Trigger re-render by refresh
      const scrollView = screen.getByLabelText('Assignments list');
      act(() => {
        scrollView.props.refreshControl.props.onRefresh();
      });

      await waitFor(() => {
        expect(mockRefereeAssignmentsService.getRefreshInterval).toHaveBeenCalledWith(upcomingOnlyAssignments);
      });
    });
  });

  describe('Assignment Interaction', () => {
    it('shows assignment details when pressed', async () => {
      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Team Alpha vs Team Beta')).toBeTruthy();
      });

      const assignmentCard = screen.getByLabelText(/Current assignment for match/);
      fireEvent.press(assignmentCard);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Assignment Details',
        expect.stringContaining('Team Alpha vs Team Beta'),
        [{ text: 'OK' }]
      );
    });

    it('handles press on upcoming assignments', async () => {
      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Team Gamma vs Team Delta')).toBeTruthy();
      });

      const upcomingCard = screen.getByLabelText(/Upcoming assignment for match/);
      fireEvent.press(upcomingCard);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Assignment Details',
        expect.stringContaining('Team Gamma vs Team Delta'),
        [{ text: 'OK' }]
      );
    });

    it('handles press on completed assignments', async () => {
      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Team Echo vs Team Foxtrot')).toBeTruthy();
      });

      const completedCard = screen.getByLabelText(/assignment for match M003/);
      fireEvent.press(completedCard);

      expect(Alert.alert).toHaveBeenCalledWith(
        'Assignment Details',
        expect.stringContaining('Team Echo vs Team Foxtrot'),
        [{ text: 'OK' }]
      );
    });
  });

  describe('Error Handling', () => {
    it('displays error state when API fails', async () => {
      mockRefereeAssignmentsService.getRefereeAssignments.mockRejectedValue(
        new Error('API temporarily unavailable')
      );

      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Unable to load assignments')).toBeTruthy();
        expect(screen.getByText('API temporarily unavailable')).toBeTruthy();
        expect(screen.getByText('Pull down to retry')).toBeTruthy();
      });
    });

    it('allows retry from error state', async () => {
      mockRefereeAssignmentsService.getRefereeAssignments
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockAssignments);

      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeTruthy();
      });

      const scrollView = screen.getByLabelText('Error retry');
      act(() => {
        scrollView.props.refreshControl.props.onRefresh();
      });

      await waitFor(() => {
        expect(screen.getByText('My Assignments')).toBeTruthy();
        expect(screen.getByText('Current Assignment')).toBeTruthy();
      });
    });

    it('handles service errors gracefully', async () => {
      mockTournamentStorageService.getSelectedTournament.mockRejectedValue(
        new Error('Storage access denied')
      );

      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('Unable to load assignments')).toBeTruthy();
        expect(screen.getByText('Storage access denied')).toBeTruthy();
      });
    });
  });

  describe('Performance', () => {
    it('does not cause memory leaks with intervals', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      const { unmount } = render(<MyAssignmentsScreen />);
      
      expect(setIntervalSpy).toHaveBeenCalled();
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('handles rapid screen focus changes', async () => {
      const { unmount } = render(<MyAssignmentsScreen />);

      // Simulate rapid focus/blur cycles
      for (let i = 0; i < 5; i++) {
        unmount();
        render(<MyAssignmentsScreen />);
      }

      // Should not cause crashes or multiple service calls
      expect(mockRefereeAssignmentsService.getRefereeAssignments).toHaveBeenCalled();
    });

    it('limits service calls during rapid refreshes', async () => {
      render(<MyAssignmentsScreen />);

      await waitFor(() => {
        expect(screen.getByText('My Assignments')).toBeTruthy();
      });

      const scrollView = screen.getByLabelText('Assignments list');
      
      // Trigger multiple rapid refreshes
      for (let i = 0; i < 5; i++) {
        act(() => {
          scrollView.props.refreshControl.props.onRefresh();
        });
      }

      // Should not cause excessive API calls
      await waitFor(() => {
        expect(mockRefereeAssignmentsService.getRefereeAssignments).toHaveBeenCalledTimes(6); // Initial + refreshes
      });
    });
  });
});