import 'dotenv/config';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Extend FastifyInstance to include authenticate decorator
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

// User payload type (decoupled from FastifyRequest to avoid conflicts with @fastify/jwt)
export interface UserPayload {
  userId: number;
  email: string;
  role?: string;
  type?: string;
}