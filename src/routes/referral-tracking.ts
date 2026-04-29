// Referral Tracking Routes - MAI-823
// Tracks referral code clicks and source attribution

import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leads } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export default async function referralTrackingRoutes(server: FastifyInstance) {
  // GET /referral/track - Track referral code click and redirect
  // Query params:
  //   code: The referral code (8-char alphanumeric)
  //   source: Where the click originated (copy, email, whatsapp)
  server.get('/referral/track', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const code = query.code || '';
    const source = query.source || 'unknown';

    // Validate code format (8 chars, alphanumeric)
    if (code && /^[A-Z0-9]{8}$/i.test(code)) {
      // Log the referral click (MAI-823: Phase 1 tracks clicks via event logging)
      // For now, we update the referral_source field on the lead if we find a matching code
      const normalizedCode = code.toUpperCase();
      
      const lead = db.select({ id: leads.id, referralSource: leads.referralSource })
        .from(leads)
        .where(eq(leads.referralCode, normalizedCode))
        .get();
      
      if (lead && !lead.referralSource) {
        // First click attribution - store the source
        db.update(leads)
          .set({ referralSource: source })
          .where(eq(leads.referralCode, normalizedCode))
          .run();
      }
      
      // Redirect to homepage (Phase 2 would go to signup with referral code pre-filled)
      return reply.redirect(`/?ref=${encodeURIComponent(normalizedCode)}`);
    }
    
    // Invalid code, redirect to homepage
    return reply.redirect('/');
  });

  // GET /referral/validate - API endpoint to validate a referral code
  // Returns: { valid: boolean, code: string }
  server.get('/referral/validate', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const code = query.code || '';

    if (!code || !/^[A-Z0-9]{8}$/i.test(code)) {
      return reply.send({ valid: false, code: code, error: 'Invalid code format' });
    }

    const normalizedCode = code.toUpperCase();
    const lead = db.select({ id: leads.id })
      .from(leads)
      .where(eq(leads.referralCode, normalizedCode))
      .get();

    return reply.send({ 
      valid: !!lead, 
      code: normalizedCode 
    });
  });
}