/**
 * AssignmentTimeline Component
 * Visual timeline showing referee's daily assignment schedule
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Assignment } from '../../types/assignments';
import { designTokens } from '../../theme/tokens';
import { StatusIcons } from '../Icons/IconLibrary';
import { CountdownTimer } from './CountdownTimer';

interface AssignmentTimelineProps {
  assignments: Assignment[];
  currentAssignmentId?: string;
  onAssignmentPress?: (assignment: Assignment) => void;
}

export const AssignmentTimeline: React.FC<AssignmentTimelineProps> = React.memo(({
  assignments,
  currentAssignmentId,
  onAssignmentPress,
}) => {
  const sortedAssignments = [...assignments].sort((a, b) => 
    a.matchTime.getTime() - b.matchTime.getTime()
  );

  const formatTimeOnly = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusIcon = (status: string, isCurrent: boolean) => {
    const size = isCurrent ? 'large' : 'medium';
    const theme = isCurrent ? 'highContrast' : 'default';

    switch (status) {
      case 'current':
        return <StatusIcons.Current size={size} theme={theme} />;
      case 'upcoming':
        return <StatusIcons.Upcoming size={size} theme={theme} />;
      case 'completed':
        return <StatusIcons.Completed size={size} theme={theme} />;
      case 'cancelled':
        return <StatusIcons.Cancelled size={size} theme={theme} />;
      default:
        return <StatusIcons.Upcoming size={size} theme={theme} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return designTokens.statusColors.current;
      case 'upcoming':
        return designTokens.statusColors.upcoming;
      case 'completed':
        return designTokens.statusColors.completed;
      case 'cancelled':
        return designTokens.statusColors.cancelled;
      default:
        return designTokens.colors.textSecondary;
    }
  };

  const renderTimelineItem = (assignment: Assignment, index: number) => {
    const isCurrent = assignment.id === currentAssignmentId;
    const isLast = index === sortedAssignments.length - 1;
    const statusColor = getStatusColor(assignment.status);

    return (
      <TouchableOpacity
        key={assignment.id}
        style={[
          styles.timelineItem,
          isCurrent && styles.currentTimelineItem
        ]}
        onPress={() => onAssignmentPress?.(assignment)}
        accessibilityRole="button"
        accessibilityLabel={`Assignment: ${assignment.homeTeam} vs ${assignment.awayTeam} at ${formatTimeOnly(assignment.matchTime)}`}
      >
        {/* Timeline connector */}
        <View style={styles.timelineConnector}>
          <View style={[styles.timelineNode, { backgroundColor: statusColor }]}>
            {getStatusIcon(assignment.status, isCurrent)}
          </View>
          {!isLast && (
            <View style={[styles.timelineLine, { backgroundColor: statusColor }]} />
          )}
        </View>

        {/* Assignment content */}
        <View style={[styles.assignmentContent, isCurrent && styles.currentAssignmentContent]}>
          <View style={styles.assignmentHeader}>
            <Text style={[styles.assignmentTime, isCurrent && styles.currentAssignmentTime]}>
              {formatTimeOnly(assignment.matchTime)}
            </Text>
            {assignment.status === 'upcoming' && (
              <CountdownTimer 
                targetDate={assignment.matchTime}
                size="small"
                showMessage={false}
              />
            )}
          </View>

          <Text style={[styles.assignmentTeams, isCurrent && styles.currentAssignmentTeams]}>
            {assignment.homeTeam} vs {assignment.awayTeam}
          </Text>

          <View style={styles.assignmentDetails}>
            <Text style={[styles.assignmentCourt, isCurrent && styles.currentAssignmentDetail]}>
              Court {assignment.courtNumber} • {assignment.refereePosition}
            </Text>
            <Text style={[styles.assignmentType, isCurrent && styles.currentAssignmentDetail]}>
              {assignment.matchType}
            </Text>
          </View>

          {assignment.notes && (
            <Text style={[styles.assignmentNotes, isCurrent && styles.currentAssignmentNotes]}>
              {assignment.notes}
            </Text>
          )}

          {assignment.importance === 'high' && (
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityText}>HIGH PRIORITY</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (sortedAssignments.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Assignments</Text>
        <Text style={styles.emptyText}>
          You have no assignments scheduled for today.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Today&apos;s Schedule</Text>
        <Text style={styles.subtitle}>
          {sortedAssignments.length} assignment{sortedAssignments.length !== 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView 
        style={styles.timeline}
        contentContainerStyle={styles.timelineContent}
        showsVerticalScrollIndicator={false}
      >
        {sortedAssignments.map((assignment, index) => 
          renderTimelineItem(assignment, index)
        )}
      </ScrollView>
    </View>
  );
});

AssignmentTimeline.displayName = 'AssignmentTimeline';

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    padding: designTokens.spacing.md,
    margin: designTokens.spacing.md,
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
  },
  header: {
    marginBottom: designTokens.spacing.md,
    paddingBottom: designTokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: designTokens.brandColors.primaryLight,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
  },
  timeline: {
    maxHeight: 300,
  },
  timelineContent: {
    paddingBottom: designTokens.spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: designTokens.spacing.sm,
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
  },
  currentTimelineItem: {
    backgroundColor: designTokens.brandColors.primaryLight,
    borderRadius: 8,
    marginHorizontal: -designTokens.spacing.xs,
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: designTokens.spacing.xs,
  },
  timelineConnector: {
    width: 40,
    alignItems: 'center',
    marginRight: designTokens.spacing.sm,
  },
  timelineNode: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    opacity: 0.3,
  },
  assignmentContent: {
    flex: 1,
    paddingTop: 2,
  },
  currentAssignmentContent: {
    // Additional styling for current assignment if needed
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  assignmentTime: {
    fontSize: 14,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
  },
  currentAssignmentTime: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  assignmentTeams: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.textPrimary,
    marginBottom: 4,
  },
  currentAssignmentTeams: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  assignmentDetails: {
    marginBottom: 4,
  },
  assignmentCourt: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    marginBottom: 2,
  },
  assignmentType: {
    fontSize: 12,
    color: designTokens.colors.textSecondary,
  },
  currentAssignmentDetail: {
    fontWeight: '500',
  },
  assignmentNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    color: designTokens.colors.textSecondary,
    marginTop: 4,
  },
  currentAssignmentNotes: {
    fontSize: 14,
  },
  priorityBadge: {
    backgroundColor: designTokens.colors.error,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: '600',
    color: designTokens.colors.background,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    backgroundColor: designTokens.colors.background,
    borderRadius: 12,
    padding: designTokens.spacing.xl,
    margin: designTokens.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: designTokens.brandColors.primaryLight,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: designTokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default AssignmentTimeline;