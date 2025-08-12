/**
 * Assignment Component Exports
 * Story 2.1: Assignment Card Component System
 */

export { default as AssignmentCard } from './AssignmentCard';
export { 
  CurrentAssignmentCard,
  UpcomingAssignmentCard, 
  CompletedAssignmentCard,
  CancelledAssignmentCard,
  AdaptiveAssignmentCard,
  default as AssignmentCardVariants
} from './AssignmentCardVariants';

export type { Assignment, AssignmentCardProps, CountdownTimerProps } from '../../types/assignments';