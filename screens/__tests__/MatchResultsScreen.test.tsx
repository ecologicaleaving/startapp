import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MatchResultsScreen from '../MatchResultsScreen';
import { MatchResultsService } from '../../services/MatchResultsService';
import { TournamentStorageService } from '../../services/TournamentStorageService';

// Mock services
jest.mock('../../services/MatchResultsService');
jest.mock('../../services/TournamentStorageService');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

const mockMatchResultsService = MatchResultsService as jest.Mocked<typeof MatchResultsService>;
const mockTournamentStorageService = TournamentStorageService as jest.Mocked<typeof TournamentStorageService>;

describe('MatchResultsScreen', () => {
  const mockTournament = {
    no: 'T001',
    name: 'Test Tournament',
    beginDate: '2025-08-08',
    endDate: '2025-08-10',
    locationName: 'Test Location',
  };

  const mockLiveMatch = {
    no: 'M001',
    tournamentNo: 'T001',
    teamAName: 'Team Alpha',
    teamBName: 'Team Beta',
    status: 'Running' as const,
    matchPointsA: 1,
    matchPointsB: 1,
    pointsTeamASet1: 21,
    pointsTeamBSet1: 18,
    pointsTeamASet2: 18,
    pointsTeamBSet2: 21,
    pointsTeamASet3: 0,
    pointsTeamBSet3: 0,
    durationSet1: '25:30',
    durationSet2: '28:45',
    durationSet3: '',
    localDate: new Date('2025-08-08T10:00:00.000Z'),
    localTime: '10:00',
    court: 'Court 1',
    round: 'Round 1',
  };

  const mockCompletedMatch = {
    no: 'M002',
    tournamentNo: 'T001',
    teamAName: 'Team Gamma',
    teamBName: 'Team Delta',
    status: 'Finished' as const,
    matchPointsA: 2,
    matchPointsB: 0,
    pointsTeamASet1: 21,
    pointsTeamBSet1: 15,
    pointsTeamASet2: 21,
    pointsTeamBSet2: 18,
    pointsTeamASet3: 0,
    pointsTeamBSet3: 0,
    durationSet1: '22:15',
    durationSet2: '24:30',
    durationSet3: '',
    localDate: new Date('2025-08-08T09:00:00.000Z'),
    localTime: '09:00',
    court: 'Court 2',
    round: 'Round 1',
  };

  const mockMatchResults = {
    live: [mockLiveMatch],
    completed: [mockCompletedMatch],
    scheduled: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
    
    mockTournamentStorageService.getSelectedTournament.mockResolvedValue(mockTournament);
    mockMatchResultsService.getMatchResults.mockResolvedValue(mockMatchResults);
    mockMatchResultsService.getRefreshInterval.mockReturnValue(30000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders loading state initially', async () => {
    mockTournamentStorageService.getSelectedTournament.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve(mockTournament), 100))
    );

    const { getByText } = render(<MatchResultsScreen />);

    expect(getByText('Loading match results...')).toBeTruthy();
  });

  it('loads and displays match results correctly', async () => {
    const { getByText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(getByText('Live Matches')).toBeTruthy();
      expect(getByText('Completed Matches')).toBeTruthy();
      expect(getByText('Team Alpha')).toBeTruthy();
      expect(getByText('Team Gamma')).toBeTruthy();
    });
  });

  it('shows live indicator for live matches', async () => {
    const { getByText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(getByText('1 Live')).toBeTruthy();
      expect(getByText('LIVE')).toBeTruthy();
    });
  });

  it('displays auto-refresh indicator when live matches are present', async () => {
    const { getByText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(getByText('Auto-refreshing every 30s')).toBeTruthy();
    });
  });

  it('handles pull-to-refresh functionality', async () => {
    const { getByLabelText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(mockMatchResultsService.getMatchResults).toHaveBeenCalled();
    });

    const scrollView = getByLabelText('Match results list');
    
    await act(async () => {
      fireEvent(scrollView, 'refresh');
    });

    await waitFor(() => {
      expect(mockMatchResultsService.getMatchResults).toHaveBeenCalledWith('T001', true);
    });
  });

  it('sets up auto-refresh interval for live matches', async () => {
    render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(mockMatchResultsService.getMatchResults).toHaveBeenCalled();
    });

    // Fast forward time to trigger auto-refresh
    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(mockMatchResultsService.getMatchResults).toHaveBeenCalledTimes(2);
    });
  });

  it('handles error state when tournament loading fails', async () => {
    mockTournamentStorageService.getSelectedTournament.mockRejectedValue(
      new Error('Tournament load failed')
    );

    const { getByText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(getByText('Failed to load tournament information')).toBeTruthy();
    });
  });

  it('handles error state when match results loading fails', async () => {
    mockMatchResultsService.getMatchResults.mockRejectedValue(
      new Error('Match results failed')
    );

    const { getByText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(getByText(/Failed to load match results/)).toBeTruthy();
      expect(getByText('Pull down to retry')).toBeTruthy();
    });
  });

  it('shows empty state when no matches available', async () => {
    mockMatchResultsService.getMatchResults.mockResolvedValue({
      live: [],
      completed: [],
      scheduled: [],
    });

    const { getByText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(getByText('No match results available')).toBeTruthy();
      expect(getByText('Pull down to refresh')).toBeTruthy();
    });
  });

  it('shows empty state when no tournament is selected', async () => {
    mockTournamentStorageService.getSelectedTournament.mockResolvedValue(null);

    const { getByText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(getByText(/No tournament selected/)).toBeTruthy();
    });
  });

  it('navigates to match detail when match card is pressed', async () => {
    const mockRouter = { push: jest.fn() };
    jest.doMock('expo-router', () => ({
      useRouter: () => mockRouter,
    }));

    const { getByText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(getByText('Team Alpha')).toBeTruthy();
    });

    fireEvent.press(getByText('Team Alpha'));

    expect(mockRouter.push).toHaveBeenCalledWith({
      pathname: '/match-detail',
      params: { matchNo: 'M001', tournamentNo: 'T001' },
    });
  });

  it('handles only completed matches scenario', async () => {
    const completedOnlyResults = {
      live: [],
      completed: [mockCompletedMatch],
      scheduled: [],
    };

    mockMatchResultsService.getMatchResults.mockResolvedValue(completedOnlyResults);

    const { getByText, queryByText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(getByText('Completed Matches')).toBeTruthy();
      expect(getByText('Team Gamma')).toBeTruthy();
      expect(queryByText('Live Matches')).toBeFalsy();
      expect(queryByText('Auto-refreshing every 30s')).toBeFalsy();
    });
  });

  it('cleans up auto-refresh interval on unmount', async () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
    
    const { unmount } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(mockMatchResultsService.getMatchResults).toHaveBeenCalled();
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('has proper accessibility labels', async () => {
    const { getByLabelText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(getByLabelText('Match results list')).toBeTruthy();
    });
  });

  it('shows correct refresh control configuration', async () => {
    const { getByLabelText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      const scrollView = getByLabelText('Match results list');
      expect(scrollView.props.refreshControl).toBeTruthy();
    });
  });

  it('handles multiple live matches correctly', async () => {
    const multiLiveResults = {
      live: [mockLiveMatch, { ...mockLiveMatch, no: 'M003', teamAName: 'Team Echo' }],
      completed: [],
      scheduled: [],
    };

    mockMatchResultsService.getMatchResults.mockResolvedValue(multiLiveResults);

    const { getByText } = render(<MatchResultsScreen />);

    await waitFor(() => {
      expect(getByText('2 Live')).toBeTruthy();
      expect(getByText('Team Alpha')).toBeTruthy();
      expect(getByText('Team Echo')).toBeTruthy();
    });
  });
});