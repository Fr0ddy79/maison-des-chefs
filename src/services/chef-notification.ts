import { Resend } from 'resend';
import { db } from '../db/index.js';
import { users, chefProfiles, services, leads } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const CHEF_DASHBOARD_URL = process.env.CHEF_DASHBOARD_URL || 'https://maisondeschefs.com/chef-dashboard';

interface BookingDetails {
  bookingId: number;
  leadId: number;
  chefId: number;
  serviceId: number;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
  eventDate: string;
  guestCount: number;
  totalPrice: number;
  notes?: string;
}

/**
 * Format a date string for display.
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
 * Get chef details including WhatsApp number.
 */
function getChefDetails(chefId: number): { name: string; whatsappNumber: string | null; email: string } | null {
  const chef = db.select({
    name: users.name,
    whatsappNumber: chefProfiles.whatsappNumber,
    email: users.email,
  })
    .from(chefProfiles)
    .innerJoin(users, eq(chefProfiles.userId, users.id))
    .where(eq(users.id, chefId))
    .get();

  return chef || null;
}

/**
 * Get service name.
 */
function getServiceName(serviceId: number): string {
  const service = db.select({ name: services.name }).from(services).where(eq(services.id, serviceId)).get();
  return service?.name || 'Private Chef Service';
}

/**
 * Build the chef booking confirmation email content.
 */
function buildBookingConfirmationEmail(params: {
  chefName: string;
  guestName: string;
  serviceName: string;
  eventDate: string;
  guestCount: number;
  totalPrice: number;
  bookingId: number;
}): { subject: string; html: string; text: string } {
  const bookingLink = `${CHEF_DASHBOARD_URL}/bookings/${params.bookingId}`;
  const formattedPrice = formatPrice(params.totalPrice);
  const formattedDate = formatDate(params.eventDate);

  return {
    subject: `🎉 Booking Confirmed: ${params.guestName}!`,
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
    <h2 style="color: #2c3e50;">Hi ${params.chefName},</h2>

    <p style="font-size: 16px; color: #555;">Great news — a booking has been confirmed! 🎉</p>

    <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 2px solid #4caf50; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #2e7d32; margin: 0 0 10px; text-transform: uppercase; letter-spacing: 1px;">Booking Confirmed</p>
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
      <p style="margin: 0; color: #5d4037; font-size: 15px;">Contact your guest to confirm dietary requirements and any special requests for the event.</p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${bookingLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">View Booking Details</a>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center;">This notification was sent because a booking was confirmed through payment.</p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${params.chefName},

🎉 Great news — a booking has been confirmed!

GUEST: ${params.guestName}
SERVICE: ${params.serviceName}
DATE: ${formattedDate}
GUESTS: ${params.guestCount}
TOTAL: ${formattedPrice}
CONFIRMATION #: ${params.bookingId}

What's Next:
Contact your guest to confirm dietary requirements and any special requests for the event.

View booking details → ${bookingLink}

This notification was sent because a booking was confirmed through payment.

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Build WhatsApp message for booking confirmation.
 */
function buildWhatsAppMessage(params: {
  guestName: string;
  serviceName: string;
  eventDate: string;
  guestCount: number;
  totalPrice: number;
  bookingId: number;
}): string {
  const formattedDate = formatDate(params.eventDate);
  const formattedPrice = formatPrice(params.totalPrice);

  return `🍽️ Maison des Chefs - Booking Confirmed!

Hi Chef! A new booking has been confirmed:

👤 Guest: ${params.guestName}
🍴 Service: ${params.serviceName}
📅 Date: ${formattedDate}
👥 Guests: ${params.guestCount}
💰 Total: ${formattedPrice}
🔖 Ref: #${params.bookingId}

Contact your guest to confirm dietary requirements and any special requests.

View details: ${CHEF_DASHBOARD_URL}/bookings/${params.bookingId}`;
}

/**
 * Send booking confirmation email to chef.
 * Returns true on success or when email is not configured (graceful degradation).
 */
async function sendBookingEmail(
  chefEmail: string,
  params: {
    chefName: string;
    guestName: string;
    serviceName: string;
    eventDate: string;
    guestCount: number;
    totalPrice: number;
    bookingId: number;
  }
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  // Graceful degradation: if RESEND_API_KEY is not configured, log and return without error
  if (!RESEND_API_KEY) {
    console.warn(`[ChefNotification] RESEND_API_KEY not configured — skipping email to ${chefEmail}`);
    return { success: true, skipped: true };
  }

  // Handle placeholder key used during development
  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[ChefNotification] RESEND_API_KEY is placeholder — stubbing email to ${chefEmail}`);
    return { success: true, skipped: true };
  }

  if (!chefEmail) {
    console.warn(`[ChefNotification] No chef email — skipping`);
    return { success: true, skipped: true };
  }

  try {
    const resend = new Resend(RESEND_API_KEY);
    const email = buildBookingConfirmationEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: chefEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error(`[ChefNotification] Failed to send email to ${chefEmail}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[ChefNotification] Email sent to ${chefEmail} for booking ${params.bookingId}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ChefNotification] Exception sending email to ${chefEmail}:`, err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Send booking confirmation WhatsApp message to chef.
 * Uses wa.me link with pre-filled message.
 * Returns true on success or when WhatsApp is not configured (graceful degradation).
 */
function sendWhatsAppMessage(
  chefWhatsApp: string,
  params: {
    guestName: string;
    serviceName: string;
    eventDate: string;
    guestCount: number;
    totalPrice: number;
    bookingId: number;
  }
): { success: boolean; skipped?: boolean; waLink?: string } {
  if (!chefWhatsApp) {
    console.warn(`[ChefNotification] No chef WhatsApp number — skipping WhatsApp notification`);
    return { success: true, skipped: true };
  }

  const message = buildWhatsAppMessage(params);
  const cleanNumber = chefWhatsApp.replace(/[^0-9]/g, '');
  const waLink = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;

  console.log(`[ChefNotification] WhatsApp link generated for chef ${chefWhatsApp} for booking ${params.bookingId}`);
  console.log(`[ChefNotification] WA Link: ${waLink}`);

  // Note: We generate the link but can't send WhatsApp directly from server.
  // The link can be opened by the chef or used in a notification to the chef.
  // For now, we log it - in future this could be sent via a WhatsApp Business API.
  return { success: true, skipped: false, waLink };
}

/**
 * Send booking confirmation to chef.
 * Sends email and generates WhatsApp link using existing WhatsApp infrastructure.
 * Called from webhook on successful payment.
 * 
 * @param chefId - The chef's user ID
 * @param bookingDetails - Full booking details
 * @returns Object with success status for email and WhatsApp notification
 */
export async function sendBookingConfirmation(
  chefId: number,
  bookingDetails: BookingDetails
): Promise<{ email: { success: boolean; skipped?: boolean; error?: string }; whatsapp: { success: boolean; skipped?: boolean; waLink?: string; error?: string } }> {
  // Get chef details
  const chef = getChefDetails(chefId);
  if (!chef) {
    console.error(`[ChefNotification] Chef ${chefId} not found`);
    return {
      email: { success: false, error: 'Chef not found' },
      whatsapp: { success: false, error: 'Chef not found' },
    };
  }

  const serviceName = getServiceName(bookingDetails.serviceId);

  const emailParams = {
    chefName: chef.name,
    guestName: bookingDetails.guestName,
    serviceName,
    eventDate: bookingDetails.eventDate,
    guestCount: bookingDetails.guestCount,
    totalPrice: bookingDetails.totalPrice,
    bookingId: bookingDetails.bookingId,
  };

  const whatsappParams = {
    guestName: bookingDetails.guestName,
    serviceName,
    eventDate: bookingDetails.eventDate,
    guestCount: bookingDetails.guestCount,
    totalPrice: bookingDetails.totalPrice,
    bookingId: bookingDetails.bookingId,
  };

  // Send email notification
  const emailResult = await sendBookingEmail(chef.email, emailParams);

  // Send WhatsApp notification (generates link for chef to use)
  const whatsappResult = sendWhatsAppMessage(chef.whatsappNumber || '', whatsappParams);

  return {
    email: emailResult,
    whatsapp: whatsappResult,
  };
}