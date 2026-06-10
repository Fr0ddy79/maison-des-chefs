// MAI-2813: Admin Application Notification Email
// Sent when a prospective chef submits an application — notifies admin of new submission

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@maisondeschefs.com';
const APPLICATIONS_URL = process.env.APPLICATIONS_URL || 'https://maisondeschefs.com/admin/applications';

interface AdminApplicationNotificationParams {
  applicantName: string;
  applicantEmail: string;
  location: string;
  cuisineTypes: string[];
  yearsExperience: number;
  bio?: string;
  submittedAt: Date;
}

function buildAdminNotificationEmail(params: AdminApplicationNotificationParams): { subject: string; html: string; text: string } {
  const { applicantName, applicantEmail, location, cuisineTypes, yearsExperience, bio, submittedAt } = params;
  const applicationsLink = APPLICATIONS_URL;
  const formattedDate = submittedAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const cuisineList = cuisineTypes.length > 0 ? cuisineTypes.join(', ') : 'Not specified';

  return {
    subject: `🍽️ New Chef Application: ${applicantName}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Chef Application</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
    <p style="color: #888; margin: 5px 0 0;">Admin Notification</p>
  </div>

  <div style="padding: 30px 0;">
    <div style="background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%); border: 2px solid #ff9800; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <p style="font-size: 18px; color: #e65100; margin: 0; font-weight: 600;">📬 New Chef Application Received</p>
    </div>

    <h2 style="color: #2c3e50;">${applicantName}</h2>

    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #2c3e50; margin-top: 0;">📋 Application Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #888; width: 120px;"><strong>Email:</strong></td>
          <td style="padding: 8px 0;"><a href="mailto:${applicantEmail}" style="color: #c9a227;">${applicantEmail}</a></td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;"><strong>Location:</strong></td>
          <td style="padding: 8px 0;">${location || 'Not specified'}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;"><strong>Cuisines:</strong></td>
          <td style="padding: 8px 0;">${cuisineList}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;"><strong>Experience:</strong></td>
          <td style="padding: 8px 0;">${yearsExperience} years</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #888;"><strong>Submitted:</strong></td>
          <td style="padding: 8px 0;">${formattedDate}</td>
        </tr>
      </table>
    </div>

    ${bio ? `
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
      <h3 style="color: #2c3e50; margin-top: 0;">📝 Bio</h3>
      <p style="color: #555; white-space: pre-wrap; line-height: 1.6;">${bio}</p>
    </div>
    ` : ''}

    <div style="text-align: center; margin: 30px 0;">
      <a href="${applicationsLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Review Applications</a>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center;">You received this email because you're an admin of Maison des Chefs.</p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs System</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2026 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `NEW CHEF APPLICATION RECEIVED

Applicant: ${applicantName}
Email: ${applicantEmail}
Location: ${location || 'Not specified'}
Cuisines: ${cuisineList}
Experience: ${yearsExperience} years
Submitted: ${formattedDate}

${bio ? `Bio:\n${bio}\n` : ''}

Review this application: ${applicationsLink}

---
You received this email because you're an admin of Maison des Chefs.
© 2026 Maison des Chefs`,
  };
}

/**
 * Send admin notification email when a new chef application is submitted.
 * Non-blocking — errors are logged but don't throw.
 */
export async function sendAdminApplicationNotification(
  params: AdminApplicationNotificationParams
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const { applicantName, applicantEmail, location, cuisineTypes, yearsExperience, bio, submittedAt } = params;

  if (!ADMIN_EMAIL) {
    console.error('[AdminApplicationNotification] No admin email configured');
    return { success: false, error: 'No admin email' };
  }

  if (!resend) {
    console.warn('[AdminApplicationNotification] Resend not configured — skipping email');
    return { success: true, skipped: true };
  }

  if (RESEND_API_KEY === 're_placeholder' || RESEND_API_KEY?.startsWith('re_')) {
    console.log(`[AdminApplicationNotification] RESEND_API_KEY is placeholder — stubbing email to ${ADMIN_EMAIL}`);
    console.log(`  Applicant: ${applicantName} (${applicantEmail})`);
    console.log(`  Location: ${location || 'Not specified'}, Cuisines: ${cuisineTypes.join(', ') || 'Not specified'}`);
    return { success: true, skipped: true };
  }

  try {
    const email = buildAdminNotificationEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error(`[AdminApplicationNotification] Failed to send to ${ADMIN_EMAIL}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[AdminApplicationNotification] Admin notification sent for ${applicantName} (${applicantEmail})`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[AdminApplicationNotification] Exception sending to ${ADMIN_EMAIL}:`, err);
    return { success: false, error: errorMsg };
  }
}