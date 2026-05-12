import cron, { ScheduledTask } from 'node-cron';
import { Resend } from 'resend';
import { db, schema } from '../db/index.js';
import { eq, and, inArray, lt, isNull, or } from 'drizzle-orm';
import { sendExpiredEmail } from './diner-confirmation-email.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const BOOKING_STATUS_URL = process.env.BOOKING_STATUS_URL || `${DASHBOARD_URL}/booking-status`;
const SERVICES_URL = process.env.SERVICES_URL || `${DASHBOARD_URL}/services`;

interface ExpiredLeadRow {
  id: number;
  serviceId: number;
  chefId: number;
  clientName: string | null;
  email: string | null;
  eventDate: string | null;
  guestCount: number | null;
  message: string | null;
  accessToken: string | null;
  createdAt: Date;
  inquiryConfirmSentAt: Date | null;
  leadExpiredSentAt: Date | null;
}

/**
 * Get the booking status URL for a lead.
 */
function getBookingStatusUrl(lead: ExpiredLeadRow): string {
  if (lead.accessToken) {
    return `${BOOKING_STATUS_URL}?token=${lead.accessToken}`;
  }
  return BOOKING_STATUS_URL;
}

let registeredTask: ScheduledTask | null = null;

/**
 * Start the lead expiration scheduler.
 * MAI-1396: Runs every 6 hours to find leads where:
 *   - status IN ('new', 'pending') — no chef response yet
 *   - createdAt < NOW() - 72 hours
 *   - leadExpiredSentAt IS NULL (not already sent)
 */
export function startLeadExpirationScheduler(): void {
  if (registeredTask) {
    console.log('[LeadExpiration] Scheduler already initialized');
    return;
  }

  // Run every 6 hours
  const task = cron.schedule('0 */6 * * *', async () => {
    console.log('[LeadExpiration] Running lead expiration check...');
    try {
      await processLeadExpiration();
    } catch (err) {
      console.error('[LeadExpiration] Error processing lead expiration:', err);
    }
  });

  registeredTask = task;
  console.log('📅 Registered: Lead Expiration cron (every 6 hours)');
}

/**
 * Stop the lead expiration scheduler.
 */
export function stopLeadExpirationScheduler(): void {
  if (registeredTask) {
    registeredTask.stop();
    registeredTask = null;
    console.log('[LeadExpiration] Scheduler stopped');
  }
}

/**
 * Process leads that have expired (no chef response for 72+ hours).
 * Finds leads where:
 *   - status IN ('new', 'pending') — no chef response yet
 *   - createdAt < NOW() - 72 hours (72h = 72 * 60 * 60 * 1000 ms)
 *   - leadExpiredSentAt IS NULL (not already sent)
 * Then marks them as 'expired' and sends the diner an email.
 */
export async function processLeadExpiration(): Promise<void> {
  const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000);

  // Find leads: no response, older than 72h, not already expired
  const leadsToExpire = await db
    .select()
    .from(schema.leads)
    .where(
      and(
        // No chef response yet (still in initial state)
        or(
          eq(schema.leads.status, 'new'),
          eq(schema.leads.status, 'pending')
        ),
        // Created more than 72 hours ago
        lt(schema.leads.createdAt, seventyTwoHoursAgo),
        // Not already sent expired email
        isNull(schema.leads.leadExpiredSentAt)
      )
    )
    .all();

  if (leadsToExpire.length === 0) {
    console.log('[LeadExpiration] No leads needing expiration.');
    return;
  }

  console.log(`[LeadExpiration] Found ${leadsToExpire.length} lead(s) to expire.`);

  for (const lead of leadsToExpire) {
    if (!lead.email) {
      console.warn(`[LeadExpiration] Skipping lead ${lead.id} — missing email.`);
      continue;
    }

    // Get chef name
    const [chef] = await db
      .select({ name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, lead.chefId))
      .limit(1);

    const chefName = chef?.name || 'your chef';

    // Get service name
    const [service] = await db
      .select({ name: schema.services.name })
      .from(schema.services)
      .where(eq(schema.services.id, lead.serviceId))
      .limit(1);

    const serviceName = service?.name || 'the service';

    // Build URLs
    const bookingStatusUrl = getBookingStatusUrl(lead as ExpiredLeadRow);
    const browseUrl = SERVICES_URL;

    // Send expired email
    const success = await sendExpiredEmail({
      leadId: lead.id,
      dinerName: lead.clientName || 'there',
      dinerEmail: lead.email,
      chefName,
      serviceName,
      eventDate: lead.eventDate,
      guestCount: lead.guestCount || 0,
      bookingStatusUrl,
      browseUrl,
    });

    if (success) {
      // Mark lead status as 'expired' and record email sent time (idempotency)
      await db
        .update(schema.leads)
        .set({
          status: 'expired',
          leadExpiredSentAt: new Date(),
        } as Record<string, unknown>)
        .where(eq(schema.leads.id, lead.id));

      console.log(`[LeadExpiration] Lead ${lead.id} marked as expired and email sent.`);
    } else {
      console.error(`[LeadExpiration] Failed to send expired email for lead ${lead.id}`);
    }
  }
}
