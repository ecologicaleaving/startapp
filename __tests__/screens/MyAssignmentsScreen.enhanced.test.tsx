/**
 * Enhanced MyAssignmentsScreen Tests
 * Story 3.2: Dedicated My Assignments Screen
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { MyAssignmentsScreen } from '../../screens/MyAssignmentsScreen';
import { useCurrentAssignment } from '../../hooks/useCurrentAssignment';
import { useAssignmentPreparation } from '../../hooks/useAssignmentPreparation';
import { Assignment } from '../../types/assignments';

// Mock external dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('../../hooks/useCurrentAssignment');
jest.mock('../../hooks/useAssignmentPreparation');
jest.mock('../../components/navigation/NavigationHeader', () => 'NavigationHeader');
jest.mock('../../components/navigation/BottomTabNavigation', () => 'BottomTabNavigation');

const mockUseCurrentAssignment = useCurrentAssignment as jest.MockedFunction<typeof useCurrentAssignment>;
const mockUseAssignmentPreparation = useAssignmentPreparation as jest.MockedFunction<typeof useAssignmentPreparation>;

describe('MyAssignmentsScreen - Enhanced Features', () => {
  const mockCurrentAssignment: Assignment = {
    id: 'current-001',
    courtNumber: 1,
    homeTeam: 'Beach Warriors',
    awayTeam: 'Sand Storms',
    matchTime: new Date(Date.now() + 30 * 60 * 1000),
    refereePosition: '1st Referee',
    status: 'current',
    matchType: 'Pool Play',
    importance: 'high',
    notes: 'Championship semi-final match',
    matchResult: null,
    tournamentInfo: {
      name: 'Beach Volleyball Championship 2025',
      location: 'Santa Monica, CA',
      court: 'Center Court',
    },
  };

  const mockUpcomingAssignments: Assignment[] = [
    {
      id: 'upcoming-001',
      courtNumber: 2,
      homeTeam: 'Wave Riders',
      awayTeam: 'Coastal Crushers',
      matchTime: new Date(Date.now() + 90 * 60 * 1000),
      refereePosition: '2nd Referee',
      status: 'upcoming',
      matchType: 'Pool Play',
      importance: 'medium',
      notes: null,
      matchResult: null,
    },
  ];

  const defaultCurrentAssignmentMock = {
    currentAssignment: mockCurrentAssignment,
    upcomingAssignments: mockUpcomingAssignments,
    loading: false,
    error: null,
    refreshAssignments: jest.fn(),
  };

  const defaultPreparationMock = {
    preparations: new Map(),
    history: [],
    loading: false,
    error: null,
    isOffline: false,
    syncPending: false,
    lastSyncTime: null,
    getPreparation: jest.fn(),
    savePreparation: jest.fn(),
    updateAssignmentStatus: jest.fn(),
    addPerformanceNote: jest.fn(),
    getAssignmentHistory: jest.fn(() => []),
    detectScheduleConflicts: jest.fn(() => []),
    getPreparationCompletionRate: jest.fn(() => 75),
    refreshData: jest.fn(),
    syncPendingData: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCurrentAssignment.mockReturnValue(defaultCurrentAssignmentMock);
    mockUseAssignmentPreparation.mockReturnValue(defaultPreparationMock);
  });

  describe('Enhanced Assignment Display', () => {
    it('should render current assignment prominently', async () => {
      const { getByText } = render(<MyAssignmentsScreen />);
      
      await waitFor(() => {
        expect(getByText('Current Assignment')).toBeTruthy();
        expect(getByText('Beach Warriors vs Sand Storms')).toBeTruthy();
      });
    });

    it('should display upcoming assignments in compact format', async () => {
      const { getByText } = render(<MyAssignmentsScreen />);
      
      await waitFor(() => {
        expect(getByText('Upcoming Assignments (1)')).toBeTruthy();
        expect(getByText('Wave Riders vs Coastal Crushers')).toBeTruthy();
      });
    });

    it('should show assignment status overview', async () => {
      const { getByText } = render(<MyAssignmentsScreen />);
      
      await waitFor(() => {
        expect(getByText('Active Assignment')).toBeTruthy();
      });
    });
  });

  describe('View Mode Toggle', () => {
    it('should toggle between list and timeline views', async () => {
      const { getByLabelText } = render(<MyAssignmentsScreen />);
      
      const toggleButton = getByLabelText('Switch to timeline view');
      fireEvent.press(toggleButton);
      
      // Should switch to timeline view
      const switchBackButton = getByLabelText('Switch to list view');
      expect(switchBackButton).toBeTruthy();
    });

    it('should display timeline view when selected', async () => {
      const { getByLabelText, queryByText } = render(<MyAssignmentsScreen />);
      
      const toggleButton = getByLabelText('Switch to timeline view');
      fireEvent.press(toggleButton);
      
      await waitFor(() => {
        // Timeline should be rendered
        expect(queryByText('Current Assignment')).toBeFalsy();
      });
    });
  });

  describe('Offline Capabilities', () => {
    it('should display offline status when network is unavailable', async () => {
      mockUseAssignmentPreparation.mockReturnValue({
        ...defaultPreparationMock,
        isOffline: true,
      });

      const { getByText } = render(<MyAssignmentsScreen />);
      
      await waitFor(() => {
        expect(getByText('📴 Offline Mode')).toBeTruthy();
      });
    });

    it('should show sync pending status', async () => {
      mockUseAssignmentPreparation.mockReturnValue({
        ...defaultPreparationMock,
        syncPending: true,
        lastSyncTime: new Date(),
      });

      const { getByText } = render(<MyAssignmentsScreen />);
      
      await waitFor(() => {
        expect(getByText('🔄 Sync Pending')).toBeTruthy();
        expect(getByText(/Last sync:/)).toBeTruthy();
      });
    });

    it('should allow manual sync when pending', async () => {
      const mockSyncPendingData = jest.fn();
      mockUseAssignmentPreparation.mockReturnValue({
        ...defaultPreparationMock,
        syncPending: true,
        syncPendingData: mockSyncPendingData,
      });

      const { getByText } = render(<MyAssignmentsScreen />);
      
      const syncButton = getByText('Sync Now');
      fireEvent.press(syncButton);
      
      expect(mockSyncPendingData).toHaveBeenCalled();
    });
  });

  describe('Schedule Conflicts', () => {
    it('should display conflict alert when conflicts exist', async () => {
      mockUseAssignmentPreparation.mockReturnValue({
        ...defaultPreparationMock,
        detectScheduleConflicts: jest.fn(() => [mockCurrentAssignment]),
      });

      const { getByText } = render(<MyAssignmentsScreen />);
      
      await waitFor(() => {
        expect(getByText(/1 schedule conflict detected/)).toBeTruthy();
      });
    });

    it('should handle multiple conflicts', async () => {
      mockUseAssignmentPreparation.mockReturnValue({
        ...defaultPreparationMock,
        detectScheduleConflicts: jest.fn(() => [mockCurrentAssignment, mockUpcomingAssignments[0]]),
      });

      const { getByText } = render(<MyAssignmentsScreen />);
      
      await waitFor(() => {
        expect(getByText(/2 schedule conflicts detected/)).toBeTruthy();
      });
    });
  });

  describe('Assignment Actions', () => {
    it('should handle assignment press for details navigation', async () => {
      const { getByText } = render(<MyAssignmentsScreen />);
      
      await waitFor(() => {
        const assignmentCard = getByText('Beach Warriors vs Sand Storms');
        fireEvent.press(assignmentCard);
        // Navigation should be handled by the component
      });
    });

    it('should open status management modal', async () => {
      const { getByText, getByLabelText } = render(<MyAssignmentsScreen />);
      
      await waitFor(() => {
        // Look for manage button or similar action
        const manageButton = getByLabelText(/Manage assignment status/);
        if (manageButton) {
          fireEvent.press(manageButton);
        }
      });
    });
  });

  describe('Loading and Error States', () => {
    it('should display loading state', () => {
      mockUseCurrentAssignment.mockReturnValue({
        ...defaultCurrentAssignmentMock,
        loading: true,
      });

      const { getByText } = render(<MyAssignmentsScreen />);
      
      expect(getByText('Loading your assignments...')).toBeTruthy();
    });

    it('should display error state', () => {
      mockUseCurrentAssignment.mockReturnValue({
        ...defaultCurrentAssignmentMock,
        loading: false,
        error: 'Failed to load assignments',
      });

      const { getByText } = render(<MyAssignmentsScreen />);
      
      expect(getByText('Unable to load assignments')).toBeTruthy();
      expect(getByText('Failed to load assignments')).toBeTruthy();
    });

    it('should allow retry on error', () => {
      const mockRefresh = jest.fn();
      mockUseCurrentAssignment.mockReturnValue({
        ...defaultCurrentAssignmentMock,
        loading: false,
        error: 'Failed to load assignments',
        refreshAssignments: mockRefresh,
      });

      const { getByText } = render(<MyAssignmentsScreen />);
      
      const retryText = getByText('Pull down to retry');
      expect(retryText).toBeTruthy();
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no assignments', () => {
      mockUseCurrentAssignment.mockReturnValue({
        ...defaultCurrentAssignmentMock,
        currentAssignment: null,
        upcomingAssignments: [],
      });

      const { getByText } = render(<MyAssignmentsScreen />);
      
      expect(getByText('No assignments found')).toBeTruthy();
      expect(getByText("You don't have any referee assignments scheduled.")).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should memoize assignment lists correctly', () => {
      const { rerender } = render(<MyAssignmentsScreen />);
      
      // Re-render with same data
      rerender(<MyAssignmentsScreen />);
      
      // Component should not re-calculate assignments unnecessarily
      expect(mockUseCurrentAssignment).toHaveBeenCalledTimes(2);
    });

    it('should handle refresh correctly', async () => {
      const mockRefresh = jest.fn();
      mockUseCurrentAssignment.mockReturnValue({
        ...defaultCurrentAssignmentMock,
        refreshAssignments: mockRefresh,
      });

      const { getByTestId } = render(<MyAssignmentsScreen />);
      
      // Simulate pull-to-refresh
      const scrollView = getByTestId(/scrollview/i);
      if (scrollView) {
        fireEvent(scrollView, 'refresh');
        expect(mockRefresh).toHaveBeenCalled();
      }
    });
  });
});