import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TournamentDetail from '../../components/TournamentDetail';
import { useRealtimeMatches } from '../../hooks/useRealtimeData';
import { ConnectionState } from '../../services/RealtimeSubscriptionService';
import { Tournament } from '../../types/tournament';

// Mock the real-time data hook
jest.mock('../../hooks/useRealtimeData');
jest.mock('../../services/visApi');

const mockUseRealtimeMatches = useRealtimeMatches as jest.MockedFunction<typeof useRealtimeMatches>;

const mockTournament: Tournament = {
  No: 'TEST_TOURNAMENT_123',
  Name: 'Test Beach Volleyball Tournament',
  Code: 'TBV2025',
  BeachTournamentType: 'BPT',
  Gender: 'M',
  StartDate: '2025-01-15',
  EndDate: '2025-01-17',
  Venue: 'Test Beach Arena',
  Country: 'Test Country'
} as Tournament;

const mockMatches = [
  {
    No: 'M001',
    NoInTournament: '1',
    Status: 'live',
    Court: 'Court 1',
    LocalDate: '2025-01-15',
    LocalTime: '10:00',
    TeamA: 'Team A',
    TeamB: 'Team B',
    PointsA: 21,
    PointsB: 18,
  },
  {
    No: 'M002', 
    NoInTournament: '2',
    Status: 'finished',
    Court: 'Court 2',
    LocalDate: '2025-01-15',
    LocalTime: '12:00',
    TeamA: 'Team C',
    TeamB: 'Team D',
    PointsA: 21,
    PointsB: 19,
  },
];

describe('TournamentDetail Real-Time Integration', () => {
  const mockOnBack = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display connection status indicator', () => {
    mockUseRealtimeMatches.mockReturnValue({
      matches: mockMatches,
      liveMatches: [mockMatches[0]],
      loading: false,
      error: null,
      lastUpdated: new Date(),
      connectionState: ConnectionState.CONNECTED,
      isConnected: true,
      isSubscribed: true,
      hasLiveMatches: true,
      refresh: jest.fn(),
    });

    const { getByTestId } = render(
      <TournamentDetail tournament={mockTournament} onBack={mockOnBack} />
    );

    // Should show connection status indicators
    expect(() => getByTestId('connection-indicator')).not.toThrow();
  });

  it('should show live match indicators when connected with live matches', () => {
    mockUseRealtimeMatches.mockReturnValue({
      matches: mockMatches,
      liveMatches: [mockMatches[0]],
      loading: false,
      error: null,
      lastUpdated: new Date(),
      connectionState: ConnectionState.CONNECTED,
      isConnected: true,
      isSubscribed: true,
      hasLiveMatches: true,
      refresh: jest.fn(),
    });

    const { getByText } = render(
      <TournamentDetail tournament={mockTournament} onBack={mockOnBack} />
    );

    // Should indicate live updates are active
    expect(getByText(/Live Updates/i)).toBeTruthy();
  });

  it('should show connecting state during subscription setup', () => {
    mockUseRealtimeMatches.mockReturnValue({
      matches: [],
      liveMatches: [],
      loading: false,
      error: null,
      lastUpdated: null,
      connectionState: ConnectionState.CONNECTING,
      isConnected: false,
      isSubscribed: false,
      hasLiveMatches: false,
      refresh: jest.fn(),
    });

    const { getByText } = render(
      <TournamentDetail tournament={mockTournament} onBack={mockOnBack} />
    );

    expect(getByText(/Connecting/i)).toBeTruthy();
  });

  it('should show error state when connection fails', () => {
    mockUseRealtimeMatches.mockReturnValue({
      matches: [],
      liveMatches: [],
      loading: false,
      error: 'Connection failed',
      lastUpdated: null,
      connectionState: ConnectionState.ERROR,
      isConnected: false,
      isSubscribed: false,
      hasLiveMatches: false,
      refresh: jest.fn(),
    });

    const { getByText } = render(
      <TournamentDetail tournament={mockTournament} onBack={mockOnBack} />
    );

    expect(getByText(/Connection Error/i)).toBeTruthy();
  });

  it('should call refresh function when retry button is pressed', () => {
    const mockRefresh = jest.fn();
    
    mockUseRealtimeMatches.mockReturnValue({
      matches: [],
      liveMatches: [],
      loading: false,
      error: 'Failed to load matches',
      lastUpdated: null,
      connectionState: ConnectionState.CONNECTED,
      isConnected: true,
      isSubscribed: true,
      hasLiveMatches: false,
      refresh: mockRefresh,
    });

    const { getByText } = render(
      <TournamentDetail tournament={mockTournament} onBack={mockOnBack} />
    );

    const retryButton = getByText('Retry');
    fireEvent.press(retryButton);

    expect(mockRefresh).toHaveBeenCalled();
  });

  it('should display matches with real-time data', () => {
    mockUseRealtimeMatches.mockReturnValue({
      matches: mockMatches,
      liveMatches: [mockMatches[0]],
      loading: false,
      error: null,
      lastUpdated: new Date(),
      connectionState: ConnectionState.CONNECTED,
      isConnected: true,
      isSubscribed: true,
      hasLiveMatches: true,
      refresh: jest.fn(),
    });

    const { getByText } = render(
      <TournamentDetail tournament={mockTournament} onBack={mockOnBack} />
    );

    // Should display matches from the real-time hook
    expect(getByText('Team A')).toBeTruthy();
    expect(getByText('Team B')).toBeTruthy();
    expect(getByText('Team C')).toBeTruthy();
    expect(getByText('Team D')).toBeTruthy();
  });

  it('should show loading state during initial load', () => {
    mockUseRealtimeMatches.mockReturnValue({
      matches: [],
      liveMatches: [],
      loading: true,
      error: null,
      lastUpdated: null,
      connectionState: ConnectionState.CONNECTING,
      isConnected: false,
      isSubscribed: false,
      hasLiveMatches: false,
      refresh: jest.fn(),
    });

    const { getByText } = render(
      <TournamentDetail tournament={mockTournament} onBack={mockOnBack} />
    );

    expect(getByText('Loading matches...')).toBeTruthy();
  });

  it('should handle subscription cleanup on unmount', () => {
    const mockRefresh = jest.fn();
    
    mockUseRealtimeMatches.mockReturnValue({
      matches: mockMatches,
      liveMatches: [mockMatches[0]],
      loading: false,
      error: null,
      lastUpdated: new Date(),
      connectionState: ConnectionState.CONNECTED,
      isConnected: true,
      isSubscribed: true,
      hasLiveMatches: true,
      refresh: mockRefresh,
    });

    const { unmount } = render(
      <TournamentDetail tournament={mockTournament} onBack={mockOnBack} />
    );

    // Should cleanup subscriptions on unmount
    expect(() => unmount()).not.toThrow();
  });

  it('should show reconnecting state during connection recovery', () => {
    mockUseRealtimeMatches.mockReturnValue({
      matches: mockMatches,
      liveMatches: [mockMatches[0]],
      loading: false,
      error: null,
      lastUpdated: new Date('2025-01-15T10:30:00Z'),
      connectionState: ConnectionState.RECONNECTING,
      isConnected: false,
      isSubscribed: true,
      hasLiveMatches: true,
      refresh: jest.fn(),
    });

    const { getByText } = render(
      <TournamentDetail tournament={mockTournament} onBack={mockOnBack} />
    );

    expect(getByText(/Reconnecting/i)).toBeTruthy();
  });

  it('should display last updated timestamp when available', () => {
    const lastUpdated = new Date('2025-01-15T10:30:00Z');
    
    mockUseRealtimeMatches.mockReturnValue({
      matches: mockMatches,
      liveMatches: [mockMatches[0]],
      loading: false,
      error: null,
      lastUpdated,
      connectionState: ConnectionState.CONNECTED,
      isConnected: true,
      isSubscribed: true,
      hasLiveMatches: true,
      refresh: jest.fn(),
    });

    const { getByText } = render(
      <TournamentDetail tournament={mockTournament} onBack={mockOnBack} />
    );

    expect(getByText(/Last updated/i)).toBeTruthy();
  });
});