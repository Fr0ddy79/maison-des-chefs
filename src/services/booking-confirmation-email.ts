import { Resend } from 'resend';
import { db } from '../db/index.js';
import { bookings, services, users, chefProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const DINER_BOOKINGS_URL = process.env.DINER_BOOKINGS_URL || 'https://maisondeschefs.com/diner/bookings';

interface BookingConfirmationParams {
  bookingId: number;
  dinerName: string;
  dinerEmail: string;
  chefName: string;
  serviceName: string;
  eventDate: string;
  guestCount: number;
  totalPrice: number;
  bookingStatusUrl?: string;
  dinerBookingsUrl?: string;
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
 * Build the diner post-booking confirmation email content.
 */
function buildBookingConfirmationEmail(params: BookingConfirmationParams): { subject: string; html: string; text: string } {
  const bookingStatusLink = params.bookingStatusUrl || `${DASHBOARD_URL}/booking-status/${params.bookingId}`;
  const dinerBookingsLink = params.dinerBookingsUrl || DINER_BOOKINGS_URL;
  const formattedPrice = formatPrice(params.totalPrice);
  const formattedDate = formatDate(params.eventDate);

  return {
    subject: `🎉 You're going to dine with Chef ${params.chefName}!`,
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
    
    <p style="font-size: 16px; color: #555;">Great news — your booking is confirmed! 🎉</p>
    
    <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 2px solid #4caf50; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #2e7d32; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Booking Confirmed ✓</p>
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
    
    <!-- Referral Credit Section -->
    <div style="background: linear-gradient(135deg, #e8f0fe 0%, #d4e4ff 100%); border: 2px solid #4285f4; border-radius: 12px; padding: 24px; margin: 25px 0; text-align: center;">
      <p style="font-size: 13px; color: #1a73e8; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">🎁 Share the Love</p>
      <p style="font-size: 18px; color: #2c3e50; margin: 0 0 12px; font-weight: 600;">Give $25, Get $25</p>
      <p style="font-size: 14px; color: #555; margin: 0 0 18px; line-height: 1.5;">Know someone who'd love a private chef experience? Share your referral code and you'll both get $25 credit toward your next booking!</p>
      <a href="${dinerBookingsLink}" style="display: inline-block; background: #4285f4; color: white; padding: 12px 24px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 14px;">Get My Referral Code →</a>
    </div>
    
    <h3 style="color: #2c3e50; margin-top: 25px;">Need to reach us?</h3>
    <p style="color: #555;">Questions about your booking? We're here to help at <a href="mailto:support@maisondeschefs.com" style="color: #c9a227;">support@maisondeschefs.com</a></p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${dinerBookingsLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">View My Bookings</a>
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

🎉 Great news — your booking is confirmed!

CHEF: ${params.chefName}
SERVICE: ${params.serviceName}
DATE: ${formattedDate}
GUESTS: ${params.guestCount}
TOTAL: ${formattedPrice}
CONFIRMATION #: ${params.bookingId}

What's Next:
Chef ${params.chefName} will reach out within 24 hours to confirm details and discuss any dietary requirements or special requests.

🎁 SHARE THE LOVE — Give $25, Get $25!
Know someone who'd love a private chef experience? Share your referral code and you'll both get $25 credit toward your next booking!
Get your referral code → ${dinerBookingsLink}

View your bookings → ${dinerBookingsLink}

Questions? Contact us at support@maisondeschefs.com

Thank you for choosing Maison des Chefs!

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send booking confirmation email to diner.
 * Returns true on success, false on error.
 */
export async function sendBookingConfirmationEmail(params: BookingConfirmationParams): Promise<boolean> {
  const { dinerEmail } = params;

  if (!resend) {
    console.log('[BookingConfirmation] Resend not configured, skipping email');
    return true;
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[BookingConfirmation] RESEND_API_KEY is placeholder, stubbing email send');
    return true;
  }

  if (!dinerEmail) {
    console.log('[BookingConfirmation] No diner email, skipping');
    return false;
  }

  try {
    const email = buildBookingConfirmationEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[BookingConfirmation] Failed to send confirmation email:', result.error);
      return false;
    }

    console.log(`[BookingConfirmation] Booking confirmation email sent for booking ${params.bookingId}`);
    return true;
  } catch (error) {
    console.error('[BookingConfirmation] Error sending confirmation email:', error);
    return false;
  }
}
