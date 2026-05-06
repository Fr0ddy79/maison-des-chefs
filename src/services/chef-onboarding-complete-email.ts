import { Resend } from 'resend';
import { db } from '../db/index.js';
import { chefProfiles, users, services } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.FROM_EMAIL || 'Maison des Chefs <onboarding@resend.dev>';
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const SERVICES_URL = process.env.SERVICES_URL || 'https://maisondeschefs.com/services';
const LEADS_URL = process.env.LEADS_URL || 'https://maisondeschefs.com/chef/leads';

interface ChefOnboardingCompleteEmailParams {
  chefId: number;
  chefEmail: string;
  chefName: string;
  serviceName: string;
  serviceId?: number;
}

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
 * Build the chef onboarding completion / welcome email.
 */
function buildChefOnboardingCompleteEmail(params: ChefOnboardingCompleteEmailParams): { subject: string; html: string; text: string } {
  const {
    chefName,
    serviceName,
  } = params;

  const leadsLink = LEADS_URL;
  const servicesLink = SERVICES_URL;

  return {
    subject: `🎉 Welcome, Chef ${chefName}! Your service is now live.`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your service is live!</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #c9a227;">
    <h1 style="color: #2c3e50; margin: 0;">🍽️ Maison des Chefs</h1>
  </div>
  
  <div style="padding: 30px 0;">
    <h2 style="color: #2c3e50;">Congratulations, Chef ${chefName}! 🎉</h2>
    
    <p style="font-size: 16px; color: #555;">Your service "<strong>${serviceName}</strong>" is now <span style="color: #27ae60; font-weight: 600;">LIVE</span> and visible to diners on Maison des Chefs!</p>
    
    <div style="background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 2px solid #4caf50; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
      <p style="font-size: 32px; margin: 0 0 10px;">✅</p>
      <p style="font-size: 18px; color: #2e7d32; margin: 0; font-weight: 600;">You're ready to receive bookings!</p>
    </div>
    
    <h3 style="color: #2c3e50; margin-top: 30px;">📋 What happens next</h3>
    <ol style="color: #555; line-height: 1.8;">
      <li><strong>Diners will find your service</strong> — they'll send you inquiries through the platform</li>
      <li><strong>Check your leads dashboard</strong> → <a href="${leadsLink}" style="color: #c9a227;">View Incoming Leads</a></li>
      <li><strong>Respond within 24 hours</strong> — diners expect a response within 24 hours of submitting an inquiry</li>
      <li><strong>Set your availability</strong> — block dates when you're unavailable so diners know upfront</li>
    </ol>
    
    <h3 style="color: #2c3e50; margin-top: 30px;">💡 Tips for getting your first booking</h3>
    <ul style="color: #555; line-height: 1.8;">
      <li>Respond promptly to inquiries — speed matters!</li>
      <li>Personalize your quote messages with details about your approach</li>
      <li>Add a chef's note to stand out — diners love hearing about your cooking philosophy</li>
      <li>Ask satisfied diners to refer you to friends using your referral code</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${leadsLink}" style="display: inline-block; background: #c9a227; color: white; padding: 14px 28px; border-radius: 4px; text-decoration: none; font-weight: 600; font-size: 16px;">View Your Leads Dashboard</a>
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

Your service "${serviceName}" is now LIVE and visible to diners on Maison des Chefs!

WHAT HAPPENS NEXT:
1. Diners will find your service — they'll send you inquiries through the platform
2. Check your leads dashboard → ${leadsLink}
3. Respond within 24 hours — diners expect a response within 24 hours of submitting an inquiry
4. Set your availability — block dates when you're unavailable so diners know upfront

TIPS FOR GETTING YOUR FIRST BOOKING:
- Respond promptly to inquiries — speed matters!
- Personalize your quote messages with details about your approach
- Add a chef's note to stand out — diners love hearing about your cooking philosophy
- Ask satisfied diners to refer you to friends using your referral code

View Your Leads Dashboard → ${leadsLink}

Questions? We're here to help at support@maisondeschefs.com

— The Maison des Chefs Team

© 2024 Maison des Chefs`,
  };
}

/**
 * Send chef onboarding completion email when they publish their first service.
 * Called from the onboarding wizard publish endpoint after service goes live.
 * Returns true on success, false on error.
 */
export async function sendChefOnboardingCompleteEmail(params: ChefOnboardingCompleteEmailParams): Promise<boolean> {
  const { chefId, chefEmail, chefName, serviceName, serviceId } = params;

  if (!chefEmail) {
    console.error(`[ChefOnboardingComplete] No email for chef ${chefId}`);
    return false;
  }

  if (!resend) {
    console.log('[ChefOnboardingComplete] Resend not configured, skipping email');
    return true;
  }

  // Skip if key is a placeholder
  if (RESEND_API_KEY === 're_placeholder') {
    console.log('[ChefOnboardingComplete] RESEND_API_KEY is placeholder, stubbing email send');
    return true;
  }

  try {
    const email = buildChefOnboardingCompleteEmail(params);

    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: chefEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });

    if (result.error) {
      console.error('[ChefOnboardingComplete] Failed to send onboarding completion email:', result.error);
      return false;
    }

    console.log(`[ChefOnboardingComplete] Onboarding completion email sent for chef ${chefId} (service: ${serviceId})`);
    return true;
  } catch (error) {
    console.error('[ChefOnboardingComplete] Error sending onboarding completion email:', error);
    return false;
  }
}