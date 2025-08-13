/**
 * Touch Target System Types
 * Comprehensive TypeScript interfaces for touch target compliance and interaction
 */

export type TouchTargetSize = 'small' | 'medium' | 'large' | 'custom';
export type TouchTargetPriority = 'low' | 'normal' | 'high' | 'critical';
export type TouchTargetState = 'default' | 'pressed' | 'disabled' | 'focused';
export type HapticFeedbackType = 'light' | 'medium' | 'heavy' | 'selection' | 'warning' | 'error' | 'success';
export type TouchTargetValidationStatus = 'compliant' | 'non-compliant' | 'warning' | 'unknown';

/**
 * Core touch target dimensions and properties
 */
export interface TouchTargetDimensions {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
}

/**
 * Touch target compliance configuration
 */
export interface TouchTargetCompliance {
  minimumSize: number; // WCAG 2.1 AA requirement: 44px
  recommendedSize: number; // Optimal size: 48px
  maximumSize: number; // Maximum practical size: 88px
  spacing: {
    minimum: number; // Minimum spacing between touch targets: 8px
    recommended: number; // Recommended spacing: 12px
    critical: number; // Critical element spacing: 16px
  };
}

/**
 * Touch target properties interface
 */
export interface TouchTargetProperties {
  id: string;
  size: TouchTargetSize;
  priority: TouchTargetPriority;
  dimensions: TouchTargetDimensions;
  isCompliant: boolean;
  validationStatus: TouchTargetValidationStatus;
  accessibilityLabel?: string;
  hapticFeedback?: HapticFeedbackType;
  customSizing?: {
    width?: number;
    height?: number;
  };
}

/**
 * Touch target spacing configuration
 */
export interface TouchTargetSpacing {
  top: number;
  right: number;
  bottom: number;
  left: number;
  horizontal: number;
  vertical: number;
}

/**
 * Touch feedback configuration
 */
export interface TouchFeedbackConfig {
  haptic: {
    enabled: boolean;
    type: HapticFeedbackType;
    intensity?: number; // 0-1
    duration?: number; // milliseconds
  };
  visual: {
    enabled: boolean;
    type: 'opacity' | 'scale' | 'highlight' | 'ripple';
    duration: number; // milliseconds
    color?: string;
  };
  audio: {
    enabled: boolean;
    soundType?: 'tap' | 'click' | 'success' | 'error' | 'warning';
    volume?: number; // 0-1
  };
}

/**
 * Touch target audit result
 */
export interface TouchTargetAuditResult {
  componentId: string;
  componentPath: string;
  touchTargets: TouchTargetProperties[];
  compliance: {
    overallScore: number; // 0-100
    compliantTargets: number;
    nonCompliantTargets: number;
    warningTargets: number;
    totalTargets: number;
  };
  issues: TouchTargetIssue[];
  recommendations: TouchTargetRecommendation[];
}

/**
 * Touch target validation issue
 */
export interface TouchTargetIssue {
  id: string;
  type: 'size' | 'spacing' | 'overlap' | 'accessibility' | 'performance';
  severity: 'error' | 'warning' | 'info';
  message: string;
  targetId?: string;
  position?: {
    x: number;
    y: number;
  };
  suggestedFix?: string;
}

/**
 * Touch target improvement recommendation
 */
export interface TouchTargetRecommendation {
  type: 'size' | 'spacing' | 'layout' | 'feedback' | 'accessibility';
  priority: TouchTargetPriority;
  message: string;
  implementation: string;
  estimatedImpact: 'low' | 'medium' | 'high';
}

/**
 * Touch target manager configuration
 */
export interface TouchTargetManagerConfig {
  compliance: TouchTargetCompliance;
  debugging: {
    enabled: boolean;
    visualizeTargets: boolean;
    logViolations: boolean;
    highlightNonCompliant: boolean;
  };
  feedback: TouchFeedbackConfig;
  accessibility: {
    announceChanges: boolean;
    respectReducedMotion: boolean;
    respectHapticPreferences: boolean;
  };
}

/**
 * Component touch target metadata
 */
export interface ComponentTouchTargetMetadata {
  componentName: string;
  componentPath: string;
  touchTargets: TouchTargetProperties[];
  lastAuditDate: Date;
  compliance: {
    score: number;
    status: TouchTargetValidationStatus;
    issues: TouchTargetIssue[];
  };
  performance: {
    renderTime: number; // milliseconds
    touchResponseTime: number; // milliseconds
    memoryUsage: number; // bytes
  };
}

/**
 * Touch target validation context
 */
export interface TouchTargetValidationContext {
  deviceInfo: {
    screenWidth: number;
    screenHeight: number;
    pixelDensity: number;
    platform: 'ios' | 'android' | 'web';
  };
  userPreferences: {
    hapticEnabled: boolean;
    audioEnabled: boolean;
    reducedMotion: boolean;
    increasedTouchTargets: boolean;
  };
  environmentalFactors: {
    outdoorConditions: boolean;
    glovedHands: boolean;
    wetConditions: boolean;
    singleHandedUse: boolean;
  };
}

/**
 * Touch target hook return type
 */
export interface UseTouchTargetReturn {
  touchTargetProps: {
    style: any;
    accessible: boolean;
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityHint?: string;
    hitSlop?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  isCompliant: boolean;
  validationStatus: TouchTargetValidationStatus;
  dimensions: TouchTargetDimensions;
  refreshValidation: () => void;
}

/**
 * Touch feedback hook return type
 */
export interface UseTouchFeedbackReturn {
  onPressIn: () => void;
  onPressOut: () => void;
  onPress: () => void;
  onLongPress?: () => void;
  feedbackConfig: TouchFeedbackConfig;
  updateFeedbackConfig: (config: Partial<TouchFeedbackConfig>) => void;
}

/**
 * Touch target visualization data
 */
export interface TouchTargetVisualizationData {
  targetId: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  compliance: TouchTargetValidationStatus;
  priority: TouchTargetPriority;
  issues: TouchTargetIssue[];
  metadata: {
    componentName: string;
    accessibilityLabel?: string;
    interactionType: 'button' | 'input' | 'card' | 'navigation' | 'custom';
  };
}