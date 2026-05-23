import cron, { ScheduledTask } from 'node-cron';
import { Resend } from 'resend';
import { db, schema } from '../db/index.js';
import { eq, and, lt, isNull, isNotNull, or } from 'drizzle-orm';
import { sendExpiredEmail } from './diner-confirmation-email.js';
import { createNotification } from '../api/notifications.js';
import { addOutreachTouch } from '../api/outreach.js';

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
  slaDeadlineAt: Date | null;
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
 * MAI-1756: Runs every 6 hours to find leads where:
 *   - status IN ('new', 'pending') — no chef response yet
 *   - slaDeadlineAt < NOW() — SLA window has passed (MAI-1756: decouple from email)
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
 * Process leads that have expired (SLA window passed with no chef response).
 * MAI-1756: Finds leads where:
 *   - status IN ('new', 'pending') — no chef response yet
 *   - slaDeadlineAt < NOW() — SLA window has passed (decoupled from email)
 *   - leadExpiredSentAt IS NULL (not already sent)
 * Then marks them as 'expired' and sends the diner a notification.
 */
export async function processLeadExpiration(): Promise<void> {
  const now = new Date();

  // Find leads: no response, SLA deadline passed, not already expired
  // MAI-1756: Use slaDeadlineAt instead of fixed 72h window
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
        // SLA deadline has passed (slaDeadlineAt = inquiryReceivedAt + 48h)
        lt(schema.leads.slaDeadlineAt, now),
        // MAI-1951: Only expire leads that have received the SLA check-in nudge first
        // This sequences the flow: chef gets "please respond" email → then diner gets expiration
        isNotNull(schema.leads.slaCheckInSentAt),
        // Not already sent expired notification
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

    // Mark lead as expired and record leadExpiredSentAt (idempotency) — regardless of email success
    // This fixes the bug where leads never expired when email failed but RESEND_API_KEY was configured
    await db
      .update(schema.leads)
      .set({
        status: 'expired',
        leadExpiredSentAt: new Date(),
      } as Record<string, unknown>)
      .where(eq(schema.leads.id, lead.id));

    console.log(`[LeadExpiration] Lead ${lead.id} marked as expired.`);

    // Try to send email (best effort — does not block expiration)
    const emailSuccess = await sendExpiredEmail({
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

    if (!emailSuccess) {
      console.error(`[LeadExpiration] Failed to send expired email for lead ${lead.id} (lead still marked expired)`);
    }

    // Send in-app notification to diner if they have an account (userId lookup by email)
    const [dinerUser] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.email, lead.email))
      .limit(1);

    if (dinerUser) {
      createNotification({
        userId: dinerUser.id,
        type: 'lead_expired',
        title: 'Your inquiry has expired',
        body: `No chef responded to your ${serviceName} inquiry. Browse other chefs to find your perfect match.`,
      });
      console.log(`[LeadExpiration] In-app notification sent to diner user ${dinerUser.id} for lead ${lead.id}`);
    } else {
      console.log(`[LeadExpiration] Diner has no account (guest), skipping in-app notification for lead ${lead.id}`);
    }

    // MAI-1756: Add outreach tracker entry for lead expiration event
    // Stub: log for now; full outreach tracking would require campaign_id setup
    try {
      await addOutreachTouch({
        chefId: lead.chefId,
        campaignId: 0, // System event — no campaign
        channel: 'email',
        touchNumber: 0, // System event
        sentAt: new Date(),
        status: 'sent',
        notes: `Lead ${lead.id} expired — SLA deadline passed (${lead.slaDeadlineAt}). Notification sent to diner ${lead.email}.`,
      });
    } catch (outreachErr) {
      // Non-fatal: outreach tracking failure should not block expiration
      console.warn(`[LeadExpiration] Failed to add outreach touch for lead ${lead.id}:`, outreachErr);
    }
  }
}
