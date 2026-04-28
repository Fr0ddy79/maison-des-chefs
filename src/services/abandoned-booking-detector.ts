import cron from 'node-cron';
import { Resend } from 'resend';
import { db } from '../db/index.js';
import { bookings, abandonedBookings, services, users } from '../db/schema.js';
import { eq, and, lte, or } from 'drizzle-orm';

const ABANDONED_BOOKING_CHECK_CRON = '*/15 * * * *'; // Every 15 minutes
const ABANDONMENT_THRESHOLD_MINUTES = 10;

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';

let abandonedBookingTask: cron.ScheduledTask | null = null;

/**
 * Incomplete booking statuses — bookings that are started but not completed.
 * A booking is "abandoned" if it sits in one of these statuses for > 10 minutes.
 */
const INCOMPLETE_STATUSES = ['pending', 'pending_payment'];

/**
 * Initialize the abandoned booking detection scheduler.
 * Runs every 15 minutes to detect and log abandoned bookings.
 */
export async function initializeAbandonedBookingScheduler() {
  console.log('📅 Initializing Abandoned Booking Detector...');

  // Run immediately on startup, then on schedule
  await processAbandonedBookings();

  abandonedBookingTask = cron.schedule(ABANDONED_BOOKING_CHECK_CRON, async () => {
    console.log('📅 Running abandoned booking check...');
    try {
      const count = await processAbandonedBookings();
      console.log(`📅 Abandoned booking check complete: ${count} newly detected`);
    } catch (err) {
      console.error('📅 Abandoned booking check failed:', err);
    }
  });

  console.log(`📅 Abandoned Booking Detector initialized (check interval: ${ABANDONED_BOOKING_CHECK_CRON})`);
}

/**
 * Format a date string for display in emails.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not specified';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

/**
 * Build the abandoned booking recovery email content.
 */
function buildAbandonedBookingEmail(booking: {
  id: number;
  serviceName: string;
  chefName: string;
  eventDate: string;
  guestCount: number;
  depositAmount: number;
  dinerEmail: string;
  dinerName: string;
}): { subject: string; html: string; text: string } {
  const checkoutUrl = `${DASHBOARD_URL}/checkout/${booking.id}`;

  return {
    subject: `Your booking at ${booking.chefName}'s is waiting 🍽️`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Complete your booking</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${booking.dinerName}, your booking is waiting 👨🍳</h2>
    
    <p style="font-size: 16px; color: #555;">We noticed you started a booking for <strong>${booking.serviceName}</strong> with Chef ${booking.chefName} but didn't complete the payment.</p>
    
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Booking Summary</h3>
      <p style="margin: 5px 0; color: #555;"><strong>Service:</strong> ${booking.serviceName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Chef:</strong> ${booking.chefName}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Date:</strong> ${booking.eventDate}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Guests:</strong> ${booking.guestCount}</p>
      <p style="margin: 5px 0; color: #555;"><strong>Deposit:</strong> $${booking.depositAmount}</p>
    </div>
    
    <p style="font-size: 16px; color: #555;">No need to start over — your booking details are saved and ready to complete.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${checkoutUrl}" style="display: inline-block; background: #27ae60; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Complete Your Payment</a>
    </div>
    
    <p style="font-size: 14px; color: #888; text-align: center;">Questions? We're here to help at support@maisondeschefs.com</p>
  </div>
  
  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${booking.dinerName}, your booking is waiting 👨🍳

We noticed you started a booking for ${booking.serviceName} with Chef ${booking.chefName} but didn't complete the payment.

Booking Summary:
- Service: ${booking.serviceName}
- Chef: ${booking.chefName}
- Date: ${booking.eventDate}
- Guests: ${booking.guestCount}
- Deposit: $${booking.depositAmount}

No need to start over — your booking details are saved and ready to complete.

Complete Your Payment: ${checkoutUrl}

Questions? We're here to help at support@maisondeschefs.com

© 2024 Maison des Chefs`,
  };
}

/**
 * Send the abandoned booking recovery email.
 * Returns true if email was sent successfully, false otherwise.
 */
async function sendAbandonedBookingEmail(booking: {
  id: number;
  serviceId: number;
  chefId: number;
  dinerId: number | null;
  guestEmail: string | null;
  eventDate: string;
  guestCount: number;
  totalPrice: number;
  status: string;
  createdAt: Date;
}): Promise<boolean> {
  if (!resend) {
    console.log('[AbandonedBooking] Resend not configured, skipping email');
    return false;
  }

  // Skip if key is a placeholder
  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[AbandonedBooking] RESEND_API_KEY is placeholder, stubbing email send');
    return true; // Treat as success in stub mode
  }

  try {
    // Fetch service and chef details for the email
    const service = db.select().from(services).where(eq(services.id, booking.serviceId)).get();
    const chef = db.select().from(users).where(eq(users.id, booking.chefId)).get();
    
    if (!service || !chef) {
      console.error(`[AbandonedBooking] Could not find service ${booking.serviceId} or chef ${booking.chefId} for booking ${booking.id}`);
      return false;
    }

    // Get diner email and name
    const dinerEmail = booking.guestEmail || (booking.dinerId ? db.select().from(users).where(eq(users.id, booking.dinerId)).get()?.email : null);
    const dinerName = booking.dinerId ? db.select().from(users).where(eq(users.id, booking.dinerId)).get()?.name : 'there';

    if (!dinerEmail) {
      console.error(`[AbandonedBooking] Could not find email for booking ${booking.id}`);
      return false;
    }

    const email = buildAbandonedBookingEmail({
      id: booking.id,
      serviceName: service.name,
      chefName: chef.name,
      eventDate: formatDate(booking.eventDate),
      guestCount: booking.guestCount,
      depositAmount: booking.totalPrice * 0.2, // 20% deposit
      dinerEmail,
      dinerName: dinerName || 'there',
    });

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[AbandonedBooking] Failed to send recovery email:', result.error);
      return false;
    }

    console.log(`[AbandonedBooking] Recovery email sent for booking ${booking.id}`);
    return true;
  } catch (error) {
    console.error('[AbandonedBooking] Error sending recovery email:', error);
    return false;
  }
}

/**
 * Find incomplete bookings older than the threshold and record them as abandoned.
 * Idempotent — already-detected bookings are skipped.
 * Sends recovery emails for newly detected abandoned bookings.
 * Returns the number of newly detected abandoned bookings.
 */
export async function processAbandonedBookings() {
  const cutoff = new Date(Date.now() - ABANDONMENT_THRESHOLD_MINUTES * 60 * 1000);

  try {
    // Find bookings where:
    // - status is incomplete (pending / pending_payment)
    // - created_at <= threshold (older than 10 minutes)
    const incompleteBookings = db
      .select()
      .from(bookings)
      .where(and(
        or(eq(bookings.status, 'pending'), eq(bookings.status, 'pending_payment')),
        lte(bookings.createdAt, cutoff)
      ))
      .all();

    let newlyDetected = 0;

    for (const booking of incompleteBookings) {
      // Skip if already tracked (idempotent)
      const existing = db
        .select()
        .from(abandonedBookings)
        .where(eq(abandonedBookings.bookingId, booking.id))
        .get();

      if (existing) {
        continue;
      }

      // Insert into abandoned bookings tracking table
      db.insert(abandonedBookings)
        .values({
          bookingId: booking.id,
          emailSent: false,
          smsSent: false,
        })
        .run();

      console.log(`[AbandonedBooking] Detected abandoned booking ${booking.id} (created: ${booking.createdAt}, status: ${booking.status})`);

      // Send recovery email
      const emailSent = await sendAbandonedBookingEmail(booking);

      // Update emailSent flag if successful
      if (emailSent) {
        db.update(abandonedBookings)
          .set({ emailSent: true })
          .where(eq(abandonedBookings.bookingId, booking.id))
          .run();
      }

      newlyDetected++;
    }

    return newlyDetected;
  } catch (err) {
    console.error('[AbandonedBooking] Error processing abandoned bookings:', err);
    throw err;
  }
}

/**
 * Stop the abandoned booking detector scheduler.
 */
export function stopAbandonedBookingScheduler() {
  if (abandonedBookingTask) {
    abandonedBookingTask.stop();
    abandonedBookingTask = null;
    console.log('📅 Abandoned Booking Detector stopped');
  }
}
