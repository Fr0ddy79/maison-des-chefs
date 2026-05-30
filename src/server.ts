import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import { join } from 'path';
import { config } from './config/index.js';
import { migrate } from './db/migrate.js';
import { UserPayload } from './types.js';
import { startQuoteReminderScheduler } from './services/quote-reminder.js';
import { startQuoteExpiryScheduler } from './services/quote-expiry.js';
import { startStaleLeadReEngagementScheduler } from './services/stale-quoted-lead-reengagement.js';
import { startLeadExpirationScheduler } from './services/lead-expiration.js';
import { startDinerStagnationAlertScheduler } from './services/diner-stagnation-alert.js';
import { startSlaCheckInScheduler } from './services/sla-check-in.js';
import { startReviewRequestScheduler } from './services/review-request-scheduler.js';
import { db } from './db/index.js';
import { users, chefProfiles, services, bookings, leads, dinerPreferences, reviews } from './db/schema.js';
import { eq, sql, and, isNotNull, desc } from 'drizzle-orm';

import authRoutes from './api/auth.js';
import chefRoutes from './api/chefs.js';
import chefAvailabilityRoutes from './api/chef-availability.js';
import serviceRoutes from './api/services.js';
import bookingRoutes from './api/bookings.js';
import bookingStatusRoutes from './api/booking-status.js';
import onboardingWizardRoutes from './api/onboarding-wizard.js';
import dinerPreferencesRoutes from './api/diner-preferences.js';
import dinerReferralRoutes from './api/diner-referral.js';
import searchRoutes from './api/search.js';
import inquiryRoutes from './api/inquiry.js';
import multiInquiryRoutes from './api/multi-inquiry.js';
import chefLeadsRoutes from './api/chef-leads.js';
import chefPhotoRoutes from './api/chef-photo.js';
import analyticsRoutes from './api/analytics.js';
import pageRoutes from './routes/pages.js';
import { buildHomePage } from './routes/pages.js';
import buildBookingPage from './routes/booking-page.js';
import dinerBookingsPage from './routes/diner-bookings-page.js';
import buildChefLeadsPage from './routes/chef-leads-page.js';
import buildChefDashboardPage from './routes/chef-dashboard-page.js';
import buildChefBookingsPage from './routes/chef-bookings-page.js';
import buildChefDiscoveryPage from './routes/chef-discovery-page.js';
import buildChefComparePage from './routes/chef-compare-page.js';
import bookingStatusPageRoutes from './routes/booking-status-page.js';
import referralTrackingRoutes from './routes/referral-tracking.js';
import checkoutRoutes from './routes/checkout.js';
import checkoutPageRoutes from './routes/checkout-page.js';
import checkoutApiRoutes from './api/checkout.js';
import webhookRoutes from './api/webhooks.js';
import bookingAddonRoutes from './api/booking-addons.js';
import reviewRoutes from './api/reviews.js';
import notificationRoutes from './api/notifications.js';
import outreachRoutes from './api/outreach.js';
import leadsRoutes from './api/leads.js';
import quoteRoutes from './api/quotes.js';
import buildChefProfilePage from './routes/chef-profile-page.js';
import buildChefOnboardingPage from './routes/chef-onboarding-page.js';
declare module './routes/chef-availability-settings-page.js' {
  export function buildChefAvailabilitySettingsPage(): string;
}
import { buildChefAvailabilitySettingsPage } from './routes/chef-availability-settings-page.js';
import { buildChefPublicProfilePage } from './routes/chef-public-profile-page.js';
import buildReviewPage from './routes/review-page.js';
import buildQuoteDisplayPage from './routes/quote-display-page.js';

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
await server.register(fastifyStatic, {
  root: join(process.cwd(), 'public'),
  prefix: '/',
});
// Multipart parser for file uploads
await server.register(import('@fastify/multipart'), {
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

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
server.register(chefRoutes, { prefix: '/api/chefs' });
server.register(chefAvailabilityRoutes, { prefix: '/api/chefs' }); // MAI-2135: /api/chefs/:id/availability/*
server.register(serviceRoutes, { prefix: '/api/services' });
server.register(bookingRoutes, { prefix: '/bookings' });
server.register(bookingStatusRoutes, { prefix: '/api/booking-status' }); // Public - no auth required
server.register(onboardingWizardRoutes, { prefix: '/api/onboarding' });
server.register(dinerPreferencesRoutes, { prefix: '/api/v1/diner' });
server.register(dinerReferralRoutes, { prefix: '/api/v1/diner' });
server.register(searchRoutes, { prefix: '/api/v1/search' });
server.register(inquiryRoutes, { prefix: '/api/inquiry' });
server.register(multiInquiryRoutes, { prefix: '/api/multi-inquiry' });
server.register(chefLeadsRoutes, { prefix: '/api/chef' });
server.register(chefPhotoRoutes, { prefix: '/api/chef' }); // MAI-921: Chef photo upload
server.register(analyticsRoutes, { prefix: '/api/analytics' }); // Public analytics events
server.register(bookingStatusPageRoutes); // Public booking status page
server.register(referralTrackingRoutes); // Public referral tracking
server.register(checkoutPageRoutes); // Public checkout success/cancel pages (must register before /:leadId)
server.register(checkoutRoutes); // Public checkout page
server.register(checkoutApiRoutes, { prefix: '/api/checkout' }); // Checkout API
server.register(webhookRoutes, { prefix: '/api/webhooks' }); // Stripe webhooks
server.register(bookingAddonRoutes, { prefix: '/api/booking' }); // MAI-875: Booking addons
server.register(reviewRoutes, { prefix: '/api' });
server.register(notificationRoutes, { prefix: '/api/notifications' });
server.register(outreachRoutes, { prefix: '/api/admin/outreach' });
server.register(leadsRoutes, { prefix: '/api/leads' });
server.register(quoteRoutes); // Public - no auth, handles /api/quotes/*

// Chef leads dashboard page (standalone route to avoid esbuild parsing issues with template literals)
server.get('/chef/leads', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildChefLeadsPage();
});

// Chef dashboard page (MAI-2062)
server.get('/chef/dashboard', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildChefDashboardPage();
});

// Chef bookings dashboard page (MAI-1159 Task 2)
server.get('/chef/bookings', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildChefBookingsPage();
});

// Chef profile page (MAI-921)
server.get('/chef/profile', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildChefProfilePage();
});

// Chef discovery page (MAI-849)
server.get('/chefs', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildChefDiscoveryPage();
});

// Chef public profile page (MAI-1150: Quick Share preview)
server.get('/chefs/:id', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  const { id } = request.params as { id: string };
  const chefId = parseInt(id);
  if (isNaN(chefId)) {
    return '<html><body><h1>Invalid Chef ID</h1><a href="/chefs">Back to Chefs</a></body></html>';
  }
  return buildChefPublicProfilePage(chefId);
});

// Chef availability settings (MAI-2135)
server.get('/chef/settings/availability', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildChefAvailabilitySettingsPage();
});

// Chef onboarding wizard (MAI-1159)
server.get('/chef/onboarding', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildChefOnboardingPage();
});

// Chef compare page (MAI-903/MAI-1124)
server.get('/compare', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  const baseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || '3000'}`;
  const url = new URL(request.url, baseUrl);
  const chefIds = url.searchParams.get('chefs') || '';
  return buildChefComparePage(chefIds);
});

// Diner bookings page (standalone route to avoid esbuild parsing issues with pages.ts template literals)
server.get('/diner/bookings', async (request, reply) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return dinerBookingsPage();
});

// Page routes - fixed route conflict by moving API to /api/services
await server.register(pageRoutes);

// Standalone booking page route with cookie-based pre-fill
server.get('/book/:serviceId', async (request, reply) => {
  const { serviceId } = request.params as { serviceId: string };
  const cookies = request.cookies as Record<string, string>;
  const dinerEmail = cookies?.diner_email || '';
  const dinerName = cookies?.diner_name || '';
  const dinerPhone = cookies?.diner_phone || '';
  // MAI-892: Read guests from URL query param
  const url = new URL(request.url, config.app.url);
  const prefillGuestsParam = url.searchParams.get('guests');
  const guestCount = prefillGuestsParam ? parseInt(prefillGuestsParam, 10) : undefined;
  // MAI-1778: Read referral code from URL (passed via /?ref=CODE from referral links)
  const referralCodeFromUrl = url.searchParams.get('ref') || undefined;
  // MAI-1867: Read CTA variant from URL (set by service detail page A/B test)
  const ctaFromUrl = url.searchParams.get('cta') || undefined;
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildBookingPage(parseInt(serviceId), dinerEmail, dinerName, dinerPhone, guestCount, referralCodeFromUrl, ctaFromUrl);
});

// Review submission page (MAI-1214)
server.get('/review/:bookingId', async (request, reply) => {
  const { bookingId } = request.params as { bookingId: string };
  const bookingIdNum = parseInt(bookingId);
  if (isNaN(bookingIdNum)) {
    return '<html><body><h1>Invalid Booking ID</h1><a href="/">Back to Homepage</a></body></html>';
  }
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildReviewPage(bookingIdNum);
});

// Quote display page (MAI-2000: FE Quote Display Page)
server.get('/quote/:leadId', async (request, reply) => {
  const { leadId } = request.params as { leadId: string };
  const url = new URL(request.url, config.app.url);
  const token = url.searchParams.get('token') || '';
  const leadIdNum = parseInt(leadId);
  if (isNaN(leadIdNum) || !token) {
    return '<html><body><h1>Invalid Link</h1><a href="/">Back to Homepage</a></body></html>';
  }
  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildQuoteDisplayPage(leadIdNum, token);
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

  const reviewAggregates = db.select({
    reviewCount: sql<number>`count(*)`,
    avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
  })
    .from(reviews)
    .get();
  const reviewCount = (reviewAggregates?.reviewCount as number | null) ?? 0;
  const avgRating = (reviewAggregates?.avgRating as number | null) ?? 0;

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
      photoUrl: chefProfiles.photoUrl,
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


  // MAI-1120: Pre-fill homepage search from diner preferences
  const cookies = request.cookies as Record<string, string>;
  const authToken = cookies?.auth_token;
  let homePrefs: { cuisines: string[]; dietaryRestrictions: string[]; defaultPartySize?: number } | null = null;
  if (authToken) {
    try {
      const decoded = await request.jwtVerify() as { userId: number; role: string };
      if (decoded.role === 'diner') {
        const prefs = db.select().from(dinerPreferences).where(eq(dinerPreferences.userId, decoded.userId)).get();
        if (prefs && prefs.wizardCompletionStatus === 'completed') {
          homePrefs = {
            cuisines: JSON.parse(prefs.cuisines),
            dietaryRestrictions: JSON.parse(prefs.dietaryRestrictions),
            defaultPartySize: prefs.defaultPartySize,
          };
        }
      }
    } catch { /* invalid token - ignore */ }
  }

  reply.header('Content-Type', 'text/html; charset=utf-8');
  return buildHomePage({
    chefCount: chefCount as number,
    serviceCount: serviceCount as number,
    bookingCount: bookingCount as number,
    reviewCount,
    avgRating,
  }, featuredServices, homePrefs);
});

// Health check
server.get('/health', async () => ({ status: 'ok' }));

// Start
const start = async () => {
  await migrate();
  startQuoteReminderScheduler();
  startQuoteExpiryScheduler();
  startStaleLeadReEngagementScheduler();
  startLeadExpirationScheduler();
  startDinerStagnationAlertScheduler();
  startSlaCheckInScheduler();
  startReviewRequestScheduler();
};

const PORT = parseInt(process.env.PORT || '3001', 10);

start().then(() => {
  server.listen({ port: PORT, host: '0.0.0.0' }, (err, addr) => {
    if (err) {
      console.error('Server failed to start:', err);
      process.exit(1);
    }
    console.log(`Server running at http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Startup error:', err);
  process.exit(1);
});