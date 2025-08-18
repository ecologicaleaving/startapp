import { renderHook, act } from '@testing-library/react-hooks';
import { Alert } from 'react-native';
import { useRefereeManagement } from '../../hooks/useRefereeManagement';
import { VisApiService } from '../../services/visApi';

// Mock dependencies
jest.mock('../../services/visApi');
jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

const mockVisApiService = VisApiService as jest.Mocked<typeof VisApiService>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('useRefereeManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useRefereeManagement());

      expect(result.current.refereeList).toEqual([]);
      expect(result.current.loadingReferees).toBe(false);
      expect(result.current.showRefereeList).toBe(false);
      expect(result.current.selectedReferee).toBeNull();
      expect(result.current.refereeMatches).toEqual([]);
      expect(result.current.loadingRefereeMatches).toBe(false);
      expect(result.current.showRefereeMatches).toBe(false);
      expect(result.current.refereeCacheKey).toBeNull();
    });
  });

  describe('loadRefereeList', () => {
    const mockTournamentNo = 'TOURNAMENT_123';
    const mockMatches = [
      {
        No: 'MATCH_1',
        NoReferee1: 'REF_1',
        Referee1Name: 'John Doe',
        Referee1FederationCode: 'USA',
        NoReferee2: 'REF_2',
        Referee2Name: 'Jane Smith',
        Referee2FederationCode: 'GBR',
      },
    ];

    it('should load referees successfully', async () => {
      mockVisApiService.fetchMatchesDirectFromAPI.mockResolvedValue(mockMatches);

      const { result } = renderHook(() => useRefereeManagement());

      await act(async () => {
        await result.current.loadRefereeList(mockTournamentNo);
      });

      expect(result.current.loadingReferees).toBe(false);
      expect(result.current.refereeList).toHaveLength(2);
      expect(result.current.refereeList[0]).toEqual({
        No: 'REF_2',
        Name: 'Jane Smith',
        FederationCode: 'GBR',
      });
      expect(result.current.showRefereeList).toBe(true);
      expect(result.current.refereeCacheKey).toBe(mockTournamentNo);
    });

    it('should use cached data when available', async () => {
      const { result } = renderHook(() => useRefereeManagement());

      // First load
      mockVisApiService.fetchMatchesDirectFromAPI.mockResolvedValue(mockMatches);
      await act(async () => {
        await result.current.loadRefereeList(mockTournamentNo);
      });

      // Clear the mock call count
      mockVisApiService.fetchMatchesDirectFromAPI.mockClear();

      // Second load should use cache
      await act(async () => {
        await result.current.loadRefereeList(mockTournamentNo);
      });

      expect(mockVisApiService.fetchMatchesDirectFromAPI).not.toHaveBeenCalled();
      expect(result.current.showRefereeList).toBe(true);
    });

    it('should handle no tournament error', async () => {
      const { result } = renderHook(() => useRefereeManagement());

      await act(async () => {
        await result.current.loadRefereeList('');
      });

      expect(mockAlert).toHaveBeenCalledWith('Error', 'No tournament selected');
    });

    it('should handle no matches found', async () => {
      mockVisApiService.fetchMatchesDirectFromAPI.mockResolvedValue([]);

      const { result } = renderHook(() => useRefereeManagement());

      await act(async () => {
        await result.current.loadRefereeList(mockTournamentNo);
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'No Referees Found',
        expect.stringContaining('no matches scheduled yet')
      );
    });

    it('should handle no referees in matches', async () => {
      const matchesWithoutReferees = [
        {
          No: 'MATCH_1',
          TeamAName: 'Team A',
          TeamBName: 'Team B',
        },
      ];

      mockVisApiService.fetchMatchesDirectFromAPI.mockResolvedValue(matchesWithoutReferees);

      const { result } = renderHook(() => useRefereeManagement());

      await act(async () => {
        await result.current.loadRefereeList(mockTournamentNo);
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'No Referees Found',
        expect.stringContaining('do not have referee assignments yet')
      );
    });

    it('should handle API errors', async () => {
      const mockError = new Error('API Error');
      mockVisApiService.fetchMatchesDirectFromAPI.mockRejectedValue(mockError);

      const { result } = renderHook(() => useRefereeManagement());

      await act(async () => {
        await result.current.loadRefereeList(mockTournamentNo);
      });

      expect(mockAlert).toHaveBeenCalledWith(
        'Error',
        'Failed to load referee list. Please check your connection and try again.'
      );
      expect(result.current.loadingReferees).toBe(false);
    });
  });

  describe('selectReferee', () => {
    const mockReferee = {
      No: 'REF_1',
      Name: 'John Doe',
      FederationCode: 'USA',
    };

    const mockTournamentNo = 'TOURNAMENT_123';
    const mockMatches = [
      {
        No: 'MATCH_1',
        Referee1Name: 'John Doe',
        Date: '2025-01-01',
      },
    ];

    it('should select referee and load matches', async () => {
      mockVisApiService.getBeachMatchList.mockResolvedValue(mockMatches);

      const { result } = renderHook(() => useRefereeManagement());

      await act(async () => {
        await result.current.selectReferee(mockReferee, mockTournamentNo);
      });

      expect(result.current.selectedReferee).toEqual(mockReferee);
      expect(result.current.showRefereeList).toBe(false);
      expect(result.current.showRefereeMatches).toBe(true);
      expect(result.current.refereeMatches).toEqual(mockMatches);
    });

    it('should handle referee selection errors', async () => {
      const mockError = new Error('Load matches error');
      mockVisApiService.getBeachMatchList.mockRejectedValue(mockError);

      const { result } = renderHook(() => useRefereeManagement());

      await act(async () => {
        await result.current.selectReferee(mockReferee, mockTournamentNo);
      });

      expect(mockAlert).toHaveBeenCalledWith('Error', 'Failed to load referee matches');
    });
  });

  describe('clearRefereeData', () => {
    it('should clear all referee data', () => {
      const { result } = renderHook(() => useRefereeManagement());

      // Set some data first
      act(() => {
        result.current.setShowRefereeList(true);
        result.current.setShowRefereeMatches(true);
      });

      // Clear data
      act(() => {
        result.current.clearRefereeData();
      });

      expect(result.current.refereeList).toEqual([]);
      expect(result.current.selectedReferee).toBeNull();
      expect(result.current.refereeMatches).toEqual([]);
      expect(result.current.showRefereeList).toBe(false);
      expect(result.current.showRefereeMatches).toBe(false);
      expect(result.current.refereeCacheKey).toBeNull();
    });
  });

  describe('state setters', () => {
    it('should update showRefereeList', () => {
      const { result } = renderHook(() => useRefereeManagement());

      act(() => {
        result.current.setShowRefereeList(true);
      });

      expect(result.current.showRefereeList).toBe(true);

      act(() => {
        result.current.setShowRefereeList(false);
      });

      expect(result.current.showRefereeList).toBe(false);
    });

    it('should update showRefereeMatches', () => {
      const { result } = renderHook(() => useRefereeManagement());

      act(() => {
        result.current.setShowRefereeMatches(true);
      });

      expect(result.current.showRefereeMatches).toBe(true);

      act(() => {
        result.current.setShowRefereeMatches(false);
      });

      expect(result.current.showRefereeMatches).toBe(false);
    });
  });
});