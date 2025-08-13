/**
 * Status Components Export
 * Story 1.4: Status-Driven Color Coding System
 * Story 2.4: Professional Status Indicator System
 */

// Story 1.4 Components (Original)
export { StatusBadge } from './StatusBadge';
export type { StatusBadgeProps as OriginalStatusBadgeProps } from './StatusBadge';

export { StatusCard } from './StatusCard';
export type { StatusCardProps } from './StatusCard';

export { StatusIcon, MultiStatusIcon } from './StatusIcon';
export type { StatusIconProps as OriginalStatusIconProps, MultiStatusIconProps } from './StatusIcon';

export { StatusBar, SimpleProgressBar } from './StatusBar';
export type { StatusBarProps, StatusBarSegment, SimpleProgressBarProps } from './StatusBar';

// Story 2.4 Components (Professional Referee System)
export { StatusIndicator } from './StatusIndicator';
export type { StatusIndicatorProps } from '../../types/status';

export { ProfessionalStatusIcon } from './ProfessionalStatusIcon';
export type { StatusIconProps as ProfessionalStatusIconProps } from '../../types/status';

export { ProfessionalStatusBadge } from './ProfessionalStatusBadge';
export type { StatusBadgeProps as ProfessionalStatusBadgeProps } from '../../types/status';

// Status Indicator Variants
export { 
  InlineStatusBadge,
  ProminentStatusDisplay,
  AnimatedStatusTransition,
  ContextualStatusPlacement,
} from './StatusIndicatorVariants';
export type { 
  InlineStatusBadgeProps,
  ProminentStatusDisplayProps,
  AnimatedStatusTransitionProps,
  ContextualStatusPlacementProps,
} from './StatusIndicatorVariants';

// Status Size System
export {
  statusSizeConfigs,
  getStatusSizeConfig,
  getContainerStyle,
  getIconStyle,
  getTextStyle,
  getTouchTargetStyle,
  getSpacingStyle,
  getResponsiveSize,
  validateTouchTargetCompliance,
  getAvailableSizes,
  compareSizes,
} from './StatusSizeSystem';
export type { StatusSizeConfig, ResponsiveSizeOptions } from './StatusSizeSystem';

// Accessibility & Visual Alternatives
export {
  AccessibilityStatusIndicator,
  ColorBlindPattern,
  StatusLegend,
} from './AccessibilityStatusIndicator';
export type {
  AccessibilityStatusIndicatorProps,
  ColorBlindPatternProps,
  StatusLegendProps,
} from './AccessibilityStatusIndicator';

// Status Help System
export {
  StatusHelpModal,
  statusHelpDatabase,
} from './StatusHelpSystem';
export type {
  StatusHelpModalProps,
  StatusHelpInfo,
} from './StatusHelpSystem';

// Status Integration & Real-time Updates
export {
  AssignmentCardStatus,
  MatchResultCardStatus,
  TournamentPanelStatus,
  RealTimeStatusWrapper,
  useStatusIntegration,
} from './StatusIntegrations';
export type {
  AssignmentCardStatusProps,
  MatchResultCardStatusProps,
  TournamentPanelStatusProps,
  RealTimeStatusWrapperProps,
} from './StatusIntegrations';

// Status Context & Hooks
export {
  StatusProvider,
  useStatusContext,
  useStatus,
  useBatchStatus,
  useConnectionStatus,
} from './StatusContext';
export type {
  StatusProviderProps,
  StatusContextValue,
} from './StatusContext';

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

// Story 2.4 Professional Status Utilities
export {
  getStatusColor as getProfessionalStatusColor,
  getStatusText,
  getStatusSize,
  getStatusAccessibilityLabel,
  getStatusIconName,
  getAccessibilityPattern,
  shouldAnimateStatus,
  getStatusAnimationDuration,
  isAssignmentStatus,
  isMatchStatus,
  isSystemStatus,
  isUrgencyStatus,
  getStatusCategory,
  getStatusPriority as getProfessionalStatusPriority,
  isValidStatusTransition,
} from '../../utils/statusIndicators';