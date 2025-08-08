export interface Tournament {
  No: string;
  Name?: string;
  Title?: string;
  City?: string;
  CountryName?: string;
  Location?: string;
  StartDate?: string;
  EndDate?: string;
  Dates?: string;
  Version?: string;
  Code?: string;
  Status?: string;
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