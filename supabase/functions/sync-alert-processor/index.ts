// Sync Alert Processor Edge Function
// Story 2.3: Alert evaluation and notification system

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AlertProcessor } from './alert-processor.ts'
import { NotificationService } from './notification-service.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Alert processor started:', new Date().toISOString())

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Initialize services
    const alertProcessor = new AlertProcessor(supabase)
    const notificationService = new NotificationService()

    // Process alerts
    const processingStartTime = Date.now()
    
    // Get all active alert rules
    const { data: alertRules, error: rulesError } = await supabase
      .from('alert_rules')
      .select('*')
      .eq('is_active', true)

    if (rulesError) {
      throw new Error(`Failed to fetch alert rules: ${rulesError.message}`)
    }

    if (!alertRules || alertRules.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No active alert rules found',
        alerts_processed: 0,
        notifications_sent: 0,
        processing_time_ms: Date.now() - processingStartTime
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Process each alert rule
    const alertResults = []
    let totalNotificationsSent = 0

    for (const rule of alertRules) {
      try {
        console.log(`Processing alert rule: ${rule.name}`)
        
        // Evaluate the alert rule
        const alertResult = await alertProcessor.evaluateAlertRule(rule)
        alertResults.push(alertResult)

        // Send notifications if alert is triggered
        if (alertResult.triggered) {
          console.log(`Alert triggered: ${rule.name} - ${alertResult.message}`)
          
          const notificationsSent = await notificationService.sendAlertNotifications({
            alert_id: rule.id,
            rule_name: rule.name,
            severity: rule.severity,
            entity_type: rule.entity_type,
            message: alertResult.message,
            current_value: alertResult.current_value,
            threshold: rule.threshold,
            triggered_at: new Date().toISOString()
          }, rule.notification_channels)

          totalNotificationsSent += notificationsSent
        }

      } catch (ruleError) {
        console.error(`Failed to process alert rule ${rule.name}:`, ruleError)
        alertResults.push({
          rule_id: rule.id,
          rule_name: rule.name,
          triggered: false,
          error: ruleError.message
        })
      }
    }

    const processingTime = Date.now() - processingStartTime
    console.log(`Alert processing completed in ${processingTime}ms`)

    // Log processing completion
    await supabase.from('sync_error_log').insert([{
      entity_type: 'monitoring',
      error_type: 'INFO',
      error_severity: 'LOW',
      error_message: `Alert processor completed: ${alertResults.length} rules processed, ${totalNotificationsSent} notifications sent`,
      error_context: {
        processing_time_ms: processingTime,
        alerts_triggered: alertResults.filter(r => r.triggered).length,
        alerts_processed: alertResults.length,
        notifications_sent: totalNotificationsSent
      },
      recovery_suggestion: 'No action required'
    }])

    return new Response(JSON.stringify({
      success: true,
      message: 'Alert processing completed successfully',
      alerts_processed: alertResults.length,
      alerts_triggered: alertResults.filter(r => r.triggered).length,
      notifications_sent: totalNotificationsSent,
      processing_time_ms: processingTime,
      alert_results: alertResults
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Alert processor error:', error)

    // Log the error
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      await supabase.from('sync_error_log').insert([{
        entity_type: 'monitoring',
        error_type: 'API',
        error_severity: 'HIGH',
        error_message: `Alert processor failed: ${error.message}`,
        error_context: {
          stack_trace: error.stack,
          function: 'sync-alert-processor'
        },
        recovery_suggestion: 'Check alert processor function logs and database connectivity'
      }])
    } catch (logError) {
      console.error('Failed to log alert processor error:', logError)
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