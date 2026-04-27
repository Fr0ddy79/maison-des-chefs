import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { services, users, chefProfiles, DIETARY_TAGS, DietaryTag, dinerPreferences } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Schemas
const searchQuerySchema = z.object({
  preferences: z.string().optional(), // serialized JSON of diner preferences
  cuisines: z.string().optional(), // comma-separated (backwards compat)
  dietary: z.string().optional(), // comma-separated (backwards compat)
  partySize: z.coerce.number().int().min(1).max(8).optional(),
  delivery: z.enum(['true', 'false']).optional(),
});

export default async function searchRoutes(server: FastifyInstance) {

  // GET /api/v1/search — search services/chefs with optional preferences pre-fill
  server.get('/', async (request, reply) => {
    const query = searchQuerySchema.parse(request.query);

    // Parse preferences JSON if provided
    let cuisinesFilter: string[] | null = null;
    let dietaryFilter: string[] | null = null;
    let partySize: number | null = null;
    let deliveryMode: boolean | null = null;

    if (query.preferences) {
      try {
        const prefs = JSON.parse(query.preferences);
        cuisinesFilter = Array.isArray(prefs.cuisines) ? prefs.cuisines.map((c: string) => c.toLowerCase()) : null;
        dietaryFilter = Array.isArray(prefs.dietaryRestrictions)
          ? prefs.dietaryRestrictions.map((d: string) => d.toLowerCase())
          : null;
        partySize = typeof prefs.defaultPartySize === 'number' ? prefs.defaultPartySize : null;
        deliveryMode = typeof prefs.defaultDelivery === 'boolean' ? prefs.defaultDelivery : null;
      } catch {
        return reply.status(400).send({ error: 'Invalid preferences JSON' });
      }
    }

    // Backwards-compatible query params override preferences
    if (query.cuisines) {
      cuisinesFilter = query.cuisines.split(',').map(c => c.trim().toLowerCase());
    }
    if (query.dietary) {
      dietaryFilter = query.dietary.split(',').map(d => d.trim().toLowerCase());
    }

    // Fetch all published services with chef info
    let allServices = db.select({
      id: services.id,
      chefId: services.chefId,
      name: services.name,
      description: services.description,
      pricePerPerson: services.pricePerPerson,
      minGuests: services.minGuests,
      maxGuests: services.maxGuests,
      dietaryTags: services.dietaryTags,
      category: services.category,
      chefName: users.name,
      chefLocation: chefProfiles.location,
      chefCuisineTypes: chefProfiles.cuisineTypes,
    })
      .from(services)
      .innerJoin(users, eq(services.chefId, users.id))
      .leftJoin(chefProfiles, eq(services.chefId, chefProfiles.userId))
      .where(eq(services.status, 'published'))
      .all();

    // Filter by cuisine preference
    if (cuisinesFilter && cuisinesFilter.length > 0) {
      allServices = allServices.filter(svc => {
        const chefCuisines: string[] = JSON.parse(svc.chefCuisineTypes as string || '[]');
        return cuisinesFilter!.some(pref => chefCuisines.map(x => x.toLowerCase()).includes(pref));
      });
    }

    // Filter by dietary tags
    if (dietaryFilter && dietaryFilter.length > 0 && !dietaryFilter.includes('none')) {
      allServices = allServices.filter(svc => {
        const svcDietary: string[] = JSON.parse(svc.dietaryTags || '[]');
        return dietaryFilter!.every(d => svcDietary.map(x => x.toLowerCase()).includes(d));
      });
    }

    // Filter by party size (guest count must fit within service min/max)
    if (partySize != null) {
      allServices = allServices.filter(svc => {
        return svc.minGuests <= partySize! && partySize! <= svc.maxGuests;
      });
    }

    return allServices.map(svc => ({
      id: svc.id,
      chefId: svc.chefId,
      name: svc.name,
      description: svc.description,
      pricePerPerson: svc.pricePerPerson,
      minGuests: svc.minGuests,
      maxGuests: svc.maxGuests,
      dietaryTags: JSON.parse(svc.dietaryTags || '[]'),
      category: svc.category,
      chefName: svc.chefName,
      chefLocation: svc.chefLocation,
      chefCuisineTypes: JSON.parse(svc.chefCuisineTypes as string || '[]'),
    }));
  });
}
