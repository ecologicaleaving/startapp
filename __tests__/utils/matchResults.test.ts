/**
 * Match Results Utilities Tests
 * Story 2.2: Match Result Card Optimization
 * 
 * Comprehensive testing for match result utility functions
 */

import {
  calculateMatchDuration,
  formatMatchTime,
  formatMatchDate,
  calculateFinalScore,
  validateSetScore,
  validateMatchResult,
  convertToSetScores,
  createMatchResultFromSets,
  formatScoreDisplay,
  formatSetsDisplay,
  getResultStatusText,
  getSpecialResultText,
  needsSync,
  sortMatchResultsByPriority,
  getOfflineCacheKey,
  createOfflineCacheEntry,
} from '../../utils/matchResults';

import { EnhancedMatchResult, SetScore } from '../../types/MatchResults';

// Mock data helper
const createMockMatchResult = (overrides?: Partial<EnhancedMatchResult>): EnhancedMatchResult => ({
  no: 'M001',
  tournamentNo: 'T001',
  teamAName: 'Team A',
  teamBName: 'Team B',
  status: 'Scheduled',
  matchPointsA: 0,
  matchPointsB: 0,
  pointsTeamASet1: 0,
  pointsTeamBSet1: 0,
  pointsTeamASet2: 0,
  pointsTeamBSet2: 0,
  pointsTeamASet3: 0,
  pointsTeamBSet3: 0,
  referee1No: 'R001',
  referee1Name: 'John Doe',
  referee1FederationCode: 'USA',
  referee2No: 'R002',
  referee2Name: 'Jane Smith',
  referee2FederationCode: 'CAN',
  durationSet1: '00:25:30',
  durationSet2: '00:28:15',
  durationSet3: '00:15:45',
  localDate: new Date('2024-01-15T14:30:00Z'),
  localTime: '14:30',
  court: '1',
  round: 'Pool A',
  matchId: 'M001',
  matchType: 'beach',
  resultStatus: 'draft',
  lastModified: new Date(),
  ...overrides,
});

describe('Match Duration Utilities', () => {
  test('calculateMatchDuration - basic calculation', () => {
    const startTime = new Date('2024-01-15T14:30:00Z');
    const endTime = new Date('2024-01-15T15:45:30Z');
    
    const duration = calculateMatchDuration(startTime, endTime);
    
    expect(duration.hours).toBe(1);
    expect(duration.minutes).toBe(15);
    expect(duration.totalMinutes).toBe(75);
    expect(duration.formatted).toBe('1h 15m');
  });

  test('calculateMatchDuration - minutes only', () => {
    const startTime = new Date('2024-01-15T14:30:00Z');
    const endTime = new Date('2024-01-15T14:52:30Z');
    
    const duration = calculateMatchDuration(startTime, endTime);
    
    expect(duration.hours).toBe(0);
    expect(duration.minutes).toBe(22);
    expect(duration.totalMinutes).toBe(22);
    expect(duration.formatted).toBe('22m');
  });
});

describe('Time and Date Formatting', () => {
  beforeAll(() => {
    // Mock system time for consistent tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-15T10:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('formatMatchTime - 12-hour format', () => {
    const matchTime = new Date('2024-01-15T14:30:00Z');
    const formatted = formatMatchTime(matchTime);
    
    expect(formatted).toMatch(/\d{1,2}:\d{2} [AP]M/); // Allow for locale and timezone variations
  });

  test('formatMatchDate - today', () => {
    const today = new Date('2024-01-15T14:30:00Z');
    const formatted = formatMatchDate(today);
    
    expect(formatted).toBe('Today');
  });

  test('formatMatchDate - tomorrow', () => {
    const tomorrow = new Date('2024-01-16T14:30:00Z');
    const formatted = formatMatchDate(tomorrow);
    
    expect(formatted).toBe('Tomorrow');
  });

  test('formatMatchDate - other day', () => {
    const otherDay = new Date('2024-01-20T14:30:00Z');
    const formatted = formatMatchDate(otherDay);
    
    expect(formatted).toMatch(/Sat|Jan/); // Allow for different locale formats
  });
});

describe('Score Calculations', () => {
  test('calculateFinalScore - team A wins 2-0', () => {
    const sets: SetScore[] = [
      { homeScore: 21, awayScore: 15, completed: true },
      { homeScore: 21, awayScore: 18, completed: true },
      { homeScore: 0, awayScore: 0, completed: false },
    ];
    
    const finalScore = calculateFinalScore(sets);
    
    expect(finalScore.homeSets).toBe(2);
    expect(finalScore.awaySets).toBe(0);
    expect(finalScore.isComplete).toBe(true);
  });

  test('calculateFinalScore - team B wins 2-1', () => {
    const sets: SetScore[] = [
      { homeScore: 21, awayScore: 19, completed: true },
      { homeScore: 18, awayScore: 21, completed: true },
      { homeScore: 13, awayScore: 15, completed: true },
    ];
    
    const finalScore = calculateFinalScore(sets);
    
    expect(finalScore.homeSets).toBe(1);
    expect(finalScore.awaySets).toBe(2);
    expect(finalScore.isComplete).toBe(true);
  });

  test('calculateFinalScore - match in progress', () => {
    const sets: SetScore[] = [
      { homeScore: 21, awayScore: 15, completed: true },
      { homeScore: 15, awayScore: 12, completed: false },
      { homeScore: 0, awayScore: 0, completed: false },
    ];
    
    const finalScore = calculateFinalScore(sets);
    
    expect(finalScore.homeSets).toBe(1);
    expect(finalScore.awaySets).toBe(0);
    expect(finalScore.isComplete).toBe(false);
  });
});

describe('Score Validation', () => {
  test('validateSetScore - valid first set score', () => {
    const errors = validateSetScore(21, 15, 1);
    
    expect(errors).toHaveLength(0);
  });

  test('validateSetScore - valid win by 2', () => {
    const errors = validateSetScore(23, 21, 1);
    
    expect(errors).toHaveLength(0);
  });

  test('validateSetScore - invalid: must win by 2', () => {
    const errors = validateSetScore(22, 21, 1);
    
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('win by 2');
    expect(errors[0].severity).toBe('warning');
  });

  test('validateSetScore - invalid: negative scores', () => {
    const errors = validateSetScore(-1, 15, 1);
    
    expect(errors.length).toBeGreaterThanOrEqual(1);
    const negativeError = errors.find(e => e.message.includes('cannot be negative'));
    expect(negativeError).toBeDefined();
    expect(negativeError?.severity).toBe('error');
  });

  test('validateSetScore - third set validation', () => {
    const errors = validateSetScore(15, 10, 3);
    
    expect(errors).toHaveLength(0);
  });

  test('validateSetScore - third set invalid', () => {
    const errors = validateSetScore(16, 15, 3);
    
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('win by 2');
  });
});

describe('Match Result Validation', () => {
  test('validateMatchResult - valid completed match', () => {
    const matchResult = createMockMatchResult({
      pointsTeamASet1: 21,
      pointsTeamBSet1: 15,
      pointsTeamASet2: 21,
      pointsTeamBSet2: 18,
      matchPointsA: 2,
      matchPointsB: 0,
      status: 'Finished',
    });
    
    const errors = validateMatchResult(matchResult);
    
    expect(errors).toHaveLength(0);
  });

  test('validateMatchResult - incomplete match marked as complete', () => {
    const matchResult = createMockMatchResult({
      pointsTeamASet1: 21,
      pointsTeamBSet1: 15,
      status: 'Finished', // Marked complete but only 1 set played
    });
    
    const errors = validateMatchResult(matchResult);
    
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('no winner determined');
    expect(errors[0].severity).toBe('error');
  });

  test('validateMatchResult - special result without notes', () => {
    const matchResult = createMockMatchResult({
      specialResult: 'other',
      status: 'Finished',
    });
    
    const errors = validateMatchResult(matchResult);
    
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toContain('requires notes');
    expect(errors[0].severity).toBe('warning');
  });
});

describe('Data Conversion', () => {
  test('convertToSetScores - basic conversion', () => {
    const matchResult = createMockMatchResult({
      pointsTeamASet1: 21,
      pointsTeamBSet1: 15,
      pointsTeamASet2: 18,
      pointsTeamBSet2: 21,
    });
    
    const sets = convertToSetScores(matchResult);
    
    expect(sets).toHaveLength(3);
    expect(sets[0]).toEqual({ homeScore: 21, awayScore: 15, completed: true });
    expect(sets[1]).toEqual({ homeScore: 18, awayScore: 21, completed: true });
    expect(sets[2]).toEqual({ homeScore: 0, awayScore: 0, completed: false });
  });

  test('createMatchResultFromSets - update match result', () => {
    const baseResult = createMockMatchResult();
    const sets: SetScore[] = [
      { homeScore: 21, awayScore: 15, completed: true },
      { homeScore: 21, awayScore: 18, completed: true },
      { homeScore: 0, awayScore: 0, completed: false },
    ];
    
    const updatedResult = createMatchResultFromSets(baseResult, sets);
    
    expect(updatedResult.pointsTeamASet1).toBe(21);
    expect(updatedResult.pointsTeamBSet1).toBe(15);
    expect(updatedResult.pointsTeamASet2).toBe(21);
    expect(updatedResult.pointsTeamBSet2).toBe(18);
    expect(updatedResult.matchPointsA).toBe(2);
    expect(updatedResult.matchPointsB).toBe(0);
    expect(updatedResult.status).toBe('Finished');
  });
});

describe('Display Formatting', () => {
  test('formatScoreDisplay - basic format', () => {
    const formatted = formatScoreDisplay(21, 15);
    expect(formatted).toBe('21 - 15');
  });

  test('formatSetsDisplay - basic format', () => {
    const formatted = formatSetsDisplay(2, 1);
    expect(formatted).toBe('2 - 1');
  });

  test('getResultStatusText - all statuses', () => {
    expect(getResultStatusText('draft')).toBe('Draft');
    expect(getResultStatusText('submitted')).toBe('Submitted');
    expect(getResultStatusText('confirmed')).toBe('Confirmed');
    expect(getResultStatusText('synced')).toBe('Synced');
    expect(getResultStatusText('error')).toBe('Error');
  });

  test('getSpecialResultText - all special results', () => {
    expect(getSpecialResultText('forfeit')).toBe('Forfeit');
    expect(getSpecialResultText('timeout')).toBe('Timeout');
    expect(getSpecialResultText('injury')).toBe('Injury');
    expect(getSpecialResultText('weather')).toBe('Weather');
    expect(getSpecialResultText('other')).toBe('Other');
  });
});

describe('Sync Utilities', () => {
  test('needsSync - sync pending', () => {
    const matchResult = createMockMatchResult({ syncPending: true });
    expect(needsSync(matchResult)).toBe(true);
  });

  test('needsSync - offline result', () => {
    const matchResult = createMockMatchResult({ isOffline: true });
    expect(needsSync(matchResult)).toBe(true);
  });

  test('needsSync - submitted status', () => {
    const matchResult = createMockMatchResult({ resultStatus: 'submitted' });
    expect(needsSync(matchResult)).toBe(true);
  });

  test('needsSync - synced result', () => {
    const matchResult = createMockMatchResult({ resultStatus: 'synced' });
    expect(needsSync(matchResult)).toBe(false);
  });
});

describe('Sorting and Prioritization', () => {
  test('sortMatchResultsByPriority - current matches first', () => {
    const results = [
      createMockMatchResult({ matchId: 'M1', status: 'Scheduled', localDate: new Date('2024-01-15T16:00:00Z') }),
      createMockMatchResult({ matchId: 'M2', status: 'Running', localDate: new Date('2024-01-15T15:00:00Z') }),
      createMockMatchResult({ matchId: 'M3', status: 'Finished', localDate: new Date('2024-01-15T14:00:00Z') }),
    ];
    
    const sorted = sortMatchResultsByPriority(results);
    
    expect(sorted[0].matchId).toBe('M2'); // Running match first
    expect(sorted[1].matchId).toBe('M3'); // Then by time
    expect(sorted[2].matchId).toBe('M1');
  });

  test('sortMatchResultsByPriority - by time when same status', () => {
    const results = [
      createMockMatchResult({ matchId: 'M1', status: 'Scheduled', localDate: new Date('2024-01-15T16:00:00Z') }),
      createMockMatchResult({ matchId: 'M2', status: 'Scheduled', localDate: new Date('2024-01-15T14:00:00Z') }),
    ];
    
    const sorted = sortMatchResultsByPriority(results);
    
    expect(sorted[0].matchId).toBe('M2'); // Earlier time first
    expect(sorted[1].matchId).toBe('M1');
  });
});

describe('Offline Cache Utilities', () => {
  test('getOfflineCacheKey - generates correct key', () => {
    const key = getOfflineCacheKey('M001');
    expect(key).toBe('match_result_M001');
  });

  test('createOfflineCacheEntry - creates valid cache entry', () => {
    const matchResult = createMockMatchResult({ matchId: 'M001' });
    const cacheEntry = createOfflineCacheEntry(matchResult);
    
    expect(cacheEntry.id).toBe('match_result_M001');
    expect(cacheEntry.matchResult.isOffline).toBe(true);
    expect(cacheEntry.matchResult.syncPending).toBe(true);
    expect(cacheEntry.attempts).toBe(0);
    expect(cacheEntry.timestamp).toBeInstanceOf(Date);
    expect(cacheEntry.lastError).toBeUndefined();
  });
});