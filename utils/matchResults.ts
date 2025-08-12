/**
 * Match Result Utilities
 * Story 2.2: Match Result Card Optimization
 * 
 * Utilities for match result data processing, validation, and formatting
 */

import { 
  EnhancedMatchResult, 
  SetScore, 
  SpecialResult, 
  ResultStatus, 
  ResultValidationError,
  OfflineCacheEntry 
} from '../types/MatchResults';

/**
 * Calculate match duration for completed matches
 */
export function calculateMatchDuration(startTime: Date, endTime: Date): {
  hours: number;
  minutes: number;
  totalMinutes: number;
  formatted: string;
} {
  const diff = endTime.getTime() - startTime.getTime();
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  const formatted = hours > 0 
    ? `${hours}h ${minutes}m`
    : `${minutes}m`;
  
  return {
    hours,
    minutes,
    totalMinutes,
    formatted
  };
}

/**
 * Format match time for display
 */
export function formatMatchTime(matchTime: Date): string {
  return matchTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format match date for display
 */
export function formatMatchDate(matchTime: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const matchDate = new Date(matchTime);
  matchDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  
  if (matchDate.getTime() === today.getTime()) {
    return 'Today';
  } else if (matchDate.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  } else {
    return matchTime.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * Calculate final score from sets
 */
export function calculateFinalScore(sets: SetScore[]): {
  homeSets: number;
  awaySets: number;
  isComplete: boolean;
} {
  let homeSets = 0;
  let awaySets = 0;
  
  sets.forEach(set => {
    if (set.completed) {
      if (set.homeScore > set.awayScore) {
        homeSets++;
      } else if (set.awayScore > set.homeScore) {
        awaySets++;
      }
    }
  });
  
  // Beach volleyball is best of 3 sets
  const isComplete = homeSets >= 2 || awaySets >= 2;
  
  return {
    homeSets,
    awaySets,
    isComplete
  };
}

/**
 * Validate set scores
 */
export function validateSetScore(homeScore: number, awayScore: number, setNumber: number): ResultValidationError[] {
  const errors: ResultValidationError[] = [];
  
  // Basic score validation
  if (homeScore < 0 || awayScore < 0) {
    errors.push({
      field: `set${setNumber}`,
      message: 'Scores cannot be negative',
      severity: 'error'
    });
  }
  
  // Beach volleyball scoring rules
  if (setNumber <= 2) {
    // First two sets: play to 21, win by 2
    const minWinScore = 21;
    const maxScore = Math.max(homeScore, awayScore);
    const minScore = Math.min(homeScore, awayScore);
    const scoreDiff = maxScore - minScore;
    
    if (maxScore >= minWinScore && scoreDiff >= 2) {
      // Valid completed set
    } else if (maxScore > minWinScore && scoreDiff < 2) {
      errors.push({
        field: `set${setNumber}`,
        message: 'Must win by 2 points',
        severity: 'warning'
      });
    } else if (maxScore < minWinScore && (homeScore !== awayScore || homeScore === 0)) {
      errors.push({
        field: `set${setNumber}`,
        message: `First two sets play to ${minWinScore}`,
        severity: 'warning'
      });
    }
  } else if (setNumber === 3) {
    // Third set: play to 15, win by 2
    const minWinScore = 15;
    const maxScore = Math.max(homeScore, awayScore);
    const minScore = Math.min(homeScore, awayScore);
    const scoreDiff = maxScore - minScore;
    
    if (maxScore >= minWinScore && scoreDiff >= 2) {
      // Valid completed set
    } else if (maxScore > minWinScore && scoreDiff < 2) {
      errors.push({
        field: `set${setNumber}`,
        message: 'Must win by 2 points',
        severity: 'warning'
      });
    } else if (maxScore < minWinScore && (homeScore !== awayScore || homeScore === 0)) {
      errors.push({
        field: `set${setNumber}`,
        message: 'Third set plays to 15',
        severity: 'warning'
      });
    }
  }
  
  return errors;
}

/**
 * Validate complete match result
 */
export function validateMatchResult(matchResult: EnhancedMatchResult): ResultValidationError[] {
  const errors: ResultValidationError[] = [];
  
  // Validate all sets
  const sets = convertToSetScores(matchResult);
  sets.forEach((set, index) => {
    if (set.homeScore > 0 || set.awayScore > 0) {
      const setErrors = validateSetScore(set.homeScore, set.awayScore, index + 1);
      errors.push(...setErrors);
    }
  });
  
  // Check if match is complete
  const finalScore = calculateFinalScore(sets);
  if (matchResult.status === 'Finished' && !finalScore.isComplete && !matchResult.specialResult) {
    errors.push({
      field: 'match',
      message: 'Match marked complete but no winner determined',
      severity: 'error'
    });
  }
  
  // Special result validation
  if (matchResult.specialResult && !matchResult.specialResultNotes) {
    errors.push({
      field: 'specialResult',
      message: 'Special result requires notes',
      severity: 'warning'
    });
  }
  
  return errors;
}

/**
 * Convert MatchResult to SetScore array
 */
export function convertToSetScores(matchResult: EnhancedMatchResult): SetScore[] {
  return [
    {
      homeScore: matchResult.pointsTeamASet1 || 0,
      awayScore: matchResult.pointsTeamBSet1 || 0,
      completed: (matchResult.pointsTeamASet1 || 0) > 0 || (matchResult.pointsTeamBSet1 || 0) > 0
    },
    {
      homeScore: matchResult.pointsTeamASet2 || 0,
      awayScore: matchResult.pointsTeamBSet2 || 0,
      completed: (matchResult.pointsTeamASet2 || 0) > 0 || (matchResult.pointsTeamBSet2 || 0) > 0
    },
    {
      homeScore: matchResult.pointsTeamASet3 || 0,
      awayScore: matchResult.pointsTeamBSet3 || 0,
      completed: (matchResult.pointsTeamASet3 || 0) > 0 || (matchResult.pointsTeamBSet3 || 0) > 0
    }
  ];
}

/**
 * Create match result from set scores
 */
export function createMatchResultFromSets(
  baseResult: EnhancedMatchResult, 
  sets: SetScore[]
): EnhancedMatchResult {
  const finalScore = calculateFinalScore(sets);
  
  return {
    ...baseResult,
    pointsTeamASet1: sets[0]?.homeScore || 0,
    pointsTeamBSet1: sets[0]?.awayScore || 0,
    pointsTeamASet2: sets[1]?.homeScore || 0,
    pointsTeamBSet2: sets[1]?.awayScore || 0,
    pointsTeamASet3: sets[2]?.homeScore || 0,
    pointsTeamBSet3: sets[2]?.awayScore || 0,
    matchPointsA: finalScore.homeSets,
    matchPointsB: finalScore.awaySets,
    status: finalScore.isComplete ? 'Finished' : 'Running',
    lastModified: new Date()
  };
}

/**
 * Format score display
 */
export function formatScoreDisplay(homeScore: number, awayScore: number): string {
  return `${homeScore} - ${awayScore}`;
}

/**
 * Format sets display
 */
export function formatSetsDisplay(homeSets: number, awaySets: number): string {
  return `${homeSets} - ${awaySets}`;
}

/**
 * Get result status display text
 */
export function getResultStatusText(status: ResultStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'submitted':
      return 'Submitted';
    case 'confirmed':
      return 'Confirmed';
    case 'synced':
      return 'Synced';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
}

/**
 * Get special result display text
 */
export function getSpecialResultText(specialResult: SpecialResult): string {
  switch (specialResult) {
    case 'forfeit':
      return 'Forfeit';
    case 'timeout':
      return 'Timeout';
    case 'injury':
      return 'Injury';
    case 'weather':
      return 'Weather';
    case 'other':
      return 'Other';
    default:
      return 'Special';
  }
}

/**
 * Check if match result needs sync
 */
export function needsSync(matchResult: EnhancedMatchResult): boolean {
  return matchResult.syncPending || 
         matchResult.isOffline || 
         matchResult.resultStatus === 'submitted';
}

/**
 * Sort match results by priority (current matches first, then by time)
 */
export function sortMatchResultsByPriority(results: EnhancedMatchResult[]): EnhancedMatchResult[] {
  return [...results].sort((a, b) => {
    // Current matches first
    if (a.status === 'Running' && b.status !== 'Running') return -1;
    if (b.status === 'Running' && a.status !== 'Running') return 1;
    
    // Then by match time
    return new Date(a.localDate).getTime() - new Date(b.localDate).getTime();
  });
}

/**
 * Get offline cache key
 */
export function getOfflineCacheKey(matchId: string): string {
  return `match_result_${matchId}`;
}

/**
 * Create offline cache entry
 */
export function createOfflineCacheEntry(matchResult: EnhancedMatchResult): OfflineCacheEntry {
  return {
    id: getOfflineCacheKey(matchResult.matchId),
    matchResult: {
      ...matchResult,
      isOffline: true,
      syncPending: true,
      lastModified: new Date()
    },
    timestamp: new Date(),
    attempts: 0,
    lastError: undefined
  };
}