import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { services, users, chefProfiles, leads, DIETARY_TAGS, DietaryTag } from '../db/schema.js';
import { eq, and, gte } from 'drizzle-orm';

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
  photos: z.array(z.string().url()).max(6).optional(),
  isPublished: z.boolean().optional(), // MAI-1211: visibility toggle
});

// Validate dietary tags array (returns error if any tag is invalid)
function validateDietaryTags(tags: string[]): { valid: boolean; invalidTags?: string[] } {
  const invalidTags = tags.filter((tag): boolean => !DIETARY_TAGS.includes(tag as DietaryTag));
  if (invalidTags.length > 0) {
    return { valid: false, invalidTags };
  }
  return { valid: true };
}

// Validate photos array (max 6 URLs, valid URL format)
function validatePhotos(photos: string[]): { valid: boolean; error?: string } {
  if (photos.length > 6) {
    return { valid: false, error: 'Maximum 6 photos allowed' };
  }
  const urlPattern = /^https?:\/\/.+/i;
  const invalidUrls = photos.filter(p => !urlPattern.test(p));
  if (invalidUrls.length > 0) {
    return { valid: false, error: 'All photos must be valid URLs starting with http:// or https://' };
  }
  return { valid: true };
}

// Helper to parse service with photos and add chef response time tier
function parseServicePhotos(service: any) {
  const responseTimeTier = getChefResponseTimeTier(service.chefId);
  return {
    ...service,
    photos: JSON.parse(service.photos || '[]'),
    dietaryTags: JSON.parse(service.dietaryTags || '[]'),
    avgResponseMinutes: responseTimeTier.avgResponseMinutes,
    response_time_tier: responseTimeTier,
  };
}

// Response time tier thresholds (in minutes)
const RESPONSE_TIME_TIERS = {
  FAST: { maxMinutes: 60, label: 'Responds in <1h', color: 'green' },
  MEDIUM: { maxMinutes: 240, label: 'Responds in <4h', color: 'yellow' },
  SLOW: { maxMinutes: 1440, label: 'Responds in <24h', color: 'orange' },
};
const MIN_LEADS_FOR_TIER = 3;

interface ResponseTimeTier {
  tier: 'fast' | 'medium' | 'slow' | 'new_chef';
  label: string;
  color: 'green' | 'yellow' | 'orange' | 'gray';
  avgResponseMinutes: number | null;
}

function getChefResponseTimeTier(chefId: number): ResponseTimeTier {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get leads from last 30 days with firstResponseAt set
  const recentLeads = db
    .select({
      createdAt: leads.createdAt,
      firstResponseAt: leads.firstResponseAt,
    })
    .from(leads)
    .where(
      and(
        eq(leads.chefId, chefId),
        gte(leads.createdAt, thirtyDaysAgo),
      )
    )
    .all();

  // Filter to leads with firstResponseAt set
  const respondedLeads = recentLeads.filter(l => l.firstResponseAt !== null);

  if (respondedLeads.length < MIN_LEADS_FOR_TIER) {
    return { tier: 'new_chef', label: 'New chef', color: 'gray', avgResponseMinutes: null };
  }

  // Calculate average response time in minutes
  let totalMinutes = 0;
  for (const lead of respondedLeads) {
    const created = new Date(lead.createdAt).getTime();
    const responded = new Date(lead.firstResponseAt!).getTime();
    totalMinutes += (responded - created) / (1000 * 60);
  }
  const avgMinutes = Math.round(totalMinutes / respondedLeads.length);

  if (avgMinutes <= RESPONSE_TIME_TIERS.FAST.maxMinutes) {
    return { tier: 'fast', label: 'Responds in <1h', color: 'green', avgResponseMinutes: avgMinutes };
  } else if (avgMinutes <= RESPONSE_TIME_TIERS.MEDIUM.maxMinutes) {
    return { tier: 'medium', label: 'Responds in <4h', color: 'yellow', avgResponseMinutes: avgMinutes };
  } else {
    return { tier: 'slow', label: 'Responds in <24h', color: 'orange', avgResponseMinutes: avgMinutes };
  }
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
      photos: services.photos,
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

    // Parse photos for each service
    return allServices.map(parseServicePhotos);
  });

  // Get services by chef (public)
  server.get('/chef/:chefId', async (request, reply) => {
    const { chefId } = z.object({ chefId: z.string() }).parse(request.params);
    const chefServices = db.select().from(services).where(eq(services.chefId, parseInt(chefId))).all();
    return chefServices.map(parseServicePhotos);
  });

  // MAI-1223: Get chef's own services (authenticated chef only)
  server.get('/chef/:chefId/mine', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { chefId } = z.object({ chefId: z.string() }).parse(request.params);
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'chef' || parseInt(chefId) !== userId) {
      return reply.status(403).send({ error: 'Access denied' });
    }
    const chefServices = db.select().from(services).where(eq(services.chefId, userId)).all();
    return chefServices.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      pricePerPerson: s.pricePerPerson,
      minGuests: s.minGuests,
      maxGuests: s.maxGuests,
      dietaryTags: JSON.parse(s.dietaryTags || '[]'),
      isPublished: s.isPublished,
    }));
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
      photos: services.photos,
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
    return parseServicePhotos(service);
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
      photos: JSON.stringify([]),
    }).returning().all()[0];
    return reply.status(201).send(parseServicePhotos(created));
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

    // Validate photos if provided
    if (body.photos !== undefined) {
      const validation = validatePhotos(body.photos);
      if (!validation.valid) {
        return reply.status(400).send({ error: validation.error });
      }
    }

    const updateData: any = { ...body };
    if (updateData.dietaryTags !== undefined) {
      updateData.dietaryTags = JSON.stringify(updateData.dietaryTags);
    }
    if (updateData.photos !== undefined) {
      updateData.photos = JSON.stringify(updateData.photos);
    }

    db.update(services).set(updateData).where(eq(services.id, parseInt(id))).run();
    const updated = db.select().from(services).where(eq(services.id, parseInt(id))).get();
    return parseServicePhotos(updated);
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