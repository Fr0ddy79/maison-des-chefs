// MAI-1745: "Request Received" confirmation email
// Fires immediately when a lead (inquiry) is created, confirming to the diner
// that their request has been received with expected response time and booking status link.

import { Resend } from 'resend';
import { db } from '../db/index.js';
import { leads } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const BOOKING_STATUS_URL = process.env.DINER_BOOKINGS_URL || `${DASHBOARD_URL}/diner/bookings`;

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
 * Build the "Request Received" confirmation email sent to the diner.
 * Subject: "🍽️ We received your request — Chef [name] will respond within 24-48h"
 * Idempotent — only sends if requestReceivedSentAt is null.
 */
function buildRequestReceivedEmail(params: {
  dinerName: string;
  dinerEmail: string;
  chefName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
  bookingStatusUrl: string;
}): { subject: string; html: string; text: string } {
  const formattedDate = formatDate(params.eventDate);
  const guestText = `${params.guestCount} guest${params.guestCount !== 1 ? 's' : ''}`;

  return {
    subject: `🍽️ We received your request — Chef ${params.chefName} will respond within 24-48h`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>We've received your request!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${params.dinerName},</h2>

    <p style="font-size: 16px; color: #555;">
      We've received your request and <strong>Chef ${params.chefName}</strong> will review it shortly! 🎉
    </p>

    <div style="background: linear-gradient(135deg, #fff9e6 0%, #fef3c7 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #92400e; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">⏱️ What to expect</p>
      <p style="font-size: 20px; font-weight: 600; color: #2c3e50; margin: 0;">Chef typically responds within <span style="color: #c9a227;">24–48 hours</span></p>
    </div>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Your Inquiry Summary</h3>
      <p style="margin: 8px 0; color: #555;"><strong>Service:</strong> ${params.serviceName}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Chef:</strong> Chef ${params.chefName}</p>
      <p style="margin: 8px 0; color: #555;"><strong>📅 Event:</strong> ${formattedDate}</p>
      <p style="margin: 8px 0; color: #555;"><strong>👥 Guests:</strong> ${guestText}</p>
    </div>

    <p style="font-size: 16px; color: #555;">
      Track your booking status and get real-time updates anytime:
    </p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${params.bookingStatusUrl}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">View Booking Status</a>
    </div>

    <div style="background: #e8f5e9; border-left: 4px solid #22c55e; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #155724; font-size: 15px;">
        💡 <strong>While you wait:</strong> Browse more private chefs and discover new culinary experiences →
        <a href="${DASHBOARD_URL}/services" style="color: #c9a227;">Explore Services</a>
      </p>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center;">
      Questions? Contact us at <a href="mailto:support@maisondeschefs.com" style="color: #c9a227;">support@maisondeschefs.com</a>
    </p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${params.dinerName},

We've received your request and Chef ${params.chefName} will review it shortly! 🎉

WHAT TO EXPECT:
Chef typically responds within 24–48 hours.

YOUR INQUIRY SUMMARY:
Service: ${params.serviceName}
Chef: Chef ${params.chefName}
Event: ${formattedDate}
Guests: ${guestText}

Track your booking status and get real-time updates anytime:
→ ${params.bookingStatusUrl}

While you wait: Browse more private chefs and discover new culinary experiences → ${DASHBOARD_URL}/services

Questions? Contact us at support@maisondeschefs.com

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send the "Request Received" confirmation email to the diner.
 * Idempotent — only sends if requestReceivedSentAt is null.
 * Returns true if email was sent (or already sent), false on error.
 */
export async function sendDinerRequestReceivedEmail(params: {
  leadId: number;
  dinerName: string;
  dinerEmail: string;
  chefName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
  bookingStatusUrl: string;
}): Promise<boolean> {
  const { leadId, dinerEmail } = params;

  // Idempotency check: only send if requestReceivedSentAt is null
  const lead = db.select().from(leads).where(eq(leads.id, leadId)).get();
  if (!lead) {
    console.error(`[DinerRequestReceived] Lead ${leadId} not found`);
    return false;
  }

  if (lead.requestReceivedSentAt) {
    console.log(`[DinerRequestReceived] Email already sent for lead ${leadId}, skipping`);
    return true; // Already sent, treat as success
  }

  if (!resend) {
    console.log('[DinerRequestReceived] Resend not configured, skipping email');
    return true;
  }

  // Skip if key is a placeholder
  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[DinerRequestReceived] RESEND_API_KEY is placeholder, stubbing email send');
    return true;
  }

  try {
    const email = buildRequestReceivedEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[DinerRequestReceived] Failed to send:', result.error);
      return false;
    }

    // Mark as sent (idempotency)
    db.update(leads).set({ requestReceivedSentAt: new Date() }).where(eq(leads.id, leadId)).run();
    console.log(`[DinerRequestReceived] Email sent for lead ${leadId}`);
    return true;
  } catch (error) {
    console.error('[DinerRequestReceived] Error sending email:', error);
    return false;
  }
}