import { SupabaseClient } from 'supabase';

interface Tournament {
  no: string;
  code?: string;
  name?: string;
  start_date?: string;
  end_date?: string;
  status?: string;
}

/**
 * TournamentHourDetector - Intelligent scheduling logic for tournament activity detection
 * Determines if current time falls within active tournament playing hours
 */
export class TournamentHourDetector {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  /**
   * Check if current time is within active tournament hours
   * @returns Promise<boolean> - true if sync should run
   */
  async isActiveTournamentHour(): Promise<boolean> {
    try {
      const currentTime = new Date();
      console.log(`Checking tournament activity at ${currentTime.toISOString()}`);

      // Get active tournaments from cache database
      const activeTournaments = await this.getActiveTournaments();
      
      if (activeTournaments.length === 0) {
        console.log('No active tournaments found');
        return false;
      }

      console.log(`Found ${activeTournaments.length} active tournaments`);

      // Check if any tournament is within playing hours
      for (const tournament of activeTournaments) {
        const isWithinHours = await this.isWithinTournamentHours(
          currentTime,
          tournament
        );
        
        if (isWithinHours) {
          console.log(`Tournament ${tournament.name} (${tournament.code}) is within playing hours`);
          return true;
        }
      }

      console.log('No tournaments currently within playing hours');
      return false;

    } catch (error) {
      console.error('Error checking tournament hours:', error);
      
      // Conservative approach: if we can't determine tournament hours, allow sync
      // This prevents missing live scores due to detection failures
      console.log('Defaulting to allow sync due to detection error');
      return true;
    }
  }

  /**
   * Get active tournaments from the database
   */
  private async getActiveTournaments(): Promise<Tournament[]> {
    const { data: tournaments, error } = await this.supabase
      .from('tournaments')
      .select('no, code, name, start_date, end_date, status')
      .eq('status', 'Running')
      .gte('end_date', new Date().toISOString().split('T')[0]) // End date >= today
      .order('start_date', { ascending: true });

    if (error) {
      console.error('Error fetching active tournaments:', error);
      throw error;
    }

    return tournaments || [];
  }

  /**
   * Check if current time falls within a tournament's playing hours
   * Considers timezone differences and adds buffer time for pre/post match activities
   */
  private async isWithinTournamentHours(
    currentTime: Date,
    tournament: Tournament
  ): Promise<boolean> {
    try {
      if (!tournament.start_date || !tournament.end_date) {
        console.warn(`Tournament ${tournament.no} missing dates`);
        return false;
      }

      const startDate = new Date(tournament.start_date);
      const endDate = new Date(tournament.end_date + 'T23:59:59'); // End of day

      // Add buffer time for tournament activities
      const bufferHours = 2; // 2 hours before/after for setup/cleanup
      const bufferedStart = new Date(startDate.getTime() - (bufferHours * 60 * 60 * 1000));
      const bufferedEnd = new Date(endDate.getTime() + (bufferHours * 60 * 60 * 1000));

      const isWithinDates = currentTime >= bufferedStart && currentTime <= bufferedEnd;

      if (!isWithinDates) {
        console.log(`Tournament ${tournament.code} not within date range: ${bufferedStart.toISOString()} - ${bufferedEnd.toISOString()}`);
        return false;
      }

      // Check if within daily playing hours (typically 8 AM - 11 PM local time)
      const isWithinDailyHours = await this.isWithinDailyPlayingHours(currentTime);

      console.log(`Tournament ${tournament.code}: within dates=${isWithinDates}, within daily hours=${isWithinDailyHours}`);
      
      return isWithinDates && isWithinDailyHours;

    } catch (error) {
      console.error(`Error checking tournament ${tournament.no} hours:`, error);
      return false;
    }
  }

  /**
   * Check if current time is within typical daily playing hours
   * Beach volleyball tournaments typically run 8 AM - 11 PM local time
   */
  private async isWithinDailyPlayingHours(currentTime: Date): Promise<boolean> {
    // Use UTC time for simplicity - tournaments are global
    const hour = currentTime.getUTCHours();
    
    // Allow sync during extended hours to account for different timezones
    // Beach volleyball can happen across multiple timezones simultaneously
    const startHour = 6; // 6 AM UTC
    const endHour = 23; // 11 PM UTC
    
    const withinHours = hour >= startHour && hour <= endHour;
    
    console.log(`Current UTC hour: ${hour}, within playing hours (${startHour}-${endHour}): ${withinHours}`);
    
    return withinHours;
  }
}