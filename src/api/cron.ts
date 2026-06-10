import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { processQuoteExpiry } from '../services/quote-expiry.js';

/**
 * POST /api/cron/quote-expiration
 * Triggers the quote expiration process: finds expired quotes, marks them as expired,
 * and sends follow-up emails to both chefs and diners.
 */
async function quoteExpirationRoute(
  this: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    console.log('[CronAPI] Received quote expiration trigger');
    await processQuoteExpiry();
    reply.send({ success: true, message: 'Quote expiration processed' });
  } catch (err) {
    console.error('[CronAPI] Error processing quote expiration:', err);
    reply.status(500).send({ success: false, error: 'Internal server error' });
  }
}

export default async function cronRoutes(server: FastifyInstance): Promise<void> {
  server.post('/api/cron/quote-expiration', quoteExpirationRoute);
}
