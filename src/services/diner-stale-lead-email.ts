import cron, { ScheduledTask } from 'node-cron';
import { Resend } from 'resend';
import { db, schema } from '../db/index.js';
import { eq, and, isNull, lt } from 'drizzle-orm';
import { trackStaleLeadReengagementSent } from '../routes/analytics.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const BOOKING_STATUS_URL = process.env.BOOKING_STATUS_URL || `${DASHBOARD_URL}/booking-status`;

interface StaleLead {
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
}

/**
 * Format a date string for display in emails.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not specified';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Get the booking status URL for a lead.
 */
function getBookingStatusUrl(lead: StaleLead): string {
  if (lead.accessToken) {
    return `${BOOKING_STATUS_URL}?token=${lead.accessToken}`;
  }
  return BOOKING_STATUS_URL;
}

/**
 * Build the stale lead re-engagement email content.
 * Subject: "Your private chef inquiry is waiting ✨"
 */
function buildStaleLeadReEngagementEmail(lead: StaleLead, chefName: string, serviceName: string): { subject: string; html: string; text: string } {
  const bookingStatusLink = getBookingStatusUrl(lead);
  const dinerFirstName = lead.clientName?.split(' ')[0] || 'there';
  const formattedDate = formatDate(lead.eventDate);

  return {
    subject: 'Your private chef inquiry is waiting ✨',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your inquiry is waiting</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${dinerFirstName},</h2>
    
    <p style="font-size: 16px; color: #555;">We wanted to follow up on your inquiry for <strong>${serviceName}</strong> with Chef ${chefName}.</p>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Your Inquiry</h3>
      <p style="margin: 5px 0; color: #555;"><strong>Service:</strong> ${serviceName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Chef:</strong> ${chefName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Event:</strong> ${formattedDate}</p>
      ${lead.guestCount ? `<p style="margin: 5px 0; color: #555;"><strong>Guests:</strong> ${lead.guestCount}</p>` : ''}
    </div>
    
    <p style="font-size: 16px; color: #555;">
      Chefs typically respond within <strong>24 hours</strong>. Here's where things stand with your booking:
    </p>
    
    <div style="background: #fff9e6; border-left: 4px solid #c9a227; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #856404; font-size: 15px;">
        ⏳ Your inquiry is still waiting for a response from Chef ${chefName}.
      </p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingStatusLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Check Your Booking Status</a>
    </div>
    
    <p style="font-size: 14px; color: #888; text-align: center;">
      Questions? We're here to help at support@maisondeschefs.com
    </p>
  </div>
  
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${dinerFirstName},

We wanted to follow up on your inquiry for ${serviceName} with Chef ${chefName}.

Your Inquiry:
Service: ${serviceName}
Chef: ${chefName}
Event: ${formattedDate}
${lead.guestCount ? `Guests: ${lead.guestCount}\n` : ''}
Chefs typically respond within 24 hours. Here's where things stand with your booking:

Your inquiry is still waiting for a response from Chef ${chefName}.

Check your booking status → ${bookingStatusLink}

Questions? We're here to help at support@maisondeschefs.com

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send stale lead re-engagement email to a diner.
 * Returns true on success, false on error.
 */
async function sendStaleLeadReEngagementEmail(lead: StaleLead): Promise<boolean> {
  const { id: leadId, email } = lead;

  if (!email) {
    console.warn(`[StaleLeadReEngagement] Skipping lead ${leadId} — missing email.`);
    return false;
  }

  if (!resend) {
    console.warn(`[StaleLeadReEngagement] RESEND_API_KEY not configured — cannot send email to ${email}`);
    return false;
  }

  // Skip if key is a placeholder
  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[StaleLeadReEngagement] RESEND_API_KEY is placeholder, stubbing email send for lead ${leadId}`);
    return true;
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

  try {
    const emailContent = buildStaleLeadReEngagementEmail(lead, chefName, serviceName);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (result.error) {
      console.error(`[StaleLeadReEngagement] Failed to send to ${email}:`, result.error);
      return false;
    }

    console.log(`[StaleLeadReEngagement] Email sent for lead ${leadId} to ${email}`);
    return true;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[StaleLeadReEngagement] Exception sending to ${email}:`, err);
    return false;
  }
}

let registeredTask: ScheduledTask | null = null;

/**
 * Start the stale lead re-engagement scheduler.
 * Runs daily at 9:00 AM to find leads where:
 *   - status = 'new'
 *   - createdAt < NOW() - 48 hours
 *   - firstChefActionAt IS NULL (chef has not responded)
 *   - inquiryConfirmSentAt IS NOT NULL (confirmation was sent)
 *   - staleLeadReengagementSentAt IS NULL (not already sent)
 */
export function startStaleLeadReEngagementScheduler(): void {
  if (registeredTask) {
    console.log('[StaleLeadReEngagement] Scheduler already initialized');
    return;
  }

  const task = cron.schedule('0 9 * * *', async () => {
    console.log('[StaleLeadReEngagement] Running stale lead re-engagement check...');
    try {
      await processStaleLeadReEngagement();
    } catch (err) {
      console.error('[StaleLeadReEngagement] Error processing stale leads:', err);
    }
  });

  registeredTask = task;
  console.log('📅 Registered: Stale Lead Re-Engagement cron (daily at 9:00 AM)');
}

/**
 * Stop the stale lead re-engagement scheduler.
 */
export function stopStaleLeadReEngagementScheduler(): void {
  if (registeredTask) {
    registeredTask.stop();
    registeredTask = null;
    console.log('[StaleLeadReEngagement] Scheduler stopped');
  }
}

/**
 * Process stale leads and send re-engagement emails.
 * Finds leads where:
 *   - status = 'new'
 *   - createdAt < NOW() - 48 hours
 *   - firstChefActionAt IS NULL (chef has not responded)
 *   - inquiryConfirmSentAt IS NOT NULL (confirmation was sent)
 *   - staleLeadReengagementSentAt IS NULL (not already sent)
 */
export async function processStaleLeadReEngagement(): Promise<void> {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Check if staleLeadReengagementSentAt column exists, if not use inquiryConfirmSentAt as proxy
  // (this is for idempotency - we don't want to send multiple emails)
  const leadsToEngage = await db
    .select()
    .from(schema.leads)
    .where(
      and(
        eq(schema.leads.status, 'new'),
        lt(schema.leads.createdAt, fortyEightHoursAgo),
        isNull(schema.leads.firstChefActionAt),
        isNull(schema.leads.staleLeadReengagementSentAt)
      )
    )
    .all();

  if (leadsToEngage.length === 0) {
    console.log('[StaleLeadReEngagement] No stale leads needing re-engagement.');
    return;
  }

  console.log(`[StaleLeadReEngagement] Found ${leadsToEngage.length} stale lead(s) needing re-engagement.`);

  for (const lead of leadsToEngage) {
    if (!lead.email) {
      console.warn(`[StaleLeadReEngagement] Skipping lead ${lead.id} — missing email.`);
      continue;
    }

    // Only send if inquiry confirmation was already sent
    if (!lead.inquiryConfirmSentAt) {
      console.warn(`[StaleLeadReEngagement] Skipping lead ${lead.id} — no confirmation email was sent.`);
      continue;
    }

    const success = await sendStaleLeadReEngagementEmail(lead as StaleLead);

    if (success) {
      // Mark re-engagement email as sent (idempotency)
      await db
        .update(schema.leads)
        .set({ staleLeadReengagementSentAt: new Date() })
        .where(eq(schema.leads.id, lead.id));

      // Log analytics event
      trackStaleLeadReengagementSent({
        leadId: lead.id,
        chefId: lead.chefId,
        serviceId: lead.serviceId,
        daysSinceCreated: Math.floor((Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24)),
      });

      console.log(`[StaleLeadReEngagement] Re-engagement email sent for lead ${lead.id}`);
    } else {
      console.error(`[StaleLeadReEngagement] Failed to send re-engagement email for lead ${lead.id}`);
    }
  }
}
