export interface Tournament {
  No: string;
  Name?: string;
  Title?: string;
  City?: string;
  Country?: string;
  CountryName?: string;
  Location?: string;
  StartDate?: string;
  EndDate?: string;
  Dates?: string;
  Version?: string;
  Code?: string;
  Status?: string;
  // Additional detail fields
  Type?: string;
  Category?: string;
  Series?: string;
  League?: string;
  Division?: string;
  Prize?: string;
  PrizeMoney?: string;
  Currency?: string;
  Venue?: string;
  Courts?: string;
  ContactName?: string;
  ContactEmail?: string;
  ContactPhone?: string;
  Website?: string;
  Description?: string;
  Officials?: string;
  Referees?: string;
  TechnicalOfficials?: string;
  EntryDeadline?: string;
  WithdrawalDeadline?: string;
  Participants?: string;
  Teams?: string;
  MaxTeams?: string;
  EntryFee?: string;
  Surface?: string;
  Gender?: string;
  // Internal field for tracking merged tournaments during deduplication
  _mergedTournaments?: Array<{
    No: string;
    Name?: string;
    Code?: string;
    StartDate?: string;
    EndDate?: string;
  }>;
}

export interface TournamentListResponse {
  Response: {
    Type: string;
    TournamentList: {
      Count: string;
      Tournament: Tournament[];
    };
  };
}