/**
 * CountdownTimer Component
 * Real-time countdown display with color-coded urgency
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
} from 'react-native';
import { useAssignmentCountdown } from '../../hooks/useAssignmentCountdown';
import { designTokens } from '../../theme/tokens';

interface CountdownTimerProps {
  targetDate: Date | null;
  size?: 'small' | 'medium' | 'large';
  showMessage?: boolean;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = React.memo(({
  targetDate,
  size = 'medium',
  showMessage = true,
}) => {
  const { urgency, formattedTime, isCritical } = useAssignmentCountdown(targetDate);
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  // Pulse animation for critical state
  React.useEffect(() => {
    if (isCritical) {
      const pulse = Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]);

      const loop = Animated.loop(pulse);
      loop.start();

      return () => loop.stop();
    }
  }, [isCritical, pulseAnim]);

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          time: styles.smallTime,
          message: styles.smallMessage,
        };
      case 'large':
        return {
          container: styles.largeContainer,
          time: styles.largeTime,
          message: styles.largeMessage,
        };
      case 'medium':
      default:
        return {
          container: styles.mediumContainer,
          time: styles.mediumTime,
          message: styles.mediumMessage,
        };
    }
  };

  const sizeStyles = getSizeStyles();

  if (!targetDate) {
    return (
      <View style={[styles.container, sizeStyles.container, { backgroundColor: designTokens.colors.textSecondary }]}>
        <Text style={[styles.time, sizeStyles.time]}>--:--</Text>
        {showMessage && (
          <Text style={[styles.message, sizeStyles.message]}>No assignment</Text>
        )}
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        sizeStyles.container,
        { 
          backgroundColor: urgency.color,
          transform: isCritical ? [{ scale: pulseAnim }] : undefined,
        }
      ]}
    >
      <Text style={[styles.time, sizeStyles.time]}>
        {formattedTime}
      </Text>
      {showMessage && (
        <Text style={[styles.message, sizeStyles.message]}>
          {urgency.message}
        </Text>
      )}
    </Animated.View>
  );
});

CountdownTimer.displayName = 'CountdownTimer';

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Small size
  smallContainer: {
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: 4,
    minWidth: 60,
  },
  smallTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: designTokens.colors.background,
  },
  smallMessage: {
    fontSize: 9,
    fontWeight: '500',
    color: designTokens.colors.background,
    opacity: 0.9,
  },
  // Medium size
  mediumContainer: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    minWidth: 80,
  },
  mediumTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.background,
  },
  mediumMessage: {
    fontSize: 10,
    fontWeight: '500',
    color: designTokens.colors.background,
    opacity: 0.9,
  },
  // Large size
  largeContainer: {
    paddingHorizontal: designTokens.spacing.md,
    paddingVertical: designTokens.spacing.sm,
    minWidth: 120,
  },
  largeTime: {
    fontSize: 24,
    fontWeight: 'bold',
    color: designTokens.colors.background,
  },
  largeMessage: {
    fontSize: 12,
    fontWeight: '500',
    color: designTokens.colors.background,
    opacity: 0.9,
  },
});

export default CountdownTimer;