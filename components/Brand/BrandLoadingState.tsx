/**
 * Brand Loading State Components
 * Professional loading indicators with FIVB branding
 */

import React from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { Text } from '../Typography/Text';
import { BrandLogo } from './BrandLogo';
import { colors, spacing } from '../../theme/tokens';

export interface BrandLoadingStateProps {
  variant?: 'spinner' | 'logo' | 'skeleton';
  message?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
}

export const BrandLoadingState: React.FC<BrandLoadingStateProps> = ({
  variant = 'logo',
  message = 'Loading...',
  size = 'medium',
  style,
}) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    );
    
    spinAnimation.start();
    
    return () => spinAnimation.stop();
  }, [spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderLoading = () => {
    switch (variant) {
      case 'spinner':
        return (
          <Animated.View 
            style={[
              styles.spinner,
              styles[`spinner_${size}`],
              { transform: [{ rotate: spin }] }
            ]}
          />
        );
        
      case 'logo':
        return (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <BrandLogo 
              variant="symbol" 
              theme="light" 
              size={size === 'small' ? 32 : size === 'large' ? 80 : 56}
            />
          </Animated.View>
        );
        
      case 'skeleton':
        return <BrandSkeleton size={size} />;
        
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.loadingContent}>
        {renderLoading()}
        
        {message && (
          <Text 
            variant="body" 
            color={colors.textSecondary}
            style={styles.message}
          >
            {message}
          </Text>
        )}
      </View>
    </View>
  );
};

/**
 * Brand Skeleton Loading Component
 */
const BrandSkeleton: React.FC<{ size: 'small' | 'medium' | 'large' }> = ({ size }) => {
  const pulseAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimation.start();
    
    return () => pulseAnimation.stop();
  }, [pulseAnim]);

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const skeletonHeight = size === 'small' ? 60 : size === 'large' ? 120 : 80;

  return (
    <View style={styles.skeletonContainer}>
      <Animated.View 
        style={[
          styles.skeletonBar,
          styles.skeletonTitle,
          { height: skeletonHeight * 0.3, opacity }
        ]}
      />
      <Animated.View 
        style={[
          styles.skeletonBar,
          styles.skeletonSubtitle,
          { height: skeletonHeight * 0.2, opacity }
        ]}
      />
      <Animated.View 
        style={[
          styles.skeletonBar,
          styles.skeletonContent,
          { height: skeletonHeight * 0.4, opacity }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  spinner: {
    borderRadius: 100,
    borderWidth: 3,
    borderColor: colors.primary,
    borderTopColor: 'transparent',
  },
  spinner_small: {
    width: 32,
    height: 32,
    borderWidth: 2,
  },
  spinner_medium: {
    width: 48,
    height: 48,
  },
  spinner_large: {
    width: 64,
    height: 64,
    borderWidth: 4,
  },
  skeletonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  skeletonBar: {
    backgroundColor: colors.textSecondary,
    borderRadius: 4,
    marginVertical: spacing.xs,
  },
  skeletonTitle: {
    width: '80%',
  },
  skeletonSubtitle: {
    width: '60%',
  },
  skeletonContent: {
    width: '100%',
  },
});

BrandLoadingState.displayName = 'BrandLoadingState';