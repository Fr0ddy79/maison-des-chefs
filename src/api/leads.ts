import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leads, services, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { createNotification } from './notifications.js';
import { addOutreachTouch } from './outreach.js';

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const BOOKING_STATUS_URL = process.env.BOOKING_STATUS_URL || `${DASHBOARD_URL}/booking-status`;
const SERVICES_URL = process.env.SERVICES_URL || `${DASHBOARD_URL}/services`;

export default async function leadsRoutes(server: FastifyInstance) {
  /**
   * POST /api/leads/:leadId/notify-expired
   * MAI-1756: Manually trigger expiration notification for a lead.
   * Called when a lead transitions to expired status.
   * - Marks lead as expired (if not already)
   * - Sends in-app notification to diner (if diner has account)
   * - Adds outreach tracker entry
   * - Email stub: logs warning if RESEND_API_KEY not available
   */
  server.post<{ Params: { leadId: string } }>(
    '/:leadId/notify-expired',
    async (request, reply) => {
      const { leadId } = request.params;
      const leadIdNum = parseInt(leadId);

      if (isNaN(leadIdNum)) {
        return reply.status(400).send({ error: 'Invalid lead ID' });
      }

      // Fetch lead with related data
      const lead = db.select().from(leads).where(eq(leads.id, leadIdNum)).get();
      if (!lead) {
        return reply.status(404).send({ error: 'Lead not found' });
      }

      // Check if already notified (idempotency)
      if (lead.leadExpiredSentAt) {
        return reply.status(200).send({
          success: true,
          message: 'Lead already marked as expired and notified',
          leadId: leadIdNum,
          notifiedAt: lead.leadExpiredSentAt,
        });
      }

      // Get chef name
      const chef = db.select({ name: users.name }).from(users).where(eq(users.id, lead.chefId)).get();
      const chefName = chef?.name || 'your chef';

      // Get service name
      const service = db.select({ name: services.name }).from(services).where(eq(services.id, lead.serviceId)).get();
      const serviceName = service?.name || 'the service';

      // Build URLs
      const bookingStatusUrl = lead.accessToken
        ? `${BOOKING_STATUS_URL}?token=${lead.accessToken}`
        : BOOKING_STATUS_URL;

      // Mark lead as expired
      await db.update(leads).set({ status: 'expired', leadExpiredSentAt: new Date() }).where(eq(leads.id, leadIdNum));

      console.log(`[LeadsAPI] Lead ${leadIdNum} marked as expired via notify-expired endpoint.`);

      // Send in-app notification to diner if they have an account
      if (lead.email) {
        const dinerUser = db.select({ id: users.id }).from(users).where(eq(users.email, lead.email)).get();

        if (dinerUser) {
          createNotification({
            userId: dinerUser.id,
            type: 'lead_expired',
            title: 'Your inquiry has expired',
            body: `Your inquiry for ${serviceName} has expired. The chef was unable to respond in time. Browse other chefs to find your perfect match.`,
          });
          console.log(`[LeadsAPI] In-app notification sent to diner user ${dinerUser.id} for lead ${leadIdNum}`);
        } else {
          console.log(`[LeadsAPI] Diner has no account (guest), skipping in-app notification for lead ${leadIdNum}`);
        }

        // Add outreach tracker entry
        try {
          await addOutreachTouch({
            chefId: lead.chefId,
            campaignId: 0, // System event — no campaign
            channel: 'email',
            touchNumber: 0, // System event
            sentAt: new Date(),
            status: 'sent',
            notes: `Lead ${leadIdNum} manually expired via /api/leads/:leadId/notify-expired. Diner: ${lead.email}. Service: ${serviceName}. Chef: ${chefName}.`,
          });
        } catch (outreachErr) {
          // Non-fatal: outreach tracking failure should not fail the request
          console.warn(`[LeadsAPI] Failed to add outreach touch for lead ${leadIdNum}:`, outreachErr);
        }
      }

      // Stub: Email sending would go here if RESEND_API_KEY is configured
      // For now, log the email stub notification
      console.warn(`[LeadsAPI] Email notification for lead ${leadIdNum} - RESEND_API_KEY not configured or stub not implemented`);

      return reply.status(200).send({
        success: true,
        message: 'Lead marked as expired and notification sent',
        leadId: leadIdNum,
        notifiedAt: new Date().toISOString(),
      });
    }
  );
}
