import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { db } from '../db/index.js';
import { leads, bookings, services, referralCodes, dinerCredits, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { sendBookingConfirmation } from '../services/chef-notification.js';
import { sendBookingConfirmationEmail } from '../services/booking-confirmation-email.js';

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
          accessToken: leads.accessToken,
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

        // Update lead status to converted and payment_status to paid
        db.update(leads)
          .set({
            status: 'converted',
            referralCode,
            paymentStatus: 'paid',
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

        // MAI-1822: Send booking confirmation to chef via email + WhatsApp
        const newBooking = db.select({ id: bookings.id }).from(bookings).orderBy(bookings.id).get();
        if (newBooking) {
          sendBookingConfirmation(lead.chefId, {
            bookingId: newBooking.id,
            leadId: lead.id,
            chefId: lead.chefId,
            serviceId: lead.serviceId,
            guestName: lead.clientName || 'Guest',
            guestEmail: lead.email || '',
            guestPhone: lead.phone,
            eventDate: lead.eventDate || '',
            guestCount: lead.guestCount || 0,
            totalPrice,
          }).catch(err => {
            console.error(`[Webhook] Failed to send booking confirmation to chef ${lead.chefId}:`, err);
          });
        }

        // MAI-2122: Send booking confirmation email to diner with their referral code
        if (lead.email && newBooking) {
          const dinerUser = db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, lead.email.toLowerCase())).get();
          const dinerReferralCode = dinerUser
            ? db.select({ code: referralCodes.code }).from(referralCodes).where(eq(referralCodes.dinerId, dinerUser.id)).get()
            : null;
          const service = db.select({ name: services.name }).from(services).where(eq(services.id, lead.serviceId)).get();
          const chef = db.select({ name: users.name }).from(users).where(eq(users.id, lead.chefId)).get();
          const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
          const DINER_BOOKINGS_URL = process.env.DINER_BOOKINGS_URL || 'https://maisondeschefs.com/diner/bookings';
          const fullBookingStatusUrl = lead.accessToken ? `${DASHBOARD_URL}/booking-status?token=${lead.accessToken}` : undefined;

          sendBookingConfirmationEmail({
            bookingId: newBooking.id,
            dinerName: dinerUser?.name || lead.clientName || 'there',
            dinerEmail: lead.email,
            chefName: chef?.name || 'your chef',
            serviceName: service?.name || 'your booking',
            eventDate: lead.eventDate || '',
            guestCount: lead.guestCount || 0,
            totalPrice,
            bookingStatusUrl: fullBookingStatusUrl,
            dinerBookingsUrl: DINER_BOOKINGS_URL,
            referralCode: dinerReferralCode?.code,
          }).catch(err => {
            console.error(`[Webhook] Failed to send booking confirmation email to diner ${lead.email}:`, err);
          });
        }

        // MAI-1778: Credit trigger — when referee completes first booking,
        // both referee and referrer get $25 credit
        const REFERRAL_CREDIT_CENTS = 2500;
        const REFERRAL_CREDIT_MONTHS = 12;

        // Find who used this referral code (referee is the current lead's diner via email)
        // Look up referrer by the referralCode
        const referrerCode = db.select().from(referralCodes).where(eq(referralCodes.code, referralCode)).get();
        if (referrerCode && referrerCode.dinerId) {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + REFERRAL_CREDIT_MONTHS);

          // Credit the referrer ($25)
          db.insert(dinerCredits).values({
            dinerId: referrerCode.dinerId,
            amount: REFERRAL_CREDIT_CENTS,
            earnedFromReferralId: referrerCode.id,
            used: false,
            expiresAt,
          }).run();

          // Credit the referee — find referee by email in users table (lead email = diner email)
          const refereeUser = db.select({ id: users.id }).from(users).where(eq(users.email, lead.email || '')).get();
          if (refereeUser) {
            db.insert(dinerCredits).values({
              dinerId: refereeUser.id,
              amount: REFERRAL_CREDIT_CENTS,
              earnedFromReferralId: referrerCode.id,
              used: false,
              expiresAt,
            }).run();
          }

          console.log(`[Referral] Credited $25 to referrer (diner ${referrerCode.dinerId}) and referee (${lead.email}) for lead ${leadId}`);
        } else {
          console.log(`[Referral] No referrer found for code ${referralCode} on lead ${leadId}`);
        }

        // MAI-1879: Mark credits as used after payment confirmation
        const applyCreditSession = session.metadata?.applyCredit === 'true';
        if (applyCreditSession) {
          const creditIdsRaw = session.metadata?.creditIds;
          if (creditIdsRaw) {
            try {
              const creditIds = JSON.parse(creditIdsRaw) as number[];
              for (const creditId of creditIds) {
                db.update(dinerCredits)
                  .set({ used: true })
                  .where(eq(dinerCredits.id, creditId))
                  .run();
              }
              console.log(`[Credit] Marked ${creditIds.length} credit(s) as used for lead ${leadId}`);
            } catch (e) {
              console.error('[Credit] Failed to parse creditIds:', creditIdsRaw, e);
            }
          }
        }

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
