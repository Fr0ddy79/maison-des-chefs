import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { bookings, services, users, leads } from '../db/schema.js';
import { eq, and, or, isNull } from 'drizzle-orm';
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
      sendBookingConfirmationEmail({
        bookingId: created.id,
        dinerName: diner.name || 'Guest',
        dinerEmail: diner.email,
        chefName: service.chefId ? db.select().from(users).where(eq(users.id, service.chefId)).get()?.name || 'your chef' : 'your chef',
        serviceName: service.name,
        eventDate: body.eventDate,
        guestCount: body.guestCount,
        totalPrice,
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
        createNotification({
          userId: booking.dinerId,
          type: 'booking_confirmed',
          title: 'Booking Confirmed! 🎉',
          body: `Great news! ${chefName} has accepted your booking.${declineNote}`,
        });
      } else if (body.status === 'declined' || body.status === 'rejected') {
        createNotification({
          userId: booking.dinerId,
          type: 'booking_declined',
          title: 'Booking Declined',
          body: `Unfortunately, ${chefName} cannot host your booking.${declineNote}`,
        });
      } else if (body.status === 'completed') {
        createNotification({
          userId: booking.dinerId,
          type: 'booking_completed',
          title: 'Booking Completed ✅',
          body: `Your experience with ${chefName} is complete. Share your review!`,
        });
        createNotification({
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
}
