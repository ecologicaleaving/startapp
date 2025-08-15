/**
 * Assignment Dashboard Utilities
 * Utilities for assignment detection and dashboard optimization
 */

import { Assignment } from '../types/assignments';

export interface DashboardAssignmentData {
  currentAssignment: Assignment | null;
  upcomingAssignments: Assignment[];
  todayAssignments: Assignment[];
  hasUrgentAssignment: boolean;
  nextAssignment: Assignment | null;
}

/**
 * Detects the current assignment based on match timing and status
 */
export const getCurrentAssignment = (assignments: Assignment[]): Assignment | null => {
  const now = new Date();
  const currentTime = now.getTime();
  
  // First, look for assignments explicitly marked as "current"
  const explicitCurrent = assignments.find(a => a.status === 'current');
  if (explicitCurrent) {
    return explicitCurrent;
  }

  // Then, look for assignments within 30 minutes of start time
  const upcomingSoon = assignments
    .filter(a => a.status === 'upcoming')
    .find(a => {
      const matchTime = a.matchTime.getTime();
      const timeDiff = matchTime - currentTime;
      // Consider current if within 30 minutes of start time
      return timeDiff <= 30 * 60 * 1000 && timeDiff >= 0;
    });

  return upcomingSoon || null;
};

/**
 * Gets upcoming assignments sorted by time (next 2-3 assignments)
 */
export const getUpcomingAssignments = (assignments: Assignment[], limit = 3): Assignment[] => {
  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  return assignments
    .filter(a => 
      a.status === 'upcoming' && 
      a.matchTime.getTime() > now.getTime() &&
      a.matchTime.getTime() <= todayEnd.getTime() // Only today's assignments
    )
    .sort((a, b) => a.matchTime.getTime() - b.matchTime.getTime())
    .slice(0, limit);
};

/**
 * Gets all assignments for today
 */
export const getTodayAssignments = (assignments: Assignment[]): Assignment[] => {
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  
  return assignments
    .filter(a => 
      a.matchTime >= todayStart && 
      a.matchTime < todayEnd
    )
    .sort((a, b) => a.matchTime.getTime() - b.matchTime.getTime());
};

/**
 * Checks if there are any urgent assignments (starting within 15 minutes)
 */
export const hasUrgentAssignment = (assignments: Assignment[]): boolean => {
  const now = new Date();
  const urgentThreshold = now.getTime() + 15 * 60 * 1000; // 15 minutes
  
  return assignments.some(a => 
    a.status === 'upcoming' && // Only check upcoming assignments for urgency
    a.matchTime.getTime() <= urgentThreshold &&
    a.matchTime.getTime() > now.getTime()
  );
};

/**
 * Gets the next assignment after the current one
 */
export const getNextAssignment = (assignments: Assignment[], currentAssignment: Assignment | null): Assignment | null => {
  const now = new Date();
  
  // If no current assignment, return the earliest upcoming
  if (!currentAssignment) {
    return assignments
      .filter(a => 
        a.status === 'upcoming' && 
        a.matchTime.getTime() > now.getTime()
      )
      .sort((a, b) => a.matchTime.getTime() - b.matchTime.getTime())[0] || null;
  }
  
  // Find the next assignment after the current one (chronologically)
  return assignments
    .filter(a => 
      a.status === 'upcoming' && 
      a.matchTime.getTime() > now.getTime()
    )
    .sort((a, b) => a.matchTime.getTime() - b.matchTime.getTime())[0] || null;
};

/**
 * Processes assignments for dashboard display
 */
export const processDashboardAssignments = (assignments: Assignment[]): DashboardAssignmentData => {
  const currentAssignment = getCurrentAssignment(assignments);
  const upcomingAssignments = getUpcomingAssignments(assignments);
  const todayAssignments = getTodayAssignments(assignments);
  const hasUrgent = hasUrgentAssignment(assignments);
  const nextAssignment = getNextAssignment(assignments, currentAssignment);

  return {
    currentAssignment,
    upcomingAssignments,
    todayAssignments,
    hasUrgentAssignment: hasUrgent,
    nextAssignment,
  };
};

/**
 * Formats assignment time for dashboard display
 */
export const formatAssignmentTimeForDashboard = (date: Date): string => {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  
  // If it's today
  if (diffMs > 0 && diffMs < 24 * 60 * 60 * 1000) {
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      return `${diffHours}h ${diffMinutes % 60}m`;
    }
  }
  
  // Standard time format
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Determines dashboard information hierarchy priority
 */
export const getDashboardPriority = (assignment: Assignment): 'primary' | 'secondary' | 'tertiary' => {
  if (assignment.status === 'current') {
    return 'primary';
  }
  
  if (assignment.status === 'upcoming' && assignment.importance === 'high') {
    return 'secondary';
  }
  
  const now = new Date();
  const timeDiff = assignment.matchTime.getTime() - now.getTime();
  const minutesUntilMatch = Math.floor(timeDiff / (1000 * 60));
  
  // Upcoming within 1 hour
  if (assignment.status === 'upcoming' && minutesUntilMatch <= 60) {
    return 'secondary';
  }
  
  return 'tertiary';
};

/**
 * Optimizes dashboard scroll behavior for assignment visibility
 */
export const shouldScrollToAssignment = (assignment: Assignment): boolean => {
  // Always scroll to current assignment
  if (assignment.status === 'current') {
    return true;
  }
  
  // Scroll to urgent upcoming assignments
  const now = new Date();
  const timeDiff = assignment.matchTime.getTime() - now.getTime();
  const minutesUntilMatch = Math.floor(timeDiff / (1000 * 60));
  
  return assignment.status === 'upcoming' && minutesUntilMatch <= 15;
};

/**
 * Emergency contact information for dashboard
 */
export interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
  email?: string;
  available24h: boolean;
}

export const getEmergencyContacts = (): EmergencyContact[] => {
  // In a real implementation, this would come from tournament data
  return [
    {
      name: 'Tournament Director',
      role: 'Main Contact',
      phone: '+1 (555) 123-4567',
      email: 'director@tournament.com',
      available24h: true,
    },
    {
      name: 'Head Referee',
      role: 'Referee Coordinator',
      phone: '+1 (555) 987-6543',
      email: 'headref@tournament.com',
      available24h: false,
    },
    {
      name: 'Medical Emergency',
      role: 'Emergency Services',
      phone: '911',
      available24h: true,
    },
  ];
};