import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { db } from '../db/index.js';
import { leads } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
});

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

/**
 * Generate a referral code (8 chars).
 */
function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude confusing chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default async function webhookRoutes(server: FastifyInstance) {
  // POST /api/webhooks/stripe - Handle Stripe webhook events
  server.post('/stripe', async (request, reply) => {
    const sig = request.headers['stripe-signature'] as string;

    if (!sig || !STRIPE_WEBHOOK_SECRET) {
      console.error('Missing stripe signature or webhook secret');
      return reply.status(400).send({ error: 'Missing stripe signature or webhook secret' });
    }

    let event: Stripe.Event;

    // Get raw body for signature verification
    const rawBody = Buffer.isBuffer(request.body) ? request.body : Buffer.from(request.body as string);

    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return reply.status(400).send({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const leadId = session.metadata?.leadId;

        if (!leadId) {
          console.error('No leadId in checkout session metadata');
          break;
        }

        // Update lead status to converted
        const lead = db.select().from(leads).where(eq(leads.id, parseInt(leadId))).get();
        if (lead) {
          // Generate referral code on first booking conversion (MAI-823)
          let referralCode = lead.referralCode;
          if (!referralCode) {
            referralCode = generateReferralCode();
          }

          db.update(leads)
            .set({
              status: 'converted',
              referralCode,
            })
            .where(eq(leads.id, parseInt(leadId)))
            .run();

          console.log(`Lead ${leadId} converted: status updated to converted, referralCode: ${referralCode}`);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session ${session.id} expired`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment intent ${paymentIntent.id} failed`);
        // Could update lead status to indicate payment failure
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  });
}
