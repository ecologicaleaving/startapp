/**
 * AccessibilityIcon Component
 * Story 1.5: Outdoor-Optimized Iconography
 * 
 * Enhanced icon component with comprehensive accessibility support
 */

import React from 'react';
import { AccessibilityRole, AccessibilityState } from 'react-native';
import { Icon, IconProps } from './Icon';

export interface AccessibilityIconProps extends IconProps {
  // Enhanced accessibility props
  accessibilityState?: AccessibilityState;
  accessibilityValue?: {
    min?: number;
    max?: number;
    now?: number;
    text?: string;
  };
  importantForAccessibility?: 'auto' | 'yes' | 'no' | 'no-hide-descendants';
  accessibilityElementsHidden?: boolean;
  accessibilityLiveRegion?: 'none' | 'polite' | 'assertive';
  
  // Screen reader specific props
  screenReaderDescription?: string;
  contextualHint?: string;
  
  // High contrast support
  respectHighContrastMode?: boolean;
  highContrastFallback?: string;
}

export const AccessibilityIcon: React.FC<AccessibilityIconProps> = React.memo(({
  screenReaderDescription,
  contextualHint,
  respectHighContrastMode = true,
  highContrastFallback,
  accessibilityLabel,
  accessibilityHint,
  accessibilityState,
  accessibilityValue,
  importantForAccessibility = 'auto',
  accessibilityElementsHidden,
  accessibilityLiveRegion = 'none',
  theme = 'default',
  ...iconProps
}) => {
  // Determine accessibility role based on interactivity
  const getAccessibilityRole = (): AccessibilityRole => {
    if (iconProps.isInteractive && iconProps.onPress) {
      return 'button';
    }
    return 'image';
  };

  // Enhanced accessibility label generation
  const generateAccessibilityLabel = (): string => {
    if (accessibilityLabel) {
      return accessibilityLabel;
    }
    
    const baseLabel = `${iconProps.category} ${iconProps.name} icon`;
    
    if (screenReaderDescription) {
      return `${baseLabel}, ${screenReaderDescription}`;
    }
    
    return baseLabel;
  };

  // Enhanced accessibility hint generation
  const generateAccessibilityHint = (): string | undefined => {
    if (accessibilityHint) {
      return accessibilityHint;
    }
    
    if (contextualHint) {
      return contextualHint;
    }
    
    if (iconProps.isInteractive) {
      return `Double tap to ${iconProps.category === 'action' ? 'perform action' : 'navigate'}`;
    }
    
    return undefined;
  };

  // High contrast mode support
  const getHighContrastTheme = () => {
    if (respectHighContrastMode && highContrastFallback) {
      // In a real app, this would check the system's high contrast setting
      // For now, we'll use the accessibility theme for maximum contrast
      return 'accessibility';
    }
    return theme;
  };

  return (
    <Icon
      {...iconProps}
      theme={getHighContrastTheme()}
      accessibilityRole={getAccessibilityRole()}
      accessibilityLabel={generateAccessibilityLabel()}
      accessibilityHint={generateAccessibilityHint()}
      accessibilityState={accessibilityState}
      accessibilityValue={accessibilityValue}
      importantForAccessibility={importantForAccessibility}
      accessibilityElementsHidden={accessibilityElementsHidden}
      accessibilityLiveRegion={accessibilityLiveRegion}
    />
  );
});

AccessibilityIcon.displayName = 'AccessibilityIcon';

export default AccessibilityIcon;