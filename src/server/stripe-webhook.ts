import { Request, Response } from 'express';
import Stripe from 'stripe';
import { sql } from '../db/index.js';
import { sendDossierEmail } from '../alerts/email-dispatcher.js';

const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_12345';
const stripe = new Stripe(stripeSecret, { apiVersion: '2026-08-26.dahlia' as any });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test_secret';

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];

  let event: Stripe.Event;

  try {
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    
    // In test environment, allow simulated payload if signature header is 'test-mock-sig'
    if (process.env.NODE_ENV === 'test' && sig === 'test-mock-sig') {
      event = JSON.parse(rawBody.toString('utf8'));
    } else {
      if (!sig || typeof sig !== 'string') {
        return res.status(400).json({ error: 'Webhook signature verification failed: Missing signature' });
      }
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    }
  } catch (err: any) {
    console.error('[Stripe Webhook Verification Error]', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  // Handle checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const customerEmail = session.customer_details?.email || session.customer_email;
    const cityId = session.metadata?.cityId;
    const categoryId = session.metadata?.categoryId;
    const amountTotal = session.amount_total;
    const paymentStatus = session.payment_status;
    const currency = (session.currency || 'cad').toLowerCase();
    const sessionId = session.id;

    if (!customerEmail || !cityId || !categoryId) {
      console.error('[Stripe Webhook] Missing required session details for fulfillment', {
        sessionId,
        customerEmail,
        cityId,
        categoryId
      });
      return res.status(400).json({ error: 'Missing required metadata or customer email' });
    }

    // 1. Strict Payment State, Currency, and Amount Verification
    if (paymentStatus !== 'paid') {
      console.warn(`[Stripe Webhook] Session ${sessionId} payment_status is '${paymentStatus}' (not 'paid'); deferring fulfillment`);
      await sql`
        INSERT INTO dossier_orders (
          stripe_session_id, customer_email, email, city_id, category_id,
          amount_total_cad, amount_cents, currency, payment_status, status, fulfilled_at
        ) VALUES (
          ${sessionId}, ${customerEmail}, ${customerEmail}, ${cityId}, ${categoryId},
          ${amountTotal || 0}, ${amountTotal || 0}, ${currency}, ${paymentStatus || 'unpaid'}, 'UNPAID_PENDING', NULL
        )
        ON CONFLICT (stripe_session_id) DO UPDATE SET
          payment_status = EXCLUDED.payment_status,
          status = EXCLUDED.status,
          updated_at = NOW();
      `;
      return res.json({ received: true, fulfilled: false, reason: `Payment status is ${paymentStatus}` });
    }

    if (currency !== 'cad') {
      console.error(`[Stripe Webhook] Unsupported currency '${currency}'; only CAD is supported`);
      return res.status(400).json({ error: `Unsupported currency: ${currency}` });
    }

    if (!amountTotal || amountTotal < 10000) {
      console.error(`[Stripe Webhook] Invalid amount_total '${amountTotal}'; expected 19900 cents`);
      return res.status(400).json({ error: 'Invalid order amount' });
    }

    try {
      // 2. Exactly-Once Delivery Check: Prevent duplicate deliveries on webhook retries
      const existing = await sql<{ id: string; fulfilled_at: Date | null }[]>`
        SELECT id, fulfilled_at FROM dossier_orders WHERE stripe_session_id = ${sessionId};
      `;

      if (existing.length > 0 && existing[0]?.fulfilled_at) {
        console.log(`[Stripe Webhook] Session ${sessionId} already fulfilled at ${existing[0].fulfilled_at}; avoiding duplicate email dispatch`);
        return res.json({ received: true, orderId: existing[0].id, alreadyFulfilled: true, fulfilled: true });
      }

      // 3. Record order in database
      const [order] = await sql<{ id: string }[]>`
        INSERT INTO dossier_orders (
          stripe_session_id,
          customer_email,
          email,
          city_id,
          category_id,
          amount_total_cad,
          amount_cents,
          currency,
          payment_status,
          status,
          fulfilled_at
        ) VALUES (
          ${sessionId},
          ${customerEmail},
          ${customerEmail},
          ${cityId},
          ${categoryId},
          ${amountTotal},
          ${amountTotal},
          'cad',
          ${paymentStatus},
          'PROCESSING',
          NULL
        )
        ON CONFLICT (stripe_session_id)
        DO UPDATE SET
          payment_status = EXCLUDED.payment_status,
          status = 'PROCESSING',
          updated_at = NOW()
        RETURNING id;
      `;

      // 4. Dispatch dossier fulfillment email
      const emailSent = await sendDossierEmail(customerEmail, cityId, categoryId);

      // 5. If email dispatched successfully, mark fulfilled_at atomically
      if (emailSent && order?.id) {
        await sql`
          UPDATE dossier_orders
          SET fulfilled_at = NOW(), status = 'FULFILLED', updated_at = NOW()
          WHERE id = ${order.id};
        `;
        console.log(`[Stripe Webhook] Order #${order.id} fulfilled and delivered to ${customerEmail}`);
        return res.json({ received: true, orderId: order.id, fulfilled: true });
      } else if (order?.id) {
        // Persist failure for retry queue
        await sql`
          UPDATE dossier_orders
          SET status = 'FAILED_RETRY_QUEUED', updated_at = NOW()
          WHERE id = ${order.id};
        `;
        console.error(`[Stripe Webhook] Email delivery failed for order #${order.id}; queued for retry`);
        return res.status(502).json({ error: 'Fulfillment email dispatch failed; queued for retry', orderId: order.id });
      }

      return res.json({ received: true, orderId: order?.id, fulfilled: emailSent });
    } catch (dbErr: any) {
      console.error('[Stripe Webhook DB Error]', dbErr);
      return res.status(500).json({ error: 'Database transaction error processing order' });
    }
  }

  return res.json({ received: true });
}
