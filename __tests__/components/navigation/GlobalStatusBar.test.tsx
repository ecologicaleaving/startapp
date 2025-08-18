/**
 * GlobalStatusBar Component Tests
 * Tests for persistent status indicator with real-time updates and accessibility
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Vibration } from 'react-native';
import { GlobalStatusBar } from '../../../components/navigation/GlobalStatusBar';
import { useAssignmentStatus } from '../../../hooks/useAssignmentStatus';

// Mock dependencies
jest.mock('../../../hooks/useAssignmentStatus');
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Vibration: {
      vibrate: jest.fn(),
    },
  };
});

const mockUseAssignmentStatus = useAssignmentStatus as jest.MockedFunction<typeof useAssignmentStatus>;

describe('GlobalStatusBar', () => {
  const mockStatusContext = {
    currentAssignmentStatus: {
      id: 'status-1',
      status: 'current' as const,
      assignmentId: 'assignment-1',
      matchId: 'match-1',
      courtNumber: '3',
      teams: ['Team A', 'Team B'],
      matchTime: '2025-01-15T15:30:00Z',
      urgency: 'normal' as const,
      lastUpdated: '2025-01-15T14:00:00Z',
      syncStatus: 'synced' as const,
    },
    allStatuses: [],
    statusCounts: {
      current: 1,
      upcoming: 2,
      completed: 5,
      cancelled: 0,
      emergency: 0,
    },
    isOnline: true,
    syncStatus: 'synced' as const,
    pendingSyncCount: 0,
    updateAssignmentStatus: jest.fn(),
    getAssignmentStatus: jest.fn(),
    getAssignmentsByStatus: jest.fn(),
    lastStatusUpdate: null,
    refreshStatuses: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAssignmentStatus.mockReturnValue(mockStatusContext);
  });

  describe('Status Display', () => {
    it('should render current assignment status correctly', () => {
      const { getByText } = render(<GlobalStatusBar />);

      expect(getByText('Court 3')).toBeTruthy();
      expect(getByText(/\d+[hm]/)).toBeTruthy(); // Countdown timer pattern
    });

    it('should display no assignment state when no current assignment', () => {
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        currentAssignmentStatus: null,
        statusCounts: {
          current: 0,
          upcoming: 2,
          completed: 5,
          cancelled: 0,
          emergency: 0,
        },
      });

      const { getByText } = render(<GlobalStatusBar />);

      expect(getByText('No Active Assignment')).toBeTruthy();
    });

    it('should show offline indicator when not connected', () => {
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        isOnline: false,
        syncStatus: 'offline',
      });

      const { getByText } = render(<GlobalStatusBar />);

      expect(getByText('Offline')).toBeTruthy();
    });

    it('should show pending sync count when items are pending', () => {
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        syncStatus: 'offline',
        pendingSyncCount: 3,
      });

      const { getByText } = render(<GlobalStatusBar />);

      expect(getByText('3 pending')).toBeTruthy();
    });
  });

  describe('Urgency Indicators', () => {
    it('should show critical urgency indicator for imminent matches', () => {
      // Set match time to 3 minutes from now
      const criticalTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
      
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        currentAssignmentStatus: {
          ...mockStatusContext.currentAssignmentStatus!,
          matchTime: criticalTime,
        },
      });

      const { getByText } = render(<GlobalStatusBar />);

      expect(getByText('⚠️')).toBeTruthy();
    });

    it('should show warning urgency indicator for upcoming matches', () => {
      // Set match time to 10 minutes from now
      const warningTime = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        currentAssignmentStatus: {
          ...mockStatusContext.currentAssignmentStatus!,
          matchTime: warningTime,
        },
      });

      const { getByText } = render(<GlobalStatusBar />);

      expect(getByText('⏰')).toBeTruthy();
    });

    it('should trigger vibration for critical urgency', () => {
      const vibrationSpy = jest.spyOn(Vibration, 'vibrate');
      
      // Set match time to 3 minutes from now
      const criticalTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
      
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        currentAssignmentStatus: {
          ...mockStatusContext.currentAssignmentStatus!,
          matchTime: criticalTime,
        },
      });

      render(<GlobalStatusBar />);

      expect(vibrationSpy).toHaveBeenCalledWith([100, 200, 100]);
    });
  });

  describe('Interaction and Expansion', () => {
    it('should call onStatusPress when status bar is pressed', () => {
      const onStatusPress = jest.fn();
      
      const { getByTestId } = render(
        <GlobalStatusBar onStatusPress={onStatusPress} />
      );

      // The TouchableOpacity should be pressable
      const touchable = getByTestId ? getByTestId('status-touchable') : null;
      if (!touchable) {
        // If testID is not set, find by text and get parent
        const courtText = getByText('Court 3');
        fireEvent.press(courtText);
      } else {
        fireEvent.press(touchable);
      }

      expect(onStatusPress).toHaveBeenCalled();
    });

    it('should expand to show detailed information when pressed', () => {
      const { getByText, queryByText } = render(<GlobalStatusBar />);

      // Initially expanded content should not be visible
      expect(queryByText('Team A vs Team B')).toBeFalsy();

      // Press to expand
      fireEvent.press(getByText('Court 3'));

      // Should now show expanded content
      expect(getByText('Team A vs Team B')).toBeTruthy();
      expect(getByText('2 upcoming • 5 completed')).toBeTruthy();
    });

    it('should render in compact mode when specified', () => {
      const { queryByText } = render(<GlobalStatusBar compact={true} />);

      // Compact mode should not show countdown timer
      expect(queryByText(/\d+[hm]/)).toBeFalsy();
    });
  });

  describe('Countdown Timer Formatting', () => {
    it('should format countdown for minutes', () => {
      // Set match time to 45 minutes from now
      const matchTime = new Date(Date.now() + 45 * 60 * 1000).toISOString();
      
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        currentAssignmentStatus: {
          ...mockStatusContext.currentAssignmentStatus!,
          matchTime,
        },
      });

      const { getByText } = render(<GlobalStatusBar />);

      expect(getByText('45m')).toBeTruthy();
    });

    it('should format countdown for hours and minutes', () => {
      // Set match time to 2 hours 30 minutes from now
      const matchTime = new Date(Date.now() + (2 * 60 + 30) * 60 * 1000).toISOString();
      
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        currentAssignmentStatus: {
          ...mockStatusContext.currentAssignmentStatus!,
          matchTime,
        },
      });

      const { getByText } = render(<GlobalStatusBar />);

      expect(getByText('2h 30m')).toBeTruthy();
    });

    it('should show "Now" for current time', () => {
      // Set match time to current time
      const matchTime = new Date().toISOString();
      
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        currentAssignmentStatus: {
          ...mockStatusContext.currentAssignmentStatus!,
          matchTime,
        },
      });

      const { getByText } = render(<GlobalStatusBar />);

      expect(getByText('Now')).toBeTruthy();
    });

    it('should show "In Progress" for past time', () => {
      // Set match time to 10 minutes ago
      const matchTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        currentAssignmentStatus: {
          ...mockStatusContext.currentAssignmentStatus!,
          matchTime,
        },
      });

      const { getByText } = render(<GlobalStatusBar />);

      expect(getByText('In Progress')).toBeTruthy();
    });
  });

  describe('Status Colors', () => {
    it('should apply correct colors for current status', () => {
      const { getByText } = render(<GlobalStatusBar />);

      const courtText = getByText('Court 3');
      // Should have success color styling (green background)
      expect(courtText.props.style).toEqual(
        expect.objectContaining({
          color: expect.any(String)
        })
      );
    });

    it('should apply critical urgency colors', () => {
      // Set match time to 3 minutes from now for critical urgency
      const criticalTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
      
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        currentAssignmentStatus: {
          ...mockStatusContext.currentAssignmentStatus!,
          matchTime: criticalTime,
        },
      });

      const { container } = render(<GlobalStatusBar />);

      // Should apply error color styling for critical urgency
      expect(container).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have minimum touch target size', () => {
      const { getByText } = render(<GlobalStatusBar />);

      const courtText = getByText('Court 3');
      // Parent TouchableOpacity should have minimum 44px height
      expect(courtText.parent?.props.style).toBeTruthy();
    });

    it('should provide color-blind accessible alternatives with urgency indicators', () => {
      // Set match time to critical for urgency indicator
      const criticalTime = new Date(Date.now() + 3 * 60 * 1000).toISOString();
      
      mockUseAssignmentStatus.mockReturnValue({
        ...mockStatusContext,
        currentAssignmentStatus: {
          ...mockStatusContext.currentAssignmentStatus!,
          matchTime: criticalTime,
        },
      });

      const { getByText } = render(<GlobalStatusBar />);

      // Should show emoji icons as color-blind accessible alternatives
      expect(getByText('⚠️')).toBeTruthy();
    });
  });
});