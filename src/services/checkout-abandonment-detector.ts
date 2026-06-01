/**
 * MAI-2311: Checkout Abandonment Detection + Recovery Email
 * 
 * Runs on a cron schedule (every 15 minutes). Detects leads who:
 * - Visited the checkout page (checkoutPageVisitedAt is set)
 * - Haven't completed payment (status = 'quoted' not 'accepted'/'confirmed')
 * - Haven't already received an abandonment email
 * - Quote hasn't expired yet (quoteSentAt + 48h > now)
 * 
 * For qualifying leads, sends a high-urgency recovery email and marks
 * checkoutAbandonmentEmailSentAt.
 */

import { db } from '../db/index.js';
import { leads, users, services, chefProfiles } from '../db/schema.js';
import { eq, and, isNull, isNotNull, lt, gt, sql } from 'drizzle-orm';

const CHECKOUT_ABANDONMENT_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours
const QUOTE_EXPIRY_HOURS = 48;

// Resend email sending (stub if key missing)
async function sendCheckoutRecoveryEmail(lead: any): Promise<boolean> {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY || RESEND_API_KEY.startsWith('re_placeholder')) {
    console.log(`[CheckoutAbandonment] Would send recovery email to ${lead.email} for lead ${lead.id} (no Resend key configured)`);
    return false;
  }

  const chef = db.select({
    name: users.name,
    location: chefProfiles.location,
  })
    .from(users)
    .leftJoin(chefProfiles, eq(users.id, chefProfiles.userId))
    .where(eq(users.id, lead.chefId))
    .get();

  const service = db.select({
    name: services.name,
  })
    .from(services)
    .where(eq(services.id, lead.serviceId))
    .get();

  // Calculate time remaining until quote expiry
  const quoteExpiryMs = lead.quoteSentAt
    ? new Date(lead.quoteSentAt).getTime() + (QUOTE_EXPIRY_HOURS * 60 * 60 * 1000)
    : null;
  const timeRemaining = quoteExpiryMs
    ? formatTimeRemaining(quoteExpiryMs - Date.now())
    : '24 hours';

  // Get diner first name
  const dinerName = lead.clientName ? lead.clientName.split(' ')[0] : 'there';

  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
    .header h1 { margin: 0; font-size: 1.5rem; }
    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px; }
    .booking-card { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e5e7eb; }
    .booking-card h3 { margin: 0 0 10px 0; color: #2c3e50; }
    .booking-detail { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
    .booking-detail:last-child { border-bottom: none; }
    .label { color: #666; font-size: 0.9rem; }
    .value { font-weight: 500; color: #2c3e50; }
    .cta-button { display: block; width: 100%; background: #c9a227; color: white; padding: 16px; border: none; border-radius: 8px; font-size: 1.1rem; font-weight: 600; text-align: center; text-decoration: none; margin: 20px 0; transition: background 0.2s; }
    .cta-button:hover { background: #b8922a; }
    .urgency-box { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; text-align: center; margin: 20px 0; }
    .urgency-box .time { font-size: 1.5rem; font-weight: 700; color: #92400e; }
    .footer { text-align: center; padding: 20px; color: #888; font-size: 0.85rem; }
    .footer a { color: #c9a227; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🍽️ Complete Your Booking</h1>
    </div>
    <div class="content">
      <p>Hi ${dinerName},</p>
      <p>We noticed you visited the checkout page for Chef ${chef?.name || 'your chef'}'s service but didn't complete your payment. Your quote is still valid — don't miss out!</p>
      
      <div class="urgency-box">
        <div style="font-size: 0.9rem; color: #92400e; margin-bottom: 4px;">⏰ Your quote expires in:</div>
        <div class="time">${timeRemaining}</div>
      </div>
      
      <div class="booking-card">
        <h3>${service?.name || 'Your Private Chef Experience'}</h3>
        <div class="booking-detail">
          <span class="label">Chef</span>
          <span class="value">Chef ${chef?.name || 'your chef'}</span>
        </div>
        <div class="booking-detail">
          <span class="label">Event Date</span>
          <span class="value">${lead.eventDate ? new Date(lead.eventDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'Not specified'}</span>
        </div>
        <div class="booking-detail">
          <span class="label">Guests</span>
          <span class="value">${lead.guestCount || 0}</span>
        </div>
        <div class="booking-detail">
          <span class="label">Total</span>
          <span class="value" style="color: #c9a227; font-size: 1.1rem;">$${(lead.quoteAmount || 0).toFixed(2)}</span>
        </div>
      </div>
      
      <a href="${process.env.APP_URL || 'https://maisondeschefs.com'}/checkout/${lead.id}?token=${lead.accessToken || ''}" class="cta-button">
        Complete Payment →
      </a>
      
      <p style="font-size: 0.9rem; color: #666;">If you have questions or need to modify your booking, reply to this email — we're here to help!</p>
    </div>
    <div class="footer">
      <p>Maison des Chefs — Montreal's premier private chef marketplace</p>
      <p><a href="${process.env.APP_URL || 'https://maisondeschefs.com'}">Visit Website</a> · <a href="mailto:support@maisondeschefs.com">Contact Support</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Maison des Chefs <noreply@maisondeschefs.com>',
        to: lead.email,
        subject: `Complete your payment — Chef ${chef?.name || 'your chef'}'s quote expires in ${timeRemaining}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[CheckoutAbandonment] Failed to send email: ${error}`);
      return false;
    }

    console.log(`[CheckoutAbandonment] Sent recovery email to ${lead.email} for lead ${lead.id}`);
    return true;
  } catch (err) {
    console.error(`[CheckoutAbandonment] Error sending email:`, err);
    return false;
  }
}

function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'EXPIRED';
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''}`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Process all abandoned checkouts and send recovery emails.
 * Called by the scheduler every 15 minutes.
 */
export async function processCheckoutAbandonments(): Promise<void> {
  console.log('[CheckoutAbandonment] Running abandonment check...');

  const now = Date.now();
  const abandonmentThreshold = new Date(now - CHECKOUT_ABANDONMENT_THRESHOLD_MS);
  
  // Find leads where:
  // - checkoutPageVisitedAt is set (diner visited checkout)
  // - checkoutAbandonmentEmailSentAt is null (no email sent yet)
  // - status is 'quoted' (has a quote but hasn't paid/confirmed)
  // - checkoutPageVisitedAt is older than 2 hours (abandoned, not just browsing)
  // - quote hasn't expired (quoteSentAt + 48h > now)
  const abandonedLeads = db.select({
    id: leads.id,
    email: leads.email,
    clientName: leads.clientName,
    chefId: leads.chefId,
    serviceId: leads.serviceId,
    eventDate: leads.eventDate,
    guestCount: leads.guestCount,
    quoteAmount: leads.quoteAmount,
    quoteSentAt: leads.quoteSentAt,
    accessToken: leads.accessToken,
  })
    .from(leads)
    .where(
      and(
        eq(leads.status, 'quoted'),
        isNotNull(leads.checkoutPageVisitedAt),
        isNull(leads.checkoutAbandonmentEmailSentAt),
        lt(leads.checkoutPageVisitedAt, abandonmentThreshold),
        // Quote must still be valid (not expired)
        isNotNull(leads.quoteSentAt),
        gt(sql`quote_sent_at + ${QUOTE_EXPIRY_HOURS * 60 * 60 * 1000}`, now),
      )
    )
    .all();

  if (abandonedLeads.length === 0) {
    console.log('[CheckoutAbandonment] No abandoned checkouts found.');
    return;
  }

  console.log(`[CheckoutAbandonment] Found ${abandonedLeads.length} abandoned checkout(s) to process.`);

  for (const lead of abandonedLeads) {
    const sent = await sendCheckoutRecoveryEmail(lead);
    if (sent) {
      // Mark email as sent (idempotent)
      db.update(leads)
        .set({ checkoutAbandonmentEmailSentAt: new Date() })
        .where(eq(leads.id, lead.id))
        .run();
      
      console.log(`[CheckoutAbandonment] Marked lead ${lead.id} as emailed.`);
      
      // Fire analytics event
      try {
        await fetch(`${process.env.APP_URL || 'http://localhost:3001'}/api/analytics/event`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'checkout_abandonment_email_sent',
            leadId: lead.id,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch { /* ignore analytics errors */ }
    }
  }

  console.log(`[CheckoutAbandonment] Processed ${abandonedLeads.length} abandoned checkout(s).`);
}

/**
 * Start the checkout abandonment detection scheduler.
 * Runs every 15 minutes.
 */
export function startCheckoutAbandonmentScheduler(): void {
  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutes
  
  console.log(`[CheckoutAbandonment] Scheduler starting (interval: ${INTERVAL_MS / 1000 / 60} min)`);
  
  // Run immediately on startup
  processCheckoutAbandonments().catch(err => {
    console.error('[CheckoutAbandonment] Error during initial run:', err);
  });
  
  // Then run every 15 minutes
  setInterval(() => {
    processCheckoutAbandonments().catch(err => {
      console.error('[CheckoutAbandonment] Error during scheduled run:', err);
    });
  }, INTERVAL_MS);
}