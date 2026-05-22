/**
 * Lead Stagnation Alert Service
 * 
 * Identifies leads that haven't received a chef response within SLA window
 * and sends automated alerts to chefs to prompt action.
 * 
 * This addresses the problem of leads going cold — chefs get busy and forget
 * to respond to inquiries, causing diners to drop off.
 * 
 * Run via cron every 2-4 hours.
 */

import { db } from '../db/index.js';
import { leads, users, chefProfiles, services } from '../db/schema.js';
import { eq, and, lt, isNull, or } from 'drizzle-orm';
import { createNotification } from '../api/notifications.js';

const STAGNATION_THRESHOLD_HOURS = 24; // Alert if no chef response after 24h
const SECOND_STAGNATION_THRESHOLD_HOURS = 48; // Escalate if still no response at 48h

interface StagnantLead {
  leadId: number;
  chefId: number;
  chefName: string;
  chefEmail: string;
  dinerName: string;
  serviceName: string;
  eventDate: string;
  guestCount: number;
  quoteAmount: number | null;
  createdAt: Date;
  hoursSinceCreated: number;
  status: string;
}

interface AlertResult {
  totalChecked: number;
  stagnantLeads: StagnantLead[];
  alertsSent: number;
  skippedNoEmail: number;
}

export async function checkStagnantLeads(): Promise<AlertResult> {
  const thresholdTime = new Date(Date.now() - STAGNATION_THRESHOLD_HOURS * 60 * 60 * 1000);
  const escalationThresholdTime = new Date(Date.now() - SECOND_STAGNATION_THRESHOLD_HOURS * 60 * 60 * 1000);

  // Find leads that:
  // - Are in 'pending' status (awaiting chef response)
  // - Created more than STAGNATION_THRESHOLD_HOURS ago
  // - Have no chef response (status still pending)
  const stagnantLeads = db.select({
    leadId: leads.id,
    chefId: leads.chefId,
    chefName: users.name,
    chefEmail: users.email,
    dinerName: leads.clientName,
    serviceName: services.name,
    eventDate: leads.eventDate,
    guestCount: leads.guestCount,
    quoteAmount: leads.quoteAmount,
    createdAt: leads.createdAt,
    status: leads.status,
  })
    .from(leads)
    .innerJoin(users, eq(leads.chefId, users.id))
    .innerJoin(services, eq(leads.serviceId, services.id))
    .where(
      and(
        eq(leads.status, 'pending'),
        lt(leads.createdAt, thresholdTime)
      )
    )
    .all();

  const result: AlertResult = {
    totalChecked: stagnantLeads.length,
    stagnantLeads: stagnantLeads.map(lead => ({
      ...lead,
      hoursSinceCreated: Math.floor((Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60)),
    })),
    alertsSent: 0,
    skippedNoEmail: 0
  };

  console.log(`[LeadStagnation] Found ${result.stagnantLeads.length} stagnant leads (pending, >${STAGNATION_THRESHOLD_HOURS}h old)`);
  
  for (const lead of result.stagnantLeads) {
    if (!lead.chefEmail) {
      result.skippedNoEmail++;
      continue;
    }
    
    const isEscalation = lead.createdAt < escalationThresholdTime;

    // Create in-app notification for the chef
    // This surfaces immediately on dashboard login, regardless of email delivery status
    createNotification({
      userId: lead.chefId,
      type: isEscalation ? 'lead_stagnant_escalated' : 'lead_stagnant',
      title: isEscalation ? '⚠️ URGENT: Lead expiring soon!' : '⏰ Lead needs your attention',
      body: `You have a pending inquiry from ${lead.dinerName} for ${lead.serviceName} on ${lead.eventDate} — ${lead.hoursSinceCreated}h without response`,
      metadata: {
        leadId: lead.leadId,
        serviceName: lead.serviceName,
        eventDate: lead.eventDate,
      },
    });

    if (!isEscalation) {
      console.log(`[LeadStagnation] REMINDER sent to ${lead.chefName} (${lead.chefEmail}) for lead ${lead.leadId} from ${lead.dinerName}`);
    } else {
      console.log(`[LeadStagnation] ESCALATION sent to ${lead.chefName} (${lead.chefEmail}) for lead ${lead.leadId} — ${lead.hoursSinceCreated}h without response!`);
    }

    result.alertsSent++;
  }

  return result;
}

// Run directly if called as script
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('[LeadStagnation] Running stagnation check...');
  checkStagnantLeads()
    .then(result => {
      console.log('[LeadStagnation] Check complete:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('[LeadStagnation] Error:', err);
      process.exit(1);
    });
}
