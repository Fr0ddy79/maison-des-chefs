// Review Request Email — MAI-1723
// Sent to diners 24-48h after a completed booking
// Direct link to /review/:bookingId for one-click review submission

import { Resend } from 'resend';
import { db } from '../db/index.js';
import { bookings, services, users } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const REVIEW_BASE_URL = process.env.REVIEW_BASE_URL || 'https://maisondeschefs.com/review';

interface ReviewRequestEmailParams {
  bookingId: number;
  dinerName: string;
  dinerEmail: string;
  chefName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number;
}

/**
 * Format a date string for display in emails.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'your event';
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
 * Build the review request email content.
 * Sent 24-48h after booking completion to request a review.
 */
function buildReviewRequestEmail(params: ReviewRequestEmailParams): { subject: string; html: string; text: string } {
  const reviewLink = `${REVIEW_BASE_URL}/${params.bookingId}`;
  const formattedDate = formatDate(params.eventDate);
  const dinerFirstName = params.dinerName?.split(' ')[0] || 'there';

  return {
    subject: `How was your meal with Chef ${params.chefName}? 🌟`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Share Your Experience</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${dinerFirstName},</h2>
    
    <p style="font-size: 16px; color: #555;">We hope you had an amazing experience with Chef ${params.chefName}! 🎉</p>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Your Recent Experience</h3>
      <p style="margin: 5px 0; color: #555;"><strong>Chef:</strong> ${params.chefName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Service:</strong> ${params.serviceName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Date:</strong> ${formattedDate}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Guests:</strong> ${params.guestCount}</p>
    </div>
    
    <p style="font-size: 16px; color: #555; margin-bottom: 20px;">
      Your review helps other food lovers discover amazing private chefs — and it only takes a minute! 🌟
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${reviewLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Share Your Review →</a>
    </div>
    
    <div style="background: #fff9e6; border-left: 4px solid #c9a227; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #5d4037; font-size: 14px;">💡 <strong>Why reviews matter:</strong> Did you know services with 4+ star ratings see 15% more bookings? Your experience genuinely helps other diners in the community.</p>
    </div>
    
    <p style="font-size: 14px; color: #888; text-align: center; margin-top: 20px;">
      Thank you for being part of the Maison des Chefs community! 🙌
    </p>
    
    <p style="font-size: 14px; color: #888; text-align: center;">Questions? We're here to help at support@maisondeschefs.com</p>
  </div>
  
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2026 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${dinerFirstName},

We hope you had an amazing experience with Chef ${params.chefName}! 🎉

Your Recent Experience:
Chef: ${params.chefName}
Service: ${params.serviceName}
Date: ${formattedDate}
Guests: ${params.guestCount}

Your review helps other food lovers discover amazing private chefs — and it only takes a minute! 🌟

Share your review → ${reviewLink}

Why reviews matter: Did you know services with 4+ star ratings see 15% more bookings? Your experience genuinely helps other diners in the community.

Thank you for being part of the Maison des Chefs community! 🙌

— The Maison des Chefs Team

© 2026 Maison des Chefs`,
  };
}

/**
 * Send the review request email to a diner after booking completion.
 * Should be called 24-48h after booking status = 'completed'.
 * Returns true on success, false on error.
 */
export async function sendReviewRequestEmail(params: ReviewRequestEmailParams): Promise<boolean> {
  const { bookingId, dinerEmail } = params;

  if (!dinerEmail) {
    console.warn('[ReviewRequestEmail] No diner email provided');
    return false;
  }

  if (!resend) {
    console.log('[ReviewRequestEmail] Resend not configured, skipping email');
    return true;
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[ReviewRequestEmail] RESEND_API_KEY is placeholder, stubbing email send');
    return true;
  }

  try {
    const email = buildReviewRequestEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[ReviewRequestEmail] Failed to send review request email:', result.error);
      return false;
    }

    console.log(`[ReviewRequestEmail] Review request email sent for booking ${bookingId}`);
    return true;
  } catch (error) {
    console.error('[ReviewRequestEmail] Error sending review request email:', error);
    return false;
  }
}