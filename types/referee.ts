export interface RefereeFromDB {
  No: string;
  Name: string;
  FederationCode?: string;
  Level?: string;
  isSelected?: boolean;
}

export interface RefereeProfile {
  refereeNo: string;
  name: string;
  certificationLevel: string;
  federationCode: string;
  languages: string[];
}

export interface RefereeAssignment {
  refereeNo: string;
  refereeName: string;
  matchNo: string;
  position: 'first' | 'second';
  date: string;
  time: string;
  court: string;
}

export interface RefereeMatchFilter {
  refereeName?: string;
  date?: string;
  court?: string;
  status?: string;
}

export interface RefereeStatistics {
  totalMatches: number;
  matchesByDate: Record<string, number>;
  matchesByCourt: Record<string, number>;
  matchesByStatus: Record<string, number>;
}

export type RefereeListSortBy = 'name' | 'federation' | 'matches';
export type RefereeListSortOrder = 'asc' | 'desc';

export interface RefereeListOptions {
  sortBy: RefereeListSortBy;
  sortOrder: RefereeListSortOrder;
  searchQuery?: string;
  federationFilter?: string;
}