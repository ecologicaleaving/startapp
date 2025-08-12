/**
 * Status Change Animation System
 * Story 1.4: Status-Driven Color Coding System
 * 
 * Provides smooth transition animations for status changes
 * Optimized for mobile performance
 */

import { Animated, Easing } from 'react-native';
import { TournamentStatus, getStatusColor } from './statusColors';

// Animation configuration constants
export const ANIMATION_TIMING = {
  fast: 150,      // Quick transitions
  normal: 250,    // Standard transitions
  slow: 400,      // Smooth, deliberate transitions
  pulse: 1000,    // Pulse duration for urgent states
} as const;

export const EASING_CURVES = {
  easeInOut: Easing.inOut(Easing.ease),
  easeOut: Easing.out(Easing.ease),
  bounce: Easing.bounce,
  spring: Easing.elastic(1.2),
} as const;

// Status change animation types
export type StatusAnimationType = 'fade' | 'scale' | 'slide' | 'color' | 'pulse' | 'highlight';
export type AnimationTiming = keyof typeof ANIMATION_TIMING;
export type EasingCurve = keyof typeof EASING_CURVES;

export interface StatusAnimationConfig {
  type: StatusAnimationType;
  duration?: AnimationTiming;
  easing?: EasingCurve;
  delay?: number;
  loop?: boolean;
}

// Create animated values for status transitions
export class StatusAnimationController {
  private animatedValue: Animated.Value;
  private colorAnimated: Animated.Value;
  private scaleAnimated: Animated.Value;
  private opacityAnimated: Animated.Value;
  private currentAnimation?: Animated.CompositeAnimation;

  constructor() {
    this.animatedValue = new Animated.Value(0);
    this.colorAnimated = new Animated.Value(0);
    this.scaleAnimated = new Animated.Value(1);
    this.opacityAnimated = new Animated.Value(1);
  }

  // Animate status transition
  animateStatusChange(
    fromStatus: TournamentStatus,
    toStatus: TournamentStatus,
    config: StatusAnimationConfig = { type: 'fade' }
  ): Promise<void> {
    return new Promise((resolve) => {
      // Stop any ongoing animation
      this.stop();

      const duration = ANIMATION_TIMING[config.duration || 'normal'];
      const easing = EASING_CURVES[config.easing || 'easeInOut'];

      let animation: Animated.CompositeAnimation;

      switch (config.type) {
        case 'fade':
          animation = this.createFadeAnimation(duration, easing);
          break;
        case 'scale':
          animation = this.createScaleAnimation(duration, easing);
          break;
        case 'slide':
          animation = this.createSlideAnimation(duration, easing);
          break;
        case 'color':
          animation = this.createColorAnimation(fromStatus, toStatus, duration, easing);
          break;
        case 'pulse':
          animation = this.createPulseAnimation(toStatus === 'emergency');
          break;
        case 'highlight':
          animation = this.createHighlightAnimation(duration, easing);
          break;
        default:
          animation = this.createFadeAnimation(duration, easing);
      }

      if (config.delay) {
        animation = Animated.sequence([
          Animated.delay(config.delay),
          animation,
        ]);
      }

      if (config.loop) {
        animation = Animated.loop(animation);
      }

      this.currentAnimation = animation;
      animation.start(({ finished }) => {
        if (finished) {
          resolve();
        }
      });
    });
  }

  // Create fade animation
  private createFadeAnimation(duration: number, easing: any): Animated.CompositeAnimation {
    this.opacityAnimated.setValue(1);
    
    return Animated.sequence([
      Animated.timing(this.opacityAnimated, {
        toValue: 0,
        duration: duration / 2,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(this.opacityAnimated, {
        toValue: 1,
        duration: duration / 2,
        easing,
        useNativeDriver: true,
      }),
    ]);
  }

  // Create scale animation
  private createScaleAnimation(duration: number, easing: any): Animated.CompositeAnimation {
    this.scaleAnimated.setValue(1);
    
    return Animated.sequence([
      Animated.timing(this.scaleAnimated, {
        toValue: 1.1,
        duration: duration / 2,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(this.scaleAnimated, {
        toValue: 1,
        duration: duration / 2,
        easing,
        useNativeDriver: true,
      }),
    ]);
  }

  // Create slide animation
  private createSlideAnimation(duration: number, easing: any): Animated.CompositeAnimation {
    this.animatedValue.setValue(0);
    
    return Animated.sequence([
      Animated.timing(this.animatedValue, {
        toValue: 1,
        duration: duration / 2,
        easing,
        useNativeDriver: true,
      }),
      Animated.timing(this.animatedValue, {
        toValue: 0,
        duration: duration / 2,
        easing,
        useNativeDriver: true,
      }),
    ]);
  }

  // Create color transition animation
  private createColorAnimation(
    fromStatus: TournamentStatus,
    toStatus: TournamentStatus,
    duration: number,
    easing: any
  ): Animated.CompositeAnimation {
    this.colorAnimated.setValue(0);
    
    return Animated.timing(this.colorAnimated, {
      toValue: 1,
      duration,
      easing,
      useNativeDriver: false, // Color animations can't use native driver
    });
  }

  // Create pulse animation for urgent states
  private createPulseAnimation(isEmergency: boolean = false): Animated.CompositeAnimation {
    this.scaleAnimated.setValue(1);
    this.opacityAnimated.setValue(1);
    
    const pulseScale = isEmergency ? 1.15 : 1.08;
    const pulseOpacity = isEmergency ? 0.7 : 0.8;
    
    return Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(this.scaleAnimated, {
            toValue: pulseScale,
            duration: ANIMATION_TIMING.pulse / 2,
            easing: EASING_CURVES.easeInOut,
            useNativeDriver: true,
          }),
          Animated.timing(this.opacityAnimated, {
            toValue: pulseOpacity,
            duration: ANIMATION_TIMING.pulse / 2,
            easing: EASING_CURVES.easeInOut,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(this.scaleAnimated, {
            toValue: 1,
            duration: ANIMATION_TIMING.pulse / 2,
            easing: EASING_CURVES.easeInOut,
            useNativeDriver: true,
          }),
          Animated.timing(this.opacityAnimated, {
            toValue: 1,
            duration: ANIMATION_TIMING.pulse / 2,
            easing: EASING_CURVES.easeInOut,
            useNativeDriver: true,
          }),
        ]),
      ])
    );
  }

  // Create highlight animation
  private createHighlightAnimation(duration: number, easing: any): Animated.CompositeAnimation {
    this.animatedValue.setValue(0);
    
    return Animated.sequence([
      Animated.timing(this.animatedValue, {
        toValue: 1,
        duration: duration / 3,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(this.animatedValue, {
        toValue: 0.3,
        duration: duration / 3,
        easing,
        useNativeDriver: false,
      }),
      Animated.timing(this.animatedValue, {
        toValue: 0,
        duration: duration / 3,
        easing,
        useNativeDriver: false,
      }),
    ]);
  }

  // Stop current animation
  stop(): void {
    if (this.currentAnimation) {
      this.currentAnimation.stop();
      this.currentAnimation = undefined;
    }
  }

  // Reset all animated values
  reset(): void {
    this.stop();
    this.animatedValue.setValue(0);
    this.colorAnimated.setValue(0);
    this.scaleAnimated.setValue(1);
    this.opacityAnimated.setValue(1);
  }

  // Get animated style objects
  getAnimatedStyles() {
    return {
      fade: {
        opacity: this.opacityAnimated,
      },
      scale: {
        transform: [{ scale: this.scaleAnimated }],
      },
      slide: {
        transform: [
          {
            translateX: this.animatedValue.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 10],
            }),
          },
        ],
      },
      pulse: {
        transform: [{ scale: this.scaleAnimated }],
        opacity: this.opacityAnimated,
      },
      highlight: {
        backgroundColor: this.animatedValue.interpolate({
          inputRange: [0, 1],
          outputRange: ['transparent', '#FFD70040'], // Semi-transparent gold highlight
        }),
      },
    };
  }

  // Get interpolated color for color animations
  getInterpolatedColor(fromStatus: TournamentStatus, toStatus: TournamentStatus) {
    return this.colorAnimated.interpolate({
      inputRange: [0, 1],
      outputRange: [getStatusColor(fromStatus), getStatusColor(toStatus)],
    });
  }
}

// Utility functions for common status animations
export const statusAnimationPresets = {
  // Quick status update
  quickUpdate: {
    type: 'fade' as StatusAnimationType,
    duration: 'fast' as AnimationTiming,
    easing: 'easeOut' as EasingCurve,
  },
  
  // Smooth transition between statuses
  smoothTransition: {
    type: 'scale' as StatusAnimationType,
    duration: 'normal' as AnimationTiming,
    easing: 'easeInOut' as EasingCurve,
  },
  
  // Emergency alert animation
  emergencyAlert: {
    type: 'pulse' as StatusAnimationType,
    duration: 'slow' as AnimationTiming,
    easing: 'bounce' as EasingCurve,
    loop: true,
  },
  
  // Highlight for user attention
  attention: {
    type: 'highlight' as StatusAnimationType,
    duration: 'normal' as AnimationTiming,
    easing: 'easeInOut' as EasingCurve,
  },
  
  // Color morphing between statuses
  colorMorph: {
    type: 'color' as StatusAnimationType,
    duration: 'slow' as AnimationTiming,
    easing: 'easeInOut' as EasingCurve,
  },
  
  // Slide transition for status changes
  slideTransition: {
    type: 'slide' as StatusAnimationType,
    duration: 'normal' as AnimationTiming,
    easing: 'easeInOut' as EasingCurve,
  },
} as const;

// Hook-style animation utilities for React components
export const createStatusAnimation = (): StatusAnimationController => {
  return new StatusAnimationController();
};

// Batch animation for multiple status changes
export const animateMultipleStatusChanges = async (
  controllers: StatusAnimationController[],
  changes: Array<{
    fromStatus: TournamentStatus;
    toStatus: TournamentStatus;
    config?: StatusAnimationConfig;
  }>,
  sequence: boolean = false
): Promise<void> => {
  if (sequence) {
    // Animate in sequence
    for (let i = 0; i < changes.length; i++) {
      if (controllers[i]) {
        await controllers[i].animateStatusChange(
          changes[i].fromStatus,
          changes[i].toStatus,
          changes[i].config
        );
      }
    }
  } else {
    // Animate in parallel
    const animations = changes.map((change, index) => {
      if (controllers[index]) {
        return controllers[index].animateStatusChange(
          change.fromStatus,
          change.toStatus,
          change.config
        );
      }
      return Promise.resolve();
    });
    
    await Promise.all(animations);
  }
};

// Performance optimization helpers
export const optimizeAnimationPerformance = {
  // Use native driver when possible
  shouldUseNativeDriver: (animationType: StatusAnimationType): boolean => {
    return ['fade', 'scale', 'slide', 'pulse'].includes(animationType);
  },
  
  // Reduce animation complexity on lower-end devices
  getOptimizedConfig: (
    baseConfig: StatusAnimationConfig,
    devicePerformance: 'high' | 'medium' | 'low' = 'medium'
  ): StatusAnimationConfig => {
    if (devicePerformance === 'low') {
      return {
        ...baseConfig,
        type: 'fade', // Simplest animation
        duration: 'fast',
      };
    }
    
    if (devicePerformance === 'medium') {
      return {
        ...baseConfig,
        duration: baseConfig.duration === 'slow' ? 'normal' : baseConfig.duration,
      };
    }
    
    return baseConfig;
  },
};

export default StatusAnimationController;