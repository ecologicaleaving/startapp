import { BeachMatch } from './match';
import { RefereeFromDB } from './referee';

export type MonitorType = 'court' | 'referee';

export interface MonitorState {
  type: MonitorType | null;
  isActive: boolean;
  selectedCourt?: string;
  selectedReferee?: RefereeFromDB;
  selectedDate?: string;
}

export interface CourtMonitorState {
  availableCourts: string[];
  selectedCourt: string;
  matches: BeachMatch[];
  loading: boolean;
  error?: string;
}

export interface RefereeMonitorState {
  availableReferees: RefereeFromDB[];
  selectedReferee: RefereeFromDB | null;
  matches: BeachMatch[];
  loading: boolean;
  error?: string;
}

export interface DateNavigationState {
  selectedDate: string;
  availableDates: string[];
  currentIndex: number;
  isAtFirst: boolean;
  isAtLast: boolean;
}

export interface MonitorFilters {
  date?: string;
  court?: string;
  referee?: string;
  status?: string;
  timeRange?: {
    start: string;
    end: string;
  };
}

export interface MonitorDisplayOptions {
  showGenderStrips: boolean;
  highlightSelected: boolean;
  sortByTime: boolean;
  groupByDate: boolean;
}

export type MonitorViewMode = 'list' | 'grid' | 'timeline';

export interface MonitorSettings {
  viewMode: MonitorViewMode;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  notifications: boolean;
  filters: MonitorFilters;
  displayOptions: MonitorDisplayOptions;
}

// Error handling types
export interface MonitorError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
  source: 'court' | 'referee' | 'date' | 'api';
}

export interface MonitorErrorState {
  hasError: boolean;
  error?: MonitorError;
  retryCount: number;
  lastRetry?: Date;
}

// Loading states
export interface LoadingState {
  isLoading: boolean;
  operation?: string;
  progress?: number;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiresAt: Date;
  key: string;
}

export interface MonitorCache {
  referees: CacheEntry<RefereeFromDB[]> | null;
  courts: CacheEntry<string[]> | null;
  matches: Record<string, CacheEntry<BeachMatch[]>>;
}

// Validation types
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MonitorValidation {
  tournament: ValidationResult;
  referee: ValidationResult;
  court: ValidationResult;
  date: ValidationResult;
}