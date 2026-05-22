import { Resend } from 'resend';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const CHEF_DASHBOARD_URL = process.env.CHEF_DASHBOARD_URL || 'https://maisondeschefs.com/chef-dashboard';

/**
 * Format a date string for display in emails.
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not specified';
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
 * Build the SLA check-in email sent to chef when they haven't responded within the SLA deadline.
 * Subject: "⏰ You have a pending inquiry — please respond within 24 hours"
 */
function buildChefSlaCheckInEmail(params: {
  chefName: string;
  dinerName: string;
  serviceName: string;
  eventDate: string | null;
  guestCount: number | null;
  leadId: number;
}): { subject: string; html: string; text: string } {
  const dashboardLink = `${CHEF_DASHBOARD_URL}/leads/${params.leadId}`;
  const formattedDate = formatDate(params.eventDate);
  const guestText = params.guestCount ? `${params.guestCount} guest${params.guestCount !== 1 ? 's' : ''}` : '';

  return {
    subject: `⏰ You have a pending inquiry — please respond within 24 hours`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Pending inquiry — action required</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Hi ${params.chefName},</h2>

    <p style="font-size: 16px; color: #555;">
      You have a <strong>pending booking request</strong> from <strong>${params.dinerName}</strong> for <strong>${params.serviceName}</strong> that requires your attention.
    </p>

    <div style="background: linear-gradient(135deg, #fff9e6 0%, #fef3c7 100%); border: 2px solid #f59e0b; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 14px; color: #92400e; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">⏰ SLA Reminder — Action Required</p>
      <p style="font-size: 18px; font-weight: 600; color: #2c3e50; margin: 0;">${params.dinerName}</p>
      <p style="font-size: 16px; color: #555; margin: 8px 0 0;">${params.serviceName}</p>
    </div>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="margin: 0 0 15px; color: #2c3e50;">Booking Details</h3>
      ${formattedDate !== 'Not specified' ? `<p style="margin: 8px 0; color: #555;"><strong>📅 Event Date:</strong> ${formattedDate}</p>` : ''}
      ${guestText ? `<p style="margin: 8px 0; color: #555;"><strong>👥 Guests:</strong> ${guestText}</p>` : ''}
    </div>

    <p style="font-size: 16px; color: #555;">
      The diner is waiting for a response. Please take action within <strong>24 hours</strong> to avoid losing this booking to another chef.
    </p>

    <div style="background: #e8f5e9; border-left: 4px solid #22c55e; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0 0 8px; color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">💡 What to do</p>
      <p style="margin: 0; color: #155724; font-size: 15px;">
        <strong>Accept</strong> — for a quick yes<br>
        <strong>Send Quote</strong> — to propose pricing or discuss details<br>
        <strong>Decline</strong> — if you're unavailable (diners appreciate honesty)
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Respond Now →</a>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center;">
      Questions? Contact us at support@maisondeschefs.com
    </p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Hi ${params.chefName},

You have a pending booking request from ${params.dinerName} for ${params.serviceName} that requires your attention.

BOOKING DETAILS:
${formattedDate !== 'Not specified' ? `Event Date: ${formattedDate}` : ''}
${guestText ? `Guests: ${guestText}` : ''}

The diner is waiting for a response. Please take action within 24 hours to avoid losing this booking to another chef.

What to do:
- Accept — for a quick yes
- Send Quote — to propose pricing or discuss details
- Decline — if you're unavailable (diners appreciate honesty)

Respond Now → ${dashboardLink}

Questions? Contact us at support@maisondeschefs.com

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send SLA check-in email to the chef when they haven't responded within the SLA deadline.
 * MAI-1745: This fires automatically via cron if the chef hasn't responded within 48 hours.
 * Returns true on success, false on error. Never throws — errors are logged but not propagated.
 */
export async function sendChefSlaCheckInEmail(lead: typeof schema.leads.$inferSelect): Promise<boolean> {
  const leadId = lead.id;

  if (!lead.chefId) {
    console.warn(`[ChefSlaCheckIn] Skipping lead ${leadId} — missing chefId.`);
    return false;
  }

  if (!resend) {
    console.warn(`[ChefSlaCheckIn] RESEND_API_KEY not configured — cannot send email for lead ${leadId}.`);
    return false;
  }

  // Skip if key is a placeholder (development mode)
  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[ChefSlaCheckIn] RESEND_API_KEY is placeholder, stubbing email send for lead ${leadId}.`);
    return true;
  }

  // Get chef info (email + name)
  const [chef] = await db
    .select({ name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, lead.chefId))
    .limit(1);

  if (!chef?.email) {
    console.warn(`[ChefSlaCheckIn] Skipping lead ${leadId} — chef has no email.`);
    return false;
  }

  // Get service name
  const [service] = await db
    .select({ name: schema.services.name })
    .from(schema.services)
    .where(eq(schema.services.id, lead.serviceId))
    .limit(1);

  const serviceName = service?.name || 'your service';

  try {
    const emailContent = buildChefSlaCheckInEmail({
      chefName: chef.name || 'Chef',
      dinerName: lead.clientName || 'A diner',
      serviceName,
      eventDate: lead.eventDate || null,
      guestCount: lead.guestCount || null,
      leadId,
    });

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: chef.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (result.error) {
      console.error(`[ChefSlaCheckIn] Failed to send to ${chef.email} for lead ${leadId}:`, result.error);
      return false;
    }

    console.log(`[ChefSlaCheckIn] Email sent to chef ${chef.email} for lead ${leadId}`);
    return true;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ChefSlaCheckIn] Exception sending to chef ${chef.email} for lead ${leadId}:`, err);
    return false;
  }
}