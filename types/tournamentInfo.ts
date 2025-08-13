/**
 * Tournament Info Types
 * Story 2.3: Tournament Info Panel System
 * 
 * TypeScript interfaces for tournament information components
 */

export interface TournamentInfo {
  tournamentId: string;
  name: string;
  location: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  timezone: string;
  type: 'beach' | 'indoor';
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  organizerId: string;
  organizerName: string;
  director: TournamentDirector;
}

export interface TournamentDirector {
  name: string;
  phone: string;
  email: string;
  emergencyPhone?: string;
  role: string;
}

export interface CourtInfo {
  courtId: string;
  courtNumber: string;
  location: string;
  type: 'main' | 'practice' | 'warm-up';
  conditions?: string;
  specialRequirements?: string[];
  surfaceType?: string;
  netHeight?: number;
  dimensions?: string;
}

export interface ScheduleItem {
  matchId: string;
  courtId: string;
  courtNumber: string;
  scheduledTime: Date;
  estimatedDuration: number;
  teamA: string;
  teamB: string;
  round: string;
  refereePosition: 'first' | 'second' | 'line';
  status: 'scheduled' | 'delayed' | 'in-progress' | 'completed' | 'cancelled';
  actualStartTime?: Date;
  actualEndTime?: Date;
}

export interface WeatherAlert {
  id: string;
  type: 'warning' | 'watch' | 'advisory';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  issuedAt: Date;
  expiresAt?: Date;
  affectedCourts?: string[];
}

export interface EmergencyContact {
  name: string;
  role: string;
  phone: string;
  email?: string;
  available24h: boolean;
}

export interface EmergencyProcedure {
  type: 'medical' | 'weather' | 'security' | 'equipment';
  title: string;
  steps: string[];
  contacts: EmergencyContact[];
  priority: number;
}

// Component Props Interfaces
export interface TournamentInfoPanelProps {
  tournamentInfo: TournamentInfo;
  refereeSchedule: ScheduleItem[];
  courts: CourtInfo[];
  weatherAlerts?: WeatherAlert[];
  emergencyProcedures: EmergencyProcedure[];
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  onSectionToggle?: (sectionId: string, isCollapsed: boolean) => void;
  onEmergencyContact?: (contact: EmergencyContact) => void;
  onCourtSelect?: (courtId: string) => void;
}

export interface TournamentHeaderProps {
  tournamentInfo: TournamentInfo;
  currentDate?: Date;
  showStatus?: boolean;
  onTournamentPress?: () => void;
}

export interface ScheduleOverviewProps {
  schedule: ScheduleItem[];
  currentTime?: Date;
  timeZone?: string;
  showTimeManagement?: boolean;
  onScheduleItemPress?: (item: ScheduleItem) => void;
  maxItemsToShow?: number;
}

export interface CourtInformationProps {
  courts: CourtInfo[];
  selectedCourtId?: string;
  onCourtSelect?: (courtId: string) => void;
  showConditions?: boolean;
  showSpecialRequirements?: boolean;
}

export interface EmergencyInformationProps {
  procedures: EmergencyProcedure[];
  emergencyContacts: EmergencyContact[];
  onContactPress?: (contact: EmergencyContact) => void;
  onProcedureExpand?: (procedureType: string) => void;
  showQuickAccess?: boolean;
}

export interface WeatherAlertsProps {
  alerts: WeatherAlert[];
  onAlertPress?: (alert: WeatherAlert) => void;
  showOnlyActive?: boolean;
  maxAlertsToShow?: number;
}

// Panel Section Configuration
export interface PanelSectionConfig {
  id: string;
  title: string;
  isCollapsible: boolean;
  defaultCollapsed: boolean;
  priority: number;
  icon?: string;
  badge?: string | number;
}

export interface TournamentInfoPanelState {
  collapsedSections: Set<string>;
  selectedCourt?: string;
  activeWeatherAlerts: WeatherAlert[];
  lastUpdated: Date;
}

// Utility Types
export type TournamentStatus = 'upcoming' | 'active' | 'completed' | 'cancelled';
export type MatchStatus = 'scheduled' | 'delayed' | 'in-progress' | 'completed' | 'cancelled';
export type WeatherSeverity = 'low' | 'medium' | 'high' | 'critical';
export type RefereePosition = 'first' | 'second' | 'line';
export type CourtType = 'main' | 'practice' | 'warm-up';
export type EmergencyType = 'medical' | 'weather' | 'security' | 'equipment';