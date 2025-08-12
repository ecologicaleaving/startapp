/**
 * Assignment Utilities Tests
 * Story 2.1: Assignment Card Component System
 */

import {
  getTimeUntilAssignment,
  formatAssignmentTime,
  formatAssignmentDate,
  getAssignmentPriority,
  sortAssignments,
  formatRefereePosition,
  getStatusDisplayText,
  isAssignmentStartingSoon,
  getCountdownText
} from '../../utils/assignments';
import { Assignment } from '../../types/assignments';

// Mock current date for consistent testing
const MOCK_NOW = new Date('2025-01-12T10:00:00.000Z');

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(MOCK_NOW);
});

afterAll(() => {
  jest.useRealTimers();
});

describe('getTimeUntilAssignment', () => {
  it('should calculate time until future assignment correctly', () => {
    const futureTime = new Date('2025-01-12T11:30:00.000Z'); // 1.5 hours from mock now
    const result = getTimeUntilAssignment(futureTime);
    
    expect(result.totalMinutes).toBe(90);
    expect(result.hours).toBe(1);
    expect(result.minutes).toBe(30);
    expect(result.isOverdue).toBe(false);
  });

  it('should handle overdue assignments correctly', () => {
    const pastTime = new Date('2025-01-12T09:00:00.000Z'); // 1 hour ago
    const result = getTimeUntilAssignment(pastTime);
    
    expect(result.totalMinutes).toBe(60);
    expect(result.hours).toBe(1);
    expect(result.minutes).toBe(0);
    expect(result.isOverdue).toBe(true);
  });

  it('should handle assignments starting now', () => {
    const result = getTimeUntilAssignment(MOCK_NOW);
    
    expect(result.totalMinutes).toBe(0);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
    expect(result.isOverdue).toBe(false);
  });
});

describe('formatAssignmentTime', () => {
  it('should format time correctly', () => {
    const time = new Date('2025-01-12T14:30:00.000Z');
    const result = formatAssignmentTime(time);
    
    expect(result).toMatch(/\d{1,2}:\d{2}\s?(AM|PM)/i);
  });
});

describe('formatAssignmentDate', () => {
  it('should return "Today" for today\'s date', () => {
    const result = formatAssignmentDate(MOCK_NOW);
    expect(result).toBe('Today');
  });

  it('should return "Tomorrow" for tomorrow\'s date', () => {
    const tomorrow = new Date(MOCK_NOW);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const result = formatAssignmentDate(tomorrow);
    expect(result).toBe('Tomorrow');
  });

  it('should return formatted date for other dates', () => {
    const futureDate = new Date('2025-01-20T10:00:00.000Z');
    const result = formatAssignmentDate(futureDate);
    expect(result).toMatch(/\w{3}\s\d{1,2}/); // e.g., "Jan 20"
  });
});

describe('getAssignmentPriority', () => {
  const createMockAssignment = (status: any): Assignment => ({
    id: '1',
    matchId: '1',
    courtNumber: '1',
    homeTeam: 'Team A',
    awayTeam: 'Team B',
    matchTime: MOCK_NOW,
    refereePosition: '1st',
    status,
  });

  it('should return correct priorities', () => {
    expect(getAssignmentPriority(createMockAssignment('current'))).toBe(1);
    expect(getAssignmentPriority(createMockAssignment('upcoming'))).toBe(2);
    expect(getAssignmentPriority(createMockAssignment('completed'))).toBe(3);
    expect(getAssignmentPriority(createMockAssignment('cancelled'))).toBe(4);
    expect(getAssignmentPriority(createMockAssignment('unknown'))).toBe(5);
  });
});

describe('sortAssignments', () => {
  const createMockAssignment = (status: any, timeOffset: number): Assignment => ({
    id: status,
    matchId: status,
    courtNumber: '1',
    homeTeam: 'Team A',
    awayTeam: 'Team B',
    matchTime: new Date(MOCK_NOW.getTime() + timeOffset * 60 * 1000),
    refereePosition: '1st',
    status,
  });

  it('should sort assignments by priority and time', () => {
    const assignments = [
      createMockAssignment('completed', 60),
      createMockAssignment('current', 30),
      createMockAssignment('upcoming', 120),
      createMockAssignment('cancelled', 0),
    ];

    const sorted = sortAssignments(assignments);
    
    expect(sorted[0].status).toBe('current');
    expect(sorted[1].status).toBe('upcoming');
    expect(sorted[2].status).toBe('completed');
    expect(sorted[3].status).toBe('cancelled');
  });
});

describe('formatRefereePosition', () => {
  it('should format referee positions correctly', () => {
    expect(formatRefereePosition('1st')).toBe('1st Referee');
    expect(formatRefereePosition('2nd')).toBe('2nd Referee');
    expect(formatRefereePosition('Line')).toBe('Line Judge');
    expect(formatRefereePosition('Reserve')).toBe('Reserve');
    expect(formatRefereePosition('Custom')).toBe('Custom');
  });
});

describe('getStatusDisplayText', () => {
  it('should return correct display text for all statuses', () => {
    expect(getStatusDisplayText('current')).toBe('Current');
    expect(getStatusDisplayText('upcoming')).toBe('Upcoming');
    expect(getStatusDisplayText('completed')).toBe('Completed');
    expect(getStatusDisplayText('cancelled')).toBe('Cancelled');
  });
});

describe('isAssignmentStartingSoon', () => {
  it('should return true for assignments starting within 30 minutes', () => {
    const soonTime = new Date(MOCK_NOW.getTime() + 20 * 60 * 1000); // 20 minutes
    expect(isAssignmentStartingSoon(soonTime)).toBe(true);
  });

  it('should return false for assignments starting later', () => {
    const laterTime = new Date(MOCK_NOW.getTime() + 45 * 60 * 1000); // 45 minutes
    expect(isAssignmentStartingSoon(laterTime)).toBe(false);
  });

  it('should return false for overdue assignments', () => {
    const pastTime = new Date(MOCK_NOW.getTime() - 10 * 60 * 1000); // 10 minutes ago
    expect(isAssignmentStartingSoon(pastTime)).toBe(false);
  });
});

describe('getCountdownText', () => {
  it('should return correct countdown text for various times', () => {
    const oneHourThirty = new Date(MOCK_NOW.getTime() + 90 * 60 * 1000);
    expect(getCountdownText(oneHourThirty)).toBe('1h 30m');

    const thirtyMinutes = new Date(MOCK_NOW.getTime() + 30 * 60 * 1000);
    expect(getCountdownText(thirtyMinutes)).toBe('30m');

    const now = MOCK_NOW;
    expect(getCountdownText(now)).toBe('Starting now');

    const past = new Date(MOCK_NOW.getTime() - 30 * 60 * 1000);
    expect(getCountdownText(past)).toBe('In Progress');
  });
});

describe('Integration tests', () => {
  it('should handle complete assignment workflow', () => {
    const assignment: Assignment = {
      id: 'test-1',
      matchId: 'match-1',
      courtNumber: '3',
      homeTeam: 'Team Alpha',
      awayTeam: 'Team Beta',
      matchTime: new Date(MOCK_NOW.getTime() + 45 * 60 * 1000), // 45 minutes from now
      refereePosition: '1st',
      status: 'upcoming',
      tournamentName: 'Beach Championship',
      notes: 'Weather conditions: sunny'
    };

    expect(getAssignmentPriority(assignment)).toBe(2);
    expect(formatRefereePosition(assignment.refereePosition)).toBe('1st Referee');
    expect(isAssignmentStartingSoon(assignment.matchTime)).toBe(false);
    expect(getCountdownText(assignment.matchTime)).toBe('45m');
  });
});