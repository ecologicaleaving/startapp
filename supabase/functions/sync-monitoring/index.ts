// Sync Monitoring Dashboard API
// Story 2.3: Real-time monitoring dashboard endpoints

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { DashboardService } from './dashboard-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const endpoint = url.pathname.split('/').pop() || 'health-overview'

    console.log(`Sync monitoring API called: ${endpoint}`)

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Initialize dashboard service
    const dashboardService = new DashboardService(supabase)

    let responseData: any

    switch (endpoint) {
      case 'health-overview':
        responseData = await dashboardService.getHealthOverview()
        break

      case 'performance-history':
        const period = url.searchParams.get('period') || '24h'
        const entity = url.searchParams.get('entity') || 'all'
        responseData = await dashboardService.getPerformanceHistory(period, entity)
        break

      case 'sync-statistics':
        const entityType = url.searchParams.get('entity_type') || 'all'
        const timeWindow = parseInt(url.searchParams.get('hours') || '24')
        responseData = await dashboardService.getSyncStatistics(entityType, timeWindow)
        break

      case 'error-analytics':
        const errorHours = parseInt(url.searchParams.get('hours') || '24')
        const severity = url.searchParams.get('severity')
        responseData = await dashboardService.getErrorAnalytics(errorHours, severity)
        break

      case 'alert-status':
        responseData = await dashboardService.getAlertStatus()
        break

      case 'system-status':
        responseData = await dashboardService.getSystemStatus()
        break

      case 'metrics-summary':
        const summaryHours = parseInt(url.searchParams.get('hours') || '24')
        responseData = await dashboardService.getMetricsSummary(summaryHours)
        break

      default:
        return new Response(JSON.stringify({
          error: 'Unknown endpoint',
          available_endpoints: [
            'health-overview',
            'performance-history',
            'sync-statistics', 
            'error-analytics',
            'alert-status',
            'system-status',
            'metrics-summary'
          ]
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }

    return new Response(JSON.stringify({
      success: true,
      data: responseData,
      timestamp: new Date().toISOString(),
      endpoint
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Monitoring dashboard error:', error)

    // Log the error to the database
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      await supabase.from('sync_error_log').insert([{
        entity_type: 'monitoring',
        error_type: 'API',
        error_severity: 'MEDIUM',
        error_message: `Monitoring dashboard API error: ${error.message}`,
        error_context: {
          stack_trace: error.stack,
          function: 'sync-monitoring',
          url: req.url,
          method: req.method
        },
        recovery_suggestion: 'Check monitoring API function logs and database connectivity'
      }])
    } catch (logError) {
      console.error('Failed to log monitoring dashboard error:', logError)
    }

    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})