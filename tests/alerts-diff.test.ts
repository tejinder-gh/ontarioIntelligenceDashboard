import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { sql } from '../src/db/index.js';
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

  beforeAll(async () => {
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
    // Clean up test rows
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
});
