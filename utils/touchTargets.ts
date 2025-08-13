/**
 * Touch Target Utilities
 * Core functions for touch target sizing, validation, and compliance
 */

import { Dimensions, PixelRatio } from 'react-native';
import type {
  TouchTargetSize,
  TouchTargetProperties,
  TouchTargetCompliance,
  TouchTargetDimensions,
  TouchTargetAuditResult,
  TouchTargetIssue,
  TouchTargetRecommendation,
  TouchTargetValidationStatus,
  TouchTargetSpacing,
  TouchTargetValidationContext,
  ComponentTouchTargetMetadata,
} from '../types/touchTarget';

/**
 * Default touch target compliance configuration
 * Based on WCAG 2.1 AA requirements and mobile best practices
 */
export const DEFAULT_TOUCH_TARGET_COMPLIANCE: TouchTargetCompliance = {
  minimumSize: 44, // WCAG 2.1 AA requirement
  recommendedSize: 48, // Apple/Google recommendation
  maximumSize: 88, // Practical maximum
  spacing: {
    minimum: 8, // Minimum spacing to prevent conflicts
    recommended: 12, // Comfortable spacing
    critical: 16, // Spacing for critical actions
  },
};

/**
 * Touch target size presets optimized for different interaction types
 */
export const TOUCH_TARGET_PRESETS = {
  small: {
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
  },
  medium: {
    width: 48,
    height: 48,
    minWidth: 48,
    minHeight: 48,
  },
  large: {
    width: 56,
    height: 56,
    minWidth: 56,
    minHeight: 56,
  },
  critical: {
    width: 64,
    height: 64,
    minWidth: 64,
    minHeight: 64,
  },
} as const;

/**
 * Get device-specific information for touch target calculations
 */
export const getDeviceInfo = () => {
  const { width, height } = Dimensions.get('window');
  const pixelDensity = PixelRatio.get();
  
  return {
    screenWidth: width,
    screenHeight: height,
    pixelDensity,
    platform: 'react-native' as const,
  };
};

/**
 * Calculate optimal touch target dimensions based on device and context
 */
export const calculateOptimalTouchTargetSize = (
  baseSize: TouchTargetSize = 'medium',
  context?: Partial<TouchTargetValidationContext>
): TouchTargetDimensions => {
  let baseDimensions = TOUCH_TARGET_PRESETS[baseSize] || TOUCH_TARGET_PRESETS.medium;
  
  // Adjust for environmental factors
  if (context?.environmentalFactors) {
    const { outdoorConditions, glovedHands, singleHandedUse } = context.environmentalFactors;
    
    let sizeMultiplier = 1;
    
    if (outdoorConditions || glovedHands) {
      sizeMultiplier *= 1.1; // 10% larger for difficult conditions
    }
    
    if (singleHandedUse) {
      sizeMultiplier *= 1.05; // 5% larger for one-handed use
    }
    
    baseDimensions = {
      width: Math.round(baseDimensions.width * sizeMultiplier),
      height: Math.round(baseDimensions.height * sizeMultiplier),
      minWidth: Math.round(baseDimensions.minWidth * sizeMultiplier),
      minHeight: Math.round(baseDimensions.minHeight * sizeMultiplier),
    };
  }
  
  // Ensure minimum compliance
  const compliance = DEFAULT_TOUCH_TARGET_COMPLIANCE;
  
  return {
    width: Math.max(baseDimensions.width, compliance.minimumSize),
    height: Math.max(baseDimensions.height, compliance.minimumSize),
    minWidth: Math.max(baseDimensions.minWidth, compliance.minimumSize),
    minHeight: Math.max(baseDimensions.minHeight, compliance.minimumSize),
  };
};

/**
 * Validate if touch target dimensions meet compliance requirements
 */
export const validateTouchTargetCompliance = (
  dimensions: TouchTargetDimensions,
  compliance: TouchTargetCompliance = DEFAULT_TOUCH_TARGET_COMPLIANCE
): {
  isCompliant: boolean;
  validationStatus: TouchTargetValidationStatus;
  issues: TouchTargetIssue[];
} => {
  const issues: TouchTargetIssue[] = [];
  let isCompliant = true;
  let validationStatus: TouchTargetValidationStatus = 'compliant';
  
  // Check minimum size compliance
  if (dimensions.width < compliance.minimumSize || dimensions.height < compliance.minimumSize) {
    isCompliant = false;
    validationStatus = 'non-compliant';
    issues.push({
      id: `size-compliance-${Date.now()}`,
      type: 'size',
      severity: 'error',
      message: `Touch target size ${dimensions.width}x${dimensions.height}px is below minimum requirement of ${compliance.minimumSize}px`,
      suggestedFix: `Increase touch target size to at least ${compliance.minimumSize}x${compliance.minimumSize}px`,
    });
  }
  
  // Check if size is below recommended
  if (isCompliant && (dimensions.width < compliance.recommendedSize || dimensions.height < compliance.recommendedSize)) {
    validationStatus = 'warning';
    issues.push({
      id: `size-recommendation-${Date.now()}`,
      type: 'size',
      severity: 'warning',
      message: `Touch target size ${dimensions.width}x${dimensions.height}px is below recommended size of ${compliance.recommendedSize}px`,
      suggestedFix: `Consider increasing touch target size to ${compliance.recommendedSize}x${compliance.recommendedSize}px for better usability`,
    });
  }
  
  // Check maximum practical size
  if (dimensions.width > compliance.maximumSize || dimensions.height > compliance.maximumSize) {
    issues.push({
      id: `size-maximum-${Date.now()}`,
      type: 'size',
      severity: 'warning',
      message: `Touch target size ${dimensions.width}x${dimensions.height}px exceeds practical maximum of ${compliance.maximumSize}px`,
      suggestedFix: `Consider reducing touch target size for better layout efficiency`,
    });
  }
  
  return {
    isCompliant,
    validationStatus,
    issues,
  };
};

/**
 * Calculate appropriate spacing between touch targets
 */
export const calculateTouchTargetSpacing = (
  currentTarget: TouchTargetDimensions,
  adjacentTarget?: TouchTargetDimensions,
  priority: 'normal' | 'critical' = 'normal'
): TouchTargetSpacing => {
  const compliance = DEFAULT_TOUCH_TARGET_COMPLIANCE;
  const baseSpacing = priority === 'critical' 
    ? compliance.spacing.critical 
    : compliance.spacing.recommended;
  
  // Calculate responsive spacing based on target sizes
  const avgSize = adjacentTarget 
    ? (currentTarget.width + currentTarget.height + adjacentTarget.width + adjacentTarget.height) / 4
    : (currentTarget.width + currentTarget.height) / 2;
  
  const spacingMultiplier = Math.max(1, avgSize / compliance.recommendedSize);
  const calculatedSpacing = Math.round(baseSpacing * spacingMultiplier);
  
  return {
    top: calculatedSpacing,
    right: calculatedSpacing,
    bottom: calculatedSpacing,
    left: calculatedSpacing,
    horizontal: calculatedSpacing,
    vertical: calculatedSpacing,
  };
};

/**
 * Detect overlapping touch targets
 */
export const detectTouchTargetOverlaps = (
  targets: Array<{
    id: string;
    bounds: { x: number; y: number; width: number; height: number };
    dimensions: TouchTargetDimensions;
  }>
): TouchTargetIssue[] => {
  const issues: TouchTargetIssue[] = [];
  
  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const target1 = targets[i];
      const target2 = targets[j];
      
      // Check for overlap
      const overlap = !(
        target1.bounds.x + target1.bounds.width < target2.bounds.x ||
        target2.bounds.x + target2.bounds.width < target1.bounds.x ||
        target1.bounds.y + target1.bounds.height < target2.bounds.y ||
        target2.bounds.y + target2.bounds.height < target1.bounds.y
      );
      
      if (overlap) {
        issues.push({
          id: `overlap-${target1.id}-${target2.id}`,
          type: 'overlap',
          severity: 'error',
          message: `Touch targets "${target1.id}" and "${target2.id}" are overlapping`,
          suggestedFix: 'Increase spacing between touch targets or adjust layout',
        });
      }
    }
  }
  
  return issues;
};

/**
 * Generate touch target audit report for a component
 */
export const auditComponentTouchTargets = (
  componentId: string,
  componentPath: string,
  touchTargets: TouchTargetProperties[]
): TouchTargetAuditResult => {
  let compliantTargets = 0;
  let nonCompliantTargets = 0;
  let warningTargets = 0;
  const allIssues: TouchTargetIssue[] = [];
  const recommendations: TouchTargetRecommendation[] = [];
  
  // Validate each touch target
  touchTargets.forEach((target) => {
    const validation = validateTouchTargetCompliance(target.dimensions);
    
    if (validation.isCompliant) {
      if (validation.validationStatus === 'warning') {
        warningTargets++;
      } else {
        compliantTargets++;
      }
    } else {
      nonCompliantTargets++;
    }
    
    allIssues.push(...validation.issues);
  });
  
  // Generate recommendations based on issues
  if (nonCompliantTargets > 0) {
    recommendations.push({
      type: 'size',
      priority: 'high',
      message: `${nonCompliantTargets} touch targets are below minimum size requirement`,
      implementation: `Update touch target dimensions to meet 44px minimum requirement using TouchTargetManager utility`,
      estimatedImpact: 'high',
    });
  }
  
  if (warningTargets > 0) {
    recommendations.push({
      type: 'size',
      priority: 'normal',
      message: `${warningTargets} touch targets could be improved with larger sizes`,
      implementation: `Consider increasing touch target sizes to 48px for optimal usability`,
      estimatedImpact: 'medium',
    });
  }
  
  // Calculate overall compliance score
  const totalTargets = touchTargets.length;
  const overallScore = totalTargets > 0 
    ? Math.round(((compliantTargets + (warningTargets * 0.5)) / totalTargets) * 100)
    : 100;
  
  return {
    componentId,
    componentPath,
    touchTargets,
    compliance: {
      overallScore,
      compliantTargets,
      nonCompliantTargets,
      warningTargets,
      totalTargets,
    },
    issues: allIssues,
    recommendations,
  };
};

/**
 * Generate hit slop configuration for React Native components
 */
export const generateHitSlop = (
  currentSize: TouchTargetDimensions,
  compliance: TouchTargetCompliance = DEFAULT_TOUCH_TARGET_COMPLIANCE
) => {
  // Calculate additional hit area needed to meet minimum requirements
  const widthDeficit = Math.max(0, compliance.minimumSize - currentSize.width);
  const heightDeficit = Math.max(0, compliance.minimumSize - currentSize.height);
  
  const hitSlop = {
    top: Math.ceil(heightDeficit / 2),
    right: Math.ceil(widthDeficit / 2),
    bottom: Math.ceil(heightDeficit / 2),
    left: Math.ceil(widthDeficit / 2),
  };
  
  return hitSlop;
};

/**
 * Performance measurement utilities for touch targets
 */
export const measureTouchTargetPerformance = () => {
  const startTime = performance.now();
  let touchCount = 0;
  let totalResponseTime = 0;
  
  return {
    recordTouchResponse: (responseTime: number) => {
      touchCount++;
      totalResponseTime += responseTime;
    },
    getMetrics: () => {
      const endTime = performance.now();
      const averageResponseTime = touchCount > 0 ? totalResponseTime / touchCount : 0;
      
      return {
        totalDuration: endTime - startTime,
        touchCount,
        averageResponseTime,
        performanceScore: averageResponseTime < 16 ? 'excellent' : 
                         averageResponseTime < 32 ? 'good' : 
                         averageResponseTime < 64 ? 'fair' : 'poor',
      };
    },
  };
};

/**
 * Utility to convert touch target configuration to React Native styles
 */
export const touchTargetToStyles = (
  dimensions: TouchTargetDimensions,
  spacing?: TouchTargetSpacing
) => {
  const styles = {
    width: dimensions.width,
    height: dimensions.height,
    minWidth: dimensions.minWidth,
    minHeight: dimensions.minHeight,
  };
  
  if (spacing) {
    return {
      ...styles,
      marginTop: spacing.top,
      marginRight: spacing.right,
      marginBottom: spacing.bottom,
      marginLeft: spacing.left,
    };
  }
  
  return styles;
};

/**
 * Validate touch target transition animations for performance
 */
export const validateTouchTargetAnimations = (
  animationConfig: {
    duration: number;
    useNativeDriver: boolean;
    property: string;
  }
): { isOptimized: boolean; recommendations: string[] } => {
  const recommendations: string[] = [];
  let isOptimized = true;
  
  // Check animation duration
  if (animationConfig.duration > 300) {
    isOptimized = false;
    recommendations.push('Consider reducing animation duration to under 300ms for better responsiveness');
  }
  
  // Check native driver usage
  if (!animationConfig.useNativeDriver && ['opacity', 'transform'].includes(animationConfig.property)) {
    isOptimized = false;
    recommendations.push('Enable native driver for opacity and transform animations');
  }
  
  // Check for layout-triggering properties
  if (['width', 'height', 'padding', 'margin'].includes(animationConfig.property)) {
    recommendations.push('Consider using transform properties instead of layout properties for better performance');
  }
  
  return {
    isOptimized,
    recommendations,
  };
};