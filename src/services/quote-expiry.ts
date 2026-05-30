import cron, { ScheduledTask } from 'node-cron';
import { Resend } from 'resend';
import { db, schema } from '../db/index.js';
import { eq, and, lt, isNull, or } from 'drizzle-orm';
import { createNotification } from '../api/notifications.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const CHEF_DASHBOARD_URL = process.env.CHEF_DASHBOARD_URL || `${DASHBOARD_URL}/chef-dashboard`;
const DINER_DASHBOARD_URL = process.env.DINER_DASHBOARD_URL || `${DASHBOARD_URL}/bookings`;

// Configurable expiry days — defaults to 2 (aligned with 48h QUOTE_EXPIRY_HOURS in quotes.ts)
const QUOTE_EXPIRY_DAYS = parseInt(process.env.QUOTE_EXPIRY_DAYS || '2', 10);

interface QuoteLeadRow {
  id: number;
  serviceId: number;
  chefId: number;
  clientName: string | null;
  email: string | null;
  eventDate: string | null;
  guestCount: number | null;
  quoteAmount: number | null;
  quoteMessage: string | null;
  quoteSentAt: Date | null;
  createdAt: Date;
}

let registeredTask: ScheduledTask | null = null;

/**
 * Start the quote expiry scheduler.
 * Runs once daily to find quotes older than QUOTE_EXPIRY_DAYS and auto-expire them.
 */
export function startQuoteExpiryScheduler(): void {
  if (registeredTask) {
    console.log('[QuoteExpiry] Scheduler already initialized');
    return;
  }

  // Run once daily at midnight
  const task = cron.schedule('0 0 * * *', async () => {
    console.log('[QuoteExpiry] Running quote expiry check...');
    try {
      await processQuoteExpiry();
    } catch (err) {
      console.error('[QuoteExpiry] Error processing quote expiry:', err);
    }
  });

  registeredTask = task;
  console.log(`📅 Registered: Quote Expiry cron (daily, QUOTE_EXPIRY_DAYS=${QUOTE_EXPIRY_DAYS})`);
}

/**
 * Stop the quote expiry scheduler.
 */
export function stopQuoteExpiryScheduler(): void {
  if (registeredTask) {
    registeredTask.stop();
    registeredTask = null;
    console.log('[QuoteExpiry] Scheduler stopped');
  }
}

/**
 * Get the SLA deadline for a quote.
 * Returns the date when the quote should expire (quoteSentAt + QUOTE_EXPIRY_DAYS).
 */
export function getQuoteExpiryDate(quoteSentAt: Date): Date {
  return new Date(quoteSentAt.getTime() + QUOTE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Check if a quote has expired based on quoteSentAt and QUOTE_EXPIRY_DAYS.
 * Returns true if the quote is older than QUOTE_EXPIRY_DAYS.
 */
export function isQuoteExpired(quoteSentAt: Date | null): boolean {
  if (!quoteSentAt) return false;
  return getQuoteExpiryDate(quoteSentAt) < new Date();
}

/**
 * Process leads with expired quotes (status = 'quoted' or 'responded' where quoteSentAt + QUOTE_EXPIRY_DAYS < now).
 * Marks them as 'expired' and notifies the chef.
 */
export async function processQuoteExpiry(): Promise<void> {
  const now = new Date();
  const expiryThreshold = new Date(now.getTime() - QUOTE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Find leads: have a quote sent but not accepted/declined, and quote is older than QUOTE_EXPIRY_DAYS
  // Status: 'quoted' or 'responded' (quote sent but not yet converted)
  // quoteSentAt < expiryThreshold (older than QUOTE_EXPIRY_DAYS days)
  const leadsToExpire = await db
    .select()
    .from(schema.leads)
    .where(
      and(
        // Lead has been quoted (quote sent to diner)
        or(
          eq(schema.leads.status, 'quoted'),
          eq(schema.leads.status, 'responded')
        ),
        // Quote was sent more than QUOTE_EXPIRY_DAYS ago
        lt(schema.leads.quoteSentAt, expiryThreshold),
        // Not already expired manually (leadExpiredSentAt tracks lead expiration, not quote expiry specifically)
        // We use a different marker for quote expiry notification to chef to avoid re-notifying
        isNull(schema.leads.leadExpiredSentAt) // Skip leads already handled by lead-expiration
      )
    )
    .all();

  if (leadsToExpire.length === 0) {
    console.log('[QuoteExpiry] No quotes needing expiration.');
    return;
  }

  console.log(`[QuoteExpiry] Found ${leadsToExpire.length} quote(s) to expire.`);

  for (const lead of leadsToExpire) {
    // Mark lead as expired
    await db
      .update(schema.leads)
      .set({
        status: 'expired',
        leadExpiredSentAt: new Date(), // Reuse existing column for idempotency
      } as Record<string, unknown>)
      .where(eq(schema.leads.id, lead.id));

    console.log(`[QuoteExpiry] Lead ${lead.id} marked as expired (quote sent at ${lead.quoteSentAt}).`);

    // Notify chef whose quote expired
    await notifyChefQuoteExpired(lead as QuoteLeadRow);

    // Notify diner that their quote has expired
    await notifyDinerQuoteExpired(lead as QuoteLeadRow);
  }
}

/**
 * Notify the chef when their quote has expired.
 * Sends email via Resend (or logs if Resend is down) and creates an in-app notification.
 */
async function notifyChefQuoteExpired(lead: QuoteLeadRow): Promise<void> {
  // Get chef details
  const [chef] = await db
    .select({ name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, lead.chefId))
    .limit(1);

  if (!chef) {
    console.warn(`[QuoteExpiry] Chef ${lead.chefId} not found for lead ${lead.id}.`);
    return;
  }

  // Get service name for the notification
  const [service] = await db
    .select({ name: schema.services.name })
    .from(schema.services)
    .where(eq(schema.services.id, lead.serviceId))
    .limit(1);

  const serviceName = service?.name || 'your service';
  const chefName = chef.name || 'Chef';

  // Build email content
  const bookingUrl = `${CHEF_DASHBOARD_URL}/leads`;

  const subject = `⏰ Quote Expired: ${lead.clientName || 'Your diner'} didn't respond`;
  const html = buildQuoteExpiredEmailHtml({
    chefName,
    dinerName: lead.clientName || 'your diner',
    serviceName,
    eventDate: lead.eventDate,
    guestCount: lead.guestCount || 0,
    quoteAmount: lead.quoteAmount || 0,
    bookingUrl,
  });
  const text = buildQuoteExpiredEmailText({
    chefName,
    dinerName: lead.clientName || 'your diner',
    serviceName,
    eventDate: lead.eventDate,
    guestCount: lead.guestCount || 0,
    quoteAmount: lead.quoteAmount || 0,
    bookingUrl,
  });

  // Send email to chef (best effort — does not block expiry)
  const emailSent = await sendQuoteExpiredEmail(chef.email, {
    to: chef.email || '',
    subject,
    html,
    text,
  });

  if (!emailSent) {
    console.error(`[QuoteExpiry] Failed to send expiry notification email to chef ${chef.email} for lead ${lead.id}`);
  }

  // Send in-app notification to chef
  createNotification({
    userId: lead.chefId,
    type: 'lead_expired', // Reuse existing type
    title: 'Quote Expired',
    body: `Your quote for ${serviceName} has expired. ${lead.clientName || 'The diner'} didn't respond within ${QUOTE_EXPIRY_DAYS} days. The inquiry is now open for other chefs.`,
    metadata: {
      leadId: lead.id,
      dinerEmail: lead.email || undefined,
      serviceName,
      guestCount: lead.guestCount || undefined,
      eventDate: lead.eventDate,
    },
  });

  console.log(`[QuoteExpiry] Chef ${lead.chefId} notified for lead ${lead.id} (quote expired)`);
}

/**
 * Send quote expired email to chef.
 * Returns true on success or when Resend is not configured (graceful degradation).
 */
async function sendQuoteExpiredEmail(
  to: string,
  params: { to: string; subject: string; html: string; text: string }
): Promise<boolean> {
  if (!resend) {
    console.warn(`[QuoteExpiry] RESEND_API_KEY not configured — logging email instead:`);
    console.log(`  To: ${params.to}`);
    console.log(`  Subject: ${params.subject}`);
    return true; // Graceful degradation
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[QuoteExpiry] RESEND_API_KEY is placeholder — stubbing email to ${params.to}`);
    return true;
  }

  if (!to) {
    console.warn(`[QuoteExpiry] No chef email — skipping notification`);
    return true;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (result.error) {
      console.error(`[QuoteExpiry] Failed to send email to ${params.to}:`, result.error);
      return false;
    }

    console.log(`[QuoteExpiry] Email sent to ${params.to}`);
    return true;
  } catch (err) {
    console.error(`[QuoteExpiry] Exception sending email to ${params.to}:`, err);
    return false;
  }
}

/**
 * Build HTML email content for quote expired notification to chef.
 */
function buildQuoteExpiredEmailHtml(params: {
  chefName: string;
  dinerName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
  quoteAmount: number;
  bookingUrl: string;
}): string {
  const formattedDate = params.eventDate
    ? new Date(params.eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not specified';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Quote Expired</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${params.chefName},</h2>

    <p style="font-size: 16px; color: #555;">
      Your quote for <strong>${params.serviceName}</strong> has expired. ${params.dinerName} didn't respond within ${QUOTE_EXPIRY_DAYS} days, so the inquiry is now open for other chefs on Maison des Chefs.
    </p>

    <div style="background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 15px;">
        ⏰ <strong>Quote Expired</strong><br>
        Diner: ${params.dinerName}<br>
        Date: ${formattedDate}<br>
        Guests: ${params.guestCount}<br>
        Quote: $${params.quoteAmount.toFixed(2)}
      </p>
    </div>

    <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #0369a1; font-size: 14px;">
        💡 <strong>Good news:</strong> Your diner can still re-inquire with you directly, or another chef can now respond to their request.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.bookingUrl}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">View Other Inquiries</a>
    </div>

    <p style="color: #666; font-size: 14px; text-align: center;">
      Keep your profile active and responsive to new inquiries — quick responses help you win more bookings!
    </p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs</p>
  </div>
</body>
</html>`;
}

/**
 * Build plain text email content for quote expired notification to chef.
 */
function buildQuoteExpiredEmailText(params: {
  chefName: string;
  dinerName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
  quoteAmount: number;
  bookingUrl: string;
}): string {
  const formattedDate = params.eventDate
    ? new Date(params.eventDate).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Not specified';

  return `Hi ${params.chefName},

Your quote for ${params.serviceName} has expired. ${params.dinerName} didn't respond within ${QUOTE_EXPIRY_DAYS} days, so the inquiry is now open for other chefs on Maison des Chefs.

⏰ QUOTE EXPIRED
Diner: ${params.dinerName}
Date: ${formattedDate}
Guests: ${params.guestCount}
Quote: $${params.quoteAmount.toFixed(2)}

💡 Good news: Your diner can still re-inquire with you directly, or another chef can now respond to their request.

View Other Inquiries → ${params.bookingUrl}

Keep your profile active and responsive to new inquiries — quick responses help you win more bookings!

— The Maison des Chefs Team

© 2024 Maison des Chefs`;
}

/**
 * Notify the diner when their quote has expired.
 * Sends email via Resend (or logs if Resend is down) with CTA to browse chefs or request new booking.
 */
async function notifyDinerQuoteExpired(lead: QuoteLeadRow): Promise<void> {
  // Skip if no diner email
  if (!lead.email) {
    console.warn(`[QuoteExpiry] No diner email for lead ${lead.id} — skipping diner notification.`);
    return;
  }

  // Get chef name for the notification
  const [chef] = await db
    .select({ name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, lead.chefId))
    .limit(1);

  const chefName = chef?.name || 'Chef';
  const dinerFirstName = lead.clientName?.split(' ')[0] || 'there';

  // Build email content
  const browseChefsUrl = DINER_DASHBOARD_URL;
  const newBookingUrl = DINER_DASHBOARD_URL;

  const subject = `🍽️ Your quote from Chef ${chefName} has expired`;
  const html = buildDinerQuoteExpiredEmailHtml({
    dinerName: dinerFirstName,
    chefName,
    serviceName: lead.eventDate || undefined,
    browseChefsUrl,
    newBookingUrl,
  });
  const text = buildDinerQuoteExpiredEmailText({
    dinerName: dinerFirstName,
    chefName,
    serviceName: lead.eventDate || undefined,
    browseChefsUrl,
    newBookingUrl,
  });

  // Send email to diner (best effort — does not block expiry)
  const emailSent = await sendDinerQuoteExpiredEmail(lead.email, {
    to: lead.email,
    subject,
    html,
    text,
  });

  if (!emailSent) {
    console.error(`[QuoteExpiry] Failed to send expiry notification email to diner ${lead.email} for lead ${lead.id}`);
  } else {
    console.log(`[QuoteExpiry] Diner ${lead.email} notified for lead ${lead.id} (quote expired)`);
  }
}

/**
 * Send quote expired email to diner.
 * Returns true on success or when Resend is not configured (graceful degradation).
 */
async function sendDinerQuoteExpiredEmail(
  to: string,
  params: { to: string; subject: string; html: string; text: string }
): Promise<boolean> {
  if (!resend) {
    console.warn(`[QuoteExpiry] RESEND_API_KEY not configured — logging email instead:`);
    console.log(`  To: ${params.to}`);
    console.log(`  Subject: ${params.subject}`);
    return true; // Graceful degradation
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[QuoteExpiry] RESEND_API_KEY is placeholder — stubbing email to ${params.to}`);
    return true;
  }

  if (!to) {
    console.warn(`[QuoteExpiry] No diner email — skipping notification`);
    return true;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (result.error) {
      console.error(`[QuoteExpiry] Failed to send email to ${params.to}:`, result.error);
      return false;
    }

    console.log(`[QuoteExpiry] Email sent to ${params.to}`);
    return true;
  } catch (err) {
    console.error(`[QuoteExpiry] Exception sending email to ${params.to}:`, err);
    return false;
  }
}

/**
 * Build HTML email content for quote expired notification to diner.
 * CTA: "Your quote has expired — browse chefs or request a new booking"
 */
function buildDinerQuoteExpiredEmailHtml(params: {
  dinerName: string;
  chefName: string;
  serviceName?: string;
  browseChefsUrl: string;
  newBookingUrl: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Quote Has Expired</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${params.dinerName},</h2>

    <p style="font-size: 16px; color: #555;">
      Unfortunately, <strong>Chef ${params.chefName}</strong>'s quote has expired. No worries — your event is still open and you can browse other talented chefs or request a new booking.
    </p>

    <div style="background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 15px;">
        ⏰ <strong>Quote Expired</strong><br>
        Chef: ${params.chefName}
      </p>
    </div>

    <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #0369a1; font-size: 14px;">
        💡 <strong>Don't worry!</strong> You can still find the perfect chef for your event. Browse our curated selection of private chefs or submit a new booking request.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.browseChefsUrl}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px; margin-right: 10px;">Browse Chefs</a>
      <a href="${params.newBookingUrl}" style="display: inline-block; background: #2c3e50; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Request New Booking</a>
    </div>

    <p style="color: #666; font-size: 14px; text-align: center;">
      Have questions? Reply directly to this email — it threads straight to our team.
    </p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs</p>
  </div>
</body>
</html>`;
}

/**
 * Build plain text email content for quote expired notification to diner.
 * CTA: "Your quote has expired — browse chefs or request a new booking"
 */
function buildDinerQuoteExpiredEmailText(params: {
  dinerName: string;
  chefName: string;
  serviceName?: string;
  browseChefsUrl: string;
  newBookingUrl: string;
}): string {
  return `Hi ${params.dinerName},

Unfortunately, Chef ${params.chefName}'s quote has expired. No worries — your event is still open and you can browse other talented chefs or request a new booking.

⏰ QUOTE EXPIRED
Chef: ${params.chefName}

💡 Don't worry! You can still find the perfect chef for your event. Browse our curated selection of private chefs or submit a new booking request.

Browse Chefs → ${params.browseChefsUrl}
Request New Booking → ${params.newBookingUrl}

Have questions? Reply directly to this email — it threads straight to our team.

— The Maison des Chefs Team

© 2024 Maison des Chefs`;
}
