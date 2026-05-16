import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const CHEF_DISCOVERY_URL = process.env.CHEF_DISCOVERY_URL || 'https://maisondeschefs.com/chefs';

interface BookingDeclinedEmailParams {
  dinerEmail: string;
  dinerName: string;
  chefName: string;
  serviceName: string;
  eventDate: string;
  guestCount: number;
  declineReason?: string;
  bookingId: number;
}

/**
 * Format a date string for display in emails.
 */
function formatDate(dateStr: string): string {
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
 * Build the booking declined email sent to the diner.
 */
function buildBookingDeclinedEmail(
  params: BookingDeclinedEmailParams
): { subject: string; html: string; text: string } {
  const chefDiscoveryLink = CHEF_DISCOVERY_URL;
  const formattedDate = formatDate(params.eventDate);
  const reasonParagraph = params.declineReason
    ? `<p style="margin: 0 0 16px; color: #5d4037; font-size: 15px; font-style: italic;">"${params.declineReason}"</p>`
    : '';

  return {
    subject: `Chef ${params.chefName} has declined your booking request`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Declined</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${params.dinerName},</h2>

    <p style="font-size: 16px; color: #555;">Unfortunately, Chef ${params.chefName} is unable to host your booking at this time.</p>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Booking Details</h3>
      <p style="margin: 8px 0; color: #555;"><strong>Chef:</strong> ${params.chefName}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Service:</strong> ${params.serviceName}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Date:</strong> ${formattedDate}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Guests:</strong> ${params.guestCount}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Confirmation #:</strong> ${params.bookingId}</p>
    </div>

    ${reasonParagraph}

    <div style="background: #e3f2fd; border-left: 4px solid #1976d2; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px; color: #0d47a1; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">🍴 Looking for another chef?</p>
      <p style="margin: 0; color: #1565c0; font-size: 15px;">Montreal has many incredible private chefs ready to create a memorable experience for you and your guests. Explore other chefs and find the perfect match!</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${chefDiscoveryLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Browse Chefs</a>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center;">Thank you for choosing Maison des Chefs — Montreal's premier private chef marketplace.</p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${params.dinerName},

Unfortunately, Chef ${params.chefName} is unable to host your booking at this time.

CHEF: ${params.chefName}
SERVICE: ${params.serviceName}
DATE: ${formattedDate}
GUESTS: ${params.guestCount}
CONFIRMATION #: ${params.bookingId}

${params.declineReason ? `Chef's note: "${params.declineReason}"` : ''}

Looking for another chef?
Montreal has many incredible private chefs ready to create a memorable experience for you and your guests. Explore other chefs and find the perfect match!

Browse chefs → ${chefDiscoveryLink}

Thank you for choosing Maison des Chefs!

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send booking declined email to diner.
 * Returns true on success or when email is not configured (graceful degradation).
 */
export async function sendBookingDeclinedEmail(
  params: BookingDeclinedEmailParams
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn(`[BookingDeclined] RESEND_API_KEY not configured — skipping email to ${params.dinerEmail}`);
    return { success: true, skipped: true };
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[BookingDeclined] RESEND_API_KEY is placeholder — stubbing email to ${params.dinerEmail}`);
    return { success: true, skipped: true };
  }

  if (!params.dinerEmail) {
    console.warn(`[BookingDeclined] No diner email — skipping`);
    return { success: true, skipped: true };
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const email = buildBookingDeclinedEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error(`[BookingDeclined] Failed to send to ${params.dinerEmail}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[BookingDeclined] Email sent to ${params.dinerEmail} for booking ${params.bookingId}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[BookingDeclined] Exception sending to ${params.dinerEmail}:`, err);
    return { success: false, error: errorMsg };
  }
}