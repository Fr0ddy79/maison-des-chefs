import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db, schema } from '../db/index.js';
import { eq, desc } from 'drizzle-orm';

/**
 * GET /api/guest/info?email=xxx
 * Returns diner info from the most recent lead for the given email.
 * Used to pre-fill returning diners' contact info on the booking page.
 * No auth required (uses email as identifier via query param).
 */
export default async function guestInfoRoutes(server: FastifyInstance) {
  server.get('/api/guest/info', async (
    request: FastifyRequest<{ Querystring: { email?: string } }>,
    reply: FastifyReply
  ) => {
    const { email } = request.query;

    if (!email) {
      return reply.status(400).send({ error: 'Email query parameter is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return reply.status(400).send({ error: 'Invalid email format' });
    }

    try {
      // Find the most recent lead with matching email
      const lead = await db.select({
        email: schema.leads.email,
        clientName: schema.leads.clientName,
        phone: schema.leads.phone,
        eventDate: schema.leads.eventDate,
        guestCount: schema.leads.guestCount,
      })
        .from(schema.leads)
        .where(eq(schema.leads.email, email.toLowerCase()))
        .orderBy(desc(schema.leads.createdAt))
        .limit(1)
        .get();

      if (!lead) {
        return reply.status(404).send({ error: 'No prior guest found with this email' });
      }

      return reply.send({
        email: lead.email,
        name: lead.clientName || null,
        phone: lead.phone || null,
        lastEventDate: lead.eventDate || null,
        lastGuestCount: lead.guestCount || null,
      });
    } catch (err: any) {
      console.error('GET /api/guest/info error:', err);
      return reply.status(500).send({ error: 'Internal server error' });
    }
  });
}