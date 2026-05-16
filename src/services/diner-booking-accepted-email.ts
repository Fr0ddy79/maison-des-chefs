import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DINER_BOOKINGS_URL = process.env.DINER_BOOKINGS_URL || 'https://maisondeschefs.com/diner/bookings';

interface BookingAcceptedEmailParams {
  dinerEmail: string;
  dinerName: string;
  chefName: string;
  serviceName: string;
  eventDate: string;
  guestCount: number;
  totalPrice: number;
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
 * Format a price for display.
 */
function formatPrice(amount: number): string {
  return '$' + amount.toFixed(2);
}

/**
 * Build the booking accepted email sent to the diner.
 */
function buildBookingAcceptedEmail(
  params: BookingAcceptedEmailParams
): { subject: string; html: string; text: string } {
  const bookingStatusLink = `${DINER_BOOKINGS_URL}?booking=${params.bookingId}`;
  const formattedPrice = formatPrice(params.totalPrice);
  const formattedDate = formatDate(params.eventDate);

  return {
    subject: `✅ Booking Confirmed with Chef ${params.chefName}!`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${params.dinerName},</h2>

    <p style="font-size: 16px; color: #555;">Great news — Chef ${params.chefName} has confirmed your booking! 🎉</p>

    <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 2px solid #4caf50; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #2e7d32; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Booking Confirmed ✅</p>
      <p style="font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0;">Chef ${params.chefName}</p>
      <p style="font-size: 18px; color: #555; margin: 10px 0 0;">${params.serviceName}</p>
    </div>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Booking Details</h3>
      <p style="margin: 8px 0; color: #555;"><strong>Date:</strong> ${formattedDate}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Guests:</strong> ${params.guestCount}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Total:</strong> ${formattedPrice}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Confirmation #:</strong> ${params.bookingId}</p>
    </div>

    <div style="background: #fff9e6; border-left: 4px solid #c9a227; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px; color: #856404; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">💡 What's Next</p>
      <p style="margin: 0; color: #5d4037; font-size: 15px;">Chef ${params.chefName} will reach out within 24 hours to confirm details and discuss any dietary requirements or special requests.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingStatusLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">View My Booking</a>
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

✅ Great news — Chef ${params.chefName} has confirmed your booking!

CHEF: ${params.chefName}
SERVICE: ${params.serviceName}
DATE: ${formattedDate}
GUESTS: ${params.guestCount}
TOTAL: ${formattedPrice}
CONFIRMATION #: ${params.bookingId}

What's Next:
Chef ${params.chefName} will reach out within 24 hours to confirm details and discuss any dietary requirements or special requests.

View your booking → ${bookingStatusLink}

Thank you for choosing Maison des Chefs!

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send booking accepted email to diner.
 * Returns true on success or when email is not configured (graceful degradation).
 */
export async function sendBookingAcceptedEmail(
  params: BookingAcceptedEmailParams
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn(`[BookingAccepted] RESEND_API_KEY not configured — skipping email to ${params.dinerEmail}`);
    return { success: true, skipped: true };
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[BookingAccepted] RESEND_API_KEY is placeholder — stubbing email to ${params.dinerEmail}`);
    return { success: true, skipped: true };
  }

  if (!params.dinerEmail) {
    console.warn(`[BookingAccepted] No diner email — skipping`);
    return { success: true, skipped: true };
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const email = buildBookingAcceptedEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error(`[BookingAccepted] Failed to send to ${params.dinerEmail}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[BookingAccepted] Email sent to ${params.dinerEmail} for booking ${params.bookingId}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[BookingAccepted] Exception sending to ${params.dinerEmail}:`, err);
    return { success: false, error: errorMsg };
  }
}