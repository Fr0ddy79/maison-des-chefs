import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { bookings, services, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const createBookingSchema = z.object({
  serviceId: z.number(),
  eventDate: z.string(),
  guestCount: z.number().min(1),
  notes: z.string().optional().default(''),
});

const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'rejected']),
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
    const created = db.insert(bookings).values({
      serviceId: body.serviceId,
      dinerId: userId,
      chefId: service.chefId,
      eventDate: body.eventDate,
      guestCount: body.guestCount,
      totalPrice,
      notes: body.notes,
    }).returning().all()[0];
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
      })
        .from(bookings)
        .innerJoin(services, eq(bookings.serviceId, services.id))
        .innerJoin(users, eq(bookings.dinerId, users.id))
        .where(eq(bookings.chefId, userId))
        .all();
    } else {
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
        chefName: users.name,
      })
        .from(bookings)
        .innerJoin(services, eq(bookings.serviceId, services.id))
        .innerJoin(users, eq(bookings.chefId, users.id))
        .where(eq(bookings.dinerId, userId))
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
    db.update(bookings).set({ status: body.status }).where(eq(bookings.id, parseInt(id))).run();
    return db.select().from(bookings).where(eq(bookings.id, parseInt(id))).get();
  });
}
