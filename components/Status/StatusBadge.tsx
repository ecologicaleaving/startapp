/**
 * StatusBadge Component
 * Story 1.4: Status-Driven Color Coding System
 * 
 * A badge component that displays status information with color coding
 * and optional icons for accessibility
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Text } from '../Typography';
import { 
  getStatusColorWithText, 
  TournamentStatus, 
  statusColorThemes 
} from '../../utils/statusColors';
import { spacing } from '../../theme/tokens';

export interface StatusBadgeProps {
  status: TournamentStatus;
  label?: string;
  size?: 'small' | 'medium' | 'large';
  variant?: 'solid' | 'outlined' | 'subtle';
  showIcon?: boolean;
  icon?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const STATUS_LABELS: Record<TournamentStatus, string> = {
  current: 'Current',
  upcoming: 'Upcoming',
  completed: 'Completed',
  cancelled: 'Cancelled',
  emergency: 'Emergency',
};

const STATUS_ICONS: Record<TournamentStatus, string> = {
  current: '●', // Solid circle for current
  upcoming: '○', // Empty circle for upcoming
  completed: '✓', // Checkmark for completed
  cancelled: '✕', // X for cancelled
  emergency: '⚠', // Warning for emergency
};

const SIZE_CONFIG = {
  small: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs / 2,
    fontSize: 12,
    borderRadius: 4,
  },
  medium: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    fontSize: 14,
    borderRadius: 6,
  },
  large: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    borderRadius: 8,
  },
} as const;

export const StatusBadge: React.FC<StatusBadgeProps> = React.memo(({
  status,
  label,
  size = 'medium',
  variant = 'solid',
  showIcon = true,
  icon,
  style,
  textStyle,
}) => {
  const statusColorInfo = getStatusColorWithText(status);
  const statusTheme = statusColorThemes.badge[status];
  const sizeConfig = SIZE_CONFIG[size];
  const displayLabel = label || STATUS_LABELS[status];
  const displayIcon = icon || STATUS_ICONS[status];

  const getVariantStyles = (): ViewStyle => {
    const borderWidth = statusColorThemes.border[status].width;
    
    switch (variant) {
      case 'solid':
        return {
          backgroundColor: statusColorInfo.backgroundColor,
          borderWidth: 0,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: borderWidth,
          borderColor: statusColorInfo.backgroundColor,
        };
      case 'subtle':
        return {
          backgroundColor: `${statusColorInfo.backgroundColor}20`, // 20% opacity
          borderWidth: 1,
          borderColor: `${statusColorInfo.backgroundColor}40`, // 40% opacity
        };
      default:
        return {};
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'solid':
        return statusColorInfo.textColor;
      case 'outlined':
      case 'subtle':
        return statusColorInfo.backgroundColor;
      default:
        return statusColorInfo.textColor;
    }
  };

  const badgeStyles: ViewStyle[] = [
    styles.badge,
    {
      paddingHorizontal: sizeConfig.paddingHorizontal,
      paddingVertical: sizeConfig.paddingVertical,
      borderRadius: sizeConfig.borderRadius,
    },
    getVariantStyles(),
    style,
  ];

  const textStyles: TextStyle[] = [
    styles.text,
    {
      fontSize: sizeConfig.fontSize,
      color: getTextColor(),
    },
    textStyle,
  ];

  return (
    <View style={badgeStyles}>
      <Text style={textStyles}>
        {showIcon && `${displayIcon} `}{displayLabel}
      </Text>
    </View>
  );
});

StatusBadge.displayName = 'StatusBadge';

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    minHeight: 24, // Minimum touch target consideration
  },
  text: {
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default StatusBadge;