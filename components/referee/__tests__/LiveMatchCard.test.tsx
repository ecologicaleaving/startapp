import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { LiveMatchCard } from '../LiveMatchCard';
import { MatchResult } from '../../../types/MatchResults';

// Mock the MatchResultsService
jest.mock('../../../services/MatchResultsService', () => ({
  MatchResultsService: {
    formatScore: jest.fn((match) => '21-15, 18-21, 15-12'),
  },
}));

describe('LiveMatchCard', () => {
  const mockLiveMatch: MatchResult = {
    no: 'M001',
    tournamentNo: 'T001',
    teamAName: 'Team Alpha',
    teamBName: 'Team Beta',
    status: 'Running',
    matchPointsA: 2,
    matchPointsB: 1,
    pointsTeamASet1: 21,
    pointsTeamBSet1: 15,
    pointsTeamASet2: 18,
    pointsTeamBSet2: 21,
    pointsTeamASet3: 15,
    pointsTeamBSet3: 12,
    durationSet1: '25:30',
    durationSet2: '28:45',
    durationSet3: '18:20',
    localDate: new Date('2025-08-08T10:00:00.000Z'),
    localTime: '10:00',
    court: 'Court 1',
    round: 'Round 1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders live match information correctly', () => {
    const { getByText } = render(<LiveMatchCard match={mockLiveMatch} />);

    expect(getByText('Team Alpha')).toBeTruthy();
    expect(getByText('Team Beta')).toBeTruthy();
    expect(getByText('vs')).toBeTruthy();
    expect(getByText('LIVE')).toBeTruthy();
    expect(getByText('Match Points: 2-1')).toBeTruthy();
    expect(getByText('Court 1')).toBeTruthy();
    expect(getByText('Round 1')).toBeTruthy();
  });

  it('displays formatted score from service', () => {
    const { getByText } = render(<LiveMatchCard match={mockLiveMatch} />);

    expect(getByText('21-15, 18-21, 15-12')).toBeTruthy();
  });

  it('formats date and time correctly', () => {
    const { getByText } = render(<LiveMatchCard match={mockLiveMatch} />);

    // Check that time is displayed
    expect(getByText('10:00')).toBeTruthy();
  });

  it('calls onPress when card is pressed', () => {
    const onPressMock = jest.fn();
    const { getByRole } = render(
      <LiveMatchCard match={mockLiveMatch} onPress={onPressMock} />
    );

    const card = getByRole('button');
    fireEvent.press(card);

    expect(onPressMock).toHaveBeenCalledWith(mockLiveMatch);
  });

  it('has proper accessibility label for live match', () => {
    const { getByRole } = render(<LiveMatchCard match={mockLiveMatch} />);

    const card = getByRole('button');
    expect(card.props.accessibilityLabel).toContain('Live match: Team Alpha vs Team Beta');
    expect(card.props.accessibilityLabel).toContain('current score 21-15, 18-21, 15-12');
    expect(card.props.accessibilityLabel).toContain('match points 2-1');
    expect(card.props.accessibilityLabel).toContain('10:00 on Court 1');
  });

  it('handles different match points combinations', () => {
    const twoSetMatch = {
      ...mockLiveMatch,
      matchPointsA: 1,
      matchPointsB: 1,
    };

    const { getByText } = render(<LiveMatchCard match={twoSetMatch} />);

    expect(getByText('Match Points: 1-1')).toBeTruthy();
  });

  it('displays live status badge prominently', () => {
    const { getByText } = render(<LiveMatchCard match={mockLiveMatch} />);

    const liveStatus = getByText('LIVE');
    expect(liveStatus).toBeTruthy();
  });

  it('handles long team names gracefully', () => {
    const matchWithLongNames = {
      ...mockLiveMatch,
      teamAName: 'Very Long Team Name Alpha With Multiple Words',
      teamBName: 'Very Long Team Name Beta With Multiple Words',
    };

    const { getByText } = render(<LiveMatchCard match={matchWithLongNames} />);

    expect(getByText('Very Long Team Name Alpha With Multiple Words')).toBeTruthy();
    expect(getByText('Very Long Team Name Beta With Multiple Words')).toBeTruthy();
  });

  it('renders with live match styling (high contrast green)', () => {
    const { getByRole } = render(<LiveMatchCard match={mockLiveMatch} />);

    const card = getByRole('button');
    // Verify the card renders (actual style verification would need more sophisticated testing)
    expect(card).toBeTruthy();
  });

  it('handles missing time data gracefully', () => {
    const matchWithoutTime = {
      ...mockLiveMatch,
      localTime: '',
    };

    const { getByText } = render(<LiveMatchCard match={matchWithoutTime} />);

    // Should fall back to formatted time from date
    expect(getByText(/\d{2}:\d{2}/)).toBeTruthy(); // Matches time format
  });

  it('handles zero match points for early match', () => {
    const earlyMatch = {
      ...mockLiveMatch,
      matchPointsA: 0,
      matchPointsB: 0,
    };

    const { getByText } = render(<LiveMatchCard match={earlyMatch} />);

    expect(getByText('Match Points: 0-0')).toBeTruthy();
  });

  it('displays live indicator element', () => {
    const { getByText } = render(<LiveMatchCard match={mockLiveMatch} />);

    // The live indicator dot is rendered but text content verification
    const liveText = getByText('LIVE');
    expect(liveText).toBeTruthy();
  });

  it('shows proper match context information', () => {
    const { getByText } = render(<LiveMatchCard match={mockLiveMatch} />);

    expect(getByText('Court 1')).toBeTruthy();
    expect(getByText('Round 1')).toBeTruthy();
  });

  it('handles different court formats', () => {
    const matchDifferentCourt = {
      ...mockLiveMatch,
      court: 'Center Court',
      round: 'Semifinal',
    };

    const { getByText } = render(<LiveMatchCard match={matchDifferentCourt} />);

    expect(getByText('Center Court')).toBeTruthy();
    expect(getByText('Semifinal')).toBeTruthy();
  });
});