// MAI-2504: Chef Approval Notification Email
// Sent when admin approves a chef application — includes login credentials

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const LOGIN_URL = process.env.LOGIN_URL || 'https://maisondeschefs.com/login';

interface ChefApprovalNotificationParams {
  chefEmail: string;
  chefName: string;
  password: string;
}

function buildApprovalEmail(params: ChefApprovalNotificationParams): { subject: string; html: string; text: string } {
  const { chefName, password, chefEmail } = params;
  const loginLink = LOGIN_URL;
  const dashboardLink = DASHBOARD_URL;

  return {
    subject: `🎉 Welcome to Maison des Chefs, Chef ${chefName}! Your application is approved.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Application Approved!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>

  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Congratulations, Chef ${chefName}! 🎉</h2>

    <p style="font-size: 16px; color: #555;">Great news — your application to join Maison des Chefs has been <span style="color: #27ae60; font-weight: 600;">approved</span>!</p>

    <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 2px solid #4caf50; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 18px; color: #2e7d32; margin: 0; font-weight: 600;">✅ Your chef account is ready!</p>
    </div>

    <h3 style="color: #2c3e50; margin-top: 30px;">🔐 Your Login Credentials</h3>
    <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 15px 0;">
      <p style="margin: 8px 0;"><strong>Email:</strong> <code style="background: #e0e0e0; padding: 2px 8px; border-radius: 4px;">${chefEmail}</code></p>
      <p style="margin: 8px 0;"><strong>Password:</strong> <code style="background: #e0e0e0; padding: 2px 8px; border-radius: 4px; font-size: 16px; letter-spacing: 1px;">${password}</code></p>
    </div>

    <p style="color: #e74c3c; font-size: 14px; margin: 10px 0;">⚠️ Please change your password after your first login.</p>

    <h3 style="color: #2c3e50; margin-top: 25px;">📋 Next Steps</h3>
    <ol style="color: #555; line-height: 1.8;">
      <li><strong>Log in</strong> → <a href="${loginLink}" style="color: #c9a227;">Click here to login</a></li>
      <li><strong>Complete your chef profile</strong> — add your bio, photo, and signature dishes</li>
      <li><strong>Set your availability</strong> — let diners know when you're available to cook</li>
      <li><strong>Create your first service</strong> — a private dinner, cooking class, or tasting menu</li>
    </ol>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${dashboardLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">Go to Your Dashboard</a>
    </div>

    <p style="font-size: 14px; color: #888; text-align: center;">Questions? We're here to help at support@maisondeschefs.com</p>
  </div>

  <div style="background: #2c3e50; color: white; padding: 20px; border-radius: 8px; text-align: center;">
    <p style="margin: 0; font-size: 14px;">— The Maison des Chefs Team</p>
    <p style="margin: 10px 0 0; font-size: 12px; opacity: 0.8;">© 2024 Maison des Chefs. Montreal's premier private chef marketplace.</p>
  </div>
</body>
</html>`,
    text: `Congratulations, Chef ${chefName}! 🎉

Your application to join Maison des Chefs has been APPROVED!

YOUR LOGIN CREDENTIALS:
Email: ${chefEmail}
Password: ${password}

⚠️ Please change your password after your first login.

NEXT STEPS:
1. Log in → ${loginLink}
2. Complete your chef profile — add your bio, photo, and signature dishes
3. Set your availability — let diners know when you're available to cook
4. Create your first service — a private dinner, cooking class, or tasting menu

Go to Your Dashboard → ${dashboardLink}

Questions? We're here to help at support@maisondeschefs.com

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send chef approval notification email with login credentials.
 * Non-blocking — errors are logged but don't throw.
 */
export async function sendChefApprovalNotification(
  params: ChefApprovalNotificationParams
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const { chefEmail, chefName, password } = params;

  if (!chefEmail) {
    console.error('[ChefApproval] No chef email provided');
    return { success: false, error: 'No chef email' };
  }

  if (!resend) {
    console.warn('[ChefApproval] Resend not configured — skipping email');
    return { success: true, skipped: true };
  }

  if (RESEND_API_KEY === 're_placeholder') {
    console.log(`[ChefApproval] RESEND_API_KEY is placeholder — stubbing email to ${chefEmail}`);
    return { success: true, skipped: true };
  }

  try {
    const email = buildApprovalEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: chefEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error(`[ChefApproval] Failed to send to ${chefEmail}:`, result.error);
      return { success: false, error: result.error.message };
    }

    console.log(`[ChefApproval] Approval email sent to ${chefEmail}`);
    return { success: true };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[ChefApproval] Exception sending to ${chefEmail}:`, err);
    return { success: false, error: errorMsg };
  }
}