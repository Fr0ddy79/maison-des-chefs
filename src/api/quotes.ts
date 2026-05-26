// Quote API Routes - Public token-authenticated quote endpoints
// MAI-2000: FE Quote Display Page - GET /api/quotes/:leadId and POST /api/quotes/:leadId/accept

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash, timingSafeEqual } from 'crypto';
import { db } from '../db/index.js';
import { leads, services, users, chefProfiles } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const QUOTE_EXPIRY_HOURS = 48;

// Constant-time string comparison to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return timingSafeEqual(bufA, bufB);
}

// Hash token with SHA-256
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export default async function quoteRoutes(server: FastifyInstance) {

  // ============================================
  // GET /api/quotes/:leadId?token=xxx - Public quote view endpoint
  // ============================================
  server.get('/api/quotes/:leadId', async (
    req: FastifyRequest<{
      Params: { leadId: string };
      Querystring: { token?: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { leadId } = req.params;
      const { token } = req.query;

      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return reply.status(400).send({ valid: false, error: 'invalid_token' });
      }

      const leadIdNum = parseInt(leadId);
      if (isNaN(leadIdNum)) {
        return reply.status(400).send({ valid: false, error: 'invalid_token' });
      }

      const lead = db.select({
        id: leads.id,
        status: leads.status,
        quoteAmount: leads.quoteAmount,
        quoteMessage: leads.quoteMessage,
        quoteSentAt: leads.quoteSentAt,
        quoteTokenHash: leads.quoteTokenHash,
        eventDate: leads.eventDate,
        guestCount: leads.guestCount,
        clientName: leads.clientName,
        email: leads.email,
        chefId: leads.chefId,
        serviceName: services.name,
      })
        .from(leads)
        .innerJoin(services, eq(leads.serviceId, services.id))
        .where(eq(leads.id, leadIdNum))
        .get();

      if (!lead) {
        return reply.status(404).send({ valid: false, error: 'not_found' });
      }

      // Validate token hash using constant-time comparison
      if (!lead.quoteTokenHash) {
        return reply.status(400).send({ valid: false, error: 'invalid_token' });
      }
      const tokenHash = hashToken(token);
      if (!secureCompare(tokenHash, lead.quoteTokenHash)) {
        return reply.status(400).send({ valid: false, error: 'invalid_token' });
      }

      // Check lead status is 'quoted' (note: BE sets status to 'responded' not 'quoted')
      // MAI-2000: Using 'responded' as that's what chef-leads.ts sets when quote is sent
      if (lead.status !== 'quoted' && lead.status !== 'responded') {
        return reply.status(400).send({ valid: false, error: 'invalid_token' });
      }

      // Check quote not expired (48h from quoteSentAt)
      let isExpired = false;
      if (lead.quoteSentAt) {
        const elapsedMs = Date.now() - new Date(lead.quoteSentAt).getTime();
        const expiryMs = QUOTE_EXPIRY_HOURS * 60 * 60 * 1000;
        if (elapsedMs > expiryMs) {
          isExpired = true;
        }
      }

      // Calculate expiresAt
      const expiresAt = lead.quoteSentAt
        ? new Date(new Date(lead.quoteSentAt).getTime() + QUOTE_EXPIRY_HOURS * 60 * 60 * 1000)
        : null;

      // Get chef info
      const chefResult = db.select({
        name: users.name,
        photoUrl: chefProfiles.photoUrl,
      })
        .from(users)
        .leftJoin(chefProfiles, eq(users.id, chefProfiles.userId))
        .where(eq(users.id, lead.chefId))
        .get();

      // Build quote response
      const nameParts = (lead.clientName || '').trim().split(/\s+/);

      return reply.send({
        valid: true,
        lead: {
          id: lead.id,
          status: lead.status,
          quote_amount: lead.quoteAmount,
          quote_message: lead.quoteMessage,
          quote_sent_at: lead.quoteSentAt ? new Date(lead.quoteSentAt).toISOString() : null,
          diner_first_name: nameParts[0] || null,
          diner_last_name: nameParts.slice(1).join(' ') || null,
          diner_email: lead.email,
          event_date: lead.eventDate,
          event_time: null, // leads doesn't have event time field
          guest_count: lead.guestCount,
          service_name: lead.serviceName,
        },
        chef: {
          name: chefResult?.name || 'Chef',
          photo_url: chefResult?.photoUrl || null,
        },
        expires_at: expiresAt ? expiresAt.toISOString() : null,
        is_expired: isExpired,
      });
    } catch (err) {
      console.error('Quote view error:', err);
      return reply.status(500).send({ valid: false, error: 'internal_error' });
    }
  });

  // ============================================
  // GET /api/leads/:leadId?token=xxx - Alias for quote view (same endpoint, different path)
  // This is needed because chef-leads.ts generates quoteToken for /lead/:leadId style URLs
  // ============================================
  server.get('/api/leads/:leadId', async (
    req: FastifyRequest<{
      Params: { leadId: string };
      Querystring: { token?: string };
    }>,
    reply: FastifyReply
  ) => {
    // Reuse the quote view logic by forwarding
    return server.inject({
      method: 'GET',
      url: `/api/quotes/${req.params.leadId}?token=${req.query.token || ''}`,
    });
  });

  // ============================================
  // POST /api/quotes/:leadId/accept - Public quote accept endpoint
  // ============================================
  server.post<{
    Params: { leadId: string };
    Body: { token: string };
  }>('/api/quotes/:leadId/accept', async (req, reply) => {
    try {
      const { leadId } = req.params;
      const { token } = req.body;

      if (!token || typeof token !== 'string' || token.trim().length === 0) {
        return reply.status(400).send({ success: false, error: 'invalid_token' });
      }

      const leadIdNum = parseInt(leadId);
      if (isNaN(leadIdNum)) {
        return reply.status(400).send({ success: false, error: 'invalid_token' });
      }

      const lead = db.select({
        id: leads.id,
        status: leads.status,
        quoteSentAt: leads.quoteSentAt,
        quoteTokenHash: leads.quoteTokenHash,
      })
        .from(leads)
        .where(eq(leads.id, leadIdNum))
        .get();

      if (!lead) {
        return reply.status(404).send({ success: false, error: 'not_found' });
      }

      // Validate token hash using constant-time comparison
      if (!lead.quoteTokenHash) {
        return reply.status(400).send({ success: false, error: 'invalid_token' });
      }
      const tokenHash = hashToken(token);
      if (!secureCompare(tokenHash, lead.quoteTokenHash)) {
        return reply.status(400).send({ success: false, error: 'invalid_token' });
      }

      // Check lead status is 'quoted' or 'responded'
      if (lead.status !== 'quoted' && lead.status !== 'responded') {
        return reply.status(400).send({ success: false, error: 'invalid_token' });
      }

      // Check quote not expired (48h from quoteSentAt)
      if (lead.quoteSentAt) {
        const elapsedMs = Date.now() - new Date(lead.quoteSentAt).getTime();
        const expiryMs = QUOTE_EXPIRY_HOURS * 60 * 60 * 1000;
        if (elapsedMs > expiryMs) {
          return reply.status(400).send({ success: false, error: 'quote_expired' });
        }
      }

      // Mark lead as accepted
      await db
        .update(leads)
        .set({
          status: 'accepted',
        } as Record<string, unknown>)
        .where(and(
          eq(leads.id, leadIdNum)
        ));

      return reply.send({
        success: true,
        status: 'accepted',
      });
    } catch (err) {
      console.error('Quote accept error:', err);
      return reply.status(500).send({ success: false, error: 'internal_error' });
    }
  });

  // ============================================
  // POST /api/leads/:leadId/accept - Alias for quote accept
  // ============================================
  server.post<{
    Params: { leadId: string };
    Body: { token: string };
  }>('/api/leads/:leadId/accept', async (req, reply) => {
    const { leadId } = req.params;
    const { token } = req.body;

    if (!token) {
      return reply.status(400).send({ success: false, error: 'invalid_token' });
    }

    // Reuse the quote accept logic
    const leadIdNum = parseInt(leadId);
    if (isNaN(leadIdNum)) {
      return reply.status(400).send({ success: false, error: 'invalid_token' });
    }

    const lead = db.select({
      id: leads.id,
      status: leads.status,
      quoteSentAt: leads.quoteSentAt,
      quoteTokenHash: leads.quoteTokenHash,
      quoteAmount: leads.quoteAmount,
      quoteMessage: leads.quoteMessage,
      guestCount: leads.guestCount,
      eventDate: leads.eventDate,
      serviceId: leads.serviceId,
      email: leads.email,
      clientName: leads.clientName,
    })
      .from(leads)
      .where(eq(leads.id, leadIdNum))
      .get();

    if (!lead) {
      return reply.status(404).send({ success: false, error: 'not_found' });
    }

    // Validate token
    if (!lead.quoteTokenHash) {
      return reply.status(400).send({ success: false, error: 'invalid_token' });
    }
    const tokenHash = hashToken(token);
    if (!secureCompare(tokenHash, lead.quoteTokenHash)) {
      return reply.status(400).send({ success: false, error: 'invalid_token' });
    }

    // Check status
    if (lead.status !== 'quoted' && lead.status !== 'responded') {
      return reply.status(400).send({ success: false, error: 'invalid_token' });
    }

    // Check expiry
    if (lead.quoteSentAt) {
      const elapsedMs = Date.now() - new Date(lead.quoteSentAt).getTime();
      const expiryMs = QUOTE_EXPIRY_HOURS * 60 * 60 * 1000;
      if (elapsedMs > expiryMs) {
        return reply.status(400).send({ success: false, error: 'quote_expired' });
      }
    }

    // Mark as accepted
    const now = new Date();
    const [updatedLead] = await db
      .update(leads)
      .set({
        status: 'accepted',
        updatedAt: now,
      } as Record<string, unknown>)
      .where(eq(leads.id, leadIdNum))
      .returning();

    return reply.send({
      success: true,
      status: updatedLead.status,
    });
  });
}