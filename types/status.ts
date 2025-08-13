/**
 * Status Indicator Type Definitions
 * Story 2.4: Professional Status Indicator System
 */

// Assignment status types for referee workflow
export type AssignmentStatusType = 
  | 'current'     // Currently active assignment
  | 'upcoming'    // Upcoming assignment
  | 'completed'   // Completed assignment
  | 'cancelled'   // Cancelled assignment
  | 'changed';    // Assignment changed/modified

// Match status types for tournament workflow
export type MatchStatusType = 
  | 'pre-match'   // Pre-match preparation
  | 'in-progress' // Match currently in progress
  | 'completed'   // Match completed
  | 'delayed'     // Match delayed
  | 'suspended';  // Match suspended

// System status types for app state
export type SystemStatusType = 
  | 'online'      // System online and connected
  | 'offline'     // System offline
  | 'sync-pending' // Sync in progress
  | 'error';      // System error state

// Urgency indicator types for critical alerts
export type UrgencyStatusType = 
  | 'critical'    // Critical alert requiring immediate action
  | 'warning'     // Time warning or important notice
  | 'action-required'; // Action required from referee

// Combined status type for all indicators
export type StatusType = AssignmentStatusType | MatchStatusType | SystemStatusType | UrgencyStatusType;

// Status indicator size variants
export type StatusIndicatorSize = 'small' | 'medium' | 'large';

// Status indicator variants for different contexts
export type StatusIndicatorVariant = 
  | 'badge'       // Inline badge for lists and cards
  | 'prominent'   // Large prominent display
  | 'icon-only'   // Icon-only indicator
  | 'text-only'   // Text-only indicator
  | 'full';       // Full indicator with icon and text

// Animation states for status transitions
export type StatusAnimationState = 'idle' | 'transitioning' | 'pulsing';

// Accessibility patterns for color-blind support
export type AccessibilityPattern = 
  | 'none'        // No pattern (color only)
  | 'dots'        // Dot pattern overlay
  | 'stripes'     // Stripe pattern overlay
  | 'diagonal'    // Diagonal pattern overlay
  | 'icon';       // Icon-based indication

// Status indicator configuration interface
export interface StatusIndicatorConfig {
  type: StatusType;
  size: StatusIndicatorSize;
  variant: StatusIndicatorVariant;
  animated?: boolean;
  animationState?: StatusAnimationState;
  accessibilityPattern?: AccessibilityPattern;
  highContrast?: boolean;
  showIcon?: boolean;
  showText?: boolean;
  customLabel?: string;
}

// Base status indicator props interface
export interface StatusIndicatorProps extends StatusIndicatorConfig {
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
  style?: any;
}

// Status badge specific props (extends base)
export interface StatusBadgeProps extends Omit<StatusIndicatorProps, 'variant'> {
  compact?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

// Status icon specific props
export interface StatusIconProps {
  status: StatusType;
  size?: StatusIndicatorSize;
  color?: string;
  accessibilityPattern?: AccessibilityPattern;
  animated?: boolean;
  testID?: string;
  style?: any;
}

// Status text configuration
export interface StatusTextConfig {
  current: string;
  upcoming: string;
  completed: string;
  cancelled: string;
  changed: string;
  'pre-match': string;
  'in-progress': string;
  delayed: string;
  suspended: string;
  online: string;
  offline: string;
  'sync-pending': string;
  error: string;
  critical: string;
  warning: string;
  'action-required': string;
}

// Status color mapping for different states
export interface StatusColorMapping {
  assignment: {
    current: string;
    upcoming: string;
    completed: string;
    cancelled: string;
    changed: string;
  };
  match: {
    'pre-match': string;
    'in-progress': string;
    completed: string;
    delayed: string;
    suspended: string;
  };
  system: {
    online: string;
    offline: string;
    'sync-pending': string;
    error: string;
  };
  urgency: {
    critical: string;
    warning: string;
    'action-required': string;
  };
}

// Status indicator animation configuration
export interface StatusAnimationConfig {
  duration: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  loop?: boolean;
  autoStart?: boolean;
}

// Real-time status update interface
export interface StatusUpdate {
  id: string;
  type: StatusType;
  previousStatus?: StatusType;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Status indicator context for real-time updates
export interface StatusIndicatorContext {
  subscribeToUpdates: (statusId: string, callback: (update: StatusUpdate) => void) => () => void;
  updateStatus: (statusId: string, newStatus: StatusType, metadata?: Record<string, any>) => void;
  getStatus: (statusId: string) => StatusType | null;
}