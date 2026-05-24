import { Resend } from 'resend';
import { db } from '../db/index.js';
import { leads } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const SERVICES_URL = process.env.SERVICES_URL || 'https://maisondeschefs.com/services';
const DINER_BOOKINGS_URL = process.env.DINER_BOOKINGS_URL || 'https://maisondeschefs.com/diner/bookings';

interface DinerConfirmationEmailParams {
  leadId: number;
  dinerName: string;
  dinerEmail: string;
  chefName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
  bookingStatusUrl?: string; // MAI-805: URL for guests to track their inquiry
}

interface MultiChefConfirmationParams {
  leadIds: number[];
  dinerName: string;
  dinerEmail: string;
  chefs: Array<{
    chefName: string;
    serviceName: string;
    eventDate: string | null;
    guestCount: number;
  }>;
  bookingStatusUrl?: string;
}

interface QuoteEmailParams {
  leadId: number;
  dinerName: string;
  dinerEmail: string;
  chefName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
  quoteAmount: number;
  quoteMessage?: string;
  chefNote?: string;
  quoteToken?: string; // MAI-766: Raw token for booking deep link
  bookingUrl?: string; // MAI-2037: Booking URL using quoteToken + /book/{leadId} format
  bookingStatusUrl?: string; // MAI-805: URL for guests to track their inquiry (legacy/fallback)
}

interface DeclinedEmailParams {
  leadId: number;
  dinerName: string;
  dinerEmail: string;
  chefName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
  reason?: string;
  bookingStatusUrl?: string;
}

// MAI-1396: Status transition email — accepted/converted
interface AcceptedEmailParams {
  leadId: number;
  dinerName: string;
  dinerEmail: string;
  chefName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
  quoteAmount?: number;
  bookingStatusUrl?: string;
  dinerBookingsUrl?: string;
}

// MAI-1396: Status transition email — lead expired (72h no response)
interface ExpiredEmailParams {
  leadId: number;
  dinerName: string;
  dinerEmail: string;
  chefName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
  bookingStatusUrl?: string;
  browseUrl?: string;
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
 * Build the diner post-inquiry confirmation email content.
 */
function buildDinerConfirmationEmail(params: DinerConfirmationEmailParams): { subject: string; html: string; text: string } {
  // MAI-805: Use the provided booking status URL or default to dashboard
  const bookingStatusLink = params.bookingStatusUrl || `${DASHBOARD_URL}/booking-status`;
  const servicesLink = SERVICES_URL;

  return {
    subject: `Your inquiry is sent to Chef ${params.chefName}! ⏳`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your inquiry has been sent</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${params.dinerName},</h2>
    
    <p style="font-size: 16px; color: #555;">Your inquiry has been sent to Chef ${params.chefName}! 🍽️</p>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Inquiry Summary</h3>
      <p style="margin: 5px 0; color: #555;"><strong>Service:</strong> ${params.serviceName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Chef:</strong> ${params.chefName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Event:</strong> ${formatDate(params.eventDate)}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Guests:</strong> ${params.guestCount}</p>
    </div>
    
    <h3 style="color: #2c3e50; margin-top: 25px;">What happens next:</h3>
    <ol style="color: #555; line-height: 1.8;">
      <li>Chef ${params.chefName} will review your request and respond within <strong>24 hours</strong></li>
      <li>You'll receive an email when they respond</li>
      <li><strong>Track your booking status</strong> → <a href="${bookingStatusLink}" style="color: #c9a227;">View Booking Status</a></li>
    </ol>
    
    <p style="font-size: 16px; color: #555; margin-top: 20px;">In the meantime, browse more chefs → <a href="${servicesLink}" style="color: #c9a227;">Explore Services</a></p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingStatusLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Track Your Booking</a>
    </div>
    
    <p style="font-size: 14px; color: #888; text-align: center;">Questions? We're here to help at support@maisondeschefs.com</p>
  </div>
  
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${params.dinerName},

Your inquiry has been sent to Chef ${params.chefName}! 🍽️

Service: ${params.serviceName}
Chef: ${params.chefName}
Event: ${formatDate(params.eventDate)}
Guests: ${params.guestCount}

What happens next:
1. Chef ${params.chefName} will review your request and respond within 24 hours
2. You'll receive an email when they respond
3. Track your booking status → ${bookingStatusLink}

In the meantime, browse more chefs → ${servicesLink}

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send the diner post-inquiry confirmation email.
 * Idempotent - only sends if inquiry_confirm_sent_at is null.
 * Returns true if email was sent (or already sent), false on error.
 */
export async function sendDinerConfirmationEmail(params: DinerConfirmationEmailParams): Promise<boolean> {
  const { leadId, dinerEmail } = params;

  // Idempotency check: only send if inquiry_confirm_sent_at is null
  const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) {
    console.error(`[DinerConfirmation] Lead ${leadId} not found`);
    return false;
  }

  if (lead.inquiryConfirmSentAt) {
    console.log(`[DinerConfirmation] Email already sent for lead ${leadId}, skipping`);
    return true; // Already sent, treat as success
  }

  if (!resend) {
    console.log('[DinerConfirmation] Resend not configured, skipping email');
    // Still mark as sent in stub mode to prevent retries
    db.update(leads).set({ inquiryConfirmSentAt: new Date() }).where(eq(leads.id, leadId)).run();
    return true;
  }

  // Skip if key is a placeholder
  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[DinerConfirmation] RESEND_API_KEY is placeholder, stubbing email send');
    // Mark as sent in stub mode
    db.update(leads).set({ inquiryConfirmSentAt: new Date() }).where(eq(leads.id, leadId)).run();
    return true;
  }

  try {
    const email = buildDinerConfirmationEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[DinerConfirmation] Failed to send confirmation email:', result.error);
      return false;
    }

    // Mark as sent
    db.update(leads).set({ inquiryConfirmSentAt: new Date() }).where(eq(leads.id, leadId)).run();
    console.log(`[DinerConfirmation] Confirmation email sent for lead ${leadId}`);
    return true;
  } catch (error) {
    console.error('[DinerConfirmation] Error sending confirmation email:', error);
    return false;
  }
}

/**
 * Build the multi-chef inquiry confirmation email content.
 * Sent when a diner submits a single inquiry to multiple chefs at once.
 */
function buildMultiChefConfirmationEmail(params: MultiChefConfirmationParams): { subject: string; html: string; text: string } {
  const bookingStatusLink = params.bookingStatusUrl || `${DASHBOARD_URL}/booking-status`;
  const servicesLink = SERVICES_URL;

  const chefListHtml = params.chefs
    .map(
      (c) => `
      <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; margin: 10px 0; border-left: 4px solid #c9a227;">
        <p style="margin: 0 0 5px; font-weight: 600; color: #2c3e50;">👨‍🍳 ${c.chefName}</p>
        <p style="margin: 0 0 5px; color: #555; font-size: 14px;">Service: ${c.serviceName}</p>
        <p style="margin: 0 0 5px; color: #555; font-size: 14px;">Event: ${formatDate(c.eventDate)}</p>
        <p style="margin: 0; color: #555; font-size: 14px;">Guests: ${c.guestCount}</p>
      </div>`
    )
    .join("");

  const chefListText = params.chefs
    .map((c) => `• ${c.chefName} - ${c.serviceName} (${c.guestCount} guests, ${formatDate(c.eventDate)})`)
    .join("\n");

  const subject = `Your inquiry is sent to ${params.chefs.length} chef${params.chefs.length > 1 ? "s" : ""}! 🍽️`;

  return {
    subject,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your multi-chef inquiry</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${params.dinerName},</h2>
    
    <p style="font-size: 16px; color: #555;">Your inquiry has been sent to <strong>${params.chefs.length} chef${params.chefs.length > 1 ? "s" : ""}</strong>! 🎉</p>
    
    <div style="background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="margin: 0; font-size: 16px; color: #2e7d32;">✓ Inquiry sent to ${params.chefs.length} chef${params.chefs.length > 1 ? "s" : ""}</p>
    </div>
    
    <h3 style="color: #2c3e50; margin-top: 25px;">Chefs Contacted</h3>
    ${chefListHtml}
    
    <h3 style="color: #2c3e50; margin-top: 25px;">What happens next:</h3>
    <ol style="color: #555; line-height: 1.8;">
      <li>Each chef will review your request and respond within <strong>24 hours</strong></li>
      <li>You'll receive an email when any chef responds</li>
      <li><strong>Track your booking status</strong> → <a href="${bookingStatusLink}" style="color: #c9a227;">View Booking Status</a></li>
    </ol>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingStatusLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Track Your Booking</a>
    </div>
    
    <p style="font-size: 14px; color: #888; text-align: center;">Questions? We're here to help at support@maisondeschefs.com</p>
  </div>
  
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${params.dinerName},

Your inquiry has been sent to ${params.chefs.length} chef${params.chefs.length > 1 ? "s" : ""}! 🍽️

CHEFS CONTACTED:
${chefListText}

What happens next:
1. Each chef will review your request and respond within 24 hours
2. You'll receive an email when they respond
3. Track your booking status → ${bookingStatusLink}

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send the multi-chef confirmation email.
 * Sends one email listing all selected chefs (not one per chef).
 * Sets inquiryConfirmSentAt on the first lead.
 * Returns true on success, false on error.
 */
export async function sendMultiChefConfirmationEmail(params: MultiChefConfirmationParams): Promise<boolean> {
  const { leadIds, dinerEmail } = params;

  if (leadIds.length === 0) {
    console.error('[MultiChefConfirmation] No lead IDs provided');
    return false;
  }

  const firstLeadId = leadIds[0];

  // Idempotency check: only send if inquiry_confirm_sent_at is null on first lead
  const firstLead = db.select().from(leads).where(eq(leads.id, firstLeadId)).get();
  if (!firstLead) {
    console.error(`[MultiChefConfirmation] Lead ${firstLeadId} not found`);
    return false;
  }

  if (firstLead.inquiryConfirmSentAt) {
    console.log(`[MultiChefConfirmation] Email already sent for lead ${firstLeadId}, skipping`);
    return true;
  }

  if (!resend) {
    console.log('[MultiChefConfirmation] Resend not configured, skipping email');
    db.update(leads).set({ inquiryConfirmSentAt: new Date() }).where(eq(leads.id, firstLeadId)).run();
    return true;
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[MultiChefConfirmation] RESEND_API_KEY is placeholder, stubbing email send');
    db.update(leads).set({ inquiryConfirmSentAt: new Date() }).where(eq(leads.id, firstLeadId)).run();
    return true;
  }

  try {
    const email = buildMultiChefConfirmationEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[MultiChefConfirmation] Failed to send confirmation email:', result.error);
      return false;
    }

    // Mark first lead as sent
    db.update(leads).set({ inquiryConfirmSentAt: new Date() }).where(eq(leads.id, firstLeadId)).run();
    console.log(`[MultiChefConfirmation] Confirmation email sent for ${leadIds.length} leads (first: ${firstLeadId})`);
    return true;
  } catch (error) {
    console.error('[MultiChefConfirmation] Error sending confirmation email:', error);
    return false;
  }
}

/**
 * Format a quote amount for display.
 */
function formatQuoteAmount(amount: number): string {
  return '$' + amount.toFixed(2);
}

/**
 * Build the quote email content sent when a chef responds with a price quote.
 */
function buildQuoteEmail(params: QuoteEmailParams): { subject: string; html: string; text: string } {
  // MAI-2037: Use bookingUrl (quoteToken + /book/{leadId} format) as primary CTA
  // Falls back to bookingStatusUrl for legacy compatibility
  const bookingLink = params.bookingUrl || params.bookingStatusUrl || `${DASHBOARD_URL}/booking-status`;
  const formattedAmount = formatQuoteAmount(params.quoteAmount);
  
  return {
    subject: `Chef ${params.chefName} has sent you a quote! 💰`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You've received a quote</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Great news, ${params.dinerName}!</h2>
    
    <p style="font-size: 16px; color: #555;">Chef ${params.chefName} has responded to your inquiry for <strong>${params.serviceName}</strong>!</p>
    
    <div style="background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%); border: 2px solid #c9a227; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #856404; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Your Quote</p>
      <p style="font-size: 42px; font-weight: 700; color: #c9a227; margin: 0;">${formattedAmount}</p>
      <p style="font-size: 14px; color: #666; margin: 10px 0 0;">for ${params.guestCount} guests • ${params.serviceName}</p>
    </div>
    
    ${params.quoteMessage ? `
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <p style="margin: 0 0 10px; color: #555;"><strong>Message from Chef ${params.chefName}:</strong></p>
      <p style="margin: 0; color: #2c3e50; font-style: italic; font-size: 16px;">"${params.quoteMessage}"</p>
    </div>
    ` : ''}
    
    ${params.chefNote ? `
    <div style="background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px; color: #2e7d32; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">👨‍🍳 Chef's Note</p>
      <p style="margin: 0; color: #1b5e20; font-size: 15px;">${params.chefNote}</p>
    </div>
    ` : ''}
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Accept Quote & Book</a>
    </div>
    
    <p style="font-size: 14px; color: #888; text-align: center;">This quote is valid for 7 days. Questions? We're here to help at support@maisondeschefs.com</p>
  </div>
  
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Great news, ${params.dinerName}!

Chef ${params.chefName} has responded to your inquiry for ${params.serviceName}!

YOUR QUOTE: ${formattedAmount}
for ${params.guestCount} guests

${params.quoteMessage ? `Message from Chef ${params.chefName}: "${params.quoteMessage}"

` : ''}${params.chefNote ? `👨‍🍳 Chef's Note: ${params.chefNote}

` : ''}Accept this quote and book your event → ${bookingLink}

This quote is valid for 7 days.

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send quote email when a chef responds to a lead with a price quote.
 * Returns true on success, false on error.
 */
export async function sendQuoteEmail(params: QuoteEmailParams): Promise<boolean> {
  const { leadId, dinerEmail } = params;

  if (!resend) {
    console.log('[QuoteEmail] Resend not configured, skipping email');
    return true;
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[QuoteEmail] RESEND_API_KEY is placeholder, stubbing email send');
    return true;
  }

  try {
    const email = buildQuoteEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[QuoteEmail] Failed to send quote email:', result.error);
      return false;
    }

    console.log(`[QuoteEmail] Quote email sent for lead ${leadId}`);
    return true;
  } catch (error) {
    console.error('[QuoteEmail] Error sending quote email:', error);
    return false;
  }
}
/**
 * Build the declined email content sent when a chef declines a lead.
 */
function buildDeclinedEmail(params: DeclinedEmailParams): { subject: string; html: string; text: string } {
  const bookingLink = params.bookingStatusUrl || `${DASHBOARD_URL}/booking-status`;
  const servicesLink = SERVICES_URL;
  const dinerFirstName = params.dinerName?.split(' ')[0] || 'there';

  return {
    subject: `Chef ${params.chefName} is not available for your request`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chef not available</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${dinerFirstName},</h2>
    
    <p style="font-size: 16px; color: #555;">Unfortunately, Chef ${params.chefName} has indicated they are not available for your request on ${formatDate(params.eventDate)}.</p>
    
    ${params.reason && params.reason !== 'none' ? `
    <div style="background: #fee2e2; border-left: 4px solid #dc2626; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #991b1b; font-size: 15px;"><strong>Note from Chef:</strong> ${params.reason}</p>
    </div>
    ` : ''}
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Your Request</h3>
      <p style="margin: 5px 0; color: #555;"><strong>Service:</strong> ${params.serviceName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Chef:</strong> ${params.chefName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Event:</strong> ${formatDate(params.eventDate)}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Guests:</strong> ${params.guestCount}</p>
    </div>
    
    <p style="font-size: 16px; color: #555;">
      Don't worry — there are many other amazing chefs on Maison des Chefs who would love to host your event!
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${servicesLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Browse Other Chefs</a>
    </div>
    
    <p style="font-size: 14px; color: #888; text-align: center;">Questions? We're here to help at support@maisondeschefs.com</p>
  </div>
  
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${dinerFirstName},

Unfortunately, Chef ${params.chefName} has indicated they are not available for your request on ${formatDate(params.eventDate)}.

Your Request:
Service: ${params.serviceName}
Chef: ${params.chefName}
Event: ${formatDate(params.eventDate)}
Guests: ${params.guestCount}

${params.reason && params.reason !== 'none' ? `Note from Chef: ${params.reason}

` : ''}Don't worry — there are many other amazing chefs on Maison des Chefs who would love to host your event!

Browse other chefs → ${servicesLink}

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send declined email when a chef declines a lead.
 * Returns true on success, false on error.
 */
export async function sendDeclinedEmail(params: DeclinedEmailParams): Promise<boolean> {
  const { dinerEmail } = params;

  if (!dinerEmail) {
    console.warn('[DeclinedEmail] No diner email provided');
    return false;
  }

  if (!resend) {
    console.log('[DeclinedEmail] Resend not configured, skipping email');
    return true;
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[DeclinedEmail] RESEND_API_KEY is placeholder, stubbing email send');
    return true;
  }

  try {
    const email = buildDeclinedEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[DeclinedEmail] Failed to send declined email:', result.error);
      return false;
    }

    console.log(`[DeclinedEmail] Declined email sent for lead ${params.leadId}`);
    return true;
  } catch (error) {
    console.error('[DeclinedEmail] Error sending declined email:', error);
    return false;
  }
}
/**
 * Build the accepted/converted email content (MAI-1396).
 * Sent when a chef accepts a lead (converts it to a confirmed booking).
 */
function buildAcceptedEmail(params: AcceptedEmailParams): { subject: string; html: string; text: string } {
  const bookingLink = params.bookingStatusUrl || `${DASHBOARD_URL}/booking-status`;
  const dinerBookingsLink = params.dinerBookingsUrl || DINER_BOOKINGS_URL;
  const dinerFirstName = params.dinerName?.split(' ')[0] || 'there';
  const formattedAmount = params.quoteAmount != null ? `$${params.quoteAmount.toFixed(2)}` : null;

  return {
    subject: `🎉 Chef ${params.chefName} accepted your request!`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Accepted</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Great news, ${dinerFirstName}!</h2>

    <p style="font-size: 16px; color: #555;">Chef ${params.chefName} has <strong>accepted your booking request</strong> for ${params.serviceName}! 🎉</p>

    ${formattedAmount ? `
    <div style="background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%); border: 2px solid #c9a227; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #856404; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Booking Total</p>
      <p style="font-size: 42px; font-weight: 700; color: #c9a227; margin: 0;">${formattedAmount}</p>
      <p style="font-size: 14px; color: #666; margin: 10px 0 0;">for ${params.guestCount} guests</p>
    </div>
    ` : ''}

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Booking Summary</h3>
      <p style="margin: 5px 0; color: #555;"><strong>Service:</strong> ${params.serviceName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Chef:</strong> Chef ${params.chefName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Event:</strong> ${formatDate(params.eventDate)}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Guests:</strong> ${params.guestCount}</p>
    </div>

    <div style="background: #e8f5e9; border-left: 4px solid #4caf50; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #1b5e20; font-size: 15px;">✅ Your booking is confirmed. Chef ${params.chefName} will reach out within 24 hours to discuss dietary requirements and special requests.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">View Booking Status</a>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center;">Questions? We're here to help at support@maisondeschefs.com</p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Great news, ${dinerFirstName}!

Chef ${params.chefName} has accepted your booking request for ${params.serviceName}! 🎉

${formattedAmount ? `BOOKING TOTAL: ${formattedAmount}
for ${params.guestCount} guests

` : ''}Booking Summary:
Service: ${params.serviceName}
Chef: Chef ${params.chefName}
Event: ${formatDate(params.eventDate)}
Guests: ${params.guestCount}

✅ Your booking is confirmed. Chef ${params.chefName} will reach out within 24 hours to discuss dietary requirements and special requests.

View your booking status → ${bookingLink}

Questions? Contact us at support@maisondeschefs.com

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send accepted email when a chef converts a lead to a confirmed booking (MAI-1396).
 * Returns true on success, false on error.
 */
export async function sendAcceptedEmail(params: AcceptedEmailParams): Promise<boolean> {
  const { dinerEmail } = params;

  if (!dinerEmail) {
    console.warn('[AcceptedEmail] No diner email provided');
    return false;
  }

  if (!resend) {
    console.log('[AcceptedEmail] Resend not configured, skipping email');
    return true;
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[AcceptedEmail] RESEND_API_KEY is placeholder, stubbing email send');
    return true;
  }

  try {
    const email = buildAcceptedEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[AcceptedEmail] Failed to send accepted email:', result.error);
      return false;
    }

    console.log(`[AcceptedEmail] Accepted email sent for lead ${params.leadId}`);
    return true;
  } catch (error) {
    console.error('[AcceptedEmail] Error sending accepted email:', error);
    return false;
  }
}

/**
 * Build the expired email content (MAI-1396).
 * Sent when a lead has had no chef response for 72+ hours.
 */
function buildExpiredEmail(params: ExpiredEmailParams): { subject: string; html: string; text: string } {
  const bookingLink = params.bookingStatusUrl || `${DASHBOARD_URL}/booking-status`;
  const browseLink = params.browseUrl || SERVICES_URL;
  const dinerFirstName = params.dinerName?.split(' ')[0] || 'there';

  return {
    subject: `Your inquiry with Chef ${params.chefName} has expired`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inquiry Expired</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${dinerFirstName},</h2>

    <p style="font-size: 16px; color: #555;">Unfortunately, Chef ${params.chefName} has not responded to your inquiry for <strong>${params.serviceName}</strong>, and it has now expired.</p>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Your Inquiry (Expired)</h3>
      <p style="margin: 5px 0; color: #555;"><strong>Service:</strong> ${params.serviceName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Chef:</strong> Chef ${params.chefName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Event:</strong> ${formatDate(params.eventDate)}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Guests:</strong> ${params.guestCount}</p>
    </div>

    <p style="font-size: 16px; color: #555;">
      Don't worry — there are many other amazing chefs on Maison des Chefs who would love to host your event!
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${browseLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Browse Other Chefs</a>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center;">Questions? We're here to help at support@maisondeschefs.com</p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${dinerFirstName},

Unfortunately, Chef ${params.chefName} has not responded to your inquiry for ${params.serviceName}, and it has now expired.

Your Inquiry (Expired):
Service: ${params.serviceName}
Chef: Chef ${params.chefName}
Event: ${formatDate(params.eventDate)}
Guests: ${params.guestCount}

Don't worry — there are many other amazing chefs on Maison des Chefs who would love to host your event!

Browse other chefs → ${browseLink}

Questions? Contact us at support@maisondeschefs.com

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send expired email when a lead has had no chef response for 72+ hours (MAI-1396).
 * Returns true on success, false on error.
 */
export async function sendExpiredEmail(params: ExpiredEmailParams): Promise<boolean> {
  const { dinerEmail } = params;

  if (!dinerEmail) {
    console.warn('[ExpiredEmail] No diner email provided');
    return false;
  }

  if (!resend) {
    console.log('[ExpiredEmail] Resend not configured, skipping email');
    return true;
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[ExpiredEmail] RESEND_API_KEY is placeholder, stubbing email send');
    return true;
  }

  try {
    const email = buildExpiredEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[ExpiredEmail] Failed to send expired email:', result.error);
      return false;
    }

    console.log(`[ExpiredEmail] Expired email sent for lead ${params.leadId}`);
    return true;
  } catch (error) {
    console.error('[ExpiredEmail] Error sending expired email:', error);
    return false;
  }
}
