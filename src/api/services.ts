import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { services, users, chefProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  pricePerPerson: z.number().min(0),
  minGuests: z.number().min(1).optional().default(1),
  maxGuests: z.number().min(1).optional().default(10),
});

const updateServiceSchema = createServiceSchema.partial();

export default async function serviceRoutes(server: FastifyInstance) {
  // Get services by chef (public)
  server.get('/chef/:chefId', async (request, reply) => {
    const { chefId } = z.object({ chefId: z.string() }).parse(request.params);
    const chefServices = db.select().from(services).where(eq(services.chefId, parseInt(chefId))).all();
    return chefServices;
  });

  // Get service by id (public)
  server.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const service = db.select({
      id: services.id,
      chefId: services.chefId,
      name: services.name,
      description: services.description,
      pricePerPerson: services.pricePerPerson,
      minGuests: services.minGuests,
      maxGuests: services.maxGuests,
      chefName: users.name,
      chefLocation: chefProfiles.location,
    })
      .from(services)
      .innerJoin(users, eq(services.chefId, users.id))
      .leftJoin(chefProfiles, eq(services.chefId, chefProfiles.userId))
      .where(eq(services.id, parseInt(id)))
      .get();

    if (!service) {
      return reply.status(404).send({ error: 'Service not found' });
    }
    return service;
  });

  // Create service (chef only)
  server.post('/', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can create services' });
    }
    const body = createServiceSchema.parse(request.body);
    const created = db.insert(services).values({
      chefId: userId,
      name: body.name,
      description: body.description,
      pricePerPerson: body.pricePerPerson,
      minGuests: body.minGuests,
      maxGuests: body.maxGuests,
    }).returning().all()[0];
    return reply.status(201).send(created);
  });

  // Update service (chef only)
  server.patch('/:id', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can update services' });
    }
    const service = db.select().from(services).where(eq(services.id, parseInt(id))).get();
    if (!service || service.chefId !== userId) {
      return reply.status(404).send({ error: 'Service not found' });
    }
    const body = updateServiceSchema.parse(request.body);
    db.update(services).set(body).where(eq(services.id, parseInt(id))).run();
    const updated = db.select().from(services).where(eq(services.id, parseInt(id))).get();
    return updated;
  });

  // Delete service (chef only)
  server.delete('/:id', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can delete services' });
    }
    const service = db.select().from(services).where(eq(services.id, parseInt(id))).get();
    if (!service || service.chefId !== userId) {
      return reply.status(404).send({ error: 'Service not found' });
    }
    db.delete(services).where(eq(services.id, parseInt(id))).run();
    return reply.status(204).send();
  });
}
