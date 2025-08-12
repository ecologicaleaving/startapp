/**
 * Assignment Utilities
 * Story 2.1: Assignment Card Component System
 * 
 * Utilities for assignment data processing and formatting
 */

import { Assignment, AssignmentStatus } from '../types/assignments';

/**
 * Calculate time remaining until assignment starts
 */
export function getTimeUntilAssignment(matchTime: Date): {
  totalMinutes: number;
  hours: number;
  minutes: number;
  isOverdue: boolean;
} {
  const now = new Date();
  const diff = matchTime.getTime() - now.getTime();
  const totalMinutes = Math.floor(diff / (1000 * 60));
  const isOverdue = totalMinutes < 0;
  
  return {
    totalMinutes: Math.abs(totalMinutes),
    hours: Math.floor(Math.abs(totalMinutes) / 60),
    minutes: Math.abs(totalMinutes) % 60,
    isOverdue
  };
}

/**
 * Format assignment time for display
 */
export function formatAssignmentTime(matchTime: Date): string {
  return matchTime.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format assignment date for display
 */
export function formatAssignmentDate(matchTime: Date): string {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (isSameDay(matchTime, today)) {
    return 'Today';
  } else if (isSameDay(matchTime, tomorrow)) {
    return 'Tomorrow';
  } else {
    return matchTime.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
}

/**
 * Check if two dates are the same day
 */
function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

/**
 * Get assignment priority for sorting
 */
export function getAssignmentPriority(assignment: Assignment): number {
  switch (assignment.status) {
    case 'current':
      return 1;
    case 'upcoming':
      return 2;
    case 'completed':
      return 3;
    case 'cancelled':
      return 4;
    default:
      return 5;
  }
}

/**
 * Sort assignments by priority and time
 */
export function sortAssignments(assignments: Assignment[]): Assignment[] {
  return assignments.sort((a, b) => {
    const priorityDiff = getAssignmentPriority(a) - getAssignmentPriority(b);
    if (priorityDiff !== 0) return priorityDiff;
    
    return a.matchTime.getTime() - b.matchTime.getTime();
  });
}

/**
 * Format referee position for display
 */
export function formatRefereePosition(position: string): string {
  switch (position) {
    case '1st':
      return '1st Referee';
    case '2nd':
      return '2nd Referee';
    case 'Line':
      return 'Line Judge';
    case 'Reserve':
      return 'Reserve';
    default:
      return position;
  }
}

/**
 * Get status display text
 */
export function getStatusDisplayText(status: AssignmentStatus): string {
  switch (status) {
    case 'current':
      return 'Current';
    case 'upcoming':
      return 'Upcoming';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

/**
 * Check if assignment is starting soon (within 30 minutes)
 */
export function isAssignmentStartingSoon(matchTime: Date): boolean {
  const { totalMinutes, isOverdue } = getTimeUntilAssignment(matchTime);
  return !isOverdue && totalMinutes <= 30;
}

/**
 * Get countdown text for assignment
 */
export function getCountdownText(matchTime: Date): string {
  const { hours, minutes, isOverdue } = getTimeUntilAssignment(matchTime);
  
  if (isOverdue) {
    return 'In Progress';
  }
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return 'Starting now';
  }
}