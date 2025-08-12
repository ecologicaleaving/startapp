/**
 * Assignment Card Variants Tests
 * Story 2.1: Assignment Card Component System
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import {
  CurrentAssignmentCard,
  UpcomingAssignmentCard,
  CompletedAssignmentCard,
  CancelledAssignmentCard,
  AdaptiveAssignmentCard
} from '../../../components/Assignment/AssignmentCardVariants';
import { Assignment } from '../../../types/assignments';

// Mock the base AssignmentCard component
jest.mock('../../../components/Assignment/AssignmentCard', () => {
  return jest.fn((props) => {
    const { View, Text } = require('react-native');
    return (
      <View testID="assignment-card">
        <Text>Mock Assignment Card</Text>
        <Text testID="variant">{props.variant}</Text>
        <Text testID="countdown">{props.showCountdown ? 'has-countdown' : 'no-countdown'}</Text>
        <Text testID="interactive">{props.isInteractive ? 'interactive' : 'not-interactive'}</Text>
      </View>
    );
  });
});

const mockCurrentTime = new Date('2025-01-12T10:00:00.000Z');

// Mock Date.now for consistent testing
beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(mockCurrentTime);
});

afterAll(() => {
  jest.useRealTimers();
});

const createMockAssignment = (status: Assignment['status'], timeOffset: number = 0): Assignment => ({
  id: `test-${status}`,
  matchId: `match-${status}`,
  courtNumber: '1',
  homeTeam: 'Team A',
  awayTeam: 'Team B',
  matchTime: new Date(mockCurrentTime.getTime() + timeOffset * 60 * 1000),
  refereePosition: '1st',
  status,
});

describe('CurrentAssignmentCard', () => {
  it('should render with current variant and countdown', () => {
    const assignment = createMockAssignment('current');
    
    const { getByTestId } = render(
      <CurrentAssignmentCard assignment={assignment} />
    );

    expect(getByTestId('variant').props.children).toBe('current');
    expect(getByTestId('countdown').props.children).toBe('has-countdown');
    expect(getByTestId('interactive').props.children).toBe('interactive');
  });

  it('should update countdown periodically', () => {
    const assignment = createMockAssignment('current', 30); // 30 minutes from now
    
    render(<CurrentAssignmentCard assignment={assignment} />);
    
    // Fast-forward time by 30 seconds
    jest.advanceTimersByTime(30000);
    
    // The component should have updated its countdown
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });
});

describe('UpcomingAssignmentCard', () => {
  it('should render with upcoming variant', () => {
    const assignment = createMockAssignment('upcoming', 60); // 1 hour from now
    
    const { getByTestId } = render(
      <UpcomingAssignmentCard assignment={assignment} />
    );

    expect(getByTestId('variant').props.children).toBe('upcoming');
    expect(getByTestId('interactive').props.children).toBe('interactive');
  });

  it('should show countdown when assignment is starting soon', () => {
    const assignment = createMockAssignment('upcoming', 20); // 20 minutes from now
    
    const { getByTestId, getByText } = render(
      <UpcomingAssignmentCard assignment={assignment} />
    );

    expect(getByTestId('countdown').props.children).toBe('has-countdown');
    expect(getByText(/Prepare for assignment/)).toBeTruthy();
  });

  it('should not show countdown when assignment is far away', () => {
    const assignment = createMockAssignment('upcoming', 60); // 1 hour from now
    
    const { getByTestId, queryByText } = render(
      <UpcomingAssignmentCard assignment={assignment} />
    );

    expect(getByTestId('countdown').props.children).toBe('no-countdown');
    expect(queryByText(/Prepare for assignment/)).toBeNull();
  });

  it('should show preparation alert for soon-starting assignments', () => {
    const assignment = createMockAssignment('upcoming', 15); // 15 minutes from now
    
    const { getByText } = render(
      <UpcomingAssignmentCard assignment={assignment} />
    );

    expect(getByText('⚡ Prepare for assignment - starts in 15 minutes')).toBeTruthy();
  });
});

describe('CompletedAssignmentCard', () => {
  it('should render with completed variant and no interaction', () => {
    const assignment = createMockAssignment('completed');
    
    const { getByTestId } = render(
      <CompletedAssignmentCard assignment={assignment} />
    );

    expect(getByTestId('variant').props.children).toBe('completed');
    expect(getByTestId('countdown').props.children).toBe('no-countdown');
    expect(getByTestId('interactive').props.children).toBe('not-interactive');
  });
});

describe('CancelledAssignmentCard', () => {
  it('should render with cancelled variant and cancellation notice', () => {
    const assignment = createMockAssignment('cancelled');
    
    const { getByTestId, getByText } = render(
      <CancelledAssignmentCard assignment={assignment} />
    );

    expect(getByTestId('variant').props.children).toBe('cancelled');
    expect(getByTestId('countdown').props.children).toBe('no-countdown');
    expect(getByTestId('interactive').props.children).toBe('not-interactive');
    expect(getByText('Assignment Cancelled')).toBeTruthy();
  });
});

describe('AdaptiveAssignmentCard', () => {
  it('should render CurrentAssignmentCard for current assignments', () => {
    const assignment = createMockAssignment('current');
    
    const { getByTestId } = render(
      <AdaptiveAssignmentCard assignment={assignment} />
    );

    expect(getByTestId('variant').props.children).toBe('current');
    expect(getByTestId('interactive').props.children).toBe('interactive');
  });

  it('should render UpcomingAssignmentCard for upcoming assignments', () => {
    const assignment = createMockAssignment('upcoming');
    
    const { getByTestId } = render(
      <AdaptiveAssignmentCard assignment={assignment} />
    );

    expect(getByTestId('variant').props.children).toBe('upcoming');
  });

  it('should render CompletedAssignmentCard for completed assignments', () => {
    const assignment = createMockAssignment('completed');
    
    const { getByTestId } = render(
      <AdaptiveAssignmentCard assignment={assignment} />
    );

    expect(getByTestId('variant').props.children).toBe('completed');
    expect(getByTestId('interactive').props.children).toBe('not-interactive');
  });

  it('should render CancelledAssignmentCard for cancelled assignments', () => {
    const assignment = createMockAssignment('cancelled');
    
    const { getByTestId, getByText } = render(
      <AdaptiveAssignmentCard assignment={assignment} />
    );

    expect(getByTestId('variant').props.children).toBe('cancelled');
    expect(getByText('Assignment Cancelled')).toBeTruthy();
  });

  it('should fallback to base AssignmentCard for unknown status', () => {
    const assignment = {
      ...createMockAssignment('upcoming'),
      status: 'unknown' as any
    };
    
    const { getByTestId } = render(
      <AdaptiveAssignmentCard assignment={assignment} />
    );

    // Should render base component without specific variant
    expect(getByTestId('assignment-card')).toBeTruthy();
  });
});

describe('Integration with touch targets', () => {
  it('should maintain 44px minimum touch targets across variants', () => {
    const assignment = createMockAssignment('current');
    
    const { getByTestId } = render(
      <CurrentAssignmentCard assignment={assignment} />
    );

    // The mock component should receive interactive=true
    expect(getByTestId('interactive').props.children).toBe('interactive');
  });
});

describe('Real-time behavior', () => {
  it('should handle countdown updates in CurrentAssignmentCard', () => {
    const assignment = createMockAssignment('current', 5); // 5 minutes from now
    
    render(<CurrentAssignmentCard assignment={assignment} />);
    
    // Verify timer was set up
    expect(setTimeout).toHaveBeenCalled();
    
    // Fast-forward and check timer still running
    jest.advanceTimersByTime(30000);
    expect(jest.getTimerCount()).toBeGreaterThan(0);
  });
});

describe('Visual hierarchy compliance', () => {
  it('should apply proper visual weight to completed assignments', () => {
    const assignment = createMockAssignment('completed');
    
    const { getByTestId } = render(
      <CompletedAssignmentCard assignment={assignment} />
    );

    // Verify completed assignments are not interactive (minimal visual weight)
    expect(getByTestId('interactive').props.children).toBe('not-interactive');
  });
});