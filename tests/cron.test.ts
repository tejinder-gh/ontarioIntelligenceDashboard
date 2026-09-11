import { describe, it, expect, beforeAll, vi, afterAll } from 'vitest';
import { processAlerts } from '../src/server/cron.js';
import { sql } from '../src/db/index.js';
import { sendAlertNotificationEmail } from '../src/alerts/email-dispatcher.js';

// Mock the email dispatcher to prevent actual email sending during tests
vi.mock('../src/alerts/email-dispatcher.js', () => ({
  sendAlertNotificationEmail: vi.fn().mockResolvedValue(true)
}));

describe('Cron Worker - Process Alerts', () => {
  let watchId: number;
  let eventId: number;

  beforeAll(async () => {
    // 1. Create a dummy watch
    const [watch] = await sql`
      INSERT INTO subscriber_watches (subscriber_email, watch_type, notification_channel, is_active)
      VALUES ('test.cron@example.com', 'LISTING_WATCH', 'EMAIL', TRUE)
      RETURNING id;
    `;
    watchId = watch.id;

    // 2. Create a dummy audit event
    const [event] = await sql`
      INSERT INTO audit_events (event_type, entity_type, entity_id, title)
      VALUES ('LISTING_NEW', 'business_listing', 'listing_test_1', 'Test Listing Alert')
      RETURNING id;
    `;
    eventId = event.id;

    // 3. Create a pending notification linking them
    await sql`
      INSERT INTO watch_notifications (watch_id, event_id, subscriber_email, channel, delivered)
      VALUES (${watchId}, ${eventId}, 'test.cron@example.com', 'EMAIL', FALSE)
      ON CONFLICT (watch_id, event_id) DO NOTHING;
    `;
  });

  afterAll(async () => {
    // Cleanup
    await sql`DELETE FROM watch_notifications WHERE watch_id = ${watchId}`;
    await sql`DELETE FROM audit_events WHERE id = ${eventId}`;
    await sql`DELETE FROM subscriber_watches WHERE id = ${watchId}`;
  });

  it('processes pending notifications and marks them as delivered', async () => {
    // Run the cron job
    await processAlerts();

    // Verify the mock was called
    expect(sendAlertNotificationEmail).toHaveBeenCalledWith(
      'test.cron@example.com',
      'Test Listing Alert',
      '',
      expect.any(String)
    );

    // Verify it was marked as delivered in the DB
    const [notif] = await sql`
      SELECT delivered, status FROM watch_notifications 
      WHERE watch_id = ${watchId} AND event_id = ${eventId}
    `;
    expect(notif.delivered).toBe(true);
    expect(notif.status).toBe('DELIVERED');
  });

  it('records failure and bounds retries when delivery fails (T-057)', async () => {
    // Create an unsendable notification
    const [eventFail] = await sql`
      INSERT INTO audit_events (event_type, entity_type, entity_id, title)
      VALUES ('LISTING_PRICE_CHANGE', 'business_listing', 'listing_test_fail', 'Failing Alert')
      RETURNING id;
    `;

    const [notifFail] = await sql`
      INSERT INTO watch_notifications (watch_id, event_id, subscriber_email, channel, delivered)
      VALUES (${watchId}, ${eventFail.id}, 'fail.cron@example.com', 'EMAIL', FALSE)
      RETURNING id;
    `;

    // Make mock fail for this call
    vi.mocked(sendAlertNotificationEmail).mockResolvedValueOnce(false);

    await processAlerts();

    const [updated] = await sql`
      SELECT delivered, retry_count, status FROM watch_notifications WHERE id = ${notifFail.id};
    `;
    expect(updated.delivered).toBe(false);
    expect(updated.retry_count).toBe(1);
    expect(updated.status).toBe('RETRYING');

    // Simulate 2 more failures to test transition to FAILED
    vi.mocked(sendAlertNotificationEmail).mockResolvedValueOnce(false);
    await processAlerts();
    vi.mocked(sendAlertNotificationEmail).mockResolvedValueOnce(false);
    await processAlerts();

    const [final] = await sql`
      SELECT delivered, retry_count, status FROM watch_notifications WHERE id = ${notifFail.id};
    `;
    expect(final.retry_count).toBe(3);
    expect(final.status).toBe('FAILED');

    // Clean up
    await sql`DELETE FROM watch_notifications WHERE id = ${notifFail.id}`;
    await sql`DELETE FROM audit_events WHERE id = ${eventFail.id}`;
  });
});
