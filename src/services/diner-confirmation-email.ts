import { Resend } from 'resend';
import { db } from '../db/index.js';
import { leads } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const SERVICES_URL = process.env.SERVICES_URL || 'https://maisondeschefs.com/services';

interface DinerConfirmationEmailParams {
  leadId: number;
  dinerName: string;
  dinerEmail: string;
  chefName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
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
  const bookingStatusLink = `${DASHBOARD_URL}/bookings`;
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
      <li>Track your booking status → <a href="${bookingStatusLink}" style="color: #c9a227;">View Booking Status</a></li>
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
 * Format a quote amount for display.
 */
function formatQuoteAmount(amount: number): string {
  return '$' + amount.toFixed(2);
}

/**
 * Build the quote email content sent when a chef responds with a price quote.
 */
function buildQuoteEmail(params: QuoteEmailParams): { subject: string; html: string; text: string } {
  const bookingLink = `${DASHBOARD_URL}/bookings`;
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
