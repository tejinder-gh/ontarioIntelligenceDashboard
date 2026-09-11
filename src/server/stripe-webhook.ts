import type { Request, Response } from 'express';
import Stripe from 'stripe';
import { sql } from '../db/index.js';
import { sendDossierEmail } from '../alerts/email-dispatcher.js';

// Fallback for local testing if env variables are missing
const stripeSecret = process.env.STRIPE_SECRET_KEY || 'sk_test_12345';
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_12345';

const stripe = new Stripe(stripeSecret, {
  apiVersion: '2026-08-26.dahlia' as any, // Current version
});

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).send('Webhook Error: Missing stripe-signature header');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`[Stripe Webhook Error] ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    
    // Extract metadata we passed during checkout creation
    const { cityId, categoryId } = session.metadata || {};
    const customerEmail = session.customer_details?.email || 'unknown';
    
    if (!cityId || !categoryId) {
      console.error('[Stripe Webhook Error] Missing metadata in session');
      return res.status(400).send('Webhook Error: Missing metadata');
    }

    try {
      const emailSent = await sendDossierEmail(customerEmail, cityId, categoryId);

      await sql`
        INSERT INTO dossier_orders (
          stripe_session_id, customer_email, city_id, category_id, amount_total_cad, payment_status, fulfilled_at
        ) VALUES (
          ${session.id}, ${customerEmail}, ${cityId}, ${categoryId}, ${session.amount_total || 19900}, ${session.payment_status}, ${emailSent ? sql`NOW()` : null}
        )
        ON CONFLICT (stripe_session_id) DO UPDATE 
        SET payment_status = ${session.payment_status}, updated_at = NOW(), fulfilled_at = COALESCE(dossier_orders.fulfilled_at, ${emailSent ? sql`NOW()` : null});
      `;
      console.log(`[Stripe] Successfully processed and fulfilled order for session ${session.id}`);
    } catch (dbErr: any) {
      console.error(`[Stripe DB Error] Failed to record order: ${dbErr.message}`);
      // Returning 500 tells Stripe to retry
      return res.status(500).send('Database error');
    }
  }

  // Return a 200 response to acknowledge receipt of the event
  res.send({ received: true });
}
