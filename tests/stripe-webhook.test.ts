import { describe, expect, it, vi } from 'vitest';
import { handleStripeWebhook } from '../src/server/stripe-webhook.js';
import { sql } from '../src/db/index.js';

// Mock sendDossierEmail
vi.mock('../src/alerts/email-dispatcher.js', () => ({
  sendDossierEmail: vi.fn().mockResolvedValue(true)
}));

describe('Stripe Webhook Verification & Fulfillment (T-052)', () => {
  it('rejects webhooks with missing signature', async () => {
    let statusCode = 0;
    let jsonResponse: any = null;

    const req: any = {
      headers: {},
      body: Buffer.from('{}')
    };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResponse = data;
        return this;
      }
    };

    await handleStripeWebhook(req, res);
    expect(statusCode).toBe(400);
    expect(jsonResponse.error).toContain('Missing signature');
  });

  it('rejects webhooks with invalid signature', async () => {
    let statusCode = 0;
    let jsonResponse: any = null;

    const req: any = {
      headers: { 'stripe-signature': 'invalid_sig' },
      body: Buffer.from('{"id":"evt_test"}')
    };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResponse = data;
        return this;
      }
    };

    await handleStripeWebhook(req, res);
    expect(statusCode).toBe(400);
    expect(jsonResponse.error).toContain('signature verification failed');
  });

  it('processes checkout.session.completed and records order in database', async () => {
    const testSessionId = `cs_test_${Date.now()}`;
    const testEmail = `customer_${Date.now()}@example.com`;

    const eventPayload = {
      id: `evt_test_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: testSessionId,
          customer_details: { email: testEmail },
          metadata: {
            cityId: 'CSD_burlington', // Burlington
            categoryId: 'pizza_store'
          },
          amount_total: 19900,
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
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResponse = data;
        return this;
      }
    };

    await handleStripeWebhook(req, res);

    expect(statusCode).toBe(200);
    expect(jsonResponse.received).toBe(true);
    expect(jsonResponse.fulfilled).toBe(true);

    // Verify order was written to database
    const [order] = await sql`
      SELECT * FROM dossier_orders WHERE stripe_session_id = ${testSessionId};
    `;

    expect(order).toBeDefined();
    expect(order.customer_email).toBe(testEmail);
    expect(order.city_id).toBe('CSD_burlington');
    expect(order.category_id).toBe('pizza_store');
    expect(order.amount_total_cad).toBe(19900);
    expect(order.fulfilled_at).not.toBeNull();

    // Clean up test order
    await sql`DELETE FROM dossier_orders WHERE stripe_session_id = ${testSessionId};`;
  });
});
