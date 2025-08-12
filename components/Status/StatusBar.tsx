/**
 * StatusBar Component
 * Story 1.4: Status-Driven Color Coding System
 * 
 * A progress/timeline bar component that displays status progression
 * with color-coded segments for tournament and assignment progress
 */

import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, CaptionText } from '../Typography';
import { StatusIcon } from './StatusIcon';
import { 
  getStatusColor, 
  TournamentStatus, 
  getStatusPriority 
} from '../../utils/statusColors';
import { spacing, colors } from '../../theme/tokens';

export interface StatusBarSegment {
  status: TournamentStatus;
  label?: string;
  isActive?: boolean;
  isCompleted?: boolean;
}

export interface StatusBarProps {
  segments: StatusBarSegment[];
  currentStatus?: TournamentStatus;
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  showIcons?: boolean;
  height?: number;
  style?: ViewStyle;
  animated?: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = React.memo(({
  segments,
  currentStatus,
  orientation = 'horizontal',
  showLabels = true,
  showIcons = true,
  height = 8,
  style,
  animated = false,
}) => {
  // Sort segments by status priority for logical progression
  const sortedSegments = [...segments].sort((a, b) => 
    getStatusPriority(a.status) - getStatusPriority(b.status)
  );

  const getCurrentSegmentIndex = (): number => {
    if (!currentStatus) return -1;
    return sortedSegments.findIndex(segment => segment.status === currentStatus);
  };

  const currentIndex = getCurrentSegmentIndex();

  const renderHorizontalBar = () => {
    return (
      <View style={[styles.horizontalContainer, style]}>
        {showLabels && (
          <View style={styles.labelsContainer}>
            {sortedSegments.map((segment, index) => (
              <View key={index} style={styles.labelItem}>
                <CaptionText 
                  style={[
                    styles.label,
                    index <= currentIndex && styles.activeLabel,
                  ]}
                >
                  {segment.label || segment.status}
                </CaptionText>
              </View>
            ))}
          </View>
        )}
        
        <View style={[styles.barContainer, { height }]}>
          {sortedSegments.map((segment, index) => {
            const isActive = index <= currentIndex;
            const segmentColor = getStatusColor(segment.status);
            
            return (
              <View
                key={index}
                style={[
                  styles.segment,
                  {
                    backgroundColor: isActive ? segmentColor : colors.textSecondary + '40',
                    opacity: isActive ? 1 : 0.3,
                  }
                ]}
              />
            );
          })}
        </View>

        {showIcons && (
          <View style={styles.iconsContainer}>
            {sortedSegments.map((segment, index) => {
              const isActive = index <= currentIndex;
              return (
                <View key={index} style={styles.iconItem}>
                  <StatusIcon 
                    status={segment.status}
                    size="small"
                    variant={isActive ? 'filled' : 'outlined'}
                    showBackground={isActive}
                  />
                </View>
              );
            })}
          </View>
        )}
      </View>
    );
  };

  const renderVerticalBar = () => {
    return (
      <View style={[styles.verticalContainer, style]}>
        {sortedSegments.map((segment, index) => {
          const isActive = index <= currentIndex;
          const segmentColor = getStatusColor(segment.status);
          
          return (
            <View key={index} style={styles.verticalSegmentContainer}>
              {showIcons && (
                <StatusIcon 
                  status={segment.status}
                  size="medium"
                  variant={isActive ? 'filled' : 'outlined'}
                  showBackground={isActive}
                  style={styles.verticalIcon}
                />
              )}
              
              <View style={styles.verticalSegmentContent}>
                <View
                  style={[
                    styles.verticalSegment,
                    {
                      backgroundColor: isActive ? segmentColor : colors.textSecondary + '40',
                      width: height,
                      opacity: isActive ? 1 : 0.3,
                    }
                  ]}
                />
                
                {showLabels && (
                  <Text 
                    style={[
                      styles.verticalLabel,
                      isActive && styles.activeLabel,
                    ]}
                  >
                    {segment.label || segment.status}
                  </Text>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  return orientation === 'horizontal' ? renderHorizontalBar() : renderVerticalBar();
});

StatusBar.displayName = 'StatusBar';

// Utility component for simple progress indication
export interface SimpleProgressBarProps {
  progress: number; // 0-100
  status: TournamentStatus;
  height?: number;
  style?: ViewStyle;
  showPercentage?: boolean;
}

export const SimpleProgressBar: React.FC<SimpleProgressBarProps> = React.memo(({
  progress,
  status,
  height = 8,
  style,
  showPercentage = false,
}) => {
  const statusColor = getStatusColor(status);
  const clampedProgress = Math.max(0, Math.min(100, progress));
  
  return (
    <View style={style}>
      {showPercentage && (
        <CaptionText style={styles.percentage}>
          {Math.round(clampedProgress)}%
        </CaptionText>
      )}
      <View style={[styles.progressContainer, { height }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: statusColor,
              width: `${clampedProgress}%`,
            }
          ]}
        />
      </View>
    </View>
  );
});

SimpleProgressBar.displayName = 'SimpleProgressBar';

const styles = StyleSheet.create({
  // Horizontal bar styles
  horizontalContainer: {
    width: '100%',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  labelItem: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  activeLabel: {
    color: colors.textPrimary,
    fontWeight: '600',
  },
  barContainer: {
    flexDirection: 'row',
    backgroundColor: colors.textSecondary + '20',
    borderRadius: 4,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    height: '100%',
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  iconItem: {
    flex: 1,
    alignItems: 'center',
  },
  
  // Vertical bar styles
  verticalContainer: {
    alignItems: 'flex-start',
  },
  verticalSegmentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  verticalIcon: {
    marginRight: spacing.sm,
  },
  verticalSegmentContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  verticalSegment: {
    height: 24,
    borderRadius: 4,
    marginRight: spacing.sm,
    minWidth: 40,
  },
  verticalLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  
  // Simple progress bar styles
  progressContainer: {
    backgroundColor: colors.textSecondary + '20',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  percentage: {
    textAlign: 'right',
    marginBottom: spacing.xs / 2,
    color: colors.textSecondary,
  },
});

export default StatusBar;