import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import Stripe from 'stripe';
import { db } from '../db/index.js';
import { bookings, services, users, leads, referralCodes, chefAvailabilitySlots, chefBlockedDates, bookingRefunds } from '../db/schema.js';
import { eq, and, or, isNull, ne } from 'drizzle-orm';
import { getStripeClient } from '../config/stripe.js';
import { sendBookingConfirmationEmail } from '../services/booking-confirmation-email.js';
import { sendBookingAcceptedEmail } from '../services/diner-booking-accepted-email.js';
import { sendBookingDeclinedEmail } from '../services/diner-booking-declined-email.js';
import { createNotification } from './notifications.js';

const createBookingSchema = z.object({
  serviceId: z.number(),
  eventDate: z.string(),
  guestCount: z.number().min(1),
  notes: z.string().optional().default(''),
});

const updateStatusSchema = z.object({
  status: z.enum(['accepted', 'rejected', 'declined', 'confirmed', 'completed']),
  declineReason: z.string().optional(),
});

export default async function bookingRoutes(server: FastifyInstance) {
  // Create booking (diner only)
  server.post('/', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'diner') {
      return reply.status(403).send({ error: 'Only diners can book' });
    }
    const body = createBookingSchema.parse(request.body);
    const service = db.select().from(services).where(eq(services.id, body.serviceId)).get();
    if (!service) {
      return reply.status(404).send({ error: 'Service not found' });
    }

    // MAI-2135: Booking conflict detection — check chef availability before creating booking
    const requestedDate = new Date(body.eventDate);
    const dayOfWeek = requestedDate.getDay();

    // 1. Check if chef has availability slots for this day of week
    const availableSlots = db.select().from(chefAvailabilitySlots).where(
      and(
        eq(chefAvailabilitySlots.chefId, service.chefId),
        eq(chefAvailabilitySlots.dayOfWeek, dayOfWeek),
        eq(chefAvailabilitySlots.isActive, true)
      )
    ).all();

    if (availableSlots.length === 0) {
      return reply.status(409).send({
        error: 'Booking conflict',
        reason: 'Chef is not available on this day of the week',
        conflictType: 'NO_AVAILABILITY_SLOT',
      });
    }

    // 2. Check if chef has blocked this specific date
    const blockedDate = db.select().from(chefBlockedDates).where(
      and(
        eq(chefBlockedDates.chefId, service.chefId),
        eq(chefBlockedDates.date, body.eventDate)
      )
    ).get();

    if (blockedDate) {
      return reply.status(409).send({
        error: 'Booking conflict',
        reason: blockedDate.reason || 'Chef has blocked this date',
        conflictType: 'DATE_BLOCKED',
      });
    }

    // 3. Check for existing non-cancelled booking at the same date
    const conflictingBooking = db.select({ id: bookings.id, status: bookings.status })
      .from(bookings)
      .where(
        and(
          eq(bookings.chefId, service.chefId),
          eq(bookings.eventDate, body.eventDate),
          ne(bookings.status, 'cancelled')
        )
      )
      .get();

    if (conflictingBooking) {
      return reply.status(409).send({
        error: 'Booking conflict',
        reason: `Chef already has a booking on this date (booking #${conflictingBooking.id})`,
        conflictType: 'DATE_ALREADY_BOOKED',
        existingBookingId: conflictingBooking.id,
      });
    }

    const totalPrice = service.pricePerPerson * body.guestCount;

    // Look up diner info BEFORE creating booking so we can create the lead
    const diner = db.select().from(users).where(eq(users.id, userId)).get();

    // MAI-1135: Create a corresponding lead record so the chef sees this inquiry in their lead dashboard.
    // The lead captures the same inquiry data, ensuring 1:1 parity between bookings and leads.
    // MAI-1144: Set inquiryType to 'direct_booking' so we can distinguish these from inquiry form submissions.
    // MAI-1559: Store diner phone in lead so chef can WhatsApp from the leads page
    db.insert(leads).values({
      serviceId: body.serviceId,
      chefId: service.chefId,
      clientName: diner?.name || null,
      email: diner?.email || null,
      eventDate: body.eventDate,
      guestCount: body.guestCount,
      message: body.notes || null,
      status: 'new',
      inquiryType: 'direct_booking',
    }).run();

    const created = db.insert(bookings).values({
      serviceId: body.serviceId,
      dinerId: userId,
      chefId: service.chefId,
      eventDate: body.eventDate,
      guestCount: body.guestCount,
      totalPrice,
      notes: body.notes,
    }).returning().all()[0];

    // MAI-1144: Update the lead with bookingId once booking is created
    db.update(leads)
      .set({ bookingId: created.id })
      .where(and(
        eq(leads.serviceId, body.serviceId),
        eq(leads.chefId, service.chefId),
        eq(leads.eventDate, body.eventDate),
        eq(leads.guestCount, body.guestCount),
        eq(leads.inquiryType, 'direct_booking')
      ))
      .run();

    // Send booking confirmation email to diner (fire-and-forget)
    if (diner?.email) {
      // MAI-2122: Look up diner's referral code to include in email
      const dinerReferralCode = db.select({ code: referralCodes.code })
        .from(referralCodes)
        .where(eq(referralCodes.dinerId, diner.id))
        .get();

      sendBookingConfirmationEmail({
        bookingId: created.id,
        dinerName: diner.name || 'Guest',
        dinerEmail: diner.email,
        chefName: service.chefId ? db.select().from(users).where(eq(users.id, service.chefId)).get()?.name || 'your chef' : 'your chef',
        serviceName: service.name,
        eventDate: body.eventDate,
        guestCount: body.guestCount,
        totalPrice,
        referralCode: dinerReferralCode?.code,
      }).catch(err => console.error('[BookingConfirmation] Failed to send email:', err));
    }

    // Send new booking notification email to chef (fire-and-forget)
    // MAI-1359: Chef Instant Notification via Resend — prepared for activation once RESEND_API_KEY is set
    const chef = db.select().from(users).where(eq(users.id, service.chefId)).get();
    if (chef?.email) {
      // Dynamically import to avoid top-level await issues
      import('../services/chef-new-booking-email.js').then(({ sendChefNewBookingEmail }) => {
        sendChefNewBookingEmail({
          chefEmail: chef.email,
          chefName: chef.name || 'Chef',
          guestName: diner?.name || 'Guest',
          eventDate: body.eventDate,
          serviceName: service.name,
          guestCount: body.guestCount,
          totalPrice,
          bookingId: created.id,
        }).catch(err => console.warn('[ChefNewBooking] Failed to send email:', err));
      }).catch(err => console.warn('[ChefNewBooking] Could not load email service:', err));
    }


    return reply.status(201).send(created);
  });

  // List bookings
  server.get('/', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role === 'chef') {
      return db.select({
        id: bookings.id,
        serviceId: bookings.serviceId,
        eventDate: bookings.eventDate,
        guestCount: bookings.guestCount,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        serviceName: services.name,
        dinerName: users.name,
        dinerEmail: users.email,
        dinerPhone: users.phone,
      })
        .from(bookings)
        .innerJoin(services, eq(bookings.serviceId, services.id))
        .innerJoin(users, eq(bookings.dinerId, users.id))
        .where(eq(bookings.chefId, userId))
        .all();
    } else {
      // MAI-1519: Include updatedAt and chefNote (via lead) for diner booking cards
      // MAI-1969: Also return guest bookings where guestEmail matches the diner's email
      const diner = db.select({ email: users.email }).from(users).where(eq(users.id, userId)).get();

      return db.select({
        id: bookings.id,
        serviceId: bookings.serviceId,
        eventDate: bookings.eventDate,
        guestCount: bookings.guestCount,
        totalPrice: bookings.totalPrice,
        status: bookings.status,
        notes: bookings.notes,
        createdAt: bookings.createdAt,
        updatedAt: bookings.updatedAt,
        serviceName: services.name,
        chefName: users.name,
        chefNote: leads.chefNote,
        guestEmail: bookings.guestEmail,
      })
        .from(bookings)
        .innerJoin(services, eq(bookings.serviceId, services.id))
        .innerJoin(users, eq(bookings.chefId, users.id))
        .leftJoin(leads, eq(bookings.id, leads.bookingId))
        .where(
          or(
            eq(bookings.dinerId, userId),
            and(
              isNull(bookings.dinerId),
              diner ? eq(bookings.guestEmail, diner.email) : undefined
            )
          )
        )
        .all();
    }
  });

  // Get booking by id
  server.get('/:id', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { userId, role } = request.user as { userId: number; role: string };
    const booking = db.select({
      id: bookings.id,
      serviceId: bookings.serviceId,
      eventDate: bookings.eventDate,
      guestCount: bookings.guestCount,
      totalPrice: bookings.totalPrice,
      status: bookings.status,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
      dinerId: bookings.dinerId,
      chefId: bookings.chefId,
      serviceName: services.name,
      chefName: users.name,
      dinerName: users.name,
    })
      .from(bookings)
      .innerJoin(services, eq(bookings.serviceId, services.id))
      .innerJoin(users, eq(bookings.chefId, users.id))
      .where(eq(bookings.id, parseInt(id)))
      .get();

    if (!booking) {
      return reply.status(404).send({ error: 'Booking not found' });
    }
    if (role === 'diner' && booking.dinerId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }
    if (role === 'chef' && booking.chefId !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }
    const { dinerId, chefId, ...rest } = booking;
    return rest;
  });

  // Update booking status (chef only)
  server.patch('/:id/status', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can update booking status' });
    }
    const booking = db.select().from(bookings).where(eq(bookings.id, parseInt(id))).get();
    if (!booking || booking.chefId !== userId) {
      return reply.status(404).send({ error: 'Booking not found' });
    }
    const body = updateStatusSchema.parse(request.body);
    const previousStatus = booking.status;

    // Idempotency: no-op if already in the target status
    if (previousStatus === body.status) {
      return reply.status(200).send({
        success: true,
        already: true,
        status: previousStatus,
        message: `Booking is already '${body.status}'.`,
        bookingId: booking.id,
      });
    }

    // MAI-1499 fix: Accept now means confirmed (pending -> confirmed)
    if (body.status === 'confirmed' && (previousStatus === 'confirmed')) {
      return reply.status(200).send({
        success: true,
        already: true,
        status: previousStatus,
        message: 'Booking is already confirmed.',
        bookingId: booking.id,
      });
    }

    // Allow re-activating a declined/rejected booking
    // MAI-1499 fix: Allow pending -> confirmed directly (chef Accept = Confirm)
    const allowedTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'declined'],
      confirmed: ['completed'],
      declined: ['confirmed'],
      rejected: ['confirmed'],
    };
    const allowed = allowedTransitions[previousStatus] || [];
    if (!allowed.includes(body.status)) {
      return reply.status(400).send({
        error: 'Invalid status transition',
        message: `Cannot transition from '${previousStatus}' to '${body.status}'.`,
        currentStatus: previousStatus,
        bookingId: booking.id,
      });
    }

    db.update(bookings).set({ status: body.status }).where(eq(bookings.id, parseInt(id))).run();

    // MAI-1212: Create notifications on status changes
    if (booking.dinerId && previousStatus !== body.status) {
      const service = db.select().from(services).where(eq(services.id, booking.serviceId)).get();
      const chefName = service ? db.select().from(users).where(eq(users.id, service.chefId)).get()?.name || 'Chef' : 'Chef';

      const declineNote = body.declineReason ? ` Reason: ${body.declineReason}` : '';


      if (body.status === 'accepted' || body.status === 'confirmed') {
        void createNotification({
          userId: booking.dinerId,
          type: 'booking_confirmed',
          title: 'Booking Confirmed! 🎉',
          body: `Great news! ${chefName} has accepted your booking.${declineNote}`,
        });
      } else if (body.status === 'declined' || body.status === 'rejected') {
        void createNotification({
          userId: booking.dinerId,
          type: 'booking_declined',
          title: 'Booking Declined',
          body: `Unfortunately, ${chefName} cannot host your booking.${declineNote}`,
        });
      } else if (body.status === 'completed') {
        void createNotification({
          userId: booking.dinerId,
          type: 'booking_completed',
          title: 'Booking Completed ✅',
          body: `Your experience with ${chefName} is complete. Share your review!`,
        });
        void createNotification({
          userId: booking.dinerId,
          type: 'review_request',
          title: 'How was your experience? 🌟',
          body: `Tell others about your meal with ${chefName}. Your review helps the community!`,
        });
      }
    }

    const updated = db.select().from(bookings).where(eq(bookings.id, parseInt(id))).get();

    // Send email to diner on status changes (fire-and-forget)
    if (updated && previousStatus !== body.status) {
      const service = db.select().from(services).where(eq(services.id, booking.serviceId)).get();
      const chef = db.select().from(users).where(eq(users.id, booking.chefId)).get();
      const diner = db.select().from(users).where(eq(users.id, booking.dinerId)).get();

      const emailParams = {
        bookingId: updated.id,
        chefName: chef?.name || 'Chef',
        serviceName: service?.name || 'your chef',
        eventDate: updated.eventDate,
        guestCount: updated.guestCount,
        totalPrice: updated.totalPrice,
      };

      if (body.status === 'accepted' || body.status === 'confirmed') {
        // Send booking accepted email to diner
        if (diner?.email) {
          sendBookingAcceptedEmail({
            ...emailParams,
            dinerEmail: diner.email,
            dinerName: diner.name || 'Guest',
          }).catch(err => console.warn('[BookingAccepted] Failed to send email:', err));
        }
      } else if (body.status === 'declined' || body.status === 'rejected') {
        // Send booking declined email to diner
        if (diner?.email) {
          sendBookingDeclinedEmail({
            ...emailParams,
            dinerEmail: diner.email,
            dinerName: diner.name || 'Guest',
            declineReason: body.declineReason,
          }).catch(err => console.warn('[BookingDeclined] Failed to send email:', err));
        }
      }
    }

    return reply.send({
      success: true,
      booking: updated,
      previousStatus,
      currentStatus: body.status,
    });
  });

  // ============================================
  // POST /api/bookings/:id/payment-intent
  // MAI-2458: Create Stripe PaymentIntent for booking quote amount
  // ============================================
  server.post<{ Params: { id: string }; Body: { clientSecret?: string } }>(
    '/:id/payment-intent',
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const { userId, role } = request.user as { userId: number; role: string };
      const bookingId = parseInt(id);

      if (isNaN(bookingId)) {
        return reply.status(400).send({ error: 'Invalid booking ID' });
      }

      // Fetch booking with service and chef info
      const booking = db
        .select({
          id: bookings.id,
          dinerId: bookings.dinerId,
          chefId: bookings.chefId,
          quoteAmount: bookings.quoteAmount,
          quoteStatus: bookings.quoteStatus,
          paymentExternalId: bookings.paymentExternalId,
          eventDate: bookings.eventDate,
          guestCount: bookings.guestCount,
          serviceName: services.name,
          chefName: users.name,
          guestEmail: bookings.guestEmail,
        })
        .from(bookings)
        .innerJoin(services, eq(bookings.serviceId, services.id))
        .innerJoin(users, eq(bookings.chefId, users.id))
        .where(eq(bookings.id, bookingId))
        .get();

      if (!booking) {
        return reply.status(404).send({ error: 'Booking not found' });
      }

      // Verify diner owns the booking (or guest email matches)
      if (role === 'diner' && booking.dinerId !== userId) {
        // Allow guest access via guestEmail
        if (booking.guestEmail) {
          const diner = db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, userId)).get();
          if (!diner || diner.email !== booking.guestEmail) {
            return reply.status(403).send({ error: 'Access denied' });
          }
        } else {
          return reply.status(403).send({ error: 'Access denied' });
        }
      }

      // Require quoteStatus === 'pending' or 'accepted' (not yet paid)
      if (!['pending', 'accepted'].includes(booking.quoteStatus)) {
        return reply.status(400).send({
          error: 'Payment not available',
          quoteStatus: booking.quoteStatus,
        });
      }

      // Require quote_amount > 0
      if (!booking.quoteAmount || booking.quoteAmount <= 0) {
        return reply.status(400).send({
          error: 'Invalid quote amount',
          message: 'Quote amount is not set or is zero',
        });
      }

      // MAI-2458: Idempotent — if PaymentIntent already exists and not succeeded, return it
      if (booking.paymentExternalId) {
        try {
          const stripe = getStripeClient();
          const existingIntent = await stripe.paymentIntents.retrieve(booking.paymentExternalId);
          if (existingIntent.status !== 'succeeded') {
            return { clientSecret: existingIntent.client_secret };
          }
          // PaymentIntent succeeded but booking wasn't updated — return error
          return reply.status(400).send({
            error: 'Payment already completed',
            quoteStatus: 'paid',
          });
        } catch (err: any) {
          // PaymentIntent not found in Stripe or error — clear and recreate
          console.warn(`[PaymentIntent] Existing paymentExternalId ${booking.paymentExternalId} invalid: ${err.message}`);
        }
      }

      // Create new Stripe PaymentIntent
      const stripe = getStripeClient();
      const amountCents = Math.round(booking.quoteAmount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: 'eur',
        metadata: {
          bookingId: booking.id.toString(),
          chefId: booking.chefId.toString(),
          serviceName: booking.serviceName || '',
          eventDate: booking.eventDate || '',
        },
      });

      // Store PaymentIntent ID on booking
      db.update(bookings)
        .set({
          paymentExternalId: paymentIntent.id,
          quoteStatus: 'accepted',
          updatedAt: new Date(),
        })
        .where(eq(bookings.id, bookingId))
        .run();

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: amountCents,
        currency: 'eur',
      };
    }
  );

  // ============================================
  // GET /api/bookings/:id/payment-status
  // MAI-2458: Return payment status from Stripe PaymentIntent
  // ============================================
  server.get<{ Params: { id: string } }>(
    '/:id/payment-status',
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const { userId, role } = request.user as { userId: number; role: string };
      const bookingId = parseInt(id);

      if (isNaN(bookingId)) {
        return reply.status(400).send({ error: 'Invalid booking ID' });
      }

      const booking = db.select({
        id: bookings.id,
        dinerId: bookings.dinerId,
        quoteAmount: bookings.quoteAmount,
        quoteStatus: bookings.quoteStatus,
        paymentExternalId: bookings.paymentExternalId,
        guestEmail: bookings.guestEmail,
      }).from(bookings).where(eq(bookings.id, bookingId)).get();

      if (!booking) {
        return reply.status(404).send({ error: 'Booking not found' });
      }

      // Verify access
      if (role === 'diner' && booking.dinerId !== userId) {
        if (booking.guestEmail) {
          const diner = db.select({ email: users.email }).from(users).where(eq(users.id, userId)).get();
          if (!diner || diner.email !== booking.guestEmail) {
            return reply.status(403).send({ error: 'Access denied' });
          }
        } else {
          return reply.status(403).send({ error: 'Access denied' });
        }
      }

      // If no PaymentIntent yet, return local quoteStatus
      if (!booking.paymentExternalId) {
        return { status: booking.quoteStatus };
      }

      // Fetch live status from Stripe
      try {
        const stripe = getStripeClient();
        const intent = await stripe.paymentIntents.retrieve(booking.paymentExternalId);
        return {
          status: intent.status, // 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'succeeded' | 'canceled'
          amount: intent.amount,
          currency: intent.currency,
          quoteStatus: booking.quoteStatus,
        };
      } catch (err: any) {
        console.error(`[PaymentStatus] Failed to retrieve PaymentIntent ${booking.paymentExternalId}: ${err.message}`);
        return reply.status(500).send({ error: 'Failed to retrieve payment status' });
      }
    }
  );

  // ============================================
  // PATCH /api/bookings/:id/cancel
  // MAI-2458: Cancel booking — handle refund if eligible (>48h before event)
  // ============================================
  server.patch<{ Params: { id: string }; Body: { reason?: string } }>(
    '/:id/cancel',
    { preHandler: [server.authenticate] },
    async (request, reply) => {
      const { id } = request.params;
      const { userId, role } = request.user as { userId: number; role: string };
      const { reason } = request.body || {};
      const bookingId = parseInt(id);

      if (isNaN(bookingId)) {
        return reply.status(400).send({ error: 'Invalid booking ID' });
      }

      const booking = db.select({
        id: bookings.id,
        serviceId: bookings.serviceId,
        dinerId: bookings.dinerId,
        chefId: bookings.chefId,
        quoteAmount: bookings.quoteAmount,
        quoteStatus: bookings.quoteStatus,
        paymentExternalId: bookings.paymentExternalId,
        eventDate: bookings.eventDate,
        status: bookings.status,
        guestEmail: bookings.guestEmail,
      }).from(bookings).where(eq(bookings.id, bookingId)).get();

      if (!booking) {
        return reply.status(404).send({ error: 'Booking not found' });
      }

      // Access: diner who owns the booking, chef who owns the booking, or admin
      if (role === 'diner' && booking.dinerId !== userId) {
        if (booking.guestEmail) {
          const diner = db.select({ email: users.email }).from(users).where(eq(users.id, userId)).get();
          if (!diner || diner.email !== booking.guestEmail) {
            return reply.status(403).send({ error: 'Access denied' });
          }
        } else {
          return reply.status(403).send({ error: 'Access denied' });
        }
      }

      // Only allow cancel if booking is not already cancelled
      if (booking.status === 'cancelled') {
        return reply.status(400).send({ error: 'Booking is already cancelled' });
      }

      // Handle refund if payment was made (quote_status = 'paid')
      let refundResult: { refunded: boolean; amount?: number; reason?: string } = { refunded: false };

      if (booking.paymentExternalId && booking.quoteStatus === 'paid') {
        // Check 48h refund eligibility
        const eventTime = new Date(booking.eventDate).getTime();
        const now = Date.now();
        const hoursUntilEvent = (eventTime - now) / (1000 * 60 * 60);

        if (hoursUntilEvent > 48) {
          // Eligible for refund — process via Stripe
          try {
            const stripe = getStripeClient();
            const refund = await stripe.refunds.create({
              payment_intent: booking.paymentExternalId,
            });

            // Record refund in booking_refunds table
            const amountCents = typeof refund.amount === 'number' ? refund.amount : 0;
            db.insert(bookingRefunds).values({
              bookingId,
              amount: amountCents,
              stripeRefundId: refund.id,
              reason: reason || null,
            }).run();

            refundResult = { refunded: true, amount: amountCents / 100, reason: 'Eligible refund — cancelled >48h before event' };

            // Update booking quote_status to refunded
            db.update(bookings)
              .set({ quoteStatus: 'refunded', updatedAt: new Date() })
              .where(eq(bookings.id, bookingId))
              .run();
          } catch (err: any) {
            console.error(`[CancelBooking] Refund failed for booking ${bookingId}: ${err.message}`);
            return reply.status(500).send({
              error: 'Refund failed',
              message: err.message,
              hoursUntilEvent,
            });
          }
        } else {
          // Not eligible for refund (<48h)
          refundResult = { refunded: false, reason: 'Not eligible — cancelled within 48h of event' };
        }
      }

      // Update booking status to cancelled
      db.update(bookings)
        .set({ status: 'cancelled', updatedAt: new Date() })
        .where(eq(bookings.id, bookingId))
        .run();

      // If diner owns this booking, notify chef
      if (booking.dinerId && role === 'diner') {
        const chef = db.select({ name: users.name }).from(users).where(eq(users.id, booking.chefId)).get();
        const service = db.select({ name: services.name }).from(services).where(eq(services.id, booking.serviceId)).get();
        void createNotification({
          userId: booking.chefId,
          type: 'booking_cancelled',
          title: 'Booking Cancelled',
          body: `A booking for ${service?.name || 'your service'} has been cancelled by the diner.`,
          metadata: { bookingId, reason: reason || null },
        });
      }

      return {
        success: true,
        bookingId,
        status: 'cancelled',
        refund: refundResult,
      };
    }
  );
}
