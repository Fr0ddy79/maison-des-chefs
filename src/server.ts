import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { config } from './config/index.js';
import { migrate } from './db/migrate.js';
import { UserPayload } from './types.js';

import authRoutes from './api/auth.js';
import chefRoutes from './api/chefs.js';
import serviceRoutes from './api/services.js';
import bookingRoutes from './api/bookings.js';
import onboardingWizardRoutes from './api/onboarding-wizard.js';
import dinerPreferencesRoutes from './api/diner-preferences.js';

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

// Health check
server.get('/health', async () => ({ status: 'ok' }));

// Start
const start = async () => {
  await migrate();
  await server.listen({ port: config.port, host: '0.0.0.0' });
};

start();