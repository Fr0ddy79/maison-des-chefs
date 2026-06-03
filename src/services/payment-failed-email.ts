import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const UPDATE_PAYMENT_URL = process.env.UPDATE_PAYMENT_URL || 'https://maisondeschefs.com/account/bookings';

interface PaymentFailedEmailParams {
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
 * Build the payment failed email sent to the diner after all retries have been exhausted.
 */
function buildPaymentFailedEmail(
  params: PaymentFailedEmailParams
): { subject: string; html: string; text: string } {
  const updatePaymentLink = `${UPDATE_PAYMENT_URL}/${params.bookingId}`;
  const formattedDate = formatDate(params.eventDate);

  return {
    subject: `Payment couldn't be processed for your booking`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${params.dinerName},</h2>

    <p style="font-size: 16px; color: #555;">We were unable to process payment for your booking request. We've tried a few times but the payment couldn't go through.</p>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Booking Details</h3>
      <p style="margin: 8px 0; color: #555;"><strong>Chef:</strong> ${params.chefName}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Service:</strong> ${params.serviceName}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Date:</strong> ${formattedDate}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Guests:</strong> ${params.guestCount}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Total:</strong> ${formatPrice(params.totalPrice)}</p>
      <p style="margin: 8px 0; color: #555;"><strong>Confirmation #:</strong> ${params.bookingId}</p>
    </div>

    <div style="background: #fff3e0; border-left: 4px solid #f57c00; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px; color: #e65100; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">💳 Update your payment method</p>
      <p style="margin: 0; color: #555; font-size: 15px;">Click the button below to update your payment details and complete your booking before the chef's availability expires.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${updatePaymentLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Update Payment Method</a>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center;">If you continue to have issues, please contact us at <a href="mailto:support@maisondeschefs.com" style="color: #c9a227;">support@maisondeschefs.com</a></p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${params.dinerName},

We were unable to process payment for your booking request. We've tried a few times but the payment couldn't go through.

CHEF: ${params.chefName}
SERVICE: ${params.serviceName}
DATE: ${formattedDate}
GUESTS: ${params.guestCount}
TOTAL: ${formatPrice(params.totalPrice)}
CONFIRMATION #: ${params.bookingId}

Update your payment method:
${updatePaymentLink}

If you continue to have issues, please contact us at support@maisondeschefs.com

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send payment failed email to diner after all retries have been exhausted.
 * Returns true on success or when email is not configured (graceful degradation).
 */
export async function sendPaymentFailedEmail(
  params: PaymentFailedEmailParams
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  if (!RESEND_API_KEY) {
    console.warn(`[PaymentFailed] RESEND_API_KEY not configured — skipping email to ${params.dinerEmail}`);
    return { success: true, skipped: true };
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[PaymentFailed] RESEND_API_KEY is placeholder — stubbing email to ${params.dinerEmail}`);
    return { success: true, skipped: true };
  }

  if (!params.dinerEmail) {
    console.warn(`[PaymentFailed] No diner email — skipping`);
    return { success: true, skipped: true };
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const email = buildPaymentFailedEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error(`[PaymentFailed] Failed to send to ${params.dinerEmail}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[PaymentFailed] Email sent to ${params.dinerEmail} for booking ${params.bookingId}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[PaymentFailed] Exception sending to ${params.dinerEmail}:`, err);
    return { success: false, error: errorMsg };
  }
}