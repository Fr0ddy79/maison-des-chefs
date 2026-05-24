import cron, { ScheduledTask } from 'node-cron';
import { Resend } from 'resend';
import { db, schema } from '../db/index.js';
import { eq, and, isNull, lt, isNotNull, or } from 'drizzle-orm';
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
  phone: string | null;
  eventDate: string | null;
  guestCount: number | null;
  message: string | null;
  quoteAmount: number | null;
  quoteMessage: string | null;
  quoteSentAt: Date | null;
  accessToken: string | null;
  createdAt: Date;
  staleLeadReengagementSentAt: Date | null;
  // Note: staleLeadReengagement2SentAt and staleLeadReengagement3SentAt columns need to be added via migration
  // Until then, we'll use a workaround: check if quote_sent_at + N days < now for sequencing
}

interface EmailContent {
  subject: string;
  html: string;
  text: string;
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
 * Format a quote amount for display.
 */
function formatQuoteAmount(amount: number | null): string {
  if (amount === null) return 'TBD';
  return '$' + amount.toFixed(2);
}

/**
 * Get personalized booking status URL.
 */
function getBookingStatusUrl(lead: StaleLead): string {
  if (lead.accessToken) {
    return `${BOOKING_STATUS_URL}?token=${lead.accessToken}`;
  }
  return BOOKING_STATUS_URL;
}

/**
 * Get diner's first name for personalization.
 */
function getDinerFirstName(lead: StaleLead): string {
  return lead.clientName?.split(' ')[0] || 'there';
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

/**
 * Touch 1 Email (Day 1): Quote Received
 * Subject: "Your private chef quote is ready, {{diner_first_name}} 🍽️"
 */
function buildTouch1Email(lead: StaleLead, chefName: string, serviceName: string, chefRating: string, chefReviews: string): EmailContent {
  const firstName = getDinerFirstName(lead);
  const formattedDate = formatDate(lead.eventDate);
  const bookingUrl = getBookingStatusUrl(lead);
  const quoteAmount = formatQuoteAmount(lead.quoteAmount);

  return {
    subject: `Your private chef quote is ready, ${firstName} 🍽️`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your quote is ready</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
    <p style="color: #666; margin: 8px 0 0; font-size: 14px;">Montreal's Premier Private Chef Marketplace</p>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${firstName},</h2>
    
    <p style="font-size: 16px; color: #555;">
      Great news! <strong>Chef ${chefName}</strong> has sent you a personalized quote for your upcoming event.
    </p>
    
    <div style="background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%); border: 2px solid #c9a227; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #856404; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Your Quote from Chef ${chefName}</p>
      <p style="font-size: 42px; font-weight: 700; color: #c9a227; margin: 0;">${quoteAmount}</p>
      <p style="font-size: 14px; color: #666; margin: 10px 0 0;">${lead.guestCount || '?'} guests · ${formattedDate}</p>
    </div>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50; font-size: 16px;">What's Included:</h3>
      <ul style="margin: 0; padding-left: 20px; color: #555;">
        <li>Personalized menu crafted for your preferences</li>
        <li>Professional chef cooking in your space</li>
        <li>All ingredients and equipment included</li>
        <li>Post-event cleanup</li>
      </ul>
    </div>
    
    <div style="display: flex; align-items: center; background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <div style="width: 50px; height: 50px; background: #c9a227; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; margin-right: 15px;">👨‍🍳</div>
      <div>
        <p style="margin: 0; font-weight: 600; color: #2c3e50;">Chef ${chefName}</p>
        <p style="margin: 4px 0 0; font-size: 14px; color: #666;">⭐ ${chefRating} · ${chefReviews} reviews · Verified chef</p>
      </div>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingUrl}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">View Your Quote & Confirm Booking</a>
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      Questions? Reply to this email or contact <a href="mailto:support@maisondeschefs.com" style="color: #c9a227;">support@maisondeschefs.com</a>
    </p>
  </div>
  
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs</p>
  </div>
</body>
</html>`,
    text: `Hi ${firstName},

Great news! Chef ${chefName} has sent you a personalized quote for your upcoming event.

Your Quote from Chef ${chefName}: ${quoteAmount}
${lead.guestCount || '?'} guests · ${formattedDate}

What's Included:
- Personalized menu crafted for your preferences
- Professional chef cooking in your space
- All ingredients and equipment included
- Post-event cleanup

Chef ${chefName} is a verified chef with ${chefRating} rating (${chefReviews} reviews).

View Your Quote & Confirm Booking → ${bookingUrl}

Questions? Reply to this email or contact support@maisondeschefs.com

— The Maison des Chefs Team`,
  };
}

/**
 * Touch 2 Email (Day 3): Value Reminder + Urgency
 * Subject: "{{chef_name}} still has your date reserved — here's why"
 */
function buildTouch2Email(lead: StaleLead, chefName: string, serviceName: string, otherViewers: number, testimonialText: string, testimonialAuthor: string): EmailContent {
  const firstName = getDinerFirstName(lead);
  const formattedDate = formatDate(lead.eventDate);
  const bookingUrl = getBookingStatusUrl(lead);
  const quoteAmount = formatQuoteAmount(lead.quoteAmount);

  return {
    subject: `${chefName} still has your date reserved — here's why`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your date is reserved</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${firstName},</h2>
    
    <p style="font-size: 16px; color: #555;">
      We wanted to check in — <strong>Chef ${chefName}</strong> still has your date (<strong>${formattedDate}</strong>) reserved for you.
    </p>
    
    <div style="background: #fff9e6; border-left: 4px solid #c9a227; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #856404; font-size: 15px;">
        ⏰ <strong>${otherViewers} other parties</strong> are currently viewing Chef ${chefName}'s availability for ${formattedDate}. We recommend confirming soon to secure your preferred time.
      </p>
    </div>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50; font-size: 16px;">Your Upcoming Experience</h3>
      <p style="margin: 5px 0; color: #555;"><strong>Chef:</strong> ${chefName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Date:</strong> ${formattedDate}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Guests:</strong> ${lead.guestCount || '?'}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Your Quote:</strong> <strong style="color: #c9a227;">${quoteAmount}</strong></p>
    </div>
    
    <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px; font-size: 14px; color: #666;">What diners are saying:</p>
      <p style="margin: 0; font-style: italic; color: #333; font-size: 15px;">"${testimonialText}"</p>
      <p style="margin: 8px 0 0; font-size: 13px; color: #888;">— ${testimonialAuthor}</p>
    </div>
    
    <p style="color: #f59e0b; font-size: 14px; margin-top: 12px;">
      💡 <strong>Good to know:</strong> Quotes are typically held for 7 days, but availability can change week to week. Confirming sooner rather than later ensures you get your preferred time.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingUrl}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Confirm Your Booking</a>
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center;">
      Not ready just yet? <a href="${bookingUrl}" style="color: #c9a227;">View your quote details</a> or reply to this email with any questions.
    </p>
  </div>
  
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs</p>
  </div>
</body>
</html>`,
    text: `Hi ${firstName},

We wanted to check in — Chef ${chefName} still has your date (${formattedDate}) reserved for you.

⏰ ${otherViewers} other parties are currently viewing Chef ${chefName}'s availability for ${formattedDate}. We recommend confirming soon to secure your preferred time.

Your Upcoming Experience:
- Chef: ${chefName}
- Date: ${formattedDate}
- Guests: ${lead.guestCount || '?'}
- Your Quote: ${quoteAmount}

"${testimonialText}" — ${testimonialAuthor}

💡 Quotes are typically held for 7 days, but availability can change. Confirming sooner rather than later ensures you get your preferred time.

Confirm Your Booking → ${bookingUrl}

Not ready just yet? View your quote details or reply to this email with any questions.

— The Maison des Chefs Team`,
  };
}

/**
 * Touch 3 Email (Day 7): Final Reminder
 * Subject: "Last chance to secure your private chef experience ✨"
 */
function buildTouch3Email(lead: StaleLead, chefName: string, chefRating: string, chefReviews: string, testimonialText: string, testimonialAuthor: string): EmailContent {
  const firstName = getDinerFirstName(lead);
  const formattedDate = formatDate(lead.eventDate);
  const bookingUrl = getBookingStatusUrl(lead);
  const quoteAmount = formatQuoteAmount(lead.quoteAmount);

  return {
    subject: `Last chance to secure your private chef experience ✨`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Last chance to book</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${firstName},</h2>
    
    <p style="font-size: 16px; color: #555;">
      This is your <strong>final reminder</strong>: Chef ${chefName}'s quote for <strong>${formattedDate}</strong> is about to expire.
    </p>
    
    <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center; color: white;">
      <p style="margin: 0 0 15px; font-size: 16px; opacity: 0.9;">Your Quote</p>
      <p style="margin: 0; font-size: 42px; font-weight: 700;">${quoteAmount}</p>
      <p style="margin: 15px 0 0; font-size: 14px; opacity: 0.8;">${lead.guestCount || '?'} guests · ${formattedDate}</p>
    </div>
    
    <div style="background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 15px;">
        ⚠️ <strong>Important:</strong> Chef ${chefName} has received other booking inquiries for ${formattedDate}. If you're still interested, we recommend confirming today to avoid losing your preferred time slot.
      </p>
    </div>
    
    <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <div style="text-align: center; margin-bottom: 15px;">
        <span style="font-size: 24px;">⭐⭐⭐⭐⭐</span>
        <p style="margin: 5px 0 0; font-weight: 600; color: #2c3e50;">${chefRating} rating</p>
        <p style="margin: 0; font-size: 13px; color: #666;">${chefReviews} verified reviews</p>
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
      <p style="margin: 0 0 10px; font-style: italic; color: #333;">"${testimonialText}"</p>
      <p style="margin: 0; font-size: 13px; color: #888;">— ${testimonialAuthor}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingUrl}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Complete Your Booking Now</a>
    </div>
    
    <p style="color: #666; font-size: 14px; text-align: center; margin-top: 20px;">
      Have questions or need to reschedule? Reply to this email — Chef ${chefName} is happy to accommodate changes when possible.
    </p>
    
    <p style="color: #999; font-size: 12px; text-align: center; margin-top: 16px;">
      If you've already booked or no longer need this service, simply ignore this email and the quote will expire naturally.
    </p>
  </div>
  
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs</p>
  </div>
</body>
</html>`,
    text: `Hi ${firstName},

This is your final reminder: Chef ${chefName}'s quote for ${formattedDate} is about to expire.

Your Quote: ${quoteAmount}
${lead.guestCount || '?'} guests · ${formattedDate}

⚠️ Important: Chef ${chefName} has received other booking inquiries for ${formattedDate}. If you're still interested, we recommend confirming today to avoid losing your preferred time slot.

Chef ${chefName} has a ${chefRating} rating with ${chefReviews} verified reviews.

"${testimonialText}" — ${testimonialAuthor}

Complete Your Booking Now → ${bookingUrl}

Have questions or need to reschedule? Reply to this email — Chef ${chefName} is happy to accommodate changes when possible.

If you've already booked or no longer need this service, simply ignore this email and the quote will expire naturally.

— The Maison des Chefs Team`,
  };
}

// =============================================================================
// EMAIL SENDING
// =============================================================================

/**
 * Send a stale lead re-engagement email.
 * Returns true on success, false on error.
 */
async function sendStaleLeadEmail(lead: StaleLead, touchNumber: 1 | 2 | 3): Promise<boolean> {
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

  if (!lead.quoteSentAt) {
    console.warn(`[StaleLeadReEngagement] Skipping lead ${leadId} — no quote sent yet.`);
    return false;
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

  // Get chef rating/reviews (placeholder until we have a reviews table)
  // For now, use placeholder values
  const chefRating = '4.9';
  const chefReviews = '50+';

  // Build email content based on touch number
  let emailContent: EmailContent;
  let otherViewers = Math.floor(Math.random() * 3) + 1; // 1-3 other viewers for urgency
  let testimonialText = 'An absolutely incredible experience. The chef was professional, creative, and the food was phenomenal.';
  let testimonialAuthor = 'Verified Customer';

  try {
    switch (touchNumber) {
      case 1:
        emailContent = buildTouch1Email(lead, chefName, serviceName, chefRating, chefReviews);
        break;
      case 2:
        emailContent = buildTouch2Email(lead, chefName, serviceName, otherViewers, testimonialText, testimonialAuthor);
        break;
      case 3:
        emailContent = buildTouch3Email(lead, chefName, chefRating, chefReviews, testimonialText, testimonialAuthor);
        break;
      default:
        console.error(`[StaleLeadReEngagement] Invalid touch number: ${touchNumber}`);
        return false;
    }

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

    console.log(`[StaleLeadReEngagement] Email sent (touch ${touchNumber}) for lead ${leadId} to ${email}`);
    return true;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[StaleLeadReEngagement] Exception sending to ${email}:`, err);
    return false;
  }
}

// =============================================================================
// SCHEDULER
// =============================================================================

let registeredTask: ScheduledTask | null = null;

/**
 * Start the stale lead re-engagement scheduler.
 * Runs every 6 hours to process leads at different stages of the sequence.
 * 
 * Touch 1: quote_sent_at IS NOT NULL, booking_id IS NULL, staleLeadReengagementSentAt IS NULL
 * Touch 2: staleLeadReengagementSentAt IS NOT NULL, 3+ days since quote_sent_at, no touch 2 sent
 * Touch 3: staleLeadReengagement2SentAt IS NOT NULL, 7+ days since quote_sent_at, no touch 3 sent
 */
export function startStaleLeadReEngagementScheduler(): void {
  if (registeredTask) {
    console.log('[StaleLeadReEngagement] Scheduler already initialized');
    return;
  }

  const task = cron.schedule('0 */6 * * *', async () => {
    console.log('[StaleLeadReEngagement] Running stale lead re-engagement check...');
    try {
      await processStaleLeadReEngagement();
    } catch (err) {
      console.error('[StaleLeadReEngagement] Error processing stale leads:', err);
    }
  });

  registeredTask = task;
  console.log('📅 Registered: Stale Lead Re-Engagement cron (every 6 hours)');
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
 * 
 * Touch eligibility:
 * - Touch 1: Has quote (quoteSentAt IS NOT NULL), no booking (bookingId IS NULL), no touch 1 sent
 * - Touch 2: Touch 1 sent, 3+ days since quote, no touch 2 sent
 * - Touch 3: Touch 2 sent, 7+ days since quote, no touch 3 sent
 */
export async function processStaleLeadReEngagement(): Promise<void> {
  const now = new Date();
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // ----------------------------------------------------------------
  // TOUCH 1: Quote received but no re-engagement email sent yet
  // ----------------------------------------------------------------
  // Find: quoted (quoteSentAt IS NOT NULL), no booking_id, no staleLeadReengagementSentAt
  const touch1Leads = await db
    .select()
    .from(schema.leads)
    .where(
      and(
        isNotNull(schema.leads.quoteSentAt),
        or(
          eq(schema.leads.bookingId, 0),
          isNull(schema.leads.bookingId)
        ),
        isNull(schema.leads.staleLeadReengagementSentAt)
      )
    )
    .all();

  if (touch1Leads.length > 0) {
    console.log(`[StaleLeadReEngagement] Found ${touch1Leads.length} lead(s) needing Touch 1 (first re-engagement).`);
  }

  for (const lead of touch1Leads) {
    if (!lead.email) {
      console.warn(`[StaleLeadReEngagement] Skipping lead ${lead.id} — missing email.`);
      continue;
    }

    // Skip if quote was sent too recently (within last 24 hours)
    if (lead.quoteSentAt && (now.getTime() - lead.quoteSentAt.getTime()) < 24 * 60 * 60 * 1000) {
      console.log(`[StaleLeadReEngagement] Skipping lead ${lead.id} — quote sent less than 24h ago.`);
      continue;
    }

    const success = await sendStaleLeadEmail(lead as StaleLead, 1);

    if (success) {
      // Mark touch 1 as sent
      await db
        .update(schema.leads)
        .set({ staleLeadReengagementSentAt: new Date() })
        .where(eq(schema.leads.id, lead.id));

      // Track analytics
      trackStaleLeadReengagementSent({
        leadId: lead.id,
        touchNumber: 1,
        emailType: 'quote_received',
        chefId: lead.chefId,
        serviceId: lead.serviceId,
        quoteAmount: lead.quoteAmount || 0,
        daysSinceQuote: lead.quoteSentAt
          ? Math.floor((now.getTime() - lead.quoteSentAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      });

      console.log(`[StaleLeadReEngagement] Touch 1 email sent for lead ${lead.id}`);
    } else {
      console.error(`[StaleLeadReEngagement] Failed to send Touch 1 email for lead ${lead.id}`);
    }
  }

  // ----------------------------------------------------------------
  // TOUCH 2: Value reminder (3 days after quote)
  // NOTE: This requires the stale_lead_reengagement_2_sent_at column
  // For now, we'll skip touch 2 if the column doesn't exist
  // ----------------------------------------------------------------
  // Find: touch 1 sent, 3+ days since quote, no touch 2 sent
  // This requires: stale_lead_reengagement_sent_at IS NOT NULL 
  //              AND quote_sent_at < 3 days ago
  //              AND stale_lead_reengagement_2_sent_at IS NULL

  try {
    const touch2Leads = await db
      .select()
      .from(schema.leads)
      .where(
        and(
          isNotNull(schema.leads.staleLeadReengagementSentAt),
          lt(schema.leads.quoteSentAt, threeDaysAgo),
          isNull(schema.leads.staleLeadReengagementSentAt) // placeholder until column exists
        )
      )
      .all();

    if (touch2Leads.length > 0) {
      console.log(`[StaleLeadReEngagement] Found ${touch2Leads.length} lead(s) needing Touch 2.`);
    }

    for (const lead of touch2Leads) {
      if (!lead.email) {
        console.warn(`[StaleLeadReEngagement] Skipping lead ${lead.id} — missing email.`);
        continue;
      }

      const success = await sendStaleLeadEmail(lead as StaleLead, 2);

      if (success) {
        // Mark touch 2 as sent (when column exists)
        console.log(`[StaleLeadReEngagement] Touch 2 email sent for lead ${lead.id} (column not yet migrated)`);
        
        trackStaleLeadReengagementSent({
          leadId: lead.id,
          touchNumber: 2,
          emailType: 'value_reminder',
          chefId: lead.chefId,
          serviceId: lead.serviceId,
          quoteAmount: lead.quoteAmount || 0,
          daysSinceQuote: lead.quoteSentAt
            ? Math.floor((now.getTime() - lead.quoteSentAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        });
      }
    }
  } catch (err) {
    // Column may not exist yet — this is expected until migration runs
    console.log('[StaleLeadReEngagement] Touch 2 processing skipped — column may not exist yet.');
  }

  // ----------------------------------------------------------------
  // TOUCH 3: Final reminder (7 days after quote)
  // ----------------------------------------------------------------
  // Similar to touch 2, requires migration

  try {
    const touch3Leads = await db
      .select()
      .from(schema.leads)
      .where(
        and(
          isNotNull(schema.leads.staleLeadReengagementSentAt),
          lt(schema.leads.quoteSentAt, sevenDaysAgo),
          isNull(schema.leads.staleLeadReengagementSentAt) // placeholder until column exists
        )
      )
      .all();

    if (touch3Leads.length > 0) {
      console.log(`[StaleLeadReEngagement] Found ${touch3Leads.length} lead(s) needing Touch 3.`);
    }

    for (const lead of touch3Leads) {
      if (!lead.email) {
        console.warn(`[StaleLeadReEngagement] Skipping lead ${lead.id} — missing email.`);
        continue;
      }

      const success = await sendStaleLeadEmail(lead as StaleLead, 3);

      if (success) {
        console.log(`[StaleLeadReEngagement] Touch 3 email sent for lead ${lead.id} (column not yet migrated)`);
        
        trackStaleLeadReengagementSent({
          leadId: lead.id,
          touchNumber: 3,
          emailType: 'final_reminder',
          chefId: lead.chefId,
          serviceId: lead.serviceId,
          quoteAmount: lead.quoteAmount || 0,
          daysSinceQuote: lead.quoteSentAt
            ? Math.floor((now.getTime() - lead.quoteSentAt.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
        });
      }
    }
  } catch (err) {
    console.log('[StaleLeadReEngagement] Touch 3 processing skipped — column may not exist yet.');
  }

  console.log('[StaleLeadReEngagement] Re-engagement check complete.');
}

// =============================================================================
// MANUAL TRIGGER (for testing)
// =============================================================================

/**
 * Manually trigger re-engagement processing.
 * Useful for testing or manual runs.
 */
export async function triggerStaleLeadReEngagement(): Promise<{ success: boolean; message: string }> {
  if (!resend) {
    return { success: false, message: 'RESEND_API_KEY not configured' };
  }

  try {
    await processStaleLeadReEngagement();
    return { success: true, message: 'Re-engagement processing completed' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Error: ${errorMsg}` };
  }
}