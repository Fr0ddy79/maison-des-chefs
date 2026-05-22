import cron, { ScheduledTask } from 'node-cron';
import { db, schema } from '../db/index.js';
import { eq, and, isNull, lt, or } from 'drizzle-orm';
import { sendChefSlaCheckInEmail } from './chef-sla-checkin-email.js';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

// MAI-1745: SLA check-in cron
// Runs every hour. Finds leads where:
//   - status IN ('new', 'pending') — no chef response yet
//   - slaDeadlineAt < NOW() — SLA deadline has passed
//   - slaCheckInSentAt IS NULL — not already sent
// Then sends a check-in email to the chef and marks slaCheckInSentAt.
let registeredTask: ScheduledTask | null = null;

/**
 * Start the SLA check-in scheduler.
 * Runs every hour to find leads past their SLA deadline and send check-in emails to chefs.
 */
export function startSlaCheckInScheduler(): void {
  if (registeredTask) {
    console.log('[SlaCheckIn] Scheduler already initialized');
    return;
  }

  // Run every hour
  const task = cron.schedule('0 * * * *', async () => {
    console.log('[SlaCheckIn] Running SLA check-in...');
    try {
      await processSlaCheckIn();
    } catch (err) {
      console.error('[SlaCheckIn] Error processing SLA check-in:', err);
    }
  });

  registeredTask = task;
  console.log('📅 Registered: SLA Check-In cron (every hour)');
}

/**
 * Stop the SLA check-in scheduler.
 */
export function stopSlaCheckInScheduler(): void {
  if (registeredTask) {
    registeredTask.stop();
    registeredTask = null;
    console.log('[SlaCheckIn] Scheduler stopped');
  }
}

/**
 * Process leads that have passed their SLA deadline and send check-in emails to chefs.
 * Finds leads where:
 *   - status IN ('new', 'pending') — no chef response yet
 *   - slaDeadlineAt < NOW() — SLA deadline has passed
 *   - slaCheckInSentAt IS NULL — not already sent
 */
export async function processSlaCheckIn(): Promise<void> {
  // Only process if RESEND_API_KEY is configured
  if (!RESEND_API_KEY) {
    console.log('[SlaCheckIn] RESEND_API_KEY not configured — skipping SLA check-in processing.');
    return;
  }

  const now = new Date();

  // Find leads: no chef response, past SLA deadline, not already checked in
  const leadsToCheckIn = await db
    .select()
    .from(schema.leads)
    .where(
      and(
        // No chef response yet (still in initial state)
        or(
          eq(schema.leads.status, 'new'),
          eq(schema.leads.status, 'pending')
        ),
        // SLA deadline has passed
        lt(schema.leads.slaDeadlineAt, now),
        // Not already sent SLA check-in email
        isNull(schema.leads.slaCheckInSentAt)
      )
    )
    .all();

  if (leadsToCheckIn.length === 0) {
    console.log('[SlaCheckIn] No leads needing SLA check-in.');
    return;
  }

  console.log(`[SlaCheckIn] Found ${leadsToCheckIn.length} lead(s) needing SLA check-in.`);

  for (const lead of leadsToCheckIn) {
    if (!lead.email) {
      console.warn(`[SlaCheckIn] Skipping lead ${lead.id} — missing email.`);
      continue;
    }

    // Send the SLA check-in email to the chef
    const success = await sendChefSlaCheckInEmail(lead);

    if (success) {
      // Mark SLA check-in as sent (idempotency)
      await db
        .update(schema.leads)
        .set({ slaCheckInSentAt: new Date() })
        .where(eq(schema.leads.id, lead.id));

      console.log(`[SlaCheckIn] SLA check-in email sent for lead ${lead.id}.`);
    } else {
      console.error(`[SlaCheckIn] Failed to send SLA check-in email for lead ${lead.id}`);
    }
  }
}