/**
 * Text Emphasis Systems - Typography for Urgent vs Routine Information
 * Visual hierarchy systems for referee information processing
 */

import { TextStyle, ViewStyle } from 'react-native';
import { colors } from '../theme/tokens';
import { type UrgencyLevel } from './scanningPatterns';

/**
 * Information categories for referee context
 */
export type InformationCategory = 
  | 'match-critical'      // Game-affecting information (scores, violations)
  | 'assignment-status'   // Referee assignment states and changes
  | 'time-sensitive'      // Schedule updates, timing information
  | 'location-change'     // Court or venue changes
  | 'equipment-alert'     // Equipment or technical issues
  | 'administrative'      // General tournament information
  | 'personal-note';      // Individual referee notes or reminders

/**
 * Visual emphasis techniques
 */
export type EmphasisTechnique = 
  | 'size-scale'          // Font size scaling
  | 'weight-bold'         // Font weight changes
  | 'color-accent'        // Color emphasis
  | 'background-highlight'// Background color highlighting
  | 'border-emphasis'     // Border treatments
  | 'shadow-depth'        // Text shadow for depth
  | 'animation-pulse'     // Subtle animation effects
  | 'spacing-expand';     // Letter/line spacing adjustments

/**
 * Emphasis intensity levels
 */
export type EmphasisIntensity = 'subtle' | 'moderate' | 'strong' | 'maximum';

/**
 * Category-specific emphasis configurations
 */
export const categoryEmphasis: Record<InformationCategory, {
  urgency: UrgencyLevel;
  primaryTechnique: EmphasisTechnique;
  secondaryTechnique?: EmphasisTechnique;
  color: keyof typeof colors;
  intensity: EmphasisIntensity;
}> = {
  'match-critical': {
    urgency: 'immediate',
    primaryTechnique: 'size-scale',
    secondaryTechnique: 'weight-bold',
    color: 'error',
    intensity: 'maximum',
  },
  'assignment-status': {
    urgency: 'urgent',
    primaryTechnique: 'weight-bold',
    secondaryTechnique: 'background-highlight',
    color: 'primary',
    intensity: 'strong',
  },
  'time-sensitive': {
    urgency: 'urgent',
    primaryTechnique: 'color-accent',
    secondaryTechnique: 'weight-bold',
    color: 'warning',
    intensity: 'strong',
  },
  'location-change': {
    urgency: 'important',
    primaryTechnique: 'background-highlight',
    secondaryTechnique: 'weight-bold',
    color: 'accent',
    intensity: 'moderate',
  },
  'equipment-alert': {
    urgency: 'important',
    primaryTechnique: 'color-accent',
    secondaryTechnique: 'border-emphasis',
    color: 'warning',
    intensity: 'moderate',
  },
  'administrative': {
    urgency: 'routine',
    primaryTechnique: 'weight-bold',
    color: 'textSecondary',
    intensity: 'subtle',
  },
  'personal-note': {
    urgency: 'routine',
    primaryTechnique: 'color-accent',
    color: 'secondary',
    intensity: 'subtle',
  },
};

/**
 * Emphasis technique implementations
 */
export const emphasisTechniques: Record<EmphasisTechnique, (
  intensity: EmphasisIntensity,
  baseStyle: TextStyle,
  color: string
) => TextStyle & ViewStyle> = {
  'size-scale': (intensity, baseStyle, color) => {
    const scaleFactors = {
      subtle: 1.1,
      moderate: 1.2,
      strong: 1.35,
      maximum: 1.5,
    };
    
    return {
      ...baseStyle,
      fontSize: Math.round((baseStyle.fontSize || 16) * scaleFactors[intensity]),
      color,
    };
  },

  'weight-bold': (intensity, baseStyle, color) => {
    const weights = {
      subtle: '500',
      moderate: '600',
      strong: '700',
      maximum: '900',
    } as const;
    
    return {
      ...baseStyle,
      fontWeight: weights[intensity] as any,
      color,
    };
  },

  'color-accent': (intensity, baseStyle, color) => {
    const opacity = {
      subtle: 0.8,
      moderate: 0.9,
      strong: 1.0,
      maximum: 1.0,
    };
    
    return {
      ...baseStyle,
      color,
      opacity: opacity[intensity],
    };
  },

  'background-highlight': (intensity, baseStyle, color) => {
    const backgroundOpacity = {
      subtle: 0.1,
      moderate: 0.15,
      strong: 0.2,
      maximum: 0.25,
    };
    
    return {
      ...baseStyle,
      backgroundColor: `${color}${Math.round(backgroundOpacity[intensity] * 255).toString(16).padStart(2, '0')}`,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
    };
  },

  'border-emphasis': (intensity, baseStyle, color) => {
    const borderWidths = {
      subtle: 1,
      moderate: 2,
      strong: 3,
      maximum: 4,
    };
    
    return {
      ...baseStyle,
      borderLeftWidth: borderWidths[intensity],
      borderLeftColor: color,
      paddingLeft: 8,
    };
  },

  'shadow-depth': (intensity, baseStyle, color) => {
    const shadowIntensity = {
      subtle: { radius: 2, opacity: 0.3, offset: 1 },
      moderate: { radius: 4, opacity: 0.4, offset: 2 },
      strong: { radius: 6, opacity: 0.5, offset: 3 },
      maximum: { radius: 8, opacity: 0.6, offset: 4 },
    };
    
    const shadow = shadowIntensity[intensity];
    
    return {
      ...baseStyle,
      color,
      textShadowColor: `rgba(0,0,0,${shadow.opacity})`,
      textShadowOffset: { width: 0, height: shadow.offset },
      textShadowRadius: shadow.radius,
    };
  },

  'animation-pulse': (intensity, baseStyle, color) => {
    // Note: This would require additional animation library integration
    // For now, return enhanced styling that suggests animation
    return {
      ...baseStyle,
      color,
      opacity: intensity === 'maximum' ? 1 : 0.9,
    };
  },

  'spacing-expand': (intensity, baseStyle, color) => {
    const spacingMultipliers = {
      subtle: 1.1,
      moderate: 1.2,
      strong: 1.4,
      maximum: 1.6,
    };
    
    const multiplier = spacingMultipliers[intensity];
    
    return {
      ...baseStyle,
      letterSpacing: (baseStyle.letterSpacing || 0) * multiplier,
      lineHeight: Math.round((baseStyle.lineHeight || baseStyle.fontSize || 16) * multiplier),
      color,
    };
  },
};

/**
 * Apply emphasis based on information category
 */
export function applyInformationEmphasis(
  baseStyle: TextStyle,
  category: InformationCategory,
  customIntensity?: EmphasisIntensity
): TextStyle & ViewStyle {
  const config = categoryEmphasis[category];
  const intensity = customIntensity || config.intensity;
  const color = colors[config.color];
  
  // Apply primary emphasis technique
  let emphasisStyle = emphasisTechniques[config.primaryTechnique](
    intensity,
    baseStyle,
    color
  );
  
  // Apply secondary technique if specified
  if (config.secondaryTechnique) {
    const secondaryStyle = emphasisTechniques[config.secondaryTechnique](
      intensity,
      emphasisStyle,
      color
    );
    
    // Merge secondary emphasis (be careful not to override primary)
    emphasisStyle = {
      ...emphasisStyle,
      ...secondaryStyle,
      // Preserve primary technique's main properties only if they were actually changed
      fontSize: emphasisStyle.fontSize, // size-scale changes fontSize, so preserve it
      // Only preserve fontWeight if primary technique actually changed it
      ...(emphasisStyle.fontWeight !== baseStyle.fontWeight && {
        fontWeight: emphasisStyle.fontWeight,
      }),
    };
  }
  
  return emphasisStyle;
}

/**
 * Comparative emphasis for routine vs urgent information
 */
export const comparativeEmphasis = {
  urgent: {
    scale: 1.3,
    weight: '700',
    color: colors.warning,
    spacing: 0.5,
    background: '#FFF3CD',
    borderColor: colors.warning,
  },
  routine: {
    scale: 1.0,
    weight: 'normal',
    color: colors.textPrimary,
    spacing: 0,
    background: 'transparent',
    borderColor: 'transparent',
  },
} as const;

/**
 * Apply comparative emphasis (urgent vs routine)
 */
export function applyComparativeEmphasis(
  baseStyle: TextStyle,
  isUrgent: boolean
): TextStyle & ViewStyle {
  const emphasis = isUrgent ? comparativeEmphasis.urgent : comparativeEmphasis.routine;
  
  return {
    ...baseStyle,
    fontSize: Math.round((baseStyle.fontSize || 16) * emphasis.scale),
    fontWeight: emphasis.weight,
    color: emphasis.color,
    letterSpacing: (baseStyle.letterSpacing || 0) + emphasis.spacing,
    backgroundColor: emphasis.background,
    borderColor: emphasis.borderColor,
    borderWidth: isUrgent ? 1 : 0,
    borderRadius: isUrgent ? 4 : 0,
    paddingHorizontal: isUrgent ? 8 : 0,
    paddingVertical: isUrgent ? 4 : 0,
  };
}

/**
 * Information priority visual hierarchy
 */
export const priorityHierarchy = {
  1: { // Highest priority - immediate action required
    fontSize: 28,
    fontWeight: '900',
    color: colors.error,
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: colors.error,
    paddingLeft: 12,
    marginBottom: 8,
  },
  2: { // High priority - attention needed
    fontSize: 22,
    fontWeight: '700',
    color: colors.warning,
    backgroundColor: '#FFF8E1',
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
    paddingLeft: 10,
    marginBottom: 6,
  },
  3: { // Medium priority - notable information
    fontSize: 18,
    fontWeight: '600',
    color: colors.accent,
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
    paddingLeft: 8,
    marginBottom: 4,
  },
  4: { // Low priority - background information
    fontSize: 16,
    fontWeight: '500',
    color: colors.textSecondary,
    backgroundColor: 'transparent',
    borderLeftWidth: 1,
    borderLeftColor: colors.textSecondary,
    paddingLeft: 6,
    marginBottom: 2,
  },
} as const;

/**
 * Apply priority-based visual hierarchy
 */
export function applyPriorityHierarchy(
  baseStyle: TextStyle,
  priority: 1 | 2 | 3 | 4
): TextStyle & ViewStyle {
  const priorityStyle = priorityHierarchy[priority];
  
  return {
    ...baseStyle,
    ...priorityStyle,
  };
}

/**
 * Context-aware emphasis selection
 */
export function getContextualEmphasis(
  category: InformationCategory,
  urgency: UrgencyLevel,
  priority: 1 | 2 | 3 | 4
): {
  category: InformationCategory;
  technique: EmphasisTechnique;
  intensity: EmphasisIntensity;
  color: string;
} {
  const config = categoryEmphasis[category];
  
  // Adjust intensity based on urgency and priority
  let adjustedIntensity: EmphasisIntensity = config.intensity;
  
  if (urgency === 'immediate' || priority === 1) {
    adjustedIntensity = 'maximum';
  } else if (urgency === 'urgent' || priority === 2) {
    adjustedIntensity = 'strong';
  } else if (urgency === 'important' || priority === 3) {
    adjustedIntensity = 'moderate';
  } else {
    adjustedIntensity = 'subtle';
  }
  
  return {
    category,
    technique: config.primaryTechnique,
    intensity: adjustedIntensity,
    color: colors[config.color],
  };
}