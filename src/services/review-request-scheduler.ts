import cron, { ScheduledTask } from 'node-cron';
import { db, schema } from '../db/index.js';
import { eq, and, gte, lte, isNull, isNotNull } from 'drizzle-orm';
import { sendReviewRequestEmail } from './review-request-email.js';

let registeredTask: ScheduledTask | null = null;

/**
 * Start the review request email scheduler.
 * Runs every 6 hours to find confirmed bookings where:
 *   - eventDate is between 24-48h ago
 *   - no review has been submitted yet (idempotency)
 * Sends review request emails to diners.
 */
export function startReviewRequestScheduler(): void {
  if (registeredTask) {
    console.log('[ReviewRequestScheduler] Scheduler already initialized');
    return;
  }

  // Run every 6 hours
  const task = cron.schedule('0 */6 * * *', async () => {
    console.log('[ReviewRequestScheduler] Running review request check...');
    try {
      await processReviewRequests();
    } catch (err) {
      console.error('[ReviewRequestScheduler] Error processing review requests:', err);
    }
  });

  registeredTask = task;
  console.log('📅 Registered: Review Request Scheduler (every 6 hours)');
}

/**
 * Stop the review request scheduler.
 */
export function stopReviewRequestScheduler(): void {
  if (registeredTask) {
    registeredTask.stop();
    registeredTask = null;
    console.log('[ReviewRequestScheduler] Scheduler stopped');
  }
}

/**
 * Find confirmed bookings 24-48h after event date with no review,
 * then send review request emails.
 *
 * Approach: query leads that have a confirmed booking (leads.bookingId IS NOT NULL),
 * join back to bookings via leads.bookingId, filter by eventDate 24-48h ago,
 * and exclude leads whose booking already has a review.
 */
export async function processReviewRequests(): Promise<void> {
  const now = new Date();
  // Compute ISO date strings for the 24-48h window (eventDate is stored as text 'YYYY-MM-DD HH:MM:SS')
  const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const fortyEightHoursAgoStr = fortyEightHoursAgo.toISOString().slice(0, 19).replace('T', ' ');
  const twentyFourHoursAgoStr = twentyFourHoursAgo.toISOString().slice(0, 19).replace('T', ' ');

  // Find leads that have a confirmed booking with eventDate in the 24-48h window
  // We start from leads (since they hold diner email/name and link to bookings)
  const eligibleLeads = await db
    .select({
      leadId: schema.leads.id,
      bookingId: schema.leads.bookingId,
      serviceId: schema.leads.serviceId,
      chefId: schema.leads.chefId,
      eventDate: schema.bookings.eventDate,
      guestCount: schema.bookings.guestCount,
      dinerEmail: schema.leads.email,
      dinerName: schema.leads.clientName,
    })
    .from(schema.leads)
    .innerJoin(schema.bookings, eq(schema.leads.bookingId, schema.bookings.id))
    .where(
      and(
        eq(schema.bookings.status, 'confirmed'),
        gte(schema.bookings.eventDate, fortyEightHoursAgoStr),
        lte(schema.bookings.eventDate, twentyFourHoursAgoStr)
      )
    )
    .all();

  if (eligibleLeads.length === 0) {
    console.log('[ReviewRequestScheduler] No eligible bookings for review request.');
    return;
  }

  // Filter out bookings that already have a review (idempotency)
  const bookingsWithoutReviews = await Promise.all(
    eligibleLeads.map(async (lead) => {
      const existingReview = await db
        .select({ id: schema.reviews.id })
        .from(schema.reviews)
        .where(eq(schema.reviews.bookingId, lead.bookingId))
        .limit(1);
      return existingReview.length === 0 ? lead : null;
    })
  );

  const toProcess = bookingsWithoutReviews.filter(Boolean);

  if (toProcess.length === 0) {
    console.log('[ReviewRequestScheduler] All eligible bookings already have reviews.');
    return;
  }

  console.log(`[ReviewRequestScheduler] Found ${toProcess.length} booking(s) needing review requests.`);

  for (const lead of toProcess) {
    if (!lead.dinerEmail) {
      console.warn(`[ReviewRequestScheduler] Skipping lead ${lead.leadId} — missing diner email.`);
      continue;
    }

    try {
      // Get chef name
      const [chef] = await db
        .select({ name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.id, lead.chefId))
        .limit(1);

      // Get service name
      const [service] = await db
        .select({ name: schema.services.name })
        .from(schema.services)
        .where(eq(schema.services.id, lead.serviceId))
        .limit(1);

      const chefName = chef?.name || 'your chef';
      const serviceName = service?.name || 'the service';

      const success = await sendReviewRequestEmail({
        bookingId: lead.bookingId,
        dinerName: lead.dinerName || 'there',
        dinerEmail: lead.dinerEmail,
        chefName,
        serviceName,
        eventDate: lead.eventDate,
        guestCount: lead.guestCount,
      });

      if (success) {
        console.log(`[ReviewRequestScheduler] Review request email sent for booking ${lead.bookingId}.`);
      } else {
        console.error(`[ReviewRequestScheduler] Failed to send review request email for booking ${lead.bookingId}.`);
      }
    } catch (err) {
      console.error(`[ReviewRequestScheduler] Error processing lead ${lead.leadId} / booking ${lead.bookingId}:`, err);
    }
  }
}