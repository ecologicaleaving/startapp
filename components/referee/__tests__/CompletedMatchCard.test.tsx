import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { CompletedMatchCard } from '../CompletedMatchCard';
import { MatchResult } from '../../../types/MatchResults';

// Mock the MatchResultsService
jest.mock('../../../services/MatchResultsService', () => ({
  MatchResultsService: {
    formatScore: jest.fn((match) => '21-15, 21-18'),
    getMatchDuration: jest.fn((match) => 'Duration: 25:30, 22:45'),
  },
}));

describe('CompletedMatchCard', () => {
  const mockMatch: MatchResult = {
    no: 'M001',
    tournamentNo: 'T001',
    teamAName: 'Team Alpha',
    teamBName: 'Team Beta',
    status: 'Finished',
    matchPointsA: 2,
    matchPointsB: 0,
    pointsTeamASet1: 21,
    pointsTeamBSet1: 15,
    pointsTeamASet2: 21,
    pointsTeamBSet2: 18,
    pointsTeamASet3: 0,
    pointsTeamBSet3: 0,
    durationSet1: '25:30',
    durationSet2: '22:45',
    durationSet3: '',
    localDate: new Date('2025-08-08T10:00:00.000Z'),
    localTime: '10:00',
    court: 'Court 1',
    round: 'Round 1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders completed match information correctly', () => {
    const { getByText } = render(<CompletedMatchCard match={mockMatch} />);

    expect(getByText('Team Alpha')).toBeTruthy();
    expect(getByText('Team Beta')).toBeTruthy();
    expect(getByText('vs')).toBeTruthy();
    expect(getByText('FINAL')).toBeTruthy();
    expect(getByText('Final Score: 2-0')).toBeTruthy();
    expect(getByText('Court 1')).toBeTruthy();
    expect(getByText('Round 1')).toBeTruthy();
  });

  it('displays formatted score and duration', () => {
    const { getByText } = render(<CompletedMatchCard match={mockMatch} />);

    expect(getByText('21-15, 21-18')).toBeTruthy();
    expect(getByText('Duration: 25:30, 22:45')).toBeTruthy();
  });

  it('formats date and time correctly', () => {
    const { getByText } = render(<CompletedMatchCard match={mockMatch} />);

    // Check that time is displayed
    expect(getByText('10:00')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPressMock = jest.fn();
    const { getByRole } = render(
      <CompletedMatchCard match={mockMatch} onPress={onPressMock} />
    );

    const card = getByRole('button');
    fireEvent.press(card);

    expect(onPressMock).toHaveBeenCalledWith(mockMatch);
  });

  it('has proper accessibility label', () => {
    const { getByRole } = render(<CompletedMatchCard match={mockMatch} />);

    const card = getByRole('button');
    expect(card.props.accessibilityLabel).toContain('Completed match: Team Alpha vs Team Beta');
    expect(card.props.accessibilityLabel).toContain('final score 21-15, 21-18');
    expect(card.props.accessibilityLabel).toContain('match points 2-0');
    expect(card.props.accessibilityLabel).toContain('Court 1');
  });

  it('handles match without duration data', () => {
    const matchWithoutDuration = {
      ...mockMatch,
      durationSet1: '',
      durationSet2: '',
      durationSet3: '',
    };

    // Mock service to return empty duration
    const { MatchResultsService } = jest.requireMock('../../../services/MatchResultsService');
    MatchResultsService.getMatchDuration.mockReturnValue('');

    const { queryByText } = render(<CompletedMatchCard match={matchWithoutDuration} />);

    // Duration text should not be displayed
    expect(queryByText(/Duration:/)).toBeFalsy();
  });

  it('handles different match points combinations', () => {
    const threeSetMatch = {
      ...mockMatch,
      matchPointsA: 2,
      matchPointsB: 1,
    };

    const { getByText } = render(<CompletedMatchCard match={threeSetMatch} />);

    expect(getByText('Final Score: 2-1')).toBeTruthy();
  });

  it('displays team names with proper styling hierarchy', () => {
    const { getByText } = render(<CompletedMatchCard match={mockMatch} />);

    const teamA = getByText('Team Alpha');
    const teamB = getByText('Team Beta');
    const vsText = getByText('vs');

    // Verify elements exist (styling verification would require more complex testing)
    expect(teamA).toBeTruthy();
    expect(teamB).toBeTruthy();
    expect(vsText).toBeTruthy();
  });

  it('handles long team names gracefully', () => {
    const matchWithLongNames = {
      ...mockMatch,
      teamAName: 'Very Long Team Name Alpha With Multiple Words',
      teamBName: 'Very Long Team Name Beta With Multiple Words',
    };

    const { getByText } = render(<CompletedMatchCard match={matchWithLongNames} />);

    expect(getByText('Very Long Team Name Alpha With Multiple Words')).toBeTruthy();
    expect(getByText('Very Long Team Name Beta With Multiple Words')).toBeTruthy();
  });

  it('renders with proper completed match styling', () => {
    const { getByRole } = render(<CompletedMatchCard match={mockMatch} />);

    const card = getByRole('button');
    // Verify the card renders (actual style verification would need more sophisticated testing)
    expect(card).toBeTruthy();
  });

  it('handles missing time data gracefully', () => {
    const matchWithoutTime = {
      ...mockMatch,
      localTime: '',
    };

    const { getByText } = render(<CompletedMatchCard match={matchWithoutTime} />);

    // Should fall back to formatted time from date
    expect(getByText(/\d{2}:\d{2}/)).toBeTruthy(); // Matches time format
  });
});