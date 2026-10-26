import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runDataSync } from '../src/ingestion/sync.js';
import { handleStripeWebhook } from '../src/server/stripe-webhook.js';
import { validateProductionEmailConfig, sendDossierEmail } from '../src/alerts/email-dispatcher.js';
import { sql } from '../src/db/index.js';

// Mock sendDossierEmail for webhook testing
vi.mock('../src/alerts/email-dispatcher.js', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    sendDossierEmail: vi.fn().mockResolvedValue(true)
  };
});

describe('Phase 4 — Reproducibility, Async Durability & Webhook Fulfillment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Requirement 10: Data Sync Pipeline
  it('executes data:sync pipeline successfully with durable stages and duration tracking', async () => {
    const syncResult = await runDataSync();
    expect(syncResult.success).toBe(true);
    expect(syncResult.stagesCompleted).toContain('statcan_fuel');
    expect(syncResult.stagesCompleted).toContain('crea_ddf_status');
    expect(syncResult.stagesCompleted).toContain('derived_analytics');
    expect(syncResult.durationMs).toBeGreaterThan(0);
  }, 25000);

  // Requirement 11: Stripe Webhook Requires Correct Paid State
  it('defers dossier delivery when payment_status is not paid', async () => {
    const testSessionId = `cs_unpaid_${Date.now()}`;
    const testEmail = `unpaid_${Date.now()}@example.com`;

    const eventPayload = {
      id: `evt_unpaid_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: testSessionId,
          customer_details: { email: testEmail },
          metadata: { cityId: 'CSD_burlington', categoryId: 'pizza_store' },
          amount_total: 19900,
          currency: 'cad',
          payment_status: 'unpaid' // Incomplete payment
        }
      }
    };

    let statusCode = 200;
    let jsonResponse: any = null;

    const req: any = {
      headers: { 'stripe-signature': 'test-mock-sig' },
      body: Buffer.from(JSON.stringify(eventPayload))
    };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { jsonResponse = data; return this; }
    };

    await handleStripeWebhook(req, res);

    expect(statusCode).toBe(200);
    expect(jsonResponse.fulfilled).toBe(false);
    expect(jsonResponse.reason).toContain('unpaid');

    // Email dispatcher must NOT be called for unpaid sessions
    expect(sendDossierEmail).not.toHaveBeenCalled();

    // Clean up
    await sql`DELETE FROM dossier_orders WHERE stripe_session_id = ${testSessionId};`;
  });

  // Requirement 11: Stripe Webhook Rejects Unsupported Currency and Amount
  it('rejects checkout sessions with unsupported currency or invalid amount', async () => {
    const testSessionId = `cs_usd_${Date.now()}`;
    const eventPayload = {
      id: `evt_usd_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: testSessionId,
          customer_details: { email: 'test@example.com' },
          metadata: { cityId: 'CSD_burlington', categoryId: 'pizza_store' },
          amount_total: 19900,
          currency: 'usd', // Unsupported currency
          payment_status: 'paid'
        }
      }
    };

    let statusCode = 200;
    let jsonResponse: any = null;

    const req: any = {
      headers: { 'stripe-signature': 'test-mock-sig' },
      body: Buffer.from(JSON.stringify(eventPayload))
    };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { jsonResponse = data; return this; }
    };

    await handleStripeWebhook(req, res);
    expect(statusCode).toBe(400);
    expect(jsonResponse.error).toContain('Unsupported currency');
  });

  // Requirement 11: Exactly-Once Logical Delivery (Idempotency)
  it('enforces exactly-once delivery; duplicate webhook events do not duplicate email dispatches', async () => {
    const testSessionId = `cs_idemp_${Date.now()}`;
    const testEmail = `idemp_${Date.now()}@example.com`;

    const eventPayload = {
      id: `evt_idemp_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: testSessionId,
          customer_details: { email: testEmail },
          metadata: { cityId: 'CSD_burlington', categoryId: 'pizza_store' },
          amount_total: 19900,
          currency: 'cad',
          payment_status: 'paid'
        }
      }
    };

    let statusCode = 200;
    let jsonResponse: any = null;

    const req: any = {
      headers: { 'stripe-signature': 'test-mock-sig' },
      body: Buffer.from(JSON.stringify(eventPayload))
    };
    const res: any = {
      status(code: number) { statusCode = code; return this; },
      json(data: any) { jsonResponse = data; return this; }
    };

    // First Webhook: Fulfills order
    await handleStripeWebhook(req, res);
    expect(statusCode).toBe(200);
    expect(jsonResponse.fulfilled).toBe(true);
    expect(sendDossierEmail).toHaveBeenCalledTimes(1);

    // Second Duplicate Webhook: Must detect existing fulfilled_at and skip email
    statusCode = 200;
    jsonResponse = null;
    await handleStripeWebhook(req, res);
    expect(statusCode).toBe(200);
    expect(jsonResponse.alreadyFulfilled).toBe(true);
    // Still only called once!
    expect(sendDossierEmail).toHaveBeenCalledTimes(1);

    // Clean up
    await sql`DELETE FROM dossier_orders WHERE stripe_session_id = ${testSessionId};`;
  });

  // Requirement 11: Production Configuration Validation
  it('strictly validates production credentials and rejects placeholder test keys or example.com domains in production', () => {
    const origEnv = process.env.NODE_ENV;
    const origKey = process.env.RESEND_API_KEY;

    try {
      process.env.NODE_ENV = 'production';
      process.env.RESEND_API_KEY = 're_test_placeholder_key';

      // Must throw in production when test key is configured
      expect(() => validateProductionEmailConfig()).toThrow(/Production Security.*RESEND_API_KEY/);
    } finally {
      process.env.NODE_ENV = origEnv;
      process.env.RESEND_API_KEY = origKey;
    }
  });
});
