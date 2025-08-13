/**
 * Assignment Component Exports
 * Story 2.1: Assignment Card Component System
 */

export { default as AssignmentCard } from './AssignmentCard';
export { 
  CurrentAssignmentCard as AssignmentCurrentCard,
  UpcomingAssignmentCard, 
  CompletedAssignmentCard,
  CancelledAssignmentCard,
  AdaptiveAssignmentCard,
  default as AssignmentCardVariants
} from './AssignmentCardVariants';
export { 
  AssignmentStatusManager,
  type AssignmentNote,
  type AssignmentPreparation,
  type PrepChecklistItem
} from './AssignmentStatusManager';
export { EnhancedAssignmentCard } from './EnhancedAssignmentCard';

export type { Assignment, AssignmentCardProps, CountdownTimerProps } from '../../types/assignments';