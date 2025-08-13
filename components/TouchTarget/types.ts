/**
 * TouchTarget Component Types
 * Type definitions for TouchTarget components
 */

import type { ViewProps } from 'react-native';
import type {
  TouchTargetSize,
  TouchTargetPriority,
  TouchTargetValidationStatus,
  ComponentTouchTargetMetadata,
  TouchTargetVisualizationData,
  TouchTargetIssue,
  TouchFeedbackConfig,
} from '../../types/touchTarget';

/**
 * TouchTargetManager component props
 */
export interface TouchTargetManagerProps extends ViewProps {
  targetId: string;
  size?: TouchTargetSize;
  priority?: TouchTargetPriority;
  customSize?: {
    width?: number;
    height?: number;
  };
  enforceCompliance?: boolean;
  enableValidation?: boolean;
  enableDebugging?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  onLongPress?: () => void;
  onValidationResult?: (result: {
    isCompliant: boolean;
    validationStatus: TouchTargetValidationStatus;
    metadata: ComponentTouchTargetMetadata;
  }) => void;
  children?: React.ReactNode;
  containerStyle?: any;
  debugStyle?: any;
}

/**
 * TouchTargetVisualization component props
 */
export interface TouchTargetVisualizationProps {
  touchTargets: TouchTargetVisualizationData[];
  enabled?: boolean;
  showCompliantTargets?: boolean;
  showNonCompliantTargets?: boolean;
  showWarnings?: boolean;
  showDimensions?: boolean;
  showAccessibilityInfo?: boolean;
  onTargetPress?: (target: TouchTargetVisualizationData) => void;
  onIssuePress?: (issue: TouchTargetIssue) => void;
  overlayOpacity?: number;
  compliantColor?: string;
  nonCompliantColor?: string;
  warningColor?: string;
  showDebugPanel?: boolean;
  debugPanelPosition?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * TouchFeedbackProvider component props
 */
export interface TouchFeedbackProviderProps {
  children: React.ReactNode;
  initialConfig?: Partial<TouchFeedbackConfig>;
  respectSystemPreferences?: boolean;
}