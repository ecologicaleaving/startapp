/**
 * Status Components Export
 * Story 1.4: Status-Driven Color Coding System
 */

export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps } from './StatusBadge';

export { StatusCard } from './StatusCard';
export type { StatusCardProps } from './StatusCard';

export { StatusIcon, MultiStatusIcon } from './StatusIcon';
export type { StatusIconProps, MultiStatusIconProps } from './StatusIcon';

export { StatusBar, SimpleProgressBar } from './StatusBar';
export type { StatusBarProps, StatusBarSegment, SimpleProgressBarProps } from './StatusBar';

// Re-export status utilities for convenience
export {
  getStatusColor,
  getStatusColorWithText,
  getStatusColorForBackground,
  getStatusPriority,
  TournamentStatus,
  AssignmentStatus,
  MatchStatus,
} from '../../utils/statusColors';