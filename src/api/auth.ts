import { FastifyInstance } from 'fastify';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  role: z.enum(['chef', 'diner']).default('diner'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

function createTokens(server: FastifyInstance, userId: number, email: string, role: string) {
  const accessToken = server.jwt.sign({ userId, email, role });
  const refreshToken = server.jwt.sign({ userId, email, role, type: 'refresh' });
  return { accessToken, refreshToken };
}

export default async function authRoutes(server: FastifyInstance) {
  // Register
  server.post('/register', async (request, reply) => {
    const body = registerSchema.parse(request.body);
    const existing = db.select().from(users).where(eq(users.email, body.email)).get();
    if (existing) {
      return reply.status(400).send({ error: 'Email already registered' });
    }
    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = db.insert(users).values({
      email: body.email,
      passwordHash,
      name: body.name,
      role: body.role,
    }).returning().get();
    if (!user) {
      return reply.status(500).send({ error: 'Failed to create user' });
    }
    const { accessToken, refreshToken } = createTokens(server, user.id, user.email, user.role);
    return reply.status(201).send({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  // Login
  server.post('/login', async (request, reply) => {
    const body = loginSchema.parse(request.body);
    const user = db.select().from(users).where(eq(users.email, body.email)).get();
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    const valid = await bcrypt.compare(body.password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }
    const { accessToken, refreshToken } = createTokens(server, user.id, user.email, user.role);
    return reply.send({ accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  // Get current user
  server.get('/me', { preHandler: [server.authenticate] }, async (request, reply) => {
    const { userId } = request.user as { userId: number };
    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      return reply.status(404).send({ error: 'User not found' });
    }
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  });

  // Refresh token
  server.post('/refresh', async (request, reply) => {
    const { token } = z.object({ token: z.string() }).parse(request.body);
    try {
      const decoded = server.jwt.verify(token) as { userId: number; email: string; role: string; type: string };
      if (decoded.type !== 'refresh') {
        throw new Error('Not a refresh token');
      }
      const { accessToken, refreshToken } = createTokens(server, decoded.userId, decoded.email, decoded.role);
      return { accessToken, refreshToken };
    } catch {
      return reply.status(401).send({ error: 'Invalid refresh token' });
    }
  });
}
