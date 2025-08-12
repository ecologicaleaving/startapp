import { serve } from 'std/http/server.ts';
import { createClient } from 'supabase';
import { LiveScoreSync } from './sync.ts';
import { ErrorHandler } from './error-handler.ts';
import { TournamentHourDetector } from './tournament-hour-detector.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if we should run during current tournament hours
    const tournamentHourDetector = new TournamentHourDetector(supabase);
    const shouldRunSync = await tournamentHourDetector.isActiveTournamentHour();

    if (!shouldRunSync) {
      console.log('Not running sync - outside of active tournament hours');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Sync paused - outside tournament hours',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Initialize live score sync service
    const liveScoreSync = new LiveScoreSync(supabase);
    
    // Execute the sync process
    const result = await liveScoreSync.executeLiveScoreSync();

    return new Response(
      JSON.stringify({
        success: true,
        result,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Live score sync failed:', error);
    
    // Use centralized error handling
    const errorHandler = new ErrorHandler();
    const errorResult = await errorHandler.handleSyncError(error, {
      function: 'live-score-sync',
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorResult.message,
        details: errorResult.details,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});