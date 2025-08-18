import { MatchProcessingService } from '../../services/MatchProcessingService';
import { BeachMatch } from '../../types/match';

describe('MatchProcessingService', () => {
  const mockMatches: BeachMatch[] = [
    {
      No: 'MATCH_1',
      Date: '2025-01-15',
      LocalTime: '10:00',
      Court: 'Court 1',
      TeamAName: 'Team A',
      TeamBName: 'Team B',
      MatchPointsA: '2',
      MatchPointsB: '1',
      Referee1Name: 'John Doe',
      NoReferee1: 'REF_1',
      Referee2Name: 'Jane Smith',
      NoReferee2: 'REF_2',
    },
    {
      No: 'MATCH_2',
      Date: '2025-01-16',
      LocalTime: '14:30',
      Court: 'Court 2',
      TeamAName: 'Team C',
      TeamBName: 'Team D',
      MatchPointsA: '0',
      MatchPointsB: '2',
      Referee1Name: 'John Doe',
      NoReferee1: 'REF_1',
    },
    {
      No: 'MATCH_3',
      Date: '2025-01-15',
      LocalTime: '08:30',
      Court: 'Court 1',
      TeamAName: 'Team E',
      TeamBName: 'Team F',
      MatchPointsA: '1',
      MatchPointsB: '1',
    },
  ];

  describe('getUniqueDates', () => {
    it('should extract and sort unique dates', () => {
      const dates = MatchProcessingService.getUniqueDates(mockMatches);
      
      expect(dates).toEqual(['2025-01-15', '2025-01-16']);
    });

    it('should handle matches with missing dates', () => {
      const matchesWithMissingDates = [
        { ...mockMatches[0] },
        { ...mockMatches[1], Date: undefined },
      ];

      const dates = MatchProcessingService.getUniqueDates(matchesWithMissingDates);
      
      expect(dates).toEqual(['2025-01-15']);
    });

    it('should return empty array for no matches', () => {
      const dates = MatchProcessingService.getUniqueDates([]);
      
      expect(dates).toEqual([]);
    });
  });

  describe('sortMatchesByTime', () => {
    it('should sort matches by time in ascending order', () => {
      const sorted = MatchProcessingService.sortMatchesByTime(mockMatches);
      
      expect(sorted[0].LocalTime).toBe('08:30');
      expect(sorted[1].LocalTime).toBe('10:00');
      expect(sorted[2].LocalTime).toBe('14:30');
    });

    it('should handle matches with missing times', () => {
      const matchesWithMissingTimes = [
        { ...mockMatches[0], LocalTime: undefined },
        { ...mockMatches[1] },
      ];

      const sorted = MatchProcessingService.sortMatchesByTime(matchesWithMissingTimes);
      
      expect(sorted[0].LocalTime).toBe(undefined); // Should use '00:00' fallback
      expect(sorted[1].LocalTime).toBe('14:30');
    });
  });

  describe('filterMatchesByDate', () => {
    it('should filter matches by specific date', () => {
      const filtered = MatchProcessingService.filterMatchesByDate(mockMatches, '2025-01-15');
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(match => match.Date === '2025-01-15')).toBe(true);
    });

    it('should return empty array for non-existent date', () => {
      const filtered = MatchProcessingService.filterMatchesByDate(mockMatches, '2025-01-20');
      
      expect(filtered).toEqual([]);
    });
  });

  describe('filterMatchesByCourt', () => {
    it('should filter matches by specific court', () => {
      const filtered = MatchProcessingService.filterMatchesByCourt(mockMatches, 'Court 1');
      
      expect(filtered).toHaveLength(2);
      expect(filtered.every(match => match.Court === 'Court 1')).toBe(true);
    });

    it('should return all matches for "All Courts"', () => {
      const filtered = MatchProcessingService.filterMatchesByCourt(mockMatches, 'All Courts');
      
      expect(filtered).toEqual(mockMatches);
    });
  });

  describe('getUniqueCourts', () => {
    it('should extract unique courts', () => {
      const courts = MatchProcessingService.getUniqueCourts(mockMatches);
      
      expect(courts).toEqual(['Court 1', 'Court 2']);
    });

    it('should handle matches with missing courts', () => {
      const matchesWithMissingCourts = [
        { ...mockMatches[0] },
        { ...mockMatches[1], Court: undefined },
      ];

      const courts = MatchProcessingService.getUniqueCourts(matchesWithMissingCourts);
      
      expect(courts).toEqual(['Court 1']);
    });
  });

  describe('extractReferees', () => {
    it('should extract unique referees from matches', () => {
      const referees = MatchProcessingService.extractReferees(mockMatches);
      
      expect(referees).toHaveLength(2);
      expect(referees.find(r => r.Name === 'John Doe')).toEqual({
        No: 'REF_1',
        Name: 'John Doe',
        FederationCode: undefined,
      });
      expect(referees.find(r => r.Name === 'Jane Smith')).toEqual({
        No: 'REF_2',
        Name: 'Jane Smith',
        FederationCode: undefined,
      });
    });

    it('should sort referees by name', () => {
      const referees = MatchProcessingService.extractReferees(mockMatches);
      
      expect(referees[0].Name).toBe('Jane Smith');
      expect(referees[1].Name).toBe('John Doe');
    });

    it('should handle matches with no referees', () => {
      const matchesWithoutReferees = [
        {
          No: 'MATCH_1',
          TeamAName: 'Team A',
          TeamBName: 'Team B',
        },
      ];

      const referees = MatchProcessingService.extractReferees(matchesWithoutReferees);
      
      expect(referees).toEqual([]);
    });
  });

  describe('findRefereeMatches', () => {
    it('should find matches for specific referee', () => {
      const matches = MatchProcessingService.findRefereeMatches(mockMatches, 'John Doe');
      
      expect(matches).toHaveLength(2);
      expect(matches.every(match => 
        match.Referee1Name?.includes('John Doe') || 
        match.Referee2Name?.includes('John Doe')
      )).toBe(true);
    });

    it('should return empty array for non-existent referee', () => {
      const matches = MatchProcessingService.findRefereeMatches(mockMatches, 'Non Existent');
      
      expect(matches).toEqual([]);
    });
  });

  describe('getDefaultDate', () => {
    it('should return the last date chronologically', () => {
      const defaultDate = MatchProcessingService.getDefaultDate(mockMatches);
      
      expect(defaultDate).toBe('2025-01-16');
    });

    it('should return null for no matches', () => {
      const defaultDate = MatchProcessingService.getDefaultDate([]);
      
      expect(defaultDate).toBeNull();
    });
  });

  describe('hasMatchResult', () => {
    it('should return true for matches with scores', () => {
      const hasResult = MatchProcessingService.hasMatchResult(mockMatches[0]);
      
      expect(hasResult).toBe(true);
    });

    it('should return false for matches without scores', () => {
      const matchWithoutScore = {
        ...mockMatches[0],
        MatchPointsA: '0',
        MatchPointsB: '0',
      };

      const hasResult = MatchProcessingService.hasMatchResult(matchWithoutScore);
      
      expect(hasResult).toBe(false);
    });
  });

  describe('getMatchWinner', () => {
    it('should identify team A as winner', () => {
      const winner = MatchProcessingService.getMatchWinner(mockMatches[0]);
      
      expect(winner.teamAWon).toBe(true);
      expect(winner.teamBWon).toBe(false);
      expect(winner.isDraw).toBe(false);
    });

    it('should identify team B as winner', () => {
      const winner = MatchProcessingService.getMatchWinner(mockMatches[1]);
      
      expect(winner.teamAWon).toBe(false);
      expect(winner.teamBWon).toBe(true);
      expect(winner.isDraw).toBe(false);
    });

    it('should identify draw', () => {
      const winner = MatchProcessingService.getMatchWinner(mockMatches[2]);
      
      expect(winner.teamAWon).toBe(false);
      expect(winner.teamBWon).toBe(false);
      expect(winner.isDraw).toBe(true);
    });
  });

  describe('formatMatchTime', () => {
    it('should return time as-is for valid time', () => {
      const formatted = MatchProcessingService.formatMatchTime('14:30');
      
      expect(formatted).toBe('14:30');
    });

    it('should return TBD for missing time', () => {
      const formatted = MatchProcessingService.formatMatchTime(undefined);
      
      expect(formatted).toBe('TBD');
    });
  });

  describe('formatMatchDate', () => {
    it('should format date correctly', () => {
      const formatted = MatchProcessingService.formatMatchDate('2025-01-15');
      
      expect(formatted).toBe('Wed, Jan 15');
    });

    it('should return original string for invalid date', () => {
      const formatted = MatchProcessingService.formatMatchDate('invalid-date');
      
      expect(formatted).toBe('invalid-date');
    });

    it('should return "Unknown Date" for empty string', () => {
      const formatted = MatchProcessingService.formatMatchDate('');
      
      expect(formatted).toBe('Unknown Date');
    });
  });
});