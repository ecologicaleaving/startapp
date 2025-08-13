/**
 * Assignment Types for Tournament Referee App
 * Story 2.1: Assignment Card Component System
 */

export type RefereePosition = '1st' | '2nd' | 'Line' | 'Reserve';

export type AssignmentStatus = 'current' | 'upcoming' | 'completed' | 'cancelled';

export interface Assignment {
  id: string;
  matchId?: string;
  courtNumber: number;
  homeTeam: string;
  awayTeam: string;
  matchTime: Date;
  refereePosition: string;
  status: AssignmentStatus;
  matchType?: string;
  importance?: 'low' | 'medium' | 'high';
  tournamentName?: string;
  matchResult?: string;
  notes?: string;
  tournamentInfo?: {
    name: string;
    location: string;
    court: string;
  };
}

export interface AssignmentCardProps {
  assignment: Assignment;
  variant?: AssignmentStatus;
  showCountdown?: boolean;
  onPress?: (assignment: Assignment) => void;
  onUpdate?: (assignment: Assignment) => void;
  isInteractive?: boolean;
}

export interface CountdownTimerProps {
  targetTime: Date;
  onComplete?: () => void;
  variant?: 'prominent' | 'subtle';
}