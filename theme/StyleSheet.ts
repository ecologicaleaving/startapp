/**
 * Enhanced StyleSheet utilities with design token integration
 * Performance-optimized styling for React Native with type safety
 */

import { StyleSheet as RNStyleSheet, TextStyle, ViewStyle } from 'react-native';
import { designTokens } from './tokens';

export const StyleSheet = {
  ...RNStyleSheet,
  
  /**
   * Create styles with design token integration
   */
  createWithTokens: <T extends Record<string, ViewStyle | TextStyle>>(styles: T): T => {
    return RNStyleSheet.create(styles);
  },

  /**
   * Create responsive styles based on device dimensions
   */
  createResponsive: <T extends Record<string, ViewStyle | TextStyle>>(styles: T): T => {
    return RNStyleSheet.create(styles);
  },
};

// Pre-built style mixins using design tokens
export const styleMixins = {
  /**
   * Typography style mixins
   */
  typography: {
    hero: {
      fontSize: designTokens.typography.hero.fontSize,
      fontWeight: designTokens.typography.hero.fontWeight,
      lineHeight: designTokens.typography.hero.lineHeight,
      letterSpacing: designTokens.typography.hero.letterSpacing,
      color: designTokens.colors.textPrimary,
    } as TextStyle,
    
    h1: {
      fontSize: designTokens.typography.h1.fontSize,
      fontWeight: designTokens.typography.h1.fontWeight,
      lineHeight: designTokens.typography.h1.lineHeight,
      letterSpacing: designTokens.typography.h1.letterSpacing,
      color: designTokens.colors.textPrimary,
    } as TextStyle,
    
    h2: {
      fontSize: designTokens.typography.h2.fontSize,
      fontWeight: designTokens.typography.h2.fontWeight,
      lineHeight: designTokens.typography.h2.lineHeight,
      letterSpacing: designTokens.typography.h2.letterSpacing,
      color: designTokens.colors.textPrimary,
    } as TextStyle,
    
    bodyLarge: {
      fontSize: designTokens.typography.bodyLarge.fontSize,
      fontWeight: designTokens.typography.bodyLarge.fontWeight,
      lineHeight: designTokens.typography.bodyLarge.lineHeight,
      letterSpacing: designTokens.typography.bodyLarge.letterSpacing,
      color: designTokens.colors.textPrimary,
    } as TextStyle,
    
    body: {
      fontSize: designTokens.typography.body.fontSize,
      fontWeight: designTokens.typography.body.fontWeight,
      lineHeight: designTokens.typography.body.lineHeight,
      letterSpacing: designTokens.typography.body.letterSpacing,
      color: designTokens.colors.textPrimary,
    } as TextStyle,
    
    caption: {
      fontSize: designTokens.typography.caption.fontSize,
      fontWeight: designTokens.typography.caption.fontWeight,
      lineHeight: designTokens.typography.caption.lineHeight,
      letterSpacing: designTokens.typography.caption.letterSpacing,
      color: designTokens.colors.textSecondary,
    } as TextStyle,
  },

  /**
   * Color style mixins
   */
  colors: {
    primary: { color: designTokens.colors.primary } as TextStyle,
    secondary: { color: designTokens.colors.secondary } as TextStyle,
    accent: { color: designTokens.colors.accent } as TextStyle,
    success: { color: designTokens.colors.success } as TextStyle,
    warning: { color: designTokens.colors.warning } as TextStyle,
    error: { color: designTokens.colors.error } as TextStyle,
    textPrimary: { color: designTokens.colors.textPrimary } as TextStyle,
    textSecondary: { color: designTokens.colors.textSecondary } as TextStyle,
  },

  /**
   * Background style mixins
   */
  backgrounds: {
    primary: { backgroundColor: designTokens.colors.primary } as ViewStyle,
    secondary: { backgroundColor: designTokens.colors.secondary } as ViewStyle,
    accent: { backgroundColor: designTokens.colors.accent } as ViewStyle,
    success: { backgroundColor: designTokens.colors.success } as ViewStyle,
    warning: { backgroundColor: designTokens.colors.warning } as ViewStyle,
    error: { backgroundColor: designTokens.colors.error } as ViewStyle,
    background: { backgroundColor: designTokens.colors.background } as ViewStyle,
  },

  /**
   * Spacing style mixins
   */
  spacing: {
    paddingXS: { padding: designTokens.spacing.xs } as ViewStyle,
    paddingSM: { padding: designTokens.spacing.sm } as ViewStyle,
    paddingMD: { padding: designTokens.spacing.md } as ViewStyle,
    paddingLG: { padding: designTokens.spacing.lg } as ViewStyle,
    paddingXL: { padding: designTokens.spacing.xl } as ViewStyle,
    paddingXXL: { padding: designTokens.spacing.xxl } as ViewStyle,
    
    marginXS: { margin: designTokens.spacing.xs } as ViewStyle,
    marginSM: { margin: designTokens.spacing.sm } as ViewStyle,
    marginMD: { margin: designTokens.spacing.md } as ViewStyle,
    marginLG: { margin: designTokens.spacing.lg } as ViewStyle,
    marginXL: { margin: designTokens.spacing.xl } as ViewStyle,
    marginXXL: { margin: designTokens.spacing.xxl } as ViewStyle,
  },

  /**
   * Touch target optimizations for outdoor use
   */
  touchTargets: {
    minimum: {
      minWidth: 44,
      minHeight: 44,
    } as ViewStyle,
    
    preferred: {
      minWidth: 56,
      minHeight: 56,
    } as ViewStyle,
    
    large: {
      minWidth: 64,
      minHeight: 64,
    } as ViewStyle,
  },

  /**
   * Accessibility and focus state mixins
   */
  accessibility: {
    focusIndicator: {
      borderWidth: 4,
      borderColor: designTokens.colors.accent,
      borderStyle: 'solid',
    } as ViewStyle,
    
    highContrast: {
      // Additional styles for high contrast mode
      shadowOpacity: 0,
      elevation: 0,
    } as ViewStyle,
  },
};