// Notification service for alert delivery
// Story 2.3: Multi-channel alert notifications

export interface NotificationPayload {
  alert_id: string
  rule_name: string
  severity: string
  entity_type: string
  message: string
  current_value: number
  threshold: number
  triggered_at: string
  dashboard_url?: string
  webhook_url?: string
}

export class NotificationService {
  private dashboardBaseUrl: string

  constructor() {
    this.dashboardBaseUrl = Deno.env.get('DASHBOARD_BASE_URL') || 'http://localhost:3000'
  }

  /**
   * Send alert notifications via configured channels
   */
  async sendAlertNotifications(
    payload: NotificationPayload,
    channels: string[]
  ): Promise<number> {
    let notificationsSent = 0

    // Add dashboard URL to payload
    payload.dashboard_url = `${this.dashboardBaseUrl}/monitoring/alerts/${payload.alert_id}`

    for (const channel of channels) {
      try {
        const success = await this.sendNotificationToChannel(payload, channel)
        if (success) notificationsSent++
      } catch (error) {
        console.error(`Failed to send notification via ${channel}:`, error)
      }
    }

    console.log(`Sent ${notificationsSent}/${channels.length} notifications for alert: ${payload.rule_name}`)
    return notificationsSent
  }

  /**
   * Send notification to specific channel
   */
  private async sendNotificationToChannel(
    payload: NotificationPayload,
    channel: string
  ): Promise<boolean> {
    switch (channel.toLowerCase()) {
      case 'dashboard':
        return this.sendDashboardNotification(payload)
      
      case 'webhook':
        return this.sendWebhookNotification(payload)
      
      case 'email':
        return this.sendEmailNotification(payload)
      
      default:
        console.warn(`Unknown notification channel: ${channel}`)
        return false
    }
  }

  /**
   * Send dashboard notification (log to database for real-time display)
   */
  private async sendDashboardNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      // For dashboard notifications, we'll use the existing error log table
      // with a special entity_type to distinguish alerts
      const supabase = (globalThis as any).supabase

      if (!supabase) {
        console.error('Supabase client not available for dashboard notification')
        return false
      }

      await supabase.from('sync_error_log').insert([{
        entity_type: 'dashboard_alert',
        error_type: 'INFO',
        error_severity: payload.severity,
        error_message: `🚨 ${payload.rule_name}: ${payload.message}`,
        error_context: {
          alert_id: payload.alert_id,
          entity_type: payload.entity_type,
          current_value: payload.current_value,
          threshold: payload.threshold,
          triggered_at: payload.triggered_at,
          dashboard_url: payload.dashboard_url,
          notification_channel: 'dashboard'
        },
        recovery_suggestion: this.getAlertRecoverySuggestion(payload)
      }])

      console.log('Dashboard notification logged successfully')
      return true
    } catch (error) {
      console.error('Failed to send dashboard notification:', error)
      return false
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      const webhookUrl = Deno.env.get('ALERT_WEBHOOK_URL')
      
      if (!webhookUrl) {
        console.log('No webhook URL configured, skipping webhook notification')
        return true // Consider success if no webhook configured
      }

      const webhookPayload = {
        alert_id: payload.alert_id,
        rule_name: payload.rule_name,
        severity: payload.severity,
        entity_type: payload.entity_type,
        message: payload.message,
        current_value: payload.current_value,
        threshold: payload.threshold,
        triggered_at: payload.triggered_at,
        dashboard_url: payload.dashboard_url,
        webhook_format: 'sync_monitoring_v1'
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Alert-Source': 'supabase-sync-monitoring'
        },
        body: JSON.stringify(webhookPayload)
      })

      if (!response.ok) {
        throw new Error(`Webhook request failed with status ${response.status}: ${response.statusText}`)
      }

      console.log('Webhook notification sent successfully')
      return true
    } catch (error) {
      console.error('Failed to send webhook notification:', error)
      return false
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      const emailConfig = this.getEmailConfig()
      
      if (!emailConfig.enabled) {
        console.log('Email notifications not configured, skipping email notification')
        return true // Consider success if email not configured
      }

      // For production, this would integrate with an email service like SendGrid, SES, etc.
      // For now, we'll log the email content
      const emailContent = this.generateEmailContent(payload)

      console.log('Email notification would be sent:')
      console.log('To:', emailConfig.recipients)
      console.log('Subject:', emailContent.subject)
      console.log('Body:', emailContent.body)

      // TODO: Implement actual email sending
      // await this.sendEmail(emailConfig.recipients, emailContent.subject, emailContent.body)

      return true
    } catch (error) {
      console.error('Failed to send email notification:', error)
      return false
    }
  }

  /**
   * Generate email content for alert
   */
  private generateEmailContent(payload: NotificationPayload): { subject: string; body: string } {
    const severityEmoji = this.getSeverityEmoji(payload.severity)
    const subject = `${severityEmoji} Sync Alert: ${payload.rule_name}`

    const body = `
${severityEmoji} Sync Monitoring Alert

Alert: ${payload.rule_name}
Severity: ${payload.severity}
Entity: ${payload.entity_type}
Triggered: ${new Date(payload.triggered_at).toLocaleString()}

Message: ${payload.message}

Current Value: ${payload.current_value}
Threshold: ${payload.threshold}

Dashboard: ${payload.dashboard_url}

---
This alert was generated by the Sync Monitoring System.
If you believe this is a false alert, please review the alert rules configuration.
`

    return { subject, body }
  }

  /**
   * Get email configuration
   */
  private getEmailConfig(): { enabled: boolean; recipients: string[] } {
    const emailEnabled = Deno.env.get('ALERT_EMAIL_ENABLED') === 'true'
    const recipients = Deno.env.get('ALERT_EMAIL_RECIPIENTS')?.split(',') || []

    return {
      enabled: emailEnabled && recipients.length > 0,
      recipients: recipients.map(email => email.trim()).filter(email => email.length > 0)
    }
  }

  /**
   * Get emoji for severity level
   */
  private getSeverityEmoji(severity: string): string {
    switch (severity.toUpperCase()) {
      case 'CRITICAL':
        return '🔴'
      case 'HIGH':
        return '🟠'
      case 'MEDIUM':
        return '🟡'
      case 'LOW':
        return '🔵'
      default:
        return '⚠️'
    }
  }

  /**
   * Get recovery suggestion for alert
   */
  private getAlertRecoverySuggestion(payload: NotificationPayload): string {
    const baseMessage = 'Review the monitoring dashboard for detailed information.'

    switch (payload.entity_type) {
      case 'tournaments':
        return `${baseMessage} Check tournament sync job logs and FIVB API connectivity.`
      
      case 'matches_schedule':
        return `${baseMessage} Verify match schedule sync performance and database connectivity.`
      
      case 'all':
        return `${baseMessage} Check overall sync system health and investigate recent failures.`
      
      default:
        return baseMessage
    }
  }

  /**
   * Test notification channels
   */
  async testNotificationChannels(channels: string[]): Promise<{ [channel: string]: boolean }> {
    const results: { [channel: string]: boolean } = {}

    const testPayload: NotificationPayload = {
      alert_id: 'test-alert-' + Date.now(),
      rule_name: 'Test Alert',
      severity: 'LOW',
      entity_type: 'test',
      message: 'This is a test notification to verify channel configuration',
      current_value: 1,
      threshold: 0.5,
      triggered_at: new Date().toISOString()
    }

    for (const channel of channels) {
      try {
        results[channel] = await this.sendNotificationToChannel(testPayload, channel)
      } catch (error) {
        console.error(`Test notification failed for channel ${channel}:`, error)
        results[channel] = false
      }
    }

    return results
  }
}