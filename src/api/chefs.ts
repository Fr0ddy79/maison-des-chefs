import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users, chefProfiles, services, leads, reviews } from '../db/schema.js';
import { eq, and, gte, sql } from 'drizzle-orm';

const profileSchema = z.object({
  bio: z.string().optional(),
  cuisineTypes: z.array(z.string()).optional(),
  location: z.string().optional(),
  pricePerPerson: z.number().min(0).optional(),
  available: z.boolean().optional(),
  signatureDishes: z.array(z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500),
  })).max(3).optional(),
});

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

function calculate_response_time_tier(chefId: number): ResponseTimeTier {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get leads from last 30 days with responded_at (via firstResponseAt)
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
      photoUrl: chefProfiles.photoUrl,
      signatureDishes: chefProfiles.signatureDishes,
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
      signatureDishes: JSON.parse(c.signatureDishes as string || '[]'),
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
      photoUrl: chefProfiles.photoUrl,
      signatureDishes: chefProfiles.signatureDishes,
    })
      .from(chefProfiles)
      .innerJoin(users, eq(chefProfiles.userId, users.id))
      .where(eq(users.id, parseInt(id)))
      .get();

    if (!chef) {
      return reply.status(404).send({ error: 'Chef not found' });
    }
    const responseTimeTier = calculate_response_time_tier(chef.id);

    // Get review stats for this chef
    const reviewStats = db.select({
      count: sql<number>`count(*)`,
      avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
    })
      .from(reviews)
      .where(eq(reviews.chefId, chef.id))
      .get();

    return {
      ...chef,
      cuisineTypes: JSON.parse(chef.cuisineTypes as string || '[]'),
      signatureDishes: JSON.parse(chef.signatureDishes as string || '[]'),
      avgResponseMinutes: responseTimeTier.avgResponseMinutes,
      response_time_tier: responseTimeTier,
      avgRating: reviewStats ? Math.round((reviewStats.avgRating as number) * 10) / 10 : 0,
      reviewCount: reviewStats?.count ?? 0,
    };
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
        signatureDishes: body.signatureDishes ? JSON.stringify(body.signatureDishes) : existing.signatureDishes,
      }).where(eq(chefProfiles.userId, userId)).run();
      const updated = db.select().from(chefProfiles).where(eq(chefProfiles.userId, userId)).get();
      // Also fetch the user's name
      const user = db.select({ name: users.name }).from(users).where(eq(users.id, userId)).get();
      return { 
        ...updated, 
        name: user?.name || '',
        cuisineTypes: JSON.parse((updated?.cuisineTypes as string) || '[]'),
        signatureDishes: JSON.parse((updated?.signatureDishes as string) || '[]'),
      };
    } else {
      const created = db.insert(chefProfiles).values({
        userId,
        bio: body.bio ?? '',
        cuisineTypes: body.cuisineTypes ? JSON.stringify(body.cuisineTypes) : '[]',
        location: body.location ?? '',
        pricePerPerson: body.pricePerPerson ?? 0,
        available: body.available ?? true,
        signatureDishes: body.signatureDishes ? JSON.stringify(body.signatureDishes) : '[]',
      }).returning().all()[0];
      // Also fetch the user's name
      const user = db.select({ name: users.name }).from(users).where(eq(users.id, userId)).get();
      return { 
        ...created, 
        name: user?.name || '',
        cuisineTypes: JSON.parse((created?.cuisineTypes as string) || '[]'),
        signatureDishes: JSON.parse((created?.signatureDishes as string) || '[]'),
      };
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
    // Also fetch the user's name
    const user = db.select({ name: users.name }).from(users).where(eq(users.id, userId)).get();
    return { 
      ...profile, 
      name: user?.name || '',
      cuisineTypes: JSON.parse(profile.cuisineTypes as string || '[]'),
      signatureDishes: JSON.parse(profile.signatureDishes as string || '[]'),
    };
  });
}
