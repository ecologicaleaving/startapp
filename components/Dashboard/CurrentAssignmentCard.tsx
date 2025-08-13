/**
 * CurrentAssignmentCard Component
 * Prominently displays current assignment with countdown and context
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Assignment } from '../../types/assignments';
import { useAssignmentCountdown } from '../../hooks/useAssignmentCountdown';
import { designTokens } from '../../theme/tokens';
import { StatusIcons, DataIcons } from '../Icons/IconLibrary';

interface CurrentAssignmentCardProps {
  assignment: Assignment;
  onViewDetails?: () => void;
  onEnterResults?: () => void;
}

export const CurrentAssignmentCard: React.FC<CurrentAssignmentCardProps> = React.memo(({
  assignment,
  onViewDetails,
  onEnterResults,
}) => {
  const { urgency, formattedTime, isCritical } = useAssignmentCountdown(assignment.matchTime);

  const getImportanceIndicator = (importance: string) => {
    switch (importance) {
      case 'high':
        return { text: 'HIGH PRIORITY', color: designTokens.colors.error };
      case 'medium':
        return { text: 'MEDIUM PRIORITY', color: designTokens.colors.warning };
      case 'low':
      default:
        return { text: 'STANDARD', color: designTokens.colors.textSecondary };
    }
  };

  const importanceInfo = getImportanceIndicator(assignment.importance);

  return (
    <View style={[styles.container, isCritical && styles.criticalContainer]}>
      {/* Header with countdown */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.currentLabel}>CURRENT ASSIGNMENT</Text>
          <View style={[styles.priorityBadge, { backgroundColor: importanceInfo.color }]}>
            <Text style={styles.priorityText}>{importanceInfo.text}</Text>
          </View>
        </View>
        <View style={[styles.countdownContainer, { backgroundColor: urgency.color }]}>
          <Text style={styles.countdownTime}>{formattedTime}</Text>
          <Text style={styles.countdownLabel}>{urgency.message}</Text>
        </View>
      </View>

      {/* Match information */}
      <View style={styles.matchInfo}>
        <View style={styles.teamsSection}>
          <Text style={styles.teamsText}>
            {assignment.homeTeam} vs {assignment.awayTeam}
          </Text>
          <Text style={styles.matchType}>{assignment.matchType}</Text>
        </View>
        
        <View style={styles.contextSection}>
          <View style={styles.contextItem}>
            <DataIcons.Details size="medium" theme="default" colorKey="primary" />
            <Text style={styles.contextText}>Court {assignment.courtNumber}</Text>
          </View>
          <View style={styles.contextItem}>
            <StatusIcons.Current size="medium" theme="default" />
            <Text style={styles.contextText}>{assignment.refereePosition}</Text>
          </View>
        </View>
      </View>

      {/* Notes section */}
      {assignment.notes && (
        <View style={styles.notesSection}>
          <Text style={styles.notesText}>{assignment.notes}</Text>
        </View>
      )}

      {/* Quick actions */}
      <View style={styles.actionsSection}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.detailsButton]}
          onPress={onViewDetails}
          accessibilityRole="button"
          accessibilityLabel="View assignment details"
        >
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.resultsButton]}
          onPress={onEnterResults}
          accessibilityRole="button"
          accessibilityLabel="Enter match results"
        >
          <Text style={styles.resultsButtonText}>Enter Results</Text>
        </TouchableOpacity>
      </View>

      {/* Urgency animation overlay */}
      {isCritical && (
        <View style={styles.urgentOverlay}>
          <View style={styles.urgentPulse} />
        </View>
      )}
    </View>
  );
});

CurrentAssignmentCard.displayName = 'CurrentAssignmentCard';

const styles = StyleSheet.create({
  container: {
    backgroundColor: designTokens.colors.background,
    margin: designTokens.spacing.md,
    marginBottom: designTokens.spacing.lg,
    padding: designTokens.spacing.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: designTokens.statusColors.current,
    shadowColor: designTokens.statusColors.current,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  criticalContainer: {
    borderColor: designTokens.colors.error,
    shadowColor: designTokens.colors.error,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: designTokens.spacing.md,
  },
  headerLeft: {
    flex: 1,
    marginRight: designTokens.spacing.sm,
  },
  currentLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: designTokens.statusColors.current,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: designTokens.spacing.xs,
  },
  priorityBadge: {
    paddingHorizontal: designTokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
    color: designTokens.colors.background,
    letterSpacing: 0.5,
  },
  countdownContainer: {
    paddingHorizontal: designTokens.spacing.sm,
    paddingVertical: designTokens.spacing.xs,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  countdownTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: designTokens.colors.background,
    textAlign: 'center',
  },
  countdownLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: designTokens.colors.background,
    textAlign: 'center',
    opacity: 0.9,
  },
  matchInfo: {
    marginBottom: designTokens.spacing.md,
  },
  teamsSection: {
    marginBottom: designTokens.spacing.sm,
  },
  teamsText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: designTokens.colors.textPrimary,
    lineHeight: 28,
    marginBottom: designTokens.spacing.xs / 2,
  },
  matchType: {
    fontSize: 14,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
  },
  contextSection: {
    flexDirection: 'row',
    gap: designTokens.spacing.md,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: designTokens.spacing.xs,
  },
  contextText: {
    fontSize: 16,
    fontWeight: '500',
    color: designTokens.colors.textSecondary,
  },
  notesSection: {
    backgroundColor: designTokens.brandColors.primaryLight,
    padding: designTokens.spacing.sm,
    borderRadius: 8,
    marginBottom: designTokens.spacing.md,
  },
  notesText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: designTokens.colors.textSecondary,
    lineHeight: 20,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: designTokens.spacing.sm,
  },
  actionButton: {
    flex: 1,
    paddingVertical: designTokens.spacing.sm,
    paddingHorizontal: designTokens.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: designTokens.iconTokens.accessibility.minimumTouchTarget,
    justifyContent: 'center',
  },
  detailsButton: {
    backgroundColor: designTokens.colors.secondary,
  },
  detailsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.background,
  },
  resultsButton: {
    backgroundColor: designTokens.colors.accent,
  },
  resultsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: designTokens.colors.background,
  },
  urgentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
    overflow: 'hidden',
  },
  urgentPulse: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: designTokens.colors.error,
    opacity: 0.5,
  },
});

export default CurrentAssignmentCard;