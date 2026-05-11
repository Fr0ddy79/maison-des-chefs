import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const CHEF_DASHBOARD_URL = process.env.CHEF_DASHBOARD_URL || 'https://maisondeschefs.com/chef-dashboard';

interface ChefNewBookingEmailParams {
  chefEmail: string;
  chefName: string;
  guestName: string;
  eventDate: string;
  serviceName: string;
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
 * Build the chef new booking notification email content.
 */
function buildChefNewBookingEmail(params: ChefNewBookingEmailParams): { subject: string; html: string; text: string } {
  const bookingLink = `${CHEF_DASHBOARD_URL}/bookings/${params.bookingId}`;
  const formattedPrice = formatPrice(params.totalPrice);
  const formattedDate = formatDate(params.eventDate);

  return {
    subject: `🎉 New Booking from ${params.guestName}!`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${params.chefName},</h2>

    <p style="font-size: 16px; color: #555;">Great news — you have a new booking request! 🎉</p>

    <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 2px solid #4caf50; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #2e7d32; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">New Booking</p>
      <p style="font-size: 24px; font-weight: 700; color: #2c3e50; margin: 0;">${params.guestName}</p>
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
      <p style="margin: 0; color: #5d4037; font-size: 15px;">Review the booking details and confirm or decline within 24 hours. Don't forget to reach out to discuss dietary requirements or special requests.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">View Booking</a>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center;">You received this email because you have pending bookings. Check your dashboard to manage them.</p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${params.chefName},

🎉 Great news — you have a new booking request!

GUEST: ${params.guestName}
SERVICE: ${params.serviceName}
DATE: ${formattedDate}
GUESTS: ${params.guestCount}
TOTAL: ${formattedPrice}
CONFIRMATION #: ${params.bookingId}

What's Next:
Review the booking details and confirm or decline within 24 hours. Don't forget to reach out to discuss dietary requirements or special requests.

View booking → ${bookingLink}

You received this email because you have pending bookings. Check your dashboard to manage them.

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send new booking notification email to chef.
 * Returns true on success or when email is not configured (graceful degradation).
 * Never throws — errors are logged but not propagated.
 */
export async function sendChefNewBookingEmail(
  params: ChefNewBookingEmailParams
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  // Graceful degradation: if RESEND_API_KEY is not configured, log and return without error
  if (!RESEND_API_KEY) {
    console.warn(`[ChefNewBooking] RESEND_API_KEY not configured — skipping email to ${params.chefEmail}`);
    return { success: true, skipped: true };
  }

  // Handle placeholder key used during development
  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[ChefNewBooking] RESEND_API_KEY is placeholder — stubbing email to ${params.chefEmail}`);
    return { success: true, skipped: true };
  }

  if (!params.chefEmail) {
    console.warn(`[ChefNewBooking] No chef email — skipping`);
    return { success: true, skipped: true };
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const email = buildChefNewBookingEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.chefEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      // Log error but don't crash — booking still succeeds
      console.error(`[ChefNewBooking] Failed to send to ${params.chefEmail}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[ChefNewBooking] Email sent to ${params.chefEmail} for booking ${params.bookingId}`);
    return { success: true };
  } catch (err) {
    // Catch any unexpected errors — booking still succeeds
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ChefNewBooking] Exception sending to ${params.chefEmail}:`, err);
    return { success: false, error: errorMsg };
  }
}
