import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { db } from '../db/index.js';
import { leads, bookings, services } from '../db/schema.js';
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

        const parsedLeadId = parseInt(leadId);
        if (isNaN(parsedLeadId)) {
          console.error('Invalid leadId in checkout session metadata:', leadId);
          break;
        }

        // Fetch full lead details first
        const lead = db.select({
          id: leads.id,
          serviceId: leads.serviceId,
          chefId: leads.chefId,
          clientName: leads.clientName,
          email: leads.email,
          phone: leads.phone,
          eventDate: leads.eventDate,
          guestCount: leads.guestCount,
          quoteAmount: leads.quoteAmount,
          referralCode: leads.referralCode,
        })
          .from(leads)
          .where(eq(leads.id, parsedLeadId))
          .get();

        if (!lead) {
          console.error(`Lead ${leadId} not found`);
          break;
        }

        // Generate referral code on first booking conversion (MAI-823)
        let referralCode = lead.referralCode;
        if (!referralCode) {
          referralCode = generateReferralCode();
        }

        // Update lead status to converted
        db.update(leads)
          .set({
            status: 'converted',
            referralCode,
          })
          .where(eq(leads.id, parsedLeadId))
          .run();

        // Create booking record so diner can see it in "My Bookings"
        const now = new Date();
        const totalPrice = lead.quoteAmount || 0;

        db.insert(bookings).values({
          serviceId: lead.serviceId,
          chefId: lead.chefId,
          dinerId: null, // diner may not be a logged-in user; link via email/guestEmail instead
          guestEmail: lead.email || null,
          eventDate: lead.eventDate || '',
          guestCount: lead.guestCount || 0,
          totalPrice,
          status: 'confirmed',
          notes: `Converted from lead ${lead.id}`,
          createdAt: now,
        }).run();

        console.log(`Lead ${leadId} converted: status updated and booking created`);
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
