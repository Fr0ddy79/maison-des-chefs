import cron, { ScheduledTask } from 'node-cron';
import { db, schema } from '../db/index.js';
import { eq, and, isNull, lt, gt, or } from 'drizzle-orm';
import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';

interface QuoteReminderEmailParams {
  to: string;
  dinerName: string;
  chefName: string;
  quoteAmount: number;
  leadId: number;
  serviceName?: string;
  eventDate?: string;
  partySize?: number;
}

/**
 * Format a date string for display in emails.
 */
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Not specified';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format a quote amount for display.
 */
function formatQuoteAmount(amount: number): string {
  return '$' + amount.toFixed(2);
}

/**
 * Send quote reminder email to a diner who hasn't responded to a quote.
 * Returns true on success, false on error.
 */
async function sendQuoteReminderEmail(params: QuoteReminderEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, dinerName, chefName, quoteAmount, leadId, serviceName, eventDate, partySize } = params;

  if (!resend) {
    console.warn(`[QuoteReminder] RESEND_API_KEY not configured - cannot send email to ${to}`);
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  // Skip if key is a placeholder
  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[QuoteReminder] RESEND_API_KEY is placeholder, stubbing email send');
    return { success: true };
  }

  const bookUrl = `${DASHBOARD_URL}/bookings`;
  const formattedAmount = formatQuoteAmount(quoteAmount);
  const formattedDate = eventDate ? formatDate(eventDate) : null;

  const eventRecap = (serviceName || formattedDate || partySize)
    ? `<div style="color: #666; font-size: 14px; margin-bottom: 16px;">
        ${formattedDate ? `<p style="margin: 0 0 4px;">📅 ${formattedDate}</p>` : ''}
        ${partySize ? `<p style="margin: 0 0 4px;">👥 ${partySize} guests</p>` : ''}
        ${serviceName ? `<p style="margin: 0;">🍽️ ${serviceName}</p>` : ''}
       </div>`
    : '';

  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your quote from Chef ${chefName} is waiting ✨</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">✨ Hi ${dinerName},</h2>

    <p style="color: #666; font-size: 16px;">
      Just a friendly reminder — <strong>Chef ${chefName}</strong> sent you a quote and it's waiting for you!
    </p>

    <div style="background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%); border: 2px solid #c9a227; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #856404; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Your Quote from Chef ${chefName}</p>
      <p style="font-size: 42px; font-weight: 700; color: #c9a227; margin: 0;">${formattedAmount}</p>
    </div>

    ${eventRecap}

    <p style="color: #666; font-size: 15px;">
      It's easy to lock it in — just click below to accept your quote and confirm your booking.
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookUrl}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Accept Quote & Book</a>
    </div>

    <p style="color: #f59e0b; font-size: 14px; margin-top: 12px;">
      ⏰ Your quote expires <strong>tomorrow</strong> — availability can change, so we recommend confirming soon to secure your date.
    </p>

    <p style="color: #666; font-size: 14px; margin-top: 16px;">
      Not ready just yet? <a href="${bookUrl}" style="color: #666;">View full quote details</a>.
    </p>

    <p style="color: #999; font-size: 12px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 12px;">
      Questions? Reply directly to this email — it threads straight to Chef ${chefName}.
    </p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `⏳ Your quote from Chef ${chefName} is waiting ✨`,
      html: emailHtml,
    });

    if (result.error) {
      console.error(`[QuoteReminder] Failed to send to ${to}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[QuoteReminder] Sent reminder to ${dinerName} for lead ${leadId}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[QuoteReminder] Exception sending to ${to}:`, err);
    return { success: false, error: errorMsg };
  }
}

let registeredTask: ScheduledTask | null = null;

/**
 * Initialize the quote reminder scheduler.
 * Runs every 6 hours to find leads that need reminders.
 */
export function startQuoteReminderScheduler(): void {
  if (registeredTask) {
    console.log('[QuoteReminder] Scheduler already initialized');
    return;
  }

  const task = cron.schedule('0 */6 * * *', async () => {
    console.log('[QuoteReminder] Running quote reminder check...');
    try {
      // Process 24h pre-warning emails first
      await process24hPreWarnings();
      // Then process 48h+ nudge reminders
      await processQuoteReminders();
    } catch (err) {
      console.error('[QuoteReminder] Error processing quote reminders:', err);
    }
  });

  registeredTask = task;
  console.log('📅 Registered: Quote Reminder cron (every 6 hours)');
}

/**
 * Stop the quote reminder scheduler.
 */
export function stopQuoteReminderScheduler(): void {
  if (registeredTask) {
    registeredTask.stop();
    registeredTask = null;
    console.log('[QuoteReminder] Scheduler stopped');
  }
}

/**
 * Find leads that are in 'new' status, have had a quote sent MORE than 48h ago,
 * and haven't yet received a reminder. Send a reminder and mark as sent.
 */
export async function processQuoteReminders(): Promise<void> {
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

  // Find leads: 'responded' status (quote sent, diner hasn't converted), quote sent MORE than 48h ago, no reminder sent yet
  const leadsToRemind = await db
    .select()
    .from(schema.leads)
    .where(
      and(
        eq(schema.leads.status, 'responded'),
        lt(schema.leads.quoteSentAt, fortyEightHoursAgo),
        isNull(schema.leads.quoteReminderSentAt)
      )
    )
    .all();

  if (leadsToRemind.length === 0) {
    console.log('[QuoteReminder] No leads needing reminder.');
    return;
  }

  console.log(`[QuoteReminder] Found ${leadsToRemind.length} lead(s) needing reminder.`);

  for (const lead of leadsToRemind) {
    if (!lead.email || !lead.quoteAmount) {
      console.warn(`[QuoteReminder] Skipping lead ${lead.id} — missing email or quote amount.`);
      continue;
    }

    // Get chef name
    const [chef] = await db
      .select({ name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, lead.chefId))
      .limit(1);

    const chefName = chef?.name || 'Chef';
    const dinerFirstName = lead.clientName?.split(' ')[0] || 'there';

    // Get service name if serviceId exists
    let serviceName: string | undefined;
    if (lead.serviceId) {
      const [service] = await db
        .select({ name: schema.services.name })
        .from(schema.services)
        .where(eq(schema.services.id, lead.serviceId))
        .limit(1);
      serviceName = service?.name;
    }

    const result = await sendQuoteReminderEmail({
      to: lead.email,
      dinerName: dinerFirstName,
      chefName,
      quoteAmount: lead.quoteAmount,
      leadId: lead.id,
      serviceName,
      eventDate: lead.eventDate || undefined,
      partySize: lead.guestCount || undefined,
    });

    if (result.success) {
      // Mark reminder as sent
      await db
        .update(schema.leads)
        .set({ quoteReminderSentAt: new Date() })
        .where(eq(schema.leads.id, lead.id));
      console.log(`[QuoteReminder] Sent reminder for lead ${lead.id} to ${lead.email}`);
    } else {
      console.error(`[QuoteReminder] Failed to send reminder for lead ${lead.id}: ${result.error}`);
    }
  }
}

/**
 * Send 24h pre-warning email to a diner whose quote is about to expire.
 * Returns true on success, false on error.
 */
async function sendQuote24hPreWarningEmail(params: QuoteReminderEmailParams): Promise<{ success: boolean; error?: string }> {
  const { to, dinerName, chefName, quoteAmount, leadId, serviceName, eventDate, partySize } = params;

  if (!resend) {
    console.warn(`[QuoteReminder] RESEND_API_KEY not configured - cannot send 24h pre-warning to ${to}`);
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }

  // Skip if key is a placeholder
  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[QuoteReminder] RESEND_API_KEY is placeholder, stubbing 24h pre-warning send');
    return { success: true };
  }

  const bookUrl = `${DASHBOARD_URL}/bookings`;
  const formattedAmount = formatQuoteAmount(quoteAmount);
  const formattedDate = eventDate ? formatDate(eventDate) : null;

  const eventRecap = (serviceName || formattedDate || partySize)
    ? `<div style="color: #666; font-size: 14px; margin-bottom: 16px;">
        ${formattedDate ? `<p style="margin: 0 0 4px;">📅 ${formattedDate}</p>` : ''}
        ${partySize ? `<p style="margin: 0 0 4px;">👥 ${partySize} guests</p>` : ''}
        ${serviceName ? `<p style="margin: 0;">🍽️ ${serviceName}</p>` : ''}
       </div>`
    : '';

  const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your quote expires tomorrow!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">⏰ Hi ${dinerName},</h2>

    <p style="color: #666; font-size: 16px;">
      <strong>Important:</strong> Chef ${chefName}'s quote for your event expires <strong>tomorrow</strong>!
    </p>

    <div style="background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%); border: 2px solid #c9a227; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #856404; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Your Quote from Chef ${chefName}</p>
      <p style="font-size: 42px; font-weight: 700; color: #c9a227; margin: 0;">${formattedAmount}</p>
    </div>

    ${eventRecap}

    <div style="background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 15px;">
        ⏰ <strong>Your quote expires in 24 hours!</strong><br>
        Don't miss out on Chef ${chefName} — confirm your booking now to secure your date.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookUrl}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Accept Quote & Book Now</a>
    </div>

    <p style="color: #666; font-size: 14px; margin-top: 16px;">
      Have questions? Reply directly to this email — it threads straight to Chef ${chefName}.
    </p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`;

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `⏰ ${dinerName}, your quote from Chef ${chefName} expires tomorrow!`,
      html: emailHtml,
    });

    if (result.error) {
      console.error(`[QuoteReminder] Failed to send 24h pre-warning to ${to}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[QuoteReminder] Sent 24h pre-warning to ${dinerName} for lead ${leadId}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[QuoteReminder] Exception sending 24h pre-warning to ${to}:`, err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Find leads that have had a quote sent ~24h ago and send a pre-warning email.
 * Targets leads with status 'quoted' or 'responded' who haven't accepted.
 * Uses quoteReminderSentAt for idempotency to prevent duplicate sends.
 * 
 * Runs at quoteSentAt + 24h (with 6h cron window: 21-27h after quoteSentAt).
 */
export async function process24hPreWarnings(): Promise<void> {
  // 24h ago (with buffer for cron window: 21-27h)
  const twentyOneHoursAgo = new Date(Date.now() - 21 * 60 * 60 * 1000);
  const twentySevenHoursAgo = new Date(Date.now() - 27 * 60 * 60 * 1000);

  // Find leads: 'quoted' or 'responded' status, quote sent 21-27h ago, no reminder sent yet
  // Note: Using quoteReminderSentAt for idempotency (same field as 48h nudge)
  // If 24h pre-warning is sent, the 48h nudge will not fire for this lead
  const leadsToWarn = await db
    .select()
    .from(schema.leads)
    .where(
      and(
        // Lead has been quoted (quote sent to diner)
        or(
          eq(schema.leads.status, 'quoted'),
          eq(schema.leads.status, 'responded')
        ),
        // Quote was sent 21-27h ago (24h mark with 6h cron window)
        lt(schema.leads.quoteSentAt, twentyOneHoursAgo),
        gt(schema.leads.quoteSentAt, twentySevenHoursAgo),
        // No reminder sent yet (idempotency)
        isNull(schema.leads.quoteReminderSentAt)
      )
    )
    .all();

  if (leadsToWarn.length === 0) {
    console.log('[QuoteReminder] No leads needing 24h pre-warning.');
    return;
  }

  console.log(`[QuoteReminder] Found ${leadsToWarn.length} lead(s) needing 24h pre-warning.`);

  for (const lead of leadsToWarn) {
    if (!lead.email || !lead.quoteAmount) {
      console.warn(`[QuoteReminder] Skipping lead ${lead.id} for 24h pre-warning — missing email or quote amount.`);
      continue;
    }

    // Get chef name
    const [chef] = await db
      .select({ name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.id, lead.chefId))
      .limit(1);

    const chefName = chef?.name || 'Chef';
    const dinerFirstName = lead.clientName?.split(' ')[0] || 'there';

    // Get service name if serviceId exists
    let serviceName: string | undefined;
    if (lead.serviceId) {
      const [service] = await db
        .select({ name: schema.services.name })
        .from(schema.services)
        .where(eq(schema.services.id, lead.serviceId))
        .limit(1);
      serviceName = service?.name;
    }

    const result = await sendQuote24hPreWarningEmail({
      to: lead.email,
      dinerName: dinerFirstName,
      chefName,
      quoteAmount: lead.quoteAmount,
      leadId: lead.id,
      serviceName,
      eventDate: lead.eventDate || undefined,
      partySize: lead.guestCount || undefined,
    });

    if (result.success) {
      // Mark pre-warning as sent (reuses quoteReminderSentAt for idempotency)
      await db
        .update(schema.leads)
        .set({ quoteReminderSentAt: new Date() })
        .where(eq(schema.leads.id, lead.id));
      console.log(`[QuoteReminder] Sent 24h pre-warning for lead ${lead.id} to ${lead.email}`);
    } else {
      console.error(`[QuoteReminder] Failed to send 24h pre-warning for lead ${lead.id}: ${result.error}`);
    }
  }
}
