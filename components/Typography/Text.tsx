/**
 * Typography Components for React Native/Expo
 * WCAG AAA Compliant Text Components for Tournament Referees
 * Enhanced Hierarchical Typography System for Outdoor Scanning
 */

import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';
import { getColor, getTextColor } from '../../utils/colors';
import { 
  getResponsiveTypography, 
  getCriticalInfoTypography,
  getOptimizedLineHeight,
  getOptimizedLetterSpacing,
  type EmphasisLevel,
  type InformationHierarchy,
  type ScanningPattern 
} from '../../utils/typography';

// Define semantic text variants
export type TextVariant = 'hero' | 'h1' | 'h2' | 'bodyLarge' | 'body' | 'caption';
export type TextColor = keyof typeof colors;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  backgroundColor?: TextColor;
  emphasis?: EmphasisLevel;
  hierarchy?: InformationHierarchy;
  scanningPattern?: ScanningPattern;
  critical?: boolean;
  children: React.ReactNode;
}

/**
 * Base Text component with typography system integration
 * Enhanced with hierarchical typography system for outdoor scanning
 * Provides semantic markup and WCAG AAA compliant styling
 */
export const Text = React.memo<TextProps>(({ 
  variant = 'body', 
  color, 
  backgroundColor,
  emphasis,
  hierarchy,
  scanningPattern,
  critical = false,
  style, 
  children, 
  ...props 
}) => {
  // Use critical typography optimization if flag is set
  const typographyStyle = critical 
    ? getCriticalInfoTypography(variant)
    : getResponsiveTypography(variant, { emphasis, hierarchy });
  
  // Determine text color based on background or explicit color prop
  let textColor: string;
  if (color) {
    textColor = getColor(color);
  } else if (backgroundColor) {
    textColor = getTextColor(backgroundColor);
  } else {
    textColor = colors.textPrimary;
  }

  // Optimize line height and letter spacing for outdoor readability
  const optimizedLineHeight = getOptimizedLineHeight(typographyStyle.fontSize, variant);
  const optimizedLetterSpacing = getOptimizedLetterSpacing(typographyStyle.fontSize, variant, emphasis);

  const computedStyle = [
    styles.base,
    {
      fontSize: typographyStyle.fontSize,
      fontWeight: typographyStyle.fontWeight as any,
      lineHeight: optimizedLineHeight,
      letterSpacing: optimizedLetterSpacing,
      color: textColor,
    },
    backgroundColor && { backgroundColor: getColor(backgroundColor) },
    style,
  ];

  return (
    <RNText style={computedStyle} {...props}>
      {children}
    </RNText>
  );
});

Text.displayName = 'Text';

/**
 * Hero Text Component - 40px Bold
 * Used for current court number display and critical information
 */
export function HeroText({ children, ...props }: Omit<TextProps, 'variant'>) {
  return (
    <Text variant="hero" {...props}>
      {children}
    </Text>
  );
}

/**
 * H1 Text Component - 32px Bold  
 * Used for screen titles and primary headings
 */
export function H1Text({ children, ...props }: Omit<TextProps, 'variant'>) {
  return (
    <Text variant="h1" {...props}>
      {children}
    </Text>
  );
}

/**
 * H2 Text Component - 24px Semibold
 * Used for section headers and team names
 */
export function H2Text({ children, ...props }: Omit<TextProps, 'variant'>) {
  return (
    <Text variant="h2" {...props}>
      {children}
    </Text>
  );
}

/**
 * Body Large Text Component - 18px Regular
 * Used for primary content and assignment details
 */
export function BodyLargeText({ children, ...props }: Omit<TextProps, 'variant'>) {
  return (
    <Text variant="bodyLarge" {...props}>
      {children}
    </Text>
  );
}

/**
 * Body Text Component - 16px Regular
 * Used for standard text and general information
 */
export function BodyText({ children, ...props }: Omit<TextProps, 'variant'>) {
  return (
    <Text variant="body" {...props}>
      {children}
    </Text>
  );
}

/**
 * Caption Text Component - 14px Medium
 * Used for metadata, timestamps, and status text
 */
export function CaptionText({ children, ...props }: Omit<TextProps, 'variant'>) {
  return (
    <Text variant="caption" {...props}>
      {children}
    </Text>
  );
}

// =====================================================
// NEW SEMANTIC COMPONENTS - Story 1.3 Implementation
// =====================================================

/**
 * Title Component - Hero/H1 text for primary screen titles
 * Optimized for referee dashboard titles and primary information
 */
export function Title({ 
  level = 1, 
  critical = false,
  children, 
  ...props 
}: Omit<TextProps, 'variant'> & { level?: 1 | 2; critical?: boolean }) {
  const variant = level === 1 ? 'hero' : 'h1';
  
  return (
    <Text 
      variant={variant} 
      hierarchy="primary"
      emphasis={critical ? 'critical' : 'high'}
      critical={critical}
      {...props}
    >
      {children}
    </Text>
  );
}

/**
 * Heading Component - H2 text for section headers and card titles
 * Supports different emphasis levels for information hierarchy
 */
export function Heading({ 
  emphasis = 'medium',
  hierarchy = 'secondary',
  children, 
  ...props 
}: Omit<TextProps, 'variant'> & { 
  emphasis?: EmphasisLevel;
  hierarchy?: InformationHierarchy;
}) {
  return (
    <Text 
      variant="h2" 
      emphasis={emphasis}
      hierarchy={hierarchy}
      {...props}
    >
      {children}
    </Text>
  );
}

/**
 * Subheading Component - Body Large text for important secondary information
 * Used for match details, team names, and key information
 */
export function Subheading({ 
  emphasis = 'medium',
  children, 
  ...props 
}: Omit<TextProps, 'variant'> & { emphasis?: EmphasisLevel }) {
  return (
    <Text 
      variant="bodyLarge" 
      emphasis={emphasis}
      hierarchy="secondary"
      {...props}
    >
      {children}
    </Text>
  );
}

/**
 * Enhanced BodyText Component - Standard body text with scanning optimization
 * Supports different hierarchy levels and emphasis for information prioritization
 */
export function EnhancedBodyText({ 
  emphasis = 'medium',
  hierarchy = 'tertiary',
  children, 
  ...props 
}: Omit<TextProps, 'variant'> & { 
  emphasis?: EmphasisLevel;
  hierarchy?: InformationHierarchy;
}) {
  return (
    <Text 
      variant="body" 
      emphasis={emphasis}
      hierarchy={hierarchy}
      {...props}
    >
      {children}
    </Text>
  );
}

/**
 * Enhanced Caption Component - Small text with emphasis support
 * Used for metadata, timestamps, status indicators with priority levels
 */
export function EnhancedCaption({ 
  emphasis = 'low',
  urgent = false,
  children, 
  ...props 
}: Omit<TextProps, 'variant'> & { 
  emphasis?: EmphasisLevel;
  urgent?: boolean;
}) {
  return (
    <Text 
      variant="caption" 
      emphasis={urgent ? 'critical' : emphasis}
      hierarchy="tertiary"
      critical={urgent}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: 'System', // Uses SF Pro on iOS, Roboto on Android
    includeFontPadding: false, // Android-specific: removes extra padding
    textAlignVertical: 'center', // Android-specific: centers text vertically
  },
});