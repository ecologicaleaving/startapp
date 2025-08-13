/**
 * useTouchTarget Hook
 * Custom hook for touch target management and validation
 */

import { useMemo, useCallback, useState, useRef } from 'react';
import type {
  TouchTargetSize,
  TouchTargetPriority,
  UseTouchTargetReturn,
  TouchTargetValidationStatus,
  TouchTargetDimensions,
  TouchTargetValidationContext,
} from '../types/touchTarget';
import {
  calculateOptimalTouchTargetSize,
  validateTouchTargetCompliance,
  generateHitSlop,
  touchTargetToStyles,
  DEFAULT_TOUCH_TARGET_COMPLIANCE,
} from '../utils/touchTargets';

interface UseTouchTargetOptions {
  /**
   * Touch target configuration
   */
  size?: TouchTargetSize;
  priority?: TouchTargetPriority;
  customSize?: {
    width?: number;
    height?: number;
  };
  
  /**
   * Compliance settings
   */
  enforceCompliance?: boolean;
  enableValidation?: boolean;
  
  /**
   * Context for responsive sizing
   */
  validationContext?: Partial<TouchTargetValidationContext>;
  
  /**
   * Accessibility configuration
   */
  accessibilityLabel?: string;
  accessibilityRole?: string;
  accessibilityHint?: string;
  
  /**
   * Performance monitoring
   */
  enablePerformanceTracking?: boolean;
}

/**
 * Custom hook for managing touch target properties and validation
 */
export const useTouchTarget = (
  targetId: string,
  options: UseTouchTargetOptions = {}
): UseTouchTargetReturn => {
  const {
    size = 'medium',
    priority = 'normal',
    customSize,
    enforceCompliance = true,
    enableValidation = true,
    validationContext,
    accessibilityLabel,
    accessibilityRole = 'button',
    accessibilityHint,
    enablePerformanceTracking = false,
  } = options;
  
  // State for dynamic validation
  const [validationCache, setValidationCache] = useState<{
    timestamp: number;
    result: {
      isCompliant: boolean;
      validationStatus: TouchTargetValidationStatus;
      issues: any[];
    };
  } | null>(null);
  
  // Performance tracking
  const performanceRef = useRef({
    renderCount: 0,
    lastRenderTime: 0,
    validationCount: 0,
  });
  
  // Calculate optimal dimensions
  const dimensions = useMemo((): TouchTargetDimensions => {
    performanceRef.current.renderCount++;
    performanceRef.current.lastRenderTime = performance.now();
    
    if (customSize) {
      return {
        width: customSize.width || DEFAULT_TOUCH_TARGET_COMPLIANCE.minimumSize,
        height: customSize.height || DEFAULT_TOUCH_TARGET_COMPLIANCE.minimumSize,
        minWidth: customSize.width || DEFAULT_TOUCH_TARGET_COMPLIANCE.minimumSize,
        minHeight: customSize.height || DEFAULT_TOUCH_TARGET_COMPLIANCE.minimumSize,
      };
    }
    
    return calculateOptimalTouchTargetSize(size, validationContext);
  }, [size, customSize, validationContext]);
  
  // Validate compliance
  const validationResult = useMemo(() => {
    if (!enableValidation) {
      return {
        isCompliant: true,
        validationStatus: 'unknown' as TouchTargetValidationStatus,
        issues: [],
      };
    }
    
    performanceRef.current.validationCount++;
    const result = validateTouchTargetCompliance(dimensions);
    
    // Cache validation result
    setValidationCache({
      timestamp: Date.now(),
      result,
    });
    
    return result;
  }, [dimensions, enableValidation]);
  
  // Generate hit slop for compliance enforcement
  const hitSlop = useMemo(() => {
    if (!enforceCompliance || validationResult.isCompliant) {
      return undefined;
    }
    
    return generateHitSlop(dimensions);
  }, [dimensions, enforceCompliance, validationResult.isCompliant]);
  
  // Generate touch target props for React Native components
  const touchTargetProps = useMemo(() => {
    const baseStyles = touchTargetToStyles(dimensions);
    
    return {
      style: baseStyles,
      accessible: true,
      accessibilityLabel: accessibilityLabel || `Touch target ${targetId}`,
      accessibilityRole: accessibilityRole,
      accessibilityHint: accessibilityHint,
      hitSlop: hitSlop,
    };
  }, [dimensions, accessibilityLabel, targetId, accessibilityRole, accessibilityHint, hitSlop]);
  
  // Refresh validation function
  const refreshValidation = useCallback(() => {
    // Clear validation cache to force re-validation
    setValidationCache(null);
    
    // Trigger re-validation by updating a dependency
    const newResult = validateTouchTargetCompliance(dimensions);
    
    setValidationCache({
      timestamp: Date.now(),
      result: newResult,
    });
    
    return newResult;
  }, [dimensions]);
  
  // Performance metrics getter
  const getPerformanceMetrics = useCallback(() => {
    if (!enablePerformanceTracking) {
      return null;
    }
    
    return {
      renderCount: performanceRef.current.renderCount,
      lastRenderTime: performanceRef.current.lastRenderTime,
      validationCount: performanceRef.current.validationCount,
      cacheHit: validationCache ? Date.now() - validationCache.timestamp < 5000 : false,
    };
  }, [enablePerformanceTracking, validationCache]);
  
  // Debug information
  const getDebugInfo = useCallback(() => ({
    targetId,
    dimensions,
    validationResult,
    hitSlop,
    performanceMetrics: getPerformanceMetrics(),
    options: {
      size,
      priority,
      customSize,
      enforceCompliance,
      enableValidation,
    },
  }), [
    targetId,
    dimensions,
    validationResult,
    hitSlop,
    getPerformanceMetrics,
    size,
    priority,
    customSize,
    enforceCompliance,
    enableValidation,
  ]);
  
  return {
    touchTargetProps,
    isCompliant: validationResult.isCompliant,
    validationStatus: validationResult.validationStatus,
    dimensions,
    refreshValidation,
    
    // Additional utilities for advanced use cases
    ...(enablePerformanceTracking && {
      performanceMetrics: getPerformanceMetrics(),
    }),
    
    // Debug utilities (development only)
    ...(__DEV__ && {
      debugInfo: getDebugInfo(),
      validationIssues: validationResult.issues,
    }),
  };
};