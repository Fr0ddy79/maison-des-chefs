import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { services, users, chefProfiles, DIETARY_TAGS, DietaryTag } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';

const createServiceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  pricePerPerson: z.number().min(0),
  minGuests: z.number().min(1).optional().default(1),
  maxGuests: z.number().min(1).optional().default(10),
  dietaryTags: z.array(z.enum(DIETARY_TAGS)).optional().default([]),
});

const updateServiceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  pricePerPerson: z.number().min(0).optional(),
  minGuests: z.number().min(1).optional(),
  maxGuests: z.number().min(1).optional(),
  dietaryTags: z.array(z.enum(DIETARY_TAGS)).optional(),
});

// Validate dietary tags array (returns error if any tag is invalid)
function validateDietaryTags(tags: string[]): { valid: boolean; invalidTags?: string[] } {
  const invalidTags = tags.filter((tag): boolean => !DIETARY_TAGS.includes(tag as DietaryTag));
  if (invalidTags.length > 0) {
    return { valid: false, invalidTags };
  }
  return { valid: true };
}

export default async function serviceRoutes(server: FastifyInstance) {
  // Get all services with optional dietary_tags filter (public)
  // Query param: dietary_tags=vegetarian,vegan (OR logic)
  server.get('/', async (request, reply) => {
    const queryResult = z.object({
      dietary_tags: z.string().optional(),
    }).safeParse(request.query);

    if (!queryResult.success) {
      return reply.status(400).send({ error: 'Invalid query parameters' });
    }

    const { dietary_tags } = queryResult.data;
    let allServices = db.select({
      id: services.id,
      chefId: services.chefId,
      name: services.name,
      description: services.description,
      pricePerPerson: services.pricePerPerson,
      minGuests: services.minGuests,
      maxGuests: services.maxGuests,
      dietaryTags: services.dietaryTags,
      chefName: users.name,
      chefLocation: chefProfiles.location,
    })
      .from(services)
      .innerJoin(users, eq(services.chefId, users.id))
      .leftJoin(chefProfiles, eq(services.chefId, chefProfiles.userId))
      .all();

    // Apply dietary filter if provided (OR logic - match ANY of the specified tags)
    if (dietary_tags) {
      const filterTags = dietary_tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      if (filterTags.length > 0) {
        // Validate filter tags
        const validation = validateDietaryTags(filterTags);
        if (!validation.valid) {
          return reply.status(400).send({
            error: 'Invalid dietary tag value',
            validTags: DIETARY_TAGS,
            invalidTags: validation.invalidTags,
          });
        }

        allServices = allServices.filter(service => {
          const serviceTags: string[] = JSON.parse(service.dietaryTags || '[]');
          return filterTags.some(filterTag => serviceTags.includes(filterTag));
        });
      }
    }

    return allServices;
  });

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
      dietaryTags: services.dietaryTags,
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

    // Validate dietary tags
    if (body.dietaryTags && body.dietaryTags.length > 0) {
      const validation = validateDietaryTags(body.dietaryTags);
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Invalid dietary tag value',
          validTags: DIETARY_TAGS,
          invalidTags: validation.invalidTags,
        });
      }
    }

    const created = db.insert(services).values({
      chefId: userId,
      name: body.name,
      description: body.description,
      pricePerPerson: body.pricePerPerson,
      minGuests: body.minGuests,
      maxGuests: body.maxGuests,
      dietaryTags: JSON.stringify(body.dietaryTags || []),
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

    // Validate dietary tags if provided
    if (body.dietaryTags !== undefined) {
      if (body.dietaryTags.length === 0) {
        // Empty array is valid (clears all tags)
        body.dietaryTags = [];
      } else {
        const validation = validateDietaryTags(body.dietaryTags);
        if (!validation.valid) {
          return reply.status(400).send({
            error: 'Invalid dietary tag value',
            validTags: DIETARY_TAGS,
            invalidTags: validation.invalidTags,
          });
        }
      }
    }

    const updateData: any = { ...body };
    if (updateData.dietaryTags !== undefined) {
      updateData.dietaryTags = JSON.stringify(updateData.dietaryTags);
    }

    db.update(services).set(updateData).where(eq(services.id, parseInt(id))).run();
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
