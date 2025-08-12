/**
 * Brand Header Component
 * Professional referee tool navigation header with FIVB branding
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Text } from '../Typography/Text';
import { BrandLogo } from './BrandLogo';
import { colors, spacing } from '../../theme/tokens';

export interface BrandHeaderProps {
  title?: string;
  subtitle?: string;
  showLogo?: boolean;
  logoVariant?: 'primary' | 'symbol';
  backgroundColor?: keyof typeof colors;
  textColor?: keyof typeof colors;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  subtitleStyle?: TextStyle;
}

export const BrandHeader: React.FC<BrandHeaderProps> = ({
  title = 'Referee Tool',
  subtitle,
  showLogo = true,
  logoVariant = 'primary',
  backgroundColor = 'primary',
  textColor = 'background',
  style,
  titleStyle,
  subtitleStyle,
}) => {
  const bgColor = colors[backgroundColor];
  const txtColor = colors[textColor];
  
  return (
    <View style={[
      styles.container,
      { backgroundColor: bgColor },
      style
    ]}>
      <View style={styles.content}>
        {showLogo && (
          <View style={styles.logoContainer}>
            <BrandLogo 
              variant={logoVariant}
              theme={backgroundColor === 'background' ? 'light' : 'dark'}
              size="medium"
            />
          </View>
        )}
        
        <View style={styles.textContainer}>
          <Text 
            variant="h2" 
            color={txtColor}
            style={[{ color: txtColor }, titleStyle]}
          >
            {title}
          </Text>
          
          {subtitle && (
            <Text 
              variant="caption" 
              color={txtColor}
              style={[
                { color: txtColor, opacity: 0.8 }, 
                subtitleStyle
              ]}
            >
              {subtitle}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 80,
    justifyContent: 'center',
    // Shadow for outdoor visibility
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoContainer: {
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
});

BrandHeader.displayName = 'BrandHeader';