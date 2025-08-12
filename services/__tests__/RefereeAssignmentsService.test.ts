import { RefereeAssignmentsService } from '../RefereeAssignmentsService';
import { VisApiService } from '../VisApiService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RefereeAssignment } from '../../types/RefereeAssignments';

// Mock dependencies
jest.mock('../VisApiService');
jest.mock('@react-native-async-storage/async-storage');

const mockVisApiService = VisApiService as jest.Mocked<typeof VisApiService>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('RefereeAssignmentsService', () => {
  const mockTournamentNo = 'T001';
  const mockReferee = { name: 'Test Referee', id: 'ref_001' };
  
  const mockMatches = [
    {
      MatchNo: 'M001',
      TournamentNo: 'T001',
      Status: 'Running',
      MatchInTournament: 1,
      TeamAName: 'Team Alpha',
      TeamBName: 'Team Beta',
      Round: 'Round 1',
      LocalDate: '2025-08-08',
      LocalTime: '10:00',
      Court: 'Court 1',
      Referee1Name: 'Test Referee',
      Referee2Name: 'Other Referee',
    },
    {
      MatchNo: 'M002',
      TournamentNo: 'T001',
      Status: 'Scheduled',
      MatchInTournament: 2,
      TeamAName: 'Team Gamma',
      TeamBName: 'Team Delta',
      Round: 'Round 1',
      LocalDate: '2025-08-08',
      LocalTime: '11:00',
      Court: 'Court 2',
      Referee1Name: 'Another Referee',
      Referee2Name: 'Test Referee',
    },
    {
      MatchNo: 'M003',
      TournamentNo: 'T001',
      Status: 'Finished',
      MatchInTournament: 3,
      TeamAName: 'Team Echo',
      TeamBName: 'Team Foxtrot',
      Round: 'Round 1',
      LocalDate: '2025-08-07',
      LocalTime: '09:00',
      Court: 'Court 1',
      Referee1Name: 'Test Referee',
      Referee2Name: 'Final Referee',
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current referee
    mockAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === 'referee_profile') {
        return Promise.resolve(JSON.stringify(mockReferee));
      }
      return Promise.resolve(null);
    });
  });

  describe('getCurrentReferee', () => {
    it('should return stored referee profile', async () => {
      const result = await RefereeAssignmentsService.getCurrentReferee();
      expect(result).toEqual(mockReferee);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('referee_profile');
    });

    it('should return null if no referee profile stored', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce(null);
      const result = await RefereeAssignmentsService.getCurrentReferee();
      expect(result).toBeNull();
    });

    it('should handle JSON parse errors gracefully', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid json');
      const result = await RefereeAssignmentsService.getCurrentReferee();
      expect(result).toBeNull();
    });
  });

  describe('setCurrentReferee', () => {
    it('should store referee profile', async () => {
      await RefereeAssignmentsService.setCurrentReferee(mockReferee);
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'referee_profile',
        JSON.stringify(mockReferee)
      );
    });
  });

  describe('getRefereeAssignments', () => {
    beforeEach(() => {
      mockVisApiService.getTournamentMatches.mockResolvedValue(mockMatches);
    });

    it('should fetch and categorize assignments correctly', async () => {
      const result = await RefereeAssignmentsService.getRefereeAssignments(mockTournamentNo);

      expect(result.current).toHaveLength(1);
      expect(result.current[0].status).toBe('Running');
      expect(result.current[0].refereeRole).toBe('referee1');

      expect(result.upcoming).toHaveLength(1);
      expect(result.upcoming[0].status).toBe('Scheduled');
      expect(result.upcoming[0].refereeRole).toBe('referee2');

      expect(result.completed).toHaveLength(1);
      expect(result.completed[0].status).toBe('Finished');
      expect(result.completed[0].refereeRole).toBe('referee1');
    });

    it('should filter matches for current referee only', async () => {
      const nonRefereeMatches = [
        {
          ...mockMatches[0],
          Referee1Name: 'Other Referee',
          Referee2Name: 'Another Referee',
        }
      ];
      mockVisApiService.getTournamentMatches.mockResolvedValue(nonRefereeMatches);

      const result = await RefereeAssignmentsService.getRefereeAssignments(mockTournamentNo);

      expect(result.current).toHaveLength(0);
      expect(result.upcoming).toHaveLength(0);
      expect(result.completed).toHaveLength(0);
    });

    it('should handle API errors gracefully', async () => {
      mockVisApiService.getTournamentMatches.mockRejectedValue(new Error('API Error'));
      
      await expect(
        RefereeAssignmentsService.getRefereeAssignments(mockTournamentNo)
      ).rejects.toThrow('API Error');
    });

    it('should use cached data when forceRefresh is false', async () => {
      const cacheKey = `referee_assignments_${mockTournamentNo}`;
      const cachedData = {
        data: { current: [], upcoming: [], completed: [], cancelled: [] },
        timestamp: Date.now()
      };
      
      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key === cacheKey) {
          return Promise.resolve(JSON.stringify(cachedData));
        }
        if (key === 'referee_profile') {
          return Promise.resolve(JSON.stringify(mockReferee));
        }
        return Promise.resolve(null);
      });

      const result = await RefereeAssignmentsService.getRefereeAssignments(mockTournamentNo, false);
      
      expect(result).toEqual(cachedData.data);
      expect(mockVisApiService.getTournamentMatches).not.toHaveBeenCalled();
    });

    it('should handle cancelled matches correctly', async () => {
      const cancelledMatches = [
        {
          ...mockMatches[0],
          Status: 'Cancelled'
        }
      ];
      mockVisApiService.getTournamentMatches.mockResolvedValue(cancelledMatches);

      const result = await RefereeAssignmentsService.getRefereeAssignments(mockTournamentNo);

      expect(result.cancelled).toHaveLength(1);
      expect(result.cancelled[0].status).toBe('Cancelled');
    });
  });

  describe('getRefreshInterval', () => {
    it('should return 30 seconds for current assignments', () => {
      const assignmentsWithCurrent = {
        current: [mockMatches[0] as any],
        upcoming: [],
        completed: [],
        cancelled: []
      };

      const interval = RefereeAssignmentsService.getRefreshInterval(assignmentsWithCurrent);
      expect(interval).toBe(30000); // 30 seconds
    });

    it('should return 5 minutes for only upcoming assignments', () => {
      const assignmentsWithUpcoming = {
        current: [],
        upcoming: [mockMatches[1] as any],
        completed: [],
        cancelled: []
      };

      const interval = RefereeAssignmentsService.getRefreshInterval(assignmentsWithUpcoming);
      expect(interval).toBe(300000); // 5 minutes
    });

    it('should return 30 minutes for only completed assignments', () => {
      const assignmentsWithCompleted = {
        current: [],
        upcoming: [],
        completed: [mockMatches[2] as any],
        cancelled: []
      };

      const interval = RefereeAssignmentsService.getRefreshInterval(assignmentsWithCompleted);
      expect(interval).toBe(1800000); // 30 minutes
    });
  });

  describe('transformMatchToAssignment', () => {
    it('should transform match data correctly for referee1', () => {
      const match = mockMatches[0];
      const assignment = (RefereeAssignmentsService as any).transformMatchToAssignment(match, 'referee1');

      expect(assignment.matchNo).toBe(match.MatchNo);
      expect(assignment.tournamentNo).toBe(match.TournamentNo);
      expect(assignment.status).toBe(match.Status);
      expect(assignment.refereeRole).toBe('referee1');
      expect(assignment.teamAName).toBe(match.TeamAName);
      expect(assignment.teamBName).toBe(match.TeamBName);
      expect(assignment.court).toBe(match.Court);
      expect(assignment.localTime).toBe(match.LocalTime);
    });

    it('should handle missing optional fields', () => {
      const incompleteMatch = {
        MatchNo: 'M004',
        TournamentNo: 'T001',
        Status: 'Scheduled',
        Referee1Name: 'Test Referee'
      };

      const assignment = (RefereeAssignmentsService as any).transformMatchToAssignment(incompleteMatch, 'referee1');

      expect(assignment.teamAName).toBeUndefined();
      expect(assignment.teamBName).toBeUndefined();
      expect(assignment.court).toBeUndefined();
      expect(assignment.localTime).toBeUndefined();
    });
  });

  describe('cache management', () => {
    it('should cache assignments data', async () => {
      mockVisApiService.getTournamentMatches.mockResolvedValue(mockMatches);
      
      await RefereeAssignmentsService.getRefereeAssignments(mockTournamentNo);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        `referee_assignments_${mockTournamentNo}`,
        expect.stringContaining('"current"')
      );
    });

    it('should not use expired cache', async () => {
      const expiredCache = {
        data: { current: [], upcoming: [], completed: [], cancelled: [] },
        timestamp: Date.now() - (10 * 60 * 1000) // 10 minutes ago
      };

      mockAsyncStorage.getItem.mockImplementation((key: string) => {
        if (key.includes('referee_assignments_')) {
          return Promise.resolve(JSON.stringify(expiredCache));
        }
        if (key === 'referee_profile') {
          return Promise.resolve(JSON.stringify(mockReferee));
        }
        return Promise.resolve(null);
      });

      mockVisApiService.getTournamentMatches.mockResolvedValue(mockMatches);

      await RefereeAssignmentsService.getRefereeAssignments(mockTournamentNo);
      
      expect(mockVisApiService.getTournamentMatches).toHaveBeenCalled();
    });
  });
});