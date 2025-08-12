/**
 * Brand Splash Screen Component
 * Professional splash screen with FIVB branding
 */

import React from 'react';
import { View, StyleSheet, Animated, Dimensions, ViewStyle } from 'react-native';
import { Text } from '../Typography/Text';
import { BrandLogo } from './BrandLogo';
import { colors, spacing, brandColors } from '../../theme/tokens';

export interface BrandSplashScreenProps {
  title?: string;
  subtitle?: string;
  onAnimationComplete?: () => void;
  style?: ViewStyle;
}

const { width, height } = Dimensions.get('window');

export const BrandSplashScreen: React.FC<BrandSplashScreenProps> = ({
  title = 'FIVB Referee Tool',
  subtitle = 'Professional Tournament Management',
  onAnimationComplete,
  style,
}) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const slideAnim = React.useRef(new Animated.Value(50)).current;

  React.useEffect(() => {
    // Sequence of entrance animations
    const splashSequence = Animated.sequence([
      // Logo entrance
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
      // Text entrance
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      // Hold for a moment
      Animated.delay(1000),
    ]);

    splashSequence.start(() => {
      // Fade out after animation
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        onAnimationComplete?.();
      });
    });
  }, [fadeAnim, scaleAnim, slideAnim, onAnimationComplete]);

  return (
    <View style={[styles.container, style]}>
      {/* Background gradient simulation with multiple views */}
      <View style={styles.backgroundTop} />
      <View style={styles.backgroundBottom} />
      
      <Animated.View 
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <BrandLogo 
            variant="primary"
            theme="dark"
            size="large"
          />
        </View>
        
        {/* Text content */}
        <Animated.View 
          style={[
            styles.textContainer,
            {
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
            }
          ]}
        >
          <Text 
            variant="hero" 
            style={styles.title}
          >
            {title}
          </Text>
          
          <Text 
            variant="body" 
            style={styles.subtitle}
          >
            {subtitle}
          </Text>
        </Animated.View>
      </Animated.View>
      
      {/* FIVB branding footer */}
      <Animated.View 
        style={[
          styles.footer,
          { opacity: fadeAnim }
        ]}
      >
        <Text variant="caption" style={styles.footerText}>
          Powered by FIVB Technology
        </Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    height: height,
    position: 'relative',
  },
  backgroundTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    backgroundColor: brandColors.fivbPrimary, // Original FIVB primary
  },
  backgroundBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: brandColors.fivbSecondary, // Original FIVB secondary
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.xxl,
  },
  textContainer: {
    alignItems: 'center',
  },
  title: {
    color: colors.background,
    textAlign: 'center',
    marginBottom: spacing.md,
    fontWeight: 'bold',
    // Enhanced visibility for splash
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitle: {
    color: colors.background,
    textAlign: 'center',
    opacity: 0.9,
    // Enhanced visibility for splash
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  footerText: {
    color: colors.background,
    opacity: 0.8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});

BrandSplashScreen.displayName = 'BrandSplashScreen';