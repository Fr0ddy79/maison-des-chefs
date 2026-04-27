import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, chefProfiles, services } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const profileSchema = z.object({
  bio: z.string().optional(),
  cuisineTypes: z.array(z.string()).optional(),
  location: z.string().optional(),
  pricePerPerson: z.number().min(0).optional(),
  available: z.boolean().optional(),
});

// Query param schema for preferences pre-fill
const searchQuerySchema = z.object({
  cuisines: z.string().optional(), // comma-separated cuisine tags
  dietary: z.string().optional(), // comma-separated dietary tags
  partySize: z.coerce.number().int().min(1).max(8).optional(),
  delivery: z.enum(['true', 'false']).optional(),
});

export default async function chefRoutes(server: FastifyInstance) {
  // List all chefs / search with preferences pre-fill (public)
  server.get('/', async (request) => {
    const query = searchQuerySchema.parse(request.query);
    const cuisineFilter = query.cuisines ? query.cuisines.split(',').map(c => c.trim().toLowerCase()) : null;
    const dietaryFilter = query.dietary ? query.dietary.split(',').map(d => d.trim().toLowerCase()) : null;

    let chefs = db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      bio: chefProfiles.bio,
      cuisineTypes: chefProfiles.cuisineTypes,
      location: chefProfiles.location,
      pricePerPerson: chefProfiles.pricePerPerson,
      available: chefProfiles.available,
      verified: chefProfiles.verified,
    })
      .from(chefProfiles)
      .innerJoin(users, eq(chefProfiles.userId, users.id))
      .where(eq(chefProfiles.available, true))
      .all();

    // Apply cuisine preference filter: include chef if their cuisineTypes overlap with preference
    if (cuisineFilter && cuisineFilter.length > 0) {
      chefs = chefs.filter(c => {
        const chefCuisines: string[] = JSON.parse(c.cuisineTypes as string || '[]');
        return cuisineFilter.some(pref => chefCuisines.map(x => x.toLowerCase()).includes(pref));
      });
    }

    // If dietary filters provided, also filter by services that support those dietary needs
    if (dietaryFilter && dietaryFilter.length > 0 && !dietaryFilter.includes('none')) {
      const filteredChefIds = new Set<number>();
      for (const chef of chefs) {
        const chefServices = db.select().from(services)
          .where(eq(services.chefId, chef.id))
          .all()
          .filter(s => s.status === 'published');

        const hasMatchingService = chefServices.some(svc => {
          const svcDietary: string[] = JSON.parse(svc.dietaryTags || '[]');
          return dietaryFilter.every(d => svcDietary.map(x => x.toLowerCase()).includes(d));
        });
        if (hasMatchingService) filteredChefIds.add(chef.id);
      }
      chefs = chefs.filter(c => filteredChefIds.has(c.id));
    }

    return chefs.map(c => ({
      ...c,
      cuisineTypes: JSON.parse(c.cuisineTypes as string || '[]'),
    }));
  });

  // Get chef profile (public)
  server.get('/:id', async (request, reply) => {
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const chef = db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      bio: chefProfiles.bio,
      cuisineTypes: chefProfiles.cuisineTypes,
      location: chefProfiles.location,
      pricePerPerson: chefProfiles.pricePerPerson,
      available: chefProfiles.available,
      verified: chefProfiles.verified,
    })
      .from(chefProfiles)
      .innerJoin(users, eq(chefProfiles.userId, users.id))
      .where(eq(users.id, parseInt(id)))
      .get();

    if (!chef) {
      return reply.status(404).send({ error: 'Chef not found' });
    }
    return { ...chef, cuisineTypes: JSON.parse(chef.cuisineTypes as string || '[]') };
  });

  // Create/update chef profile (chef only)
  server.post('/profile', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs can create profiles' });
    }
    const body = profileSchema.parse(request.body);
    const existing = db.select().from(chefProfiles).where(eq(chefProfiles.userId, userId)).get();

    if (existing) {
      db.update(chefProfiles).set({
        bio: body.bio ?? existing.bio,
        cuisineTypes: body.cuisineTypes ? JSON.stringify(body.cuisineTypes) : existing.cuisineTypes,
        location: body.location ?? existing.location,
        pricePerPerson: body.pricePerPerson ?? existing.pricePerPerson,
        available: body.available ?? existing.available,
      }).where(eq(chefProfiles.userId, userId)).run();
      const updated = db.select().from(chefProfiles).where(eq(chefProfiles.userId, userId)).get();
      return { ...updated, cuisineTypes: JSON.parse((updated?.cuisineTypes as string) || '[]') };
    } else {
      const created = db.insert(chefProfiles).values({
        userId,
        bio: body.bio ?? '',
        cuisineTypes: body.cuisineTypes ? JSON.stringify(body.cuisineTypes) : '[]',
        location: body.location ?? '',
        pricePerPerson: body.pricePerPerson ?? 0,
        available: body.available ?? true,
      }).returning().all()[0];
      return created;
    }
  });

  // Get current chef's profile
  server.get('/me/profile', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId, role } = request.user as { userId: number; role: string };
    if (role !== 'chef') {
      return reply.status(403).send({ error: 'Only chefs have profiles' });
    }
    const profile = db.select().from(chefProfiles).where(eq(chefProfiles.userId, userId)).get();
    if (!profile) {
      return reply.status(404).send({ error: 'Profile not found' });
    }
    return { ...profile, cuisineTypes: JSON.parse(profile.cuisineTypes as string || '[]') };
  });
}
