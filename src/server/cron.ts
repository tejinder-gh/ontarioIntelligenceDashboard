import { getPendingNotifications, markNotificationSent } from '../alerts/watch-evaluator.js';
import { sendAlertNotificationEmail } from '../alerts/email-dispatcher.js';

export async function processAlerts() {
  console.log('[Cron] Processing alerts...');
  try {
    const pending = await getPendingNotifications();
    console.log(`[Cron] Found ${pending.length} pending notifications.`);
    
    for (const notif of pending) {
      if (notif.channel === 'EMAIL') {
        const title = (notif as any).event_title ?? 'New Alert';
        const desc = (notif as any).event_description ?? '';
        const occurred = (notif as any).occurred_at ? (notif as any).occurred_at.toString() : new Date().toISOString();
        
        const success = await sendAlertNotificationEmail(notif.subscriber_email, title, desc, occurred);
        if (success) {
          await markNotificationSent(notif.id!);
          console.log(`[Cron] Sent notification to ${notif.subscriber_email} (Notification ID: ${notif.id})`);
        } else {
          console.error(`[Cron] Failed to send email to ${notif.subscriber_email} for Notification ID: ${notif.id}`);
        }
      }
    }
  } catch (err) {
    console.error('[Cron] Error processing alerts:', err);
  }
}

// In a real production setup, we would run this on a separate worker process or via a tool like BullMQ/Agenda.
// For this simple monolithic node app, we will use setInterval if initialized.
let cronInterval: ReturnType<typeof setInterval> | null = null;

export function startCron(intervalMs = 60 * 1000) {
  if (cronInterval) return;
  console.log(`[Cron] Starting worker, interval = ${intervalMs}ms`);
  
  // Initial run
  processAlerts();
  
  // Set recurring loop
  cronInterval = setInterval(processAlerts, intervalMs);
}

export function stopCron() {
  if (cronInterval) {
    clearInterval(cronInterval);
    cronInterval = null;
    console.log('[Cron] Worker stopped');
  }
}
