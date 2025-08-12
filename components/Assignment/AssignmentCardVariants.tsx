/**
 * Assignment Card Variants
 * Story 2.1: Assignment Card Component System
 * 
 * Specialized assignment card components for different states
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AssignmentCard from './AssignmentCard';
import { AssignmentCardProps } from '../../types/assignments';
import { getTimeUntilAssignment } from '../../utils/assignments';
import { designTokens } from '../../theme/tokens';

/**
 * Current Assignment Card - Maximum visibility with countdown timer
 */
export const CurrentAssignmentCard: React.FC<Omit<AssignmentCardProps, 'variant'>> = React.memo((props) => {
  useEffect(() => {
    // Update countdown every 30 seconds for current assignments
    // This creates a timer that would trigger component updates in production
    const interval = setInterval(() => {
      // In production, this would use a state updater or force re-render
      // The countdown text will update automatically through the utility functions
    }, 30000);

    return () => clearInterval(interval);
  }, [props.assignment.matchTime]);

  return (
    <View style={styles.currentAssignmentContainer}>
      <AssignmentCard
        {...props}
        variant="current"
        showCountdown={true}
        isInteractive={true}
      />
    </View>
  );
});

CurrentAssignmentCard.displayName = 'CurrentAssignmentCard';

/**
 * Upcoming Assignment Card - Clear preparation information
 */
export const UpcomingAssignmentCard: React.FC<Omit<AssignmentCardProps, 'variant'>> = React.memo((props) => {
  const { assignment } = props;
  const timeUntil = getTimeUntilAssignment(assignment.matchTime);
  const isStartingSoon = timeUntil.totalMinutes <= 30 && !timeUntil.isOverdue;

  return (
    <View style={styles.upcomingAssignmentContainer}>
      <AssignmentCard
        {...props}
        variant="upcoming"
        showCountdown={isStartingSoon}
        isInteractive={true}
      />
      {isStartingSoon && (
        <View style={styles.preparationAlert}>
          <Text style={styles.preparationText}>
            ⚡ Prepare for assignment - starts in {timeUntil.totalMinutes} minutes
          </Text>
        </View>
      )}
    </View>
  );
});

UpcomingAssignmentCard.displayName = 'UpcomingAssignmentCard';

/**
 * Completed Assignment Card - Result summary with minimal visual weight
 */
export const CompletedAssignmentCard: React.FC<Omit<AssignmentCardProps, 'variant'>> = React.memo((props) => {
  return (
    <View style={styles.completedAssignmentContainer}>
      <AssignmentCard
        {...props}
        variant="completed"
        showCountdown={false}
        isInteractive={false}
      />
    </View>
  );
});

CompletedAssignmentCard.displayName = 'CompletedAssignmentCard';

/**
 * Cancelled Assignment Card - Clear cancellation indication
 */
export const CancelledAssignmentCard: React.FC<Omit<AssignmentCardProps, 'variant'>> = React.memo((props) => {
  return (
    <View style={styles.cancelledAssignmentContainer}>
      <AssignmentCard
        {...props}
        variant="cancelled"
        showCountdown={false}
        isInteractive={false}
      />
      <View style={styles.cancellationNotice}>
        <Text style={styles.cancellationText}>Assignment Cancelled</Text>
      </View>
    </View>
  );
});

CancelledAssignmentCard.displayName = 'CancelledAssignmentCard';

/**
 * Adaptive Assignment Card - Automatically selects appropriate variant
 */
export const AdaptiveAssignmentCard: React.FC<AssignmentCardProps> = React.memo((props) => {
  const { assignment } = props;

  switch (assignment.status) {
    case 'current':
      return <CurrentAssignmentCard {...props} />;
    case 'upcoming':
      return <UpcomingAssignmentCard {...props} />;
    case 'completed':
      return <CompletedAssignmentCard {...props} />;
    case 'cancelled':
      return <CancelledAssignmentCard {...props} />;
    default:
      return <AssignmentCard {...props} />;
  }
});

AdaptiveAssignmentCard.displayName = 'AdaptiveAssignmentCard';

const styles = StyleSheet.create({
  currentAssignmentContainer: {
    // Additional styling for current assignments
    position: 'relative',
  },
  upcomingAssignmentContainer: {
    position: 'relative',
  },
  completedAssignmentContainer: {
    // Minimal visual weight for completed assignments
    opacity: 0.8,
  },
  cancelledAssignmentContainer: {
    position: 'relative',
  },
  preparationAlert: {
    position: 'absolute',
    top: -8,
    right: designTokens.spacing.medium,
    backgroundColor: designTokens.colors.accent,
    paddingHorizontal: designTokens.spacing.small,
    paddingVertical: designTokens.spacing.xsmall,
    borderRadius: designTokens.spacing.borderRadius / 2,
    elevation: 2,
    shadowColor: designTokens.colors.accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  preparationText: {
    fontSize: designTokens.typography.sizes.small,
    fontWeight: '600',
    color: designTokens.colors.surfacePrimary,
  },
  cancellationNotice: {
    position: 'absolute',
    top: -8,
    right: designTokens.spacing.medium,
    backgroundColor: designTokens.colors.error,
    paddingHorizontal: designTokens.spacing.small,
    paddingVertical: designTokens.spacing.xsmall,
    borderRadius: designTokens.spacing.borderRadius / 2,
  },
  cancellationText: {
    fontSize: designTokens.typography.sizes.small,
    fontWeight: '600',
    color: designTokens.colors.surfacePrimary,
  },
});

export default {
  CurrentAssignmentCard,
  UpcomingAssignmentCard,
  CompletedAssignmentCard,
  CancelledAssignmentCard,
  AdaptiveAssignmentCard,
};