/**
 * Status Indicator Utilities
 * Story 2.4: Professional Status Indicator System
 */

import { StatusType, StatusTextConfig, StatusColorMapping, StatusIndicatorSize, AccessibilityPattern } from '../types/status';
import { designTokens } from '../theme/tokens';

// Status text labels for all status types
export const statusTextConfig: StatusTextConfig = {
  // Assignment statuses
  current: 'Current',
  upcoming: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled',
  changed: 'Changed',
  
  // Match statuses
  'pre-match': 'Pre-Match',
  'in-progress': 'In Progress',
  delayed: 'Delayed',
  suspended: 'Suspended',
  
  // System statuses
  online: 'Online',
  offline: 'Offline',
  'sync-pending': 'Syncing',
  error: 'Error',
  
  // Urgency statuses
  critical: 'Critical',
  warning: 'Warning',
  'action-required': 'Action Required',
};

// Status color mapping using Epic 1 design tokens
export const statusColorMapping: StatusColorMapping = {
  assignment: {
    current: designTokens.statusColors.current,
    upcoming: designTokens.statusColors.upcoming,
    completed: designTokens.statusColors.completed,
    cancelled: designTokens.statusColors.cancelled,
    changed: designTokens.colors.warning,
  },
  match: {
    'pre-match': designTokens.colors.secondary,
    'in-progress': designTokens.statusColors.current,
    completed: designTokens.statusColors.completed,
    delayed: designTokens.colors.warning,
    suspended: designTokens.colors.error,
  },
  system: {
    online: designTokens.statusColors.completed,
    offline: designTokens.colors.textSecondary,
    'sync-pending': designTokens.colors.warning,
    error: designTokens.colors.error,
  },
  urgency: {
    critical: designTokens.statusColors.emergency,
    warning: designTokens.colors.warning,
    'action-required': designTokens.colors.accent,
  },
};

// Size mapping to pixel values using Epic 1 icon tokens
export const statusSizeMapping = {
  small: designTokens.iconTokens.sizes.small,      // 24px
  medium: designTokens.iconTokens.sizes.medium,    // 32px
  large: designTokens.iconTokens.sizes.large,      // 44px
} as const;

// Status category helpers
export const isAssignmentStatus = (status: StatusType): status is 'current' | 'upcoming' | 'completed' | 'cancelled' | 'changed' => {
  return ['current', 'upcoming', 'completed', 'cancelled', 'changed'].includes(status);
};

export const isMatchStatus = (status: StatusType): status is 'pre-match' | 'in-progress' | 'completed' | 'delayed' | 'suspended' => {
  return ['pre-match', 'in-progress', 'completed', 'delayed', 'suspended'].includes(status);
};

export const isSystemStatus = (status: StatusType): status is 'online' | 'offline' | 'sync-pending' | 'error' => {
  return ['online', 'offline', 'sync-pending', 'error'].includes(status);
};

export const isUrgencyStatus = (status: StatusType): status is 'critical' | 'warning' | 'action-required' => {
  return ['critical', 'warning', 'action-required'].includes(status);
};

// Get status category for a given status
export const getStatusCategory = (status: StatusType): 'assignment' | 'match' | 'system' | 'urgency' => {
  if (isAssignmentStatus(status)) return 'assignment';
  if (isMatchStatus(status)) return 'match';
  if (isSystemStatus(status)) return 'system';
  if (isUrgencyStatus(status)) return 'urgency';
  throw new Error(`Unknown status type: ${status}`);
};

// Get color for a status
export const getStatusColor = (status: StatusType): string => {
  const category = getStatusCategory(status);
  return statusColorMapping[category][status as keyof typeof statusColorMapping[typeof category]];
};

// Get text label for a status
export const getStatusText = (status: StatusType): string => {
  return statusTextConfig[status];
};

// Get size in pixels for a status indicator
export const getStatusSize = (size: StatusIndicatorSize): number => {
  return statusSizeMapping[size];
};

// Generate accessibility label for status
export const getStatusAccessibilityLabel = (status: StatusType, customLabel?: string): string => {
  if (customLabel) return customLabel;
  
  const statusText = getStatusText(status);
  const category = getStatusCategory(status);
  
  switch (category) {
    case 'assignment':
      return `Assignment status: ${statusText}`;
    case 'match':
      return `Match status: ${statusText}`;
    case 'system':
      return `System status: ${statusText}`;
    case 'urgency':
      return `${statusText} alert`;
    default:
      return `Status: ${statusText}`;
  }
};

// Get icon name for status (using existing icon library)
export const getStatusIconName = (status: StatusType): string => {
  switch (status) {
    // Assignment statuses
    case 'current':
      return 'current';
    case 'upcoming':
      return 'upcoming';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'changed':
      return 'alert';
    
    // Match statuses
    case 'pre-match':
      return 'upcoming';
    case 'in-progress':
      return 'current';
    case 'delayed':
      return 'alert';
    case 'suspended':
      return 'alert';
    
    // System statuses
    case 'online':
      return 'completed';
    case 'offline':
      return 'cancelled';
    case 'sync-pending':
      return 'refresh';
    case 'error':
      return 'alert';
    
    // Urgency statuses
    case 'critical':
      return 'emergency';
    case 'warning':
      return 'alert';
    case 'action-required':
      return 'alert';
    
    default:
      return 'info';
  }
};

// Get accessibility pattern for color-blind support
export const getAccessibilityPattern = (status: StatusType): AccessibilityPattern => {
  const category = getStatusCategory(status);
  
  switch (category) {
    case 'assignment':
      switch (status) {
        case 'current': return 'dots';
        case 'upcoming': return 'stripes';
        case 'completed': return 'none';
        case 'cancelled': return 'diagonal';
        case 'changed': return 'dots';
        default: return 'none';
      }
    case 'match':
      switch (status) {
        case 'pre-match': return 'stripes';
        case 'in-progress': return 'dots';
        case 'completed': return 'none';
        case 'delayed': return 'diagonal';
        case 'suspended': return 'diagonal';
        default: return 'none';
      }
    case 'system':
      switch (status) {
        case 'online': return 'none';
        case 'offline': return 'diagonal';
        case 'sync-pending': return 'dots';
        case 'error': return 'diagonal';
        default: return 'none';
      }
    case 'urgency':
      return 'icon'; // Always use icon for urgency indicators
    default:
      return 'none';
  }
};

// Check if status requires animation
export const shouldAnimateStatus = (status: StatusType): boolean => {
  return ['in-progress', 'sync-pending', 'critical'].includes(status);
};

// Get animation duration for status
export const getStatusAnimationDuration = (status: StatusType): number => {
  switch (status) {
    case 'critical':
      return 500; // Fast pulse for critical alerts
    case 'in-progress':
      return 2000; // Steady pulse for in-progress
    case 'sync-pending':
      return 1500; // Medium pulse for syncing
    default:
      return 1000; // Default animation duration
  }
};

// Validate contrast ratio for status color
export const validateStatusColorContrast = (status: StatusType, backgroundColor: string = '#FFFFFF'): boolean => {
  const statusColor = getStatusColor(status);
  const contrastRatio = calculateContrastRatio(statusColor, backgroundColor);
  return contrastRatio >= 7.0; // WCAG AAA requirement
};

// Calculate contrast ratio between two colors
const calculateContrastRatio = (color1: string, color2: string): number => {
  // Simple contrast ratio calculation (would use a proper color library in production)
  const getLuminance = (color: string): number => {
    // Convert hex to RGB and calculate relative luminance
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;
    
    const sRGB = [r, g, b].map(c => 
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );
    
    return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
  };
  
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  
  return (brightest + 0.05) / (darkest + 0.05);
};

// Get status priority for sorting (higher number = higher priority)
export const getStatusPriority = (status: StatusType): number => {
  switch (status) {
    // Urgency statuses - highest priority
    case 'critical': return 100;
    case 'action-required': return 90;
    case 'warning': return 80;
    
    // Active/current states - high priority
    case 'current': return 70;
    case 'in-progress': return 65;
    
    // System issues - medium-high priority
    case 'error': return 60;
    case 'offline': return 55;
    case 'sync-pending': return 50;
    
    // Upcoming/changed states - medium priority
    case 'upcoming': return 40;
    case 'changed': return 35;
    case 'pre-match': return 30;
    
    // Delayed states - low-medium priority
    case 'delayed': return 25;
    case 'suspended': return 20;
    case 'cancelled': return 15;
    
    // Completed/online states - lowest priority
    case 'completed': return 10;
    case 'online': return 5;
    
    default: return 0;
  }
};

// Status transition validation
export const isValidStatusTransition = (fromStatus: StatusType, toStatus: StatusType): boolean => {
  // Determine category based on fromStatus to maintain context
  const fromCategory = getStatusCategory(fromStatus);
  
  // For shared statuses like 'completed', determine target category based on from-status context
  let toCategory: string;
  if (toStatus === 'completed') {
    // 'completed' can be either assignment or match - use fromStatus context
    if (['current', 'upcoming', 'cancelled', 'changed'].includes(fromStatus)) {
      toCategory = 'assignment';
    } else if (['pre-match', 'in-progress', 'delayed', 'suspended'].includes(fromStatus)) {
      toCategory = 'match';
    } else {
      toCategory = getStatusCategory(toStatus);
    }
  } else {
    toCategory = getStatusCategory(toStatus);
  }
  
  // Can only transition within the same category
  if (fromCategory !== toCategory) return false;
  
  // Define valid transitions for each category
  const validTransitions: Record<string, Record<string, string[]>> = {
    assignment: {
      upcoming: ['current', 'cancelled', 'changed'],
      current: ['completed', 'cancelled', 'changed'],
      completed: [], // No transitions from completed
      cancelled: [], // No transitions from cancelled
      changed: ['current', 'upcoming', 'cancelled'],
    },
    match: {
      'pre-match': ['in-progress', 'delayed', 'suspended'],
      'in-progress': ['completed', 'suspended'],
      completed: [], // No transitions from completed
      delayed: ['in-progress', 'suspended'],
      suspended: ['in-progress', 'completed'],
    },
    system: {
      online: ['offline', 'sync-pending', 'error'],
      offline: ['online', 'sync-pending'],
      'sync-pending': ['online', 'offline', 'error'],
      error: ['online', 'offline'],
    },
    urgency: {
      warning: ['critical', 'action-required'],
      'action-required': ['warning', 'critical'],
      critical: ['warning', 'action-required'],
    },
  };
  
  const categoryTransitions = validTransitions[fromCategory];
  if (!categoryTransitions || !categoryTransitions[fromStatus]) return false;
  
  return categoryTransitions[fromStatus].includes(toStatus);
};