import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { waitlistSubscriptions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// MAI-2865: Waitlist email capture endpoint
// Captures email signups from hero section with UTM attribution

export default async function subscribeRoutes(server: FastifyInstance) {
  /**
   * POST /api/subscribe
   * Submit email to waitlist with UTM parameters for attribution.
   * 
   * Request body:
   *   - email: string (required)
   *   - utm_source?: string
   *   - utm_medium?: string
   *   - utm_campaign?: string
   *   - utm_content?: string
   *   - utm_term?: string
   * 
   * Returns:
   *   - 200: { success: true, message: string }
   *   - 400: { error: string } (validation error or already subscribed)
   *   - 500: { error: string } (server error)
   */
  server.post('/', async (request, reply) => {
    try {
      const body = request.body as Record<string, string> | undefined;
      
      if (!body || !body.email) {
        return reply.status(400).send({ error: 'Email is required' });
      }

      const email = body.email.trim().toLowerCase();
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return reply.status(400).send({ error: 'Invalid email address' });
      }

      // Check for duplicate subscription
      const existing = db.select()
        .from(waitlistSubscriptions)
        .where(eq(waitlistSubscriptions.email, email))
        .get();

      if (existing) {
        return reply.status(400).send({ 
          error: 'You\'re already on the waitlist! We\'ll be in touch soon.' 
        });
      }

      // Extract UTM parameters from body
      const utmSource = body.utm_source?.trim() || null;
      const utmMedium = body.utm_medium?.trim() || null;
      const utmCampaign = body.utm_campaign?.trim() || null;
      const utmContent = body.utm_content?.trim() || null;
      const utmTerm = body.utm_term?.trim() || null;

      // Insert new subscription
      db.insert(waitlistSubscriptions).values({
        email,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        sourcePage: 'homepage',
        createdAt: new Date(),
      }).run();

      // Log for analytics/debugging
      console.log('[Waitlist] New subscription:', {
        email,
        utmSource,
        utmMedium,
        utmCampaign,
        utmContent,
        utmTerm,
        timestamp: new Date().toISOString(),
      });

      return reply.status(200).send({
        success: true,
        message: 'You\'re on the list! We\'ll notify you when we launch.',
      });
    } catch (err) {
      console.error('[Waitlist] Subscription error:', err);
      return reply.status(500).send({ error: 'Something went wrong. Please try again.' });
    }
  });

  /**
   * GET /api/subscribe
   * Health check for the subscribe endpoint
   */
  server.get('/', async (request, reply) => {
    return reply.status(200).send({ status: 'ok', endpoint: 'waitlist-subscribe' });
  });
}