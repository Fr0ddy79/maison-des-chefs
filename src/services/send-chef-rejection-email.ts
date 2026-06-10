// MAI-2504: Chef Rejection Email
// Sent when admin rejects a chef application — polite rejection with next steps

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const APPLY_AGAIN_URL = process.env.APPLY_AGAIN_URL || 'https://maisondeschefs.com/chef/apply';

interface ChefRejectionEmailParams {
  chefEmail: string;
  chefName: string;
}

function buildRejectionEmail(params: ChefRejectionEmailParams): { subject: string; html: string; text: string } {
  const { chefName } = params;
  const applyAgainLink = APPLY_AGAIN_URL;

  return {
    subject: `Update on Your Maison des Chefs Application`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Dear Chef ${chefName},</h2>

    <p style="font-size: 16px; color: #555;">Thank you for your interest in joining Maison des Chefs as a private chef.</p>

    <p style="font-size: 16px; color: #555;">After careful review, we regret to inform you that we are <span style="color: #e74c3c; font-weight: 600;">unable to move forward</span> with your application at this time.</p>

    <div style="background: #f8f9fa; border-left: 4px solid #95a5a6; border-radius: 4px; padding: 16px 20px; margin: 20px 0;">
      <p style="margin: 0; color: #555; font-size: 15px;">This decision was not easy, and we encourage you to <strong>strengthen your profile and reapply</strong> in the future. Many chefs who are not initially accepted go on to build successful careers on our platform after improving their applications.</p>
    </div>

    <h3 style="color: #2c3e50; margin-top: 25px;">💡 Suggestions for a Stronger Application</h3>
    <ul style="color: #555; line-height: 1.8;">
      <li><strong>Professional experience</strong> — Highlight any restaurant, catering, or culinary training experience</li>
      <li><strong>Signature dishes</strong> — Describe what makes your cooking unique</li>
      <li><strong>Quality photos</strong> — A professional headshot and action shots of you cooking make a great impression</li>
      <li><strong>Clear availability</strong> — Ensure your calendar shows you're available for bookings</li>
    </ul>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${applyAgainLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Update Your Application</a>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center;">Questions about the process? Contact us at support@maisondeschefs.com</p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Dear Chef ${chefName},

Thank you for your interest in joining Maison des Chefs as a private chef.

After careful review, we regret to inform you that we are UNABLE TO MOVE FORWARD with your application at this time.

This decision was not easy, and we encourage you to strengthen your profile and reapply in the future. Many chefs who are not initially accepted go on to build successful careers on our platform after improving their applications.

SUGGESTIONS FOR A STRONGER APPLICATION:
- Professional experience — Highlight any restaurant, catering, or culinary training experience
- Signature dishes — Describe what makes your cooking unique
- Quality photos — A professional headshot and action shots of you cooking make a great impression
- Clear availability — Ensure your calendar shows you're available for bookings

Update Your Application → ${applyAgainLink}

Questions about the process? Contact us at support@maisondeschefs.com

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send chef rejection email.
 * Non-blocking — errors are logged but don't throw.
 */
export async function sendChefRejectionEmail(
  params: ChefRejectionEmailParams
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const { chefEmail, chefName } = params;

  if (!chefEmail) {
    console.error('[ChefRejection] No chef email provided');
    return { success: false, error: 'No chef email' };
  }

  if (!resend) {
    console.warn('[ChefRejection] Resend not configured — skipping email');
    return { success: true, skipped: true };
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[ChefRejection] RESEND_API_KEY is placeholder — stubbing email to ${chefEmail}`);
    return { success: true, skipped: true };
  }

  try {
    const email = buildRejectionEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: chefEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error(`[ChefRejection] Failed to send to ${chefEmail}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[ChefRejection] Rejection email sent to ${chefEmail}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ChefRejection] Exception sending to ${chefEmail}:`, err);
    return { success: false, error: errorMsg };
  }
}