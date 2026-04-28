import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import { config } from './config/index.js';
import { migrate } from './db/migrate.js';
import { UserPayload } from './types.js';

import authRoutes from './api/auth.js';
import chefRoutes from './api/chefs.js';
import serviceRoutes from './api/services.js';
import bookingRoutes from './api/bookings.js';
import onboardingWizardRoutes from './api/onboarding-wizard.js';
import dinerPreferencesRoutes from './api/diner-preferences.js';
import searchRoutes from './api/search.js';
import inquiryRoutes from './api/inquiry.js';
import pageRoutes from './routes/pages.js';
import buildBookingPage from './routes/booking-page.js';
import dinerBookingsPage from './routes/diner-bookings-page.js';

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
server.register(onboardingWizardRoutes, { prefix: '/api/onboarding' });
server.register(dinerPreferencesRoutes, { prefix: '/api/v1/diner' });
server.register(searchRoutes, { prefix: '/api/v1/search' });
server.register(inquiryRoutes, { prefix: '/api/inquiry' });

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

// Health check
server.get('/health', async () => ({ status: 'ok' }));

// Start
const start = async () => {
  await migrate();
  await server.listen({ port: config.port, host: '0.0.0.0' });
};

start();