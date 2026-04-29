import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { config } from './config/index.js';
import { migrate } from './db/migrate.js';
import { UserPayload } from './types.js';
import { startQuoteReminderScheduler } from './services/quote-reminder.js';
import { db } from './db/index.js';
import { users, chefProfiles, services, bookings, leads } from './db/schema.js';
import { eq, sql, and, isNotNull, desc } from 'drizzle-orm';

import authRoutes from './api/auth.js';
import chefRoutes from './api/chefs.js';
import serviceRoutes from './api/services.js';
import bookingRoutes from './api/bookings.js';
import bookingStatusRoutes from './api/booking-status.js';
import onboardingWizardRoutes from './api/onboarding-wizard.js';
import dinerPreferencesRoutes from './api/diner-preferences.js';
import searchRoutes from './api/search.js';
import inquiryRoutes from './api/inquiry.js';
import chefLeadsRoutes from './api/chef-leads.js';
import pageRoutes from './routes/pages.js';
import { buildHomePage } from './routes/pages.js';
import buildBookingPage from './routes/booking-page.js';
import dinerBookingsPage from './routes/diner-bookings-page.js';
import buildChefLeadsPage from './routes/chef-leads-page.js';
import bookingStatusPageRoutes from './routes/booking-status-page.js';

// Extend FastifyInstance to include authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// Extend @fastify/jwt's user type
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: UserPayload;
    user: UserPayload;
  }
}

const server = Fastify({ logger: true });

// Plugins
await server.register(cors, { origin: true });
await server.register(jwt, { secret: config.jwt.secret });
await server.register(cookie);

// Auth middleware
server.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    const decoded = await request.jwtVerify();
    // user is already typed correctly via FastifyJWT declaration above
  } catch {
    reply.status(401).send({ error: 'Unauthorized' });
  }
});

// Routes
server.register(authRoutes, { prefix: '/auth' });
server.register(chefRoutes, { prefix: '/chefs' });
server.register(serviceRoutes, { prefix: '/services' });
server.register(bookingRoutes, { prefix: '/bookings' });
server.register(bookingStatusRoutes, { prefix: '/api/booking-status' }); // Public - no auth required
server.register(onboardingWizardRoutes, { prefix: '/api/onboarding' });
server.register(dinerPreferencesRoutes, { prefix: '/api/v1/diner' });
server.register(searchRoutes, { prefix: '/api/v1/search' });
server.register(inquiryRoutes, { prefix: '/api/inquiry' });
server.register(chefLeadsRoutes, { prefix: '/api/chef' });
server.register(bookingStatusPageRoutes); // Public booking status page

// Chef leads dashboard page (standalone route to avoid esbuild parsing issues with template literals)
server.get('/chef/leads', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildChefLeadsPage();
});

// Diner bookings page (standalone route to avoid esbuild parsing issues with pages.ts template literals)
server.get('/diner/bookings', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return dinerBookingsPage();
});

// Page routes - removed due to route conflicts with API
// Only the standalone booking page route is used
// await server.register(pageRoutes);

// Standalone booking page route with cookie-based pre-fill
server.get('/book/:serviceId', async (request, reply) => {
  const { serviceId } = request.params as { serviceId: string };
  const cookies = request.cookies as Record<string, string>;
  const dinerEmail = cookies?.diner_email || '';
  const dinerName = cookies?.diner_name || '';
  const dinerPhone = cookies?.diner_phone || '';
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildBookingPage(parseInt(serviceId), dinerEmail, dinerName, dinerPhone);
});

// Homepage route
server.get('/', async (request, reply) => {
  // Fetch aggregate stats
  const chefCountResult = db.select({ count: sql `count(DISTINCT ${chefProfiles.userId})` })
    .from(chefProfiles)
    .where(eq(chefProfiles.available, true))
    .get();
  const chefCount = chefCountResult?.count ?? 0;

  const serviceCountResult = db.select({ count: sql `count(*)` })
    .from(services)
    .get();
  const serviceCount = serviceCountResult?.count ?? 0;

  const bookingCountResult = db.select({ count: sql `count(*)` })
    .from(bookings)
    .where(sql `${bookings.status} IN ('completed', 'confirmed')`)
    .get();
  const bookingCount = bookingCountResult?.count ?? 0;

  // Fetch featured services (top 3 by lead count)
  const leadCounts = db.select({ serviceId: leads.serviceId, count: sql `count(${leads.id})` })
    .from(leads)
    .groupBy(leads.serviceId)
    .all();
  const leadCountMap = new Map(leadCounts.map(l => [l.serviceId, l.count]));

  const topServiceIds = leadCounts
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 3)
    .map(l => l.serviceId);

  let featuredServices: any[] = [];
  if (topServiceIds.length > 0) {
    const serviceRows = db.select({
      id: services.id,
      name: services.name,
      description: services.description,
      pricePerPerson: services.pricePerPerson,
      minGuests: services.minGuests,
      maxGuests: services.maxGuests,
      chefId: services.chefId,
      chefName: users.name,
      location: chefProfiles.location,
      cuisineTypes: chefProfiles.cuisineTypes,
      verified: chefProfiles.verified,
    })
      .from(services)
      .innerJoin(users, eq(services.chefId, users.id))
      .leftJoin(chefProfiles, eq(services.chefId, chefProfiles.userId))
      .where(sql `${services.id} IN (${topServiceIds.join(',')})`)
      .all();

    featuredServices = serviceRows.map(s => ({
      ...s,
      cuisineTypes: JSON.parse(s.cuisineTypes || '[]'),
      leadCount: leadCountMap.get(s.id) || 0,
    }));
  }

  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildHomePage({ chefCount: chefCount as number, serviceCount: serviceCount as number, bookingCount: bookingCount as number }, featuredServices);
});

// Health check
server.get('/health', async () => ({ status: 'ok' }));

// Start
const start = async () => {
  await migrate();
  startQuoteReminderScheduler();
  await server.listen({ port: config.port, host: '0.0.0.0' });
};

start();