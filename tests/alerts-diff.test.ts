import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { readFile } from 'node:fs/promises';
import { sql } from '../src/db/index.js';
import { app } from '../src/server/app.js';
import { 
  detectListingDiff, 
  detectIndicatorDiff, 
  detectBudgetDiff, 
  detectDatasetRelease,
  persistAuditEvent 
} from '../src/alerts/diff-engine.js';
import { 
  registerSubscriberWatch, 
  evaluateActiveWatches, 
  haversineDistanceKm,
  getPendingNotifications,
  markNotificationsDelivered 
} from '../src/alerts/watch-evaluator.js';

describe('T-006 Alert & Diff Change Detection Ledger Suite', () => {
  const testListingId = `test_listing_${Date.now()}`;
  const testEmail = `investor_${Date.now()}@example.com`;
  const publicTestEmail = `public_${Date.now()}@example.com`;
  let server: ReturnType<typeof app.listen>;
  let baseUrl: string;

  beforeAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server = app.listen(0, '127.0.0.1', resolve);
      server.once('error', reject);
    });
    baseUrl = `http://localhost:${(server.address() as { port: number }).port}`;
    // Seed a baseline test listing in Burlington
    await sql`
      INSERT INTO business_listings (
        listing_uid, geography_id, category_id, business_name, asking_price, monthly_rent,
        status, address, first_listed_date, last_active_date
      ) VALUES (
        ${testListingId}, 'CSD_burlington', 'pizza_store', 'Luigi Pizzeria & Trattoria',
        249000.00, 4500.00, 'ACTIVE', '123 Brant St, Burlington', '2026-01-15', '2026-01-15'
      ) ON CONFLICT (listing_uid) DO NOTHING;
    `;
  });

  afterAll(async () => {
    server.close();
    // Clean up test rows
    await sql`DELETE FROM watch_notifications WHERE subscriber_email = ${publicTestEmail};`;
    await sql`DELETE FROM subscriber_watches WHERE subscriber_email = ${publicTestEmail};`;
    await sql`DELETE FROM watch_notifications WHERE subscriber_email = ${testEmail};`;
    await sql`DELETE FROM subscriber_watches WHERE subscriber_email = ${testEmail};`;
    await sql`DELETE FROM audit_events WHERE entity_id LIKE ${`%${testListingId}%`};`;
    await sql`DELETE FROM business_listings WHERE listing_uid = ${testListingId};`;
  });

  it('AC1: audit_events table schema tracks all required temporal and delta attributes', async () => {
    const columns = await sql<{ column_name: string }[]>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'audit_events';
    `;
    const colNames = columns.map(c => c.column_name);

    expect(colNames).toContain('event_type');
    expect(colNames).toContain('entity_type');
    expect(colNames).toContain('entity_id');
    expect(colNames).toContain('geography_id');
    expect(colNames).toContain('old_value');
    expect(colNames).toContain('new_value');
    expect(colNames).toContain('delta_pct');
    expect(colNames).toContain('occurred_at');
  });

  it('AC2: subscriber_watches table tracks subscriber watches with thresholds and geo preferences', async () => {
    const columns = await sql<{ column_name: string }[]>`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'subscriber_watches';
    `;
    const colNames = columns.map(c => c.column_name);

    expect(colNames).toContain('subscriber_email');
    expect(colNames).toContain('watch_type');
    expect(colNames).toContain('geography_id');
    expect(colNames).toContain('category_id');
    expect(colNames).toContain('threshold_pct');
    expect(colNames).toContain('is_active');
  });

  it('AC3: diff engine detects price change from $249,000 to $229,000 and calculates delta (-8.03%)', async () => {
    const event = await detectListingDiff({
      listing_id: testListingId,
      geography_id: 'CSD_burlington',
      category_id: 'pizza_store',
      business_name: 'Luigi Pizzeria & Trattoria',
      asking_price: 229000.00, // Price drop of $20,000
      status: 'ACTIVE',
      monthly_rent: 4500.00
    });

    expect(event).not.toBeNull();
    expect(event!.event_type).toBe('LISTING_PRICE_CHANGE');
    expect(event!.old_value).toBe(249000);
    expect(event!.new_value).toBe(229000);
    expect(event!.delta_pct).toBe(-8.03); // Exactly -8.03%
    expect(event!.title).toContain('Price Drop (-8.03%)');
  });

  it('diff engine detects relisting when an expired listing returns to ACTIVE', async () => {
    // First simulate marking listing as EXPIRED
    await sql`
      UPDATE business_listings 
      SET status = 'EXPIRED' 
      WHERE listing_uid = ${testListingId};
    `;

    const relistEvent = await detectListingDiff({
      listing_id: testListingId,
      geography_id: 'CSD_burlington',
      category_id: 'pizza_store',
      business_name: 'Luigi Pizzeria & Trattoria',
      asking_price: 229000.00,
      status: 'ACTIVE'
    });

    expect(relistEvent).not.toBeNull();
    expect(relistEvent!.event_type).toBe('LISTING_RELIST');
    expect(relistEvent!.title).toContain('Listing Relisted');
  });

  it('haversine distance calculates exact radius between Ontario municipalities', () => {
    // Burlington (43.3255, -79.7990) to Oakville (43.4675, -79.6877) is ~18 km
    const distOakville = haversineDistanceKm(43.3255, -79.7990, 43.4675, -79.6877);
    expect(distOakville).toBeGreaterThan(15);
    expect(distOakville).toBeLessThan(20);

    // Burlington to Ottawa is ~400+ km
    const distOttawa = haversineDistanceKm(43.3255, -79.7990, 45.4215, -75.6972);
    expect(distOttawa).toBeGreaterThan(350);
  });

  it('AC4 & AC5: watch evaluator evaluates active watches in single-pass and matches subscriptions', async () => {
    // 1. Register a watch: "Alert me when a pizza business changes in or within 30km of Burlington"
    const watch = await registerSubscriberWatch({
      subscriber_email: testEmail,
      subscriber_name: 'Test Investor',
      watch_type: 'LISTING_WATCH',
      geography_id: 'CSD_burlington',
      radius_km: 30.0,
      category_id: 'pizza_store',
      notification_channel: 'EMAIL'
    });
    expect(watch.id).toBeDefined();

    // 2. Evaluate active watches
    const evalResult = await evaluateActiveWatches();
    expect(evalResult.evaluatedWatchesCount).toBeGreaterThanOrEqual(1);

    // 3. Verify notification was created for this subscriber
    const notifications = await sql<{ id: number; subscriber_email: string; delivered: boolean }[]>`
      SELECT * FROM watch_notifications 
      WHERE subscriber_email = ${testEmail};
    `;
    expect(notifications.length).toBeGreaterThanOrEqual(1);
    expect(notifications[0].subscriber_email).toBe(testEmail);
    expect(notifications[0].delivered).toBe(false);

    // 4. Mark delivered
    await markNotificationsDelivered([notifications[0].id]);
    const [updated] = await sql<{ delivered: boolean }[]>`
      SELECT delivered FROM watch_notifications WHERE id = ${notifications[0].id};
    `;
    expect(updated.delivered).toBe(true);
  });

  it('T-039 AC1 & AC4: public callers cannot inspect or operate alert queues', async () => {
    const [notification] = await sql<{ id: number }[]>`
      SELECT id FROM watch_notifications WHERE subscriber_email = ${testEmail} ORDER BY id DESC LIMIT 1;
    `;
    await sql`UPDATE watch_notifications SET delivered = FALSE, delivered_at = NULL WHERE id = ${notification.id};`;

    const blockedRequests = [
      fetch(`${baseUrl}/api/alerts/events`),
      fetch(`${baseUrl}/api/alerts/watches?email=${encodeURIComponent(testEmail)}`),
      fetch(`${baseUrl}/api/alerts/evaluate`, { method: 'POST' }),
      fetch(`${baseUrl}/api/alerts/notifications/pending`),
      fetch(`${baseUrl}/api/alerts/notifications/deliver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationIds: [notification.id] })
      })
    ];

    const responses = await Promise.all(blockedRequests);
    for (const response of responses) {
      expect(response.status).toBe(404);
      expect(await response.text()).not.toContain(testEmail);
    }

    const [after] = await sql<{ delivered: boolean }[]>`
      SELECT delivered FROM watch_notifications WHERE id = ${notification.id};
    `;
    expect(after.delivered).toBe(false);
  });

  it('T-039 AC2: public watch registration validates bounded supported input and returns no subscriber record', async () => {
    const valid = {
      subscriber_email: publicTestEmail,
      subscriber_name: 'Public Test',
      watch_type: 'LISTING_WATCH',
      geography_id: 'CSD_burlington',
      radius_km: 30,
      category_id: 'pizza_store'
    };
    const created = await fetch(`${baseUrl}/api/alerts/watches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(valid)
    });
    expect(created.status).toBe(201);
    expect(await created.json()).toEqual({ success: true });

    for (const invalid of [
      { ...valid, subscriber_email: 'not-an-email' },
      { ...valid, watch_type: 'UNKNOWN_WATCH' },
      { ...valid, radius_km: 501 },
      { ...valid, notification_channel: 'WEBHOOK' }
    ]) {
      const response = await fetch(`${baseUrl}/api/alerts/watches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalid)
      });
      expect(response.status).toBe(400);
    }
  });

  it('T-039 AC3: public alert registration is rate-limited', async () => {
    let status = 0;
    for (let index = 0; index < 31; index++) {
      const response = await fetch(`${baseUrl}/api/alerts/watches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-test-rate-limit': 'true' },
        body: JSON.stringify({ subscriber_email: 'invalid', watch_type: 'LISTING_WATCH' })
      });
      status = response.status;
      if (status === 429) break;
    }
    expect(status).toBe(429);
  });

});

describe('T-040 Alert Operator UI Removal', () => {
  it('AC1-AC3: client alert UI has no operator requests, delivery claims, or browser email storage', async () => {
    const [modalSource, appSource] = await Promise.all([
      readFile(new URL('../src/client/components/AlertSubscriptionModal.tsx', import.meta.url), 'utf8'),
      readFile(new URL('../src/client/App.tsx', import.meta.url), 'utf8')
    ]);
    const clientSource = `${modalSource}\n${appSource}`;

    expect(clientSource).not.toContain('/api/alerts/notifications/pending');
    expect(clientSource).not.toContain('/api/alerts/evaluate');
    expect(clientSource).not.toContain('/api/alerts/notifications/deliver');
    expect(clientSource).not.toContain('Run Evaluator Now');
    expect(clientSource).not.toContain('Subscribe to automated change-detection events');
    expect(clientSource).not.toContain("We'll alert");
    expect(clientSource).not.toContain("localStorage.setItem('ontario_subscriber_email'");
    expect(modalSource).toContain("event.key === 'Escape' && isOpen");
    expect(modalSource).toContain('Alert subscriptions are not available yet.');
  });
});
