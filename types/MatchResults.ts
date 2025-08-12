export interface MatchResult {
  no: string;                    // Match.No - unique identifier
  tournamentNo: string;          // Foreign key to tournaments
  teamAName: string;             // Team names from FIVB API
  teamBName: string;
  status: 'Scheduled' | 'Running' | 'Finished' | 'Cancelled';
  
  // Set-by-set scoring
  matchPointsA: number;          // Overall match points (sets won)
  matchPointsB: number;
  pointsTeamASet1: number;       // Individual set scores
  pointsTeamBSet1: number;
  pointsTeamASet2: number;
  pointsTeamBSet2: number;
  pointsTeamASet3: number;       // Third set (if played)
  pointsTeamBSet3: number;
  
  // Referee information
  referee1No?: string;           // NoReferee1
  referee1Name?: string;         // Referee1Name
  referee1FederationCode?: string; // Referee1FederationCode
  referee2No?: string;           // NoReferee2
  referee2Name?: string;         // Referee2Name
  referee2FederationCode?: string; // Referee2FederationCode
  
  // Match metadata
  durationSet1: string;          // Set durations for detailed view
  durationSet2: string;
  durationSet3: string;
  localDate: Date;
  localTime: string;
  court: string;
  round: string;
}

export interface MatchResultsStatus {
  live: MatchResult[];
  completed: MatchResult[];
  scheduled: MatchResult[];
}

export interface MatchResultsCache {
  data: MatchResultsStatus;
  timestamp: number;
  tournamentNo: string;
}