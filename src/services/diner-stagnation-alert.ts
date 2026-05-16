import cron, { ScheduledTask } from 'node-cron';
import { Resend } from 'resend';
import { db, schema } from '../db/index.js';
import { eq, and, isNull, lt, isNotNull } from 'drizzle-orm';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const BOOKING_STATUS_URL = process.env.BOOKING_STATUS_URL || `${DASHBOARD_URL}/booking-status`;
const CHEFS_DISCOVERY_URL = process.env.CHEFS_DISCOVERY_URL || `${DASHBOARD_URL}/chefs`;

/**
 * Represents a booking that needs stagnation alerting.
 */
export interface StaleBooking {
  id: number;
  dinerId: number | null;
  guestEmail: string | null;
  chefId: number;
  serviceId: number;
  eventDate: string;
  guestCount: number;
  accessToken: string | null;
  createdAt: Date;
  stagnationAlertSentAt: Date | null;
  status: 'pending' | 'accepted' | 'declined' | 'pending_payment' | 'pending_payment_failed' | 'confirmed' | 'rejected' | 'completed' | 'cancelled';
}

/**
 * Parameters for building a stagnation alert email.
 */
interface StagnationAlertParams {
  dinerFirstName: string;
  chefName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
  daysPending: number;
  bookingStatusUrl: string;
  chefsDiscoveryUrl: string;
}

/**
 * Format a date string for display in emails.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not specified';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Build the booking stagnation alert email content.
 * Subject: "⏰ Your booking with Chef [Name] is waiting for a response"
 */
export function buildDinerStagnationAlertEmail(params: StagnationAlertParams): { subject: string; html: string; text: string } {
  const formattedDate = formatDate(params.eventDate);
  const daysText = params.daysPending === 1 ? '1 day' : `${params.daysPending} days`;

  return {
    subject: `⏰ Your booking with Chef ${params.chefName} is waiting for a response`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your booking needs attention</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${params.dinerFirstName},</h2>

    <p style="font-size: 16px; color: #555;">
      Your booking request for <strong>${params.serviceName}</strong> with Chef ${params.chefName} is still waiting for a response.
    </p>

    <div style="background: linear-gradient(135deg, #fff9e6 0%, #fef3c7 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #92400e; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">⏳ Waiting for Chef Response</p>
      <p style="font-size: 18px; font-weight: 600; color: #2c3e50; margin: 0;">${params.daysPending} day${params.daysPending !== 1 ? 's' : ''} since your request</p>
    </div>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Your Booking</h3>
      <p style="margin: 8px 0; color: #555;"><strong>👨‍🍳 Chef:</strong> ${params.chefName}</p>
      <p style="margin: 8px 0; color: #555;"><strong>🍽️ Service:</strong> ${params.serviceName}</p>
      <p style="margin: 8px 0; color: #555;"><strong>📅 Event:</strong> ${formattedDate}</p>
      <p style="margin: 8px 0; color: #555;"><strong>👥 Guests:</strong> ${params.guestCount}</p>
    </div>

    <p style="font-size: 16px; color: #555;">
      Chefs typically respond within <strong>24 hours</strong>. If you need a sooner booking or want to explore other chefs, we're here to help.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.bookingStatusUrl}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 0 8px;">Confirm with Chef</a>
      <a href="${params.chefsDiscoveryUrl}" style="display: inline-block; background: #6b7280; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px; margin: 0 8px;">Browse Other Chefs</a>
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
    text: `Hi ${params.dinerFirstName},

Your booking request for ${params.serviceName} with Chef ${params.chefName} is still waiting for a response.

BOOKING DETAILS:
Chef: ${params.chefName}
Service: ${params.serviceName}
Event: ${formattedDate}
Guests: ${params.guestCount}

This booking has been pending for ${daysText}.

Chefs typically respond within 24 hours. If you need a sooner booking or want to explore other chefs, we're here to help.

CONFIRM WITH CHEF → ${params.bookingStatusUrl}

BROWSE OTHER CHEFS → ${params.chefsDiscoveryUrl}

Questions? We're here to help at support@maisondeschefs.com

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Get the booking status URL for a booking.
 * Uses accessToken if available, otherwise falls back to generic booking status URL.
 */
function getBookingStatusUrl(accessToken: string | null): string {
  if (accessToken) {
    return `${BOOKING_STATUS_URL}?token=${accessToken}`;
  }
  return BOOKING_STATUS_URL;
}

/**
 * Send the stagnation alert email to a diner.
 * Returns true on success, false on error.
 * Never throws — errors are logged but not propagated.
 */
export async function sendDinerStagnationAlertEmail(booking: StaleBooking): Promise<boolean> {
  const bookingId = booking.id;

  // Determine the diner's email: prefer guestEmail, fall back to dinerId lookup
  let dinerEmail: string | null = booking.guestEmail;

  if (!dinerEmail && booking.dinerId) {
    const [diner] = await db
      .select({ email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.id, booking.dinerId))
      .limit(1);
    dinerEmail = diner?.email || null;
  }

  if (!dinerEmail) {
    console.warn(`[DinerStagnationAlert] Skipping booking ${bookingId} — no email found (guestEmail: ${booking.guestEmail}, dinerId: ${booking.dinerId}).`);
    return false;
  }

  if (!resend) {
    console.warn(`[DinerStagnationAlert] RESEND_API_KEY not configured — cannot send email for booking ${bookingId}.`);
    return false;
  }

  // Skip if key is a placeholder (development mode)
  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[DinerStagnationAlert] RESEND_API_KEY is placeholder, stubbing email send for booking ${bookingId}.`);
    return true;
  }

  // Get chef name
  const [chef] = await db
    .select({ name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, booking.chefId))
    .limit(1);

  const chefName = chef?.name || 'your chef';

  // Get service name
  const [service] = await db
    .select({ name: schema.services.name })
    .from(schema.services)
    .where(eq(schema.services.id, booking.serviceId))
    .limit(1);

  const serviceName = service?.name || 'the service';

  // Get diner first name from email or default
  const dinerFirstName = dinerEmail.split('@')[0] || 'there';

  // Calculate days pending
  const daysPending = Math.floor((Date.now() - booking.createdAt.getTime()) / (1000 * 60 * 60 * 24));

  try {
    const emailContent = buildDinerStagnationAlertEmail({
      dinerFirstName,
      chefName,
      serviceName,
      eventDate: booking.eventDate,
      guestCount: booking.guestCount,
      daysPending,
      bookingStatusUrl: getBookingStatusUrl(booking.accessToken),
      chefsDiscoveryUrl: CHEFS_DISCOVERY_URL,
    });

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (result.error) {
      console.error(`[DinerStagnationAlert] Failed to send to ${dinerEmail} for booking ${bookingId}:`, result.error);
      return false;
    }

    console.log(`[DinerStagnationAlert] Email sent to ${dinerEmail} for booking ${bookingId}`);
    return true;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[DinerStagnationAlert] Exception sending to ${dinerEmail} for booking ${bookingId}:`, err);
    return false;
  }
}

let registeredTask: ScheduledTask | null = null;

/**
 * Start the diner stagnation alert scheduler.
 * Runs every 24 hours to find pending bookings older than 24 hours
 * that haven't received a stagnation alert yet.
 */
export function startDinerStagnationAlertScheduler(): void {
  if (registeredTask) {
    console.log('[DinerStagnationAlert] Scheduler already initialized');
    return;
  }

  // Run every 6 hours
  const task = cron.schedule('0 */6 * * *', async () => {
    console.log('[DinerStagnationAlert] Running stale booking check...');
    try {
      const result = await processStaleBookings();
      console.log(`[DinerStagnationAlert] Processed: found=${result.found}, sent=${result.sent}, skipped=${result.skipped}`);
    } catch (err) {
      console.error('[DinerStagnationAlert] Error processing stale bookings:', err);
    }
  });

  registeredTask = task;
  console.log('📅 Registered: Diner Stagnation Alert cron (every 6 hours)');
}

/**
 * Stop the diner stagnation alert scheduler.
 */
export function stopDinerStagnationAlertScheduler(): void {
  if (registeredTask) {
    registeredTask.stop();
    registeredTask = null;
    console.log('[DinerStagnationAlert] Scheduler stopped');
  }
}

/**
 * Process stale bookings and send stagnation alert emails.
 * Finds bookings where:
 *   - status = 'pending'
 *   - createdAt < NOW() - 24 hours
 *   - stagnation_alert_sent_at IS NULL (not already sent)
 *
 * Returns statistics about the processing.
 */
export async function processStaleBookings(): Promise<{ found: number; sent: number; skipped: number }> {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Find pending bookings older than 24h with no alert sent yet
  const staleBookings = await db
    .select()
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.status, 'pending'),
        lt(schema.bookings.createdAt, twentyFourHoursAgo),
        isNull(schema.bookings.stagnationAlertSentAt)
      )
    )
    .all();

  if (staleBookings.length === 0) {
    console.log('[DinerStagnationAlert] No stale bookings needing alert.');
    return { found: 0, sent: 0, skipped: 0 };
  }

  console.log(`[DinerStagnationAlert] Found ${staleBookings.length} stale booking(s) needing alert.`);

  let sent = 0;
  let skipped = 0;

  for (const booking of staleBookings) {
    // Skip if email not available (both guestEmail and dinerId null)
    const hasEmail = booking.guestEmail || booking.dinerId;
    if (!hasEmail) {
      console.warn(`[DinerStagnationAlert] Skipping booking ${booking.id} — no email available.`);
      skipped++;
      continue;
    }

    const success = await sendDinerStagnationAlertEmail(booking);

    if (success) {
      // Mark alert as sent (idempotency)
      await db
        .update(schema.bookings)
        .set({ stagnationAlertSentAt: new Date() })
        .where(eq(schema.bookings.id, booking.id));

      sent++;
    } else {
      skipped++;
    }
  }

  return { found: staleBookings.length, sent, skipped };
}

/**
 * Mark a booking's stagnation alert as sent (for manual trigger idempotency).
 * Called when "Chase the Chef" button is clicked to prevent duplicate auto-alerts.
 */
export async function markStagnationAlertSent(bookingId: number): Promise<void> {
  await db
    .update(schema.bookings)
    .set({ stagnationAlertSentAt: new Date() })
    .where(eq(schema.bookings.id, bookingId));
  console.log(`[DinerStagnationAlert] Marked alert as sent for booking ${bookingId} (manual trigger).`);
}