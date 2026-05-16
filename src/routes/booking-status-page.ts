// Booking Status Page - Public HTML page for guests to view their booking status
// MAI-805: Guest Booking Recovery via Email Token

import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leads, services, users, chefProfiles, reviews, bookings } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';

const BOOKING_STATUS_TOKEN_EXPIRY_DAYS = 30;
const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';
const CHECKOUT_URL = process.env.CHECKOUT_URL || 'https://maisondeschefs.com';

/**
 * Format a date string for display.
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
 * Get the display-friendly status information for leads.
 */
function getStatusDisplay(status: string): { label: string; color: string; bgColor: string; icon: string; description: string } {
  const statusMap: Record<string, { label: string; color: string; bgColor: string; icon: string; description: string }> = {
    'new': { label: 'Inquiry Received', color: '#b45309', bgColor: '#fef3c7', icon: '📬', description: 'We\'ve received your request and chef will review it soon' },
    'pending': { label: 'Pending Review', color: '#b45309', bgColor: '#fef3c7', icon: '⏳', description: 'Chef is reviewing your request' },
    'quoted': { label: 'Quote Received!', color: '#1d4ed8', bgColor: '#dbeafe', icon: '💰', description: 'Chef has sent you a quote - review and complete payment' },
    'accepted': { label: 'Request Accepted', color: '#15803d', bgColor: '#dcfce7', icon: '👍', description: 'Chef has accepted your request' },
    'declined': { label: 'Not Available', color: '#dc2626', bgColor: '#fee2e2', icon: '👎', description: 'Chef is not available for this date' },
    'expired': { label: 'Inquiry Expired', color: '#6b7280', bgColor: '#f3f4f6', icon: '⏰', description: 'Chef did not respond within 72 hours' },
    'converted': { label: 'Booking Confirmed! 🎉', color: '#15803d', bgColor: '#dcfce7', icon: '✅', description: 'Your booking is confirmed' },
    'cancelled': { label: 'Cancelled', color: '#6b7280', bgColor: '#f3f4f6', icon: '🚫', description: 'This inquiry has been cancelled' },
  };
  return statusMap[status] || { label: status, color: '#6b7280', bgColor: '#f3f4f6', icon: '📋', description: '' };
}

/**
 * Check if lead has a quote (can proceed to checkout).
 */
function hasQuote(status: string): boolean {
  return ['quoted', 'accepted', 'converted'].includes(status);
}

/**
 * Get the next steps based on lead status.
 */
function getNextSteps(status: string, checkoutUrl: string | null): string[] {
  switch (status) {
    case 'new':
    case 'pending':
      return [
        'Chef will review your request within 24 hours',
        'You\'ll receive an email when chef responds',
        'Feel free to browse other services in the meantime',
      ];
    case 'quoted':
      return [
        'Chef has sent you a quote!',
        'Review the quote details below',
        'Complete payment to confirm your booking',
        checkoutUrl ? `<a href="${checkoutUrl}" class="cta-button">View Quote & Pay →</a>` : 'Payment link not available',
      ];
    case 'accepted':
      return [
        'Great news! Chef has accepted your request',
        'You\'ll receive payment instructions soon',
        'Complete payment to confirm your booking',
      ];
    case 'converted':
      return [
        'Your booking is confirmed!',
        'Chef will contact you with event details',
        'Prepare for an amazing dining experience!',
      ];
    case 'declined':
      return [
        'Unfortunately, chef cannot accommodate this request',
        'Browse other chefs who may be available',
        'Try a different date or location',
      ];
    case 'expired':
      return [
        'Your inquiry has expired — chef did not respond within 72 hours',
        'Browse other chefs who may be available',
        'Try a different date or location',
      ];
    case 'cancelled':
      return [
        'This inquiry has been cancelled',
        'Create a new inquiry to book again',
        'Browse available services',
      ];
    default:
      return ['Check back later for updates'];
  }
}

/**
 * MAI-1014: Determine current stage index (0-4) for the 5-stage booking timeline.
 * Stage 0: Inquiry Sent (complete immediately on submission)
 * Stage 1: Awaiting Response (active for new/pending)
 * Stage 2: Quote Received (active for quoted)
 * Stage 3: Payment (active for accepted but not converted)
 * Stage 4: Confirmed (active for converted)
 */
function getCurrentStage(status: string): number {
  if (status === 'new' || status === 'pending') return 1;
  if (status === 'quoted') return 2;
  if (status === 'accepted') return 3;
  if (status === 'converted') return 4;
  if (status === 'declined' || status === 'cancelled' || status === 'expired') return -1; // Terminal
  return 0;
}

/**
 * MAI-1443: Get chef trust signals — review count, avg rating, and completed booking count.
 * Used on the booking status page when status === 'quoted' to provide social proof.
 */
function getChefTrustSignals(chefId: number): { chefAvgRating: number; chefReviewCount: number; chefBookingCount: number } {
  // Get review stats for this chef (aggregated across all their services)
  const ratingResult = db.select({
    avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
    reviewCount: sql<number>`count(*)`,
  })
    .from(reviews)
    .where(eq(reviews.chefId, chefId))
    .get();

  // Get completed booking count for this chef
  const bookingCountResult = db.select({
    bookingCount: sql<number>`count(*)`,
  })
    .from(bookings)
    .where(eq(bookings.chefId, chefId))
    .get();

  return {
    chefAvgRating: ratingResult ? Number(ratingResult.avgRating) : 0,
    chefReviewCount: ratingResult ? Number(ratingResult.reviewCount) : 0,
    chefBookingCount: bookingCountResult ? Number(bookingCountResult.bookingCount) : 0,
  };
}

export default async function bookingStatusPageRoutes(server: FastifyInstance) {
  // GET /booking-status - Public booking status page
  // MAI-805: Works with leads (inquiries) to track guest booking status
  // MAI-1396: Also accessible via /lead/:token for cleaner URLs
  server.get('/booking-status', async (request, reply) => {
    const query = request.query as Record<string, string>;
    const token = query.token;

    if (!token) {
      return buildErrorPage('No token provided', 'Please use the link from your confirmation email to access your booking status.');
    }

    if (token.length !== 64) {
      return buildErrorPage('Invalid token', 'The access token appears to be invalid. Please use the link from your confirmation email.');
    }

    // Find lead by access token
    const lead = db.select({
      id: leads.id,
      serviceId: leads.serviceId,
      eventDate: leads.eventDate,
      guestCount: leads.guestCount,
      status: leads.status,
      message: leads.message,
      createdAt: leads.createdAt,
      accessToken: leads.accessToken,
      accessTokenExpiresAt: leads.accessTokenExpiresAt,
      email: leads.email,
      clientName: leads.clientName,
      quoteAmount: leads.quoteAmount,
      quoteMessage: leads.quoteMessage,
      quoteSentAt: leads.quoteSentAt,
      referralCode: leads.referralCode, // MAI-823: Referral tracking
      referralSource: leads.referralSource, // MAI-823: Referral tracking
      selectedAddons: leads.selectedAddons, // MAI-1147: Upsell tracking
      serviceName: services.name,
      serviceDescription: services.description,
      chefId: leads.chefId,
      chefName: users.name,
      chefLocation: chefProfiles.location,
    })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .innerJoin(users, eq(leads.chefId, users.id))
      .leftJoin(chefProfiles, eq(leads.chefId, chefProfiles.userId))
      .where(eq(leads.accessToken, token))
      .get();

    if (!lead) {
      return buildErrorPage('Booking not found', 'No booking was found with this access token. Please check your email link or contact support.');
    }

    // Check if token has expired
    if (lead.accessTokenExpiresAt && new Date(lead.accessTokenExpiresAt) < new Date()) {
      return buildExpiredPage(lead);
    }

    // Build the booking status page
    return buildBookingStatusPage(lead, token);
  });

  // MAI-1396: GET /lead/:token - Cleaner URL alias for booking status
  server.get<{ Params: { token: string } }>('/lead/:token', async (request, reply) => {
    const { token } = request.params;

    if (!token || token.length !== 64) {
      return buildErrorPage('Invalid link', 'This booking status link appears to be invalid. Please use the link from your confirmation email.');
    }

    // Find lead by access token
    const lead = db.select({
      id: leads.id,
      serviceId: leads.serviceId,
      eventDate: leads.eventDate,
      guestCount: leads.guestCount,
      status: leads.status,
      message: leads.message,
      createdAt: leads.createdAt,
      accessToken: leads.accessToken,
      accessTokenExpiresAt: leads.accessTokenExpiresAt,
      email: leads.email,
      clientName: leads.clientName,
      quoteAmount: leads.quoteAmount,
      quoteMessage: leads.quoteMessage,
      quoteSentAt: leads.quoteSentAt,
      referralCode: leads.referralCode,
      referralSource: leads.referralSource,
      selectedAddons: leads.selectedAddons,
      serviceName: services.name,
      serviceDescription: services.description,
      chefId: leads.chefId,
      chefName: users.name,
      chefLocation: chefProfiles.location,
    })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .innerJoin(users, eq(leads.chefId, users.id))
      .leftJoin(chefProfiles, eq(leads.chefId, chefProfiles.userId))
      .where(eq(leads.accessToken, token))
      .get();

    if (!lead) {
      return buildErrorPage('Booking not found', 'No booking was found with this access token. Please check your email link or contact support.');
    }

    if (lead.accessTokenExpiresAt && new Date(lead.accessTokenExpiresAt) < new Date()) {
      return buildExpiredPage(lead);
    }

    return buildBookingStatusPage(lead, token);
  });

  // MAI-1147: POST /api/booking-status/:token/request-addon
  // Sends email to chef requesting an add-on upgrade
  server.post<{ Params: { token: string } }>(
    '/api/booking-status/:token/request-addon',
    async (request, reply) => {
      const { token } = request.params;
      const { addonId, addonName, addonPrice } = request.body as { addonId: string; addonName: string; addonPrice: number };

      if (!token || token.length !== 64) {
        return reply.status(400).send({ error: 'Invalid token' });
      }

      if (!addonId || !addonName || addonPrice == null) {
        return reply.status(400).send({ error: 'Invalid addon data' });
      }

      // Find lead by access token
      const lead = db.select({
        id: leads.id,
        email: leads.email,
        clientName: leads.clientName,
        eventDate: leads.eventDate,
        guestCount: leads.guestCount,
        chefId: leads.chefId,
        serviceId: leads.serviceId,
        status: leads.status,
      })
        .from(leads)
        .where(eq(leads.accessToken, token))
        .get();

      if (!lead) {
        return reply.status(404).send({ error: 'Booking not found' });
      }

      // Only allow for confirmed (converted) bookings
      if (lead.status !== 'converted') {
        return reply.status(400).send({ error: 'Add-ons can only be requested for confirmed bookings' });
      }

      // In MVP, we just log the request (email sending would be implemented here)
      // For now, log and return success
      console.log(`[MAI-1147] Addon request: lead=${lead.id}, addon=${addonId}, chef=${lead.chefId}`);

      return {
        success: true,
        message: `Request sent to chef for ${addonName}`,
        addonId,
        addonName,
        addonPrice,
      };
    }
  );
}

function buildErrorPage(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .error-container { text-align: center; padding: 2rem; max-width: 500px; }
    .error-icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; color: #2c3e50; margin-bottom: 0.5rem; }
    p { color: #666; margin-bottom: 1.5rem; }
    .help-link { color: #c9a227; text-decoration: none; font-weight: 500; }
    .help-link:hover { text-decoration: underline; }
    .logo { color: #2c3e50; font-size: 1.5rem; font-weight: bold; margin-bottom: 2rem; display: block; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
    nav .logo { color: white; font-size: 1.2rem; margin: 0; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; font-size: 0.9rem; }
  </style>
</head>
<body>
  <nav>
    <span class="logo">Maison des Chefs</span>
    <div class="nav-links">
      <a href="/services">Browse Services</a>
      <a href="/auth/login">Sign In</a>
    </div>
  </nav>
  <div class="error-container" style="margin-top: 60px;">
    <div class="error-icon">🔍</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="/services" class="help-link">Browse Services →</a>
  </div>
</body>
</html>`;
}

function buildExpiredPage(lead: any): string {
  const expiryDate = lead.accessTokenExpiresAt ? formatDate(lead.accessTokenExpiresAt.toString()) : '30 days after booking';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Link Expired | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    .expired-container { text-align: center; padding: 2rem; max-width: 500px; }
    .expired-icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 1.5rem; color: #2c3e50; margin-bottom: 0.5rem; }
    p { color: #666; margin-bottom: 1rem; }
    .info-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 1rem; margin: 1.5rem 0; text-align: left; }
    .info-box p { margin: 0; color: #92400e; font-size: 0.9rem; }
    .help-link { color: #c9a227; text-decoration: none; font-weight: 500; }
    .help-link:hover { text-decoration: underline; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
    nav .logo { color: white; font-size: 1.2rem; margin: 0; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; font-size: 0.9rem; }
  </style>
</head>
<body>
  <nav>
    <span class="logo">Maison des Chefs</span>
    <div class="nav-links">
      <a href="/services">Browse Services</a>
      <a href="/auth/login">Sign In</a>
    </div>
  </nav>
  <div class="expired-container" style="margin-top: 60px;">
    <div class="expired-icon">⏰</div>
    <h1>This Link Has Expired</h1>
    <p>Your booking status link is no longer active. This helps keep your booking information secure.</p>
    <div class="info-box">
      <p><strong>What happened?</strong></p>
      <p>Booking status links expire ${BOOKING_STATUS_TOKEN_EXPIRY_DAYS} days after they're created for security reasons.</p>
    </div>
    <p>If you need to check your booking status, please contact us at <a href="mailto:support@maisondeschefs.com" class="help-link">support@maisondeschefs.com</a></p>
    <p style="margin-top: 1rem;"><a href="/services" class="help-link">Browse Services →</a></p>
  </div>
</body>
</html>`;
}

function buildBookingStatusPage(lead: any, token: string): string {
  const statusDisplay = getStatusDisplay(lead.status);
  const isPaymentNeeded = hasQuote(lead.status);
  const checkoutUrl = isPaymentNeeded ? `${CHECKOUT_URL}/checkout/${lead.id}?token=${token}` : null;
  const nextSteps = getNextSteps(lead.status, checkoutUrl);
  const tokenExpiryDate = lead.accessTokenExpiresAt ? formatDate(lead.accessTokenExpiresAt.toString()) : null;
  const isConverted = lead.status === 'converted';

  // MAI-1443: Get chef trust signals for quoted status
  const trustSignals = getChefTrustSignals(lead.chefId);

  // MAI-1014: Timeline stage calculation
  const currentStage = getCurrentStage(lead.status);
  const isStale = (lead.status === 'new' || lead.status === 'pending') && (Date.now() - new Date(lead.createdAt).getTime()) > 12 * 60 * 60 * 1000;

  const nextStepsHtml = nextSteps.map(step => {
    if (step.includes('<a href=')) {
      return `<li>${step}</li>`;
    }
    return `<li>${step}</li>`;
  }).join('');

  // Format quote amount if available
  const quoteAmountDisplay = lead.quoteAmount != null ? `$${Number(lead.quoteAmount).toFixed(2)}` : null;

  // MAI-1014: 5-stage timeline data
  const timelineStages = [
    { icon: '📬', label: 'Inquiry Sent', sublabel: 'Request submitted', duration: 'Complete' },
    { icon: '⏳', label: 'Awaiting Response', sublabel: 'Chef is reviewing', duration: '4-12 hours expected' },
    { icon: '💰', label: 'Quote Received', sublabel: 'Review & decide', duration: lead.quoteSentAt ? `Sent ${formatDate(lead.quoteSentAt.toString())}` : 'Pending' },
    { icon: '💳', label: 'Payment', sublabel: 'Complete checkout', duration: 'Secure & easy' },
    { icon: '✅', label: 'Confirmed', sublabel: 'Booking secured', duration: 'You\'re all set!' },
  ];

  // Build timeline HTML
  const timelineHtml = `
    <div class="timeline-container">
      <h3 class="timeline-title">📍 Your Booking Journey</h3>
      <div class="timeline">
        ${timelineStages.map((stage, index) => {
          const stageNum = index;
          const isComplete = stageNum < currentStage;
          const isActive = stageNum === currentStage;
          const stageClass = isComplete ? 'complete' : isActive ? 'active' : 'pending';
          return `
          <div class="timeline-step ${stageClass}">
            <div class="timeline-marker">
              <div class="timeline-icon">${stage.icon}</div>
            </div>
            <div class="timeline-content">
              <div class="timeline-label">${stage.label}</div>
              <div class="timeline-sublabel">${stage.sublabel}</div>
              <div class="timeline-duration">${stage.duration}</div>
            </div>
          </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // MAI-1614: Check if pending booking context card should show (pending < 24h old)
  const isPendingContextEligible = lead.status === 'pending' && (Date.now() - new Date(lead.createdAt).getTime()) < 24 * 60 * 60 * 1000;

  // MAI-1014: Stale lead follow-up section (new/pending > 12h old)
  const staleFollowupHtml = isStale ? `
    <div class="stale-followup-card">
      <div class="stale-followup-header">
        <span class="stale-icon">⏰</span>
        <h3>What if there's no response?</h3>
      </div>
      <p class="stale-description">It's been over 12 hours since you sent your inquiry. Chefs typically respond within 4-12 hours. If you're not getting a response, we can send a gentle reminder to the chef on your behalf.</p>
      <button id="reengageBtn" class="reengage-button" onclick="triggerReengage('${token}', this)">
        <span class="reengage-spinner" style="display:none;">⟳</span>
        <span class="reengage-text">Send Reminder Email ✉️</span>
      </button>
      <p id="reengageSuccess" class="reengage-success" style="display:none;">✓ Reminder sent! The chef should be in touch soon.</p>
      <p id="reengageError" class="reengage-error" style="display:none;"></p>
    </div>
  ` : '';

  // MAI-1614: Pending booking context card for pending < 24h old
  const pendingContextCardHtml = isPendingContextEligible ? `
    <div class="pending-context-card">
      <div class="pending-context-icon">👨‍🍳</div>
      <div class="pending-context-content">
        <h3 class="pending-context-title">Chef ${lead.chefName} has received your request</h3>
        <p class="pending-context-message">They are reviewing your inquiry for <strong>${formatDate(lead.eventDate)}</strong> and will respond within 24-48 hours.</p>
        <div class="pending-context-next">
          <span class="pending-context-next-label">What happens next:</span>
          <ul class="pending-context-steps">
            <li>Chef ${lead.chefName} will review your request and any questions they may have</li>
            <li>You'll receive an email notification when they respond</li>
            <li>Feel free to browse other services while you wait</li>
          </ul>
        </div>
      </div>
    </div>
  ` : '';

  // MAI-823: Referral CTA for converted bookings
  const referralCtaHtml = isConverted ? `
    <div class="referral-card">
      <h3 class="referral-title">🍽️ Share the experience & earn $25 toward your next booking</h3>
      <p class="referral-description">Know someone who'd love this experience? Share your unique referral link and earn $25 credits each time someone books using it!</p>
      ${lead.referralCode ? `
      <div class="referral-code-section">
        <p class="referral-code-label">Your Referral Code:</p>
        <div class="referral-code-box">${lead.referralCode}</div>
      </div>
      ` : ''}
      <div class="share-buttons">
        <a href="/referral/track?code=${lead.referralCode || ''}&source=copy" class="share-btn copy-btn" onclick="copyReferralLink(this, '${lead.referralCode || ''}'); return false;">
          <span class="share-icon">📋</span> Copy Link
        </a>
        <a href="/referral/track?code=${lead.referralCode || ''}&source=email" class="share-btn email-btn" onclick="return confirm('Send referral link via email?')">
          <span class="share-icon">✉️</span> Email
        </a>
        <a href="/referral/track?code=${lead.referralCode || ''}&source=whatsapp" class="share-btn whatsapp-btn" target="_blank" rel="noopener">
          <span class="share-icon">💬</span> WhatsApp
        </a>
      </div>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Status | ${lead.serviceName} | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.2rem; margin: 0; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; font-size: 0.9rem; }
    
    .page-content { max-width: 700px; margin: 0 auto; padding: 6rem 1.5rem 3rem; }
    
    .page-header { text-align: center; margin-bottom: 2rem; }
    .page-header h1 { font-size: 1.8rem; color: #2c3e50; margin-bottom: 0.5rem; }
    .page-header p { color: #666; }
    
    .booking-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; margin-bottom: 1.5rem; }
    
    .status-banner { padding: 2rem; text-align: center; }
    .status-icon { font-size: 3rem; margin-bottom: 1rem; }
    .status-label { font-size: 1.5rem; font-weight: 700; color: ${statusDisplay.color}; margin-bottom: 0.5rem; }
    .status-description { color: #666; font-size: 0.95rem; }
    
    .booking-details { padding: 1.5rem 2rem; background: #f8f9fa; border-top: 1px solid #eee; }
    .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
    .detail-item { }
    .detail-label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .detail-value { font-size: 1rem; color: #2c3e50; font-weight: 500; }
    .detail-value.large { font-size: 1.5rem; font-weight: 700; color: #2c3e50; }
    
    .event-info { padding: 1.5rem 2rem; border-top: 1px solid #eee; }
    .event-title { font-size: 1.2rem; font-weight: 600; color: #2c3e50; margin-bottom: 0.25rem; }
    .event-chef { color: #666; margin-bottom: 0.5rem; }
    .event-description { color: #555; font-size: 0.95rem; line-height: 1.6; }
    
    .quote-section { padding: 1.5rem 2rem; border-top: 1px solid #eee; }
    .quote-amount { font-size: 2rem; font-weight: 700; color: #c9a227; }
    .quote-message { color: #555; font-size: 0.95rem; font-style: italic; margin-top: 0.5rem; }
    
    .notes-section { padding: 1.5rem 2rem; border-top: 1px solid #eee; }
    .notes-label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .notes-text { color: #555; font-size: 0.95rem; font-style: italic; }
    
    /* MAI-1443: Trust section for quoted status */
    .trust-section { padding: 1.25rem 2rem; border-top: 1px solid #eee; background: #fafafa; display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: center; }
    .trust-item { display: flex; align-items: center; gap: 0.4rem; }
    .trust-stars { color: #c9a227; font-size: 1rem; }
    .trust-rating { font-weight: 600; color: #2c3e50; font-size: 0.95rem; }
    .trust-count { color: #666; font-size: 0.85rem; }
    .trust-icon { font-size: 1rem; }
    .trust-text { color: #666; font-size: 0.85rem; }
    .stripe-badge { margin-left: auto; }
    .stripe-badge .trust-icon { color: #635bff; }
    .stripe-badge .trust-text { color: #888; }
    
    .next-steps-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 1.5rem 2rem; margin-bottom: 1.5rem; }
    .next-steps-title { font-size: 1.1rem; font-weight: 600; color: #2c3e50; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .next-steps-list { list-style: none; }
    .next-steps-list li { padding: 0.5rem 0; color: #555; display: flex; align-items: flex-start; gap: 0.75rem; }
    .next-steps-list li::before { content: '→'; color: #c9a227; font-weight: bold; }
    
    .cta-button { display: inline-block; background: #c9a227; color: white; padding: 0.875rem 1.75rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 1rem; transition: background 0.2s; margin-top: 0.5rem; }
    .cta-button:hover { background: #b8922a; }
    
    .info-card { background: #e8f4f8; border-radius: 12px; padding: 1.25rem; margin-top: 1rem; }
    .info-card p { color: #0c5460; font-size: 0.9rem; margin: 0; }
    
    .help-section { text-align: center; padding: 1.5rem; }
    .help-section p { color: #888; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .help-section a { color: #c9a227; text-decoration: none; font-weight: 500; }
    .help-section a:hover { text-decoration: underline; }
    
    .token-info { text-align: center; padding: 1rem 2rem; background: #f8f9fa; border-top: 1px solid #eee; }
    .token-info p { font-size: 0.8rem; color: #888; margin: 0; }
    
    footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 2rem; }
    footer .logo { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
    footer p { color: rgba(255,255,255,0.6); font-size: 0.85rem; }
    
    @media (max-width: 600px) {
      .detail-grid { grid-template-columns: 1fr; }
      .page-content { padding-top: 5rem; }
    }
    
    /* MAI-1014: Visual Timeline styles */
    .timeline-container {
      padding: 1.5rem 2rem;
      border-top: 1px solid #eee;
      background: #fafafa;
    }
    .timeline-title {
      font-size: 1rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 1.25rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .timeline {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
    }
    .timeline-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      position: relative;
    }
    .timeline-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      position: relative;
    }
    .timeline-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
      background: #e5e7eb;
      border: 2px solid #d1d5db;
      color: #9ca3af;
      z-index: 1;
      flex-shrink: 0;
    }
    .timeline-step.complete .timeline-icon {
      background: #dcfce7;
      border-color: #22c55e;
    }
    .timeline-step.active .timeline-icon {
      background: #fef3c7;
      border-color: #c9a227;
      box-shadow: 0 0 0 4px rgba(201, 162, 39, 0.15);
    }
    .timeline-step.pending .timeline-icon {
      background: #f3f4f6;
      border-color: #d1d5db;
    }
    .timeline-content {
      text-align: center;
      margin-top: 0.5rem;
      padding: 0 2px;
    }
    .timeline-label {
      font-size: 0.7rem;
      font-weight: 600;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .timeline-step.complete .timeline-label { color: #15803d; }
    .timeline-step.active .timeline-label { color: #92400e; }
    .timeline-sublabel {
      font-size: 0.65rem;
      color: #aaa;
      margin-top: 1px;
    }
    .timeline-duration {
      font-size: 0.6rem;
      color: #bbb;
      margin-top: 2px;
    }
    .timeline-step.active .timeline-duration { color: #c9a227; }
    
    /* MAI-1014: Stale follow-up styles */
    .stale-followup-card {
      background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
    }
    .stale-followup-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;
    }
    .stale-icon { font-size: 1.5rem; }
    .stale-followup-header h3 {
      font-size: 1rem;
      font-weight: 600;
      color: #92400e;
      margin: 0;
    }
    .stale-description {
      color: #78350f;
      font-size: 0.875rem;
      line-height: 1.5;
      margin-bottom: 1rem;
    }
    .reengage-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: #f59e0b;
      color: white;
      border: none;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .reengage-button:hover { background: #d97706; }
    .reengage-button:disabled { opacity: 0.7; cursor: not-allowed; }
    .reengage-spinner {
      display: inline-block;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .reengage-success { color: #15803d; font-size: 0.875rem; margin-top: 0.75rem; font-weight: 500; }
    .reengage-error { color: #dc2626; font-size: 0.875rem; margin-top: 0.75rem; }
    
    /* Responsive timeline for mobile (320px) */
    @media (max-width: 480px) {
      .timeline {
        flex-direction: column;
        align-items: flex-start;
        gap: 0;
      }
      .timeline-step {
        flex-direction: row;
        align-items: flex-start;
        flex: unset;
        width: 100%;
      }
      .timeline-marker {
        width: auto;
        flex-shrink: 0;
      }
      .timeline-icon {
        width: 32px;
        height: 32px;
        font-size: 1rem;
      }
      .timeline-content {
        text-align: left;
        margin-top: 0;
        margin-left: 0.75rem;
        padding: 8px 0;
      }
      .timeline-label { font-size: 0.8rem; }
      .timeline-sublabel, .timeline-duration { font-size: 0.75rem; }
    }
    
    /* MAI-823: Referral CTA styles */
    .referral-card {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 2px solid #22c55e;
      border-radius: 16px;
      padding: 1.75rem 2rem;
      margin-bottom: 1.5rem;
      text-align: center;
    }
    .referral-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #15803d;
      margin-bottom: 0.75rem;
    }
    .referral-description {
      color: #555;
      font-size: 0.95rem;
      margin-bottom: 1.25rem;
      line-height: 1.5;
    }
    .referral-code-section { margin: 1rem 0; }
    .referral-code-label { font-size: 0.85rem; color: #888; margin-bottom: 0.5rem; }
    .referral-code-box {
      display: inline-block;
      background: white;
      border: 2px dashed #22c55e;
      border-radius: 8px;
      padding: 0.75rem 1.5rem;
      font-size: 1.25rem;
      font-weight: 700;
      color: #15803d;
      letter-spacing: 0.1em;
    }
    .share-buttons {
      display: flex;
      gap: 0.75rem;
      justify-content: center;
      flex-wrap: wrap;
      margin-top: 1rem;
    }
    .share-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.25rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      transition: all 0.2s;
    }
    .share-btn.copy-btn { background: #22c55e; color: white; }
    .share-btn.copy-btn:hover { background: #16a34a; }
    .share-btn.email-btn { background: #3b82f6; color: white; }
    .share-btn.email-btn:hover { background: #2563eb; }
    .share-btn.whatsapp-btn { background: #22c55e; color: white; }
    .share-btn.whatsapp-btn:hover { background: #16a34a; }
    .share-icon { font-size: 1.1rem; }

    /* MAI-1614: Pending booking context card styles */
    .pending-context-card {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 1px solid #22c55e;
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }
    .pending-context-icon {
      font-size: 2.5rem;
      flex-shrink: 0;
    }
    .pending-context-content {
      flex: 1;
    }
    .pending-context-title {
      font-size: 1.1rem;
      font-weight: 600;
      color: #15803d;
      margin: 0 0 0.5rem 0;
    }
    .pending-context-message {
      color: #555;
      font-size: 0.95rem;
      margin: 0 0 1rem 0;
      line-height: 1.5;
    }
    .pending-context-next {
      background: rgba(255,255,255,0.7);
      border-radius: 8px;
      padding: 0.75rem 1rem;
    }
    .pending-context-next-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: #166534;
      display: block;
      margin-bottom: 0.5rem;
    }
    .pending-context-steps {
      margin: 0;
      padding-left: 1.25rem;
    }
    .pending-context-steps li {
      font-size: 0.85rem;
      color: #166534;
      margin-bottom: 0.25rem;
    }
    .pending-context-steps li:last-child {
      margin-bottom: 0;
    }

    /* MAI-881: Book Again CTA styles */
    .book-again-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      text-align: center;
    }
    .book-again-card h3 { margin: 0 0 8px 0; font-size: 1.25rem; }
    .book-again-card p { margin: 0 0 16px 0; opacity: 0.9; }
    .book-again-card .btn {
      background: white;
      color: #667eea;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      display: inline-block;
    }
    .book-again-card .btn:hover { background: #f0f0f0; }

    /* MAI-1147: Post-Booking Upsell styles */
    .upsell-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      padding: 1.5rem 2rem;
      margin-bottom: 1.5rem;
    }
    .upsell-header {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .upsell-icon { font-size: 2rem; }
    .upsell-title { font-size: 1.2rem; font-weight: 700; color: #2c3e50; margin: 0 0 0.25rem 0; }
    .upsell-subtitle { font-size: 0.9rem; color: #666; margin: 0; }
    .upsell-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; }
    .upsell-card-item {
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 1rem;
      transition: all 0.2s;
    }
    .upsell-card-item:hover { border-color: #c9a227; box-shadow: 0 2px 8px rgba(201,162,39,0.15); }
    .upsell-card-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.5rem; }
    .upsell-card-icon { font-size: 1.5rem; }
    .upsell-card-info { flex: 1; }
    .upsell-card-name { font-size: 1rem; font-weight: 600; color: #2c3e50; }
    .upsell-card-price { font-size: 1rem; font-weight: 700; color: #c9a227; }
    .upsell-card-desc { font-size: 0.85rem; color: #666; line-height: 1.4; margin-bottom: 0.75rem; }
    .upsell-add-btn {
      width: 100%;
      background: #c9a227;
      color: white;
      border: none;
      padding: 0.625rem 1rem;
      border-radius: 6px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .upsell-add-btn:hover { background: #b8922a; }
    .upsell-add-btn.requested { background: #22c55e; cursor: default; }
    .upsell-success-msg {
      text-align: center;
      padding: 1rem;
      background: #dcfce7;
      border-radius: 8px;
      color: #15803d;
      font-weight: 500;
      margin-top: 1rem;
    }
    .upsell-error-msg {
      text-align: center;
      padding: 0.75rem;
      background: #fee2e2;
      border-radius: 8px;
      color: #dc2626;
      font-size: 0.85rem;
      margin-top: 0.75rem;
    }
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">Maison des Chefs</a>
    <div class="nav-links">
      <a href="/services">Browse Services</a>
      <a href="/auth/login">Sign In</a>
    </div>
  </nav>
  
  <div class="page-content">
    <div class="page-header">
      <h1>Your Booking Status</h1>
      <p>Track your inquiry with Chef ${lead.chefName}</p>
    </div>
    
    <div class="booking-card">
      <div class="status-banner" style="background: ${statusDisplay.bgColor};">
        <div class="status-icon">${statusDisplay.icon}</div>
        <div class="status-label">${statusDisplay.label}</div>
        <div class="status-description">${statusDisplay.description}</div>
      </div>
      
      ${timelineHtml}
      
      <div class="event-info">
        <h2 class="event-title">${lead.serviceName}</h2>
        <p class="event-chef">with Chef ${lead.chefName} ${lead.chefLocation ? `• ${lead.chefLocation}` : ''}</p>
        <p class="event-description">${lead.serviceDescription || ''}</p>
      </div>
      
      <div class="booking-details">
        <div class="detail-grid">
          <div class="detail-item">
            <div class="detail-label">Event Date</div>
            <div class="detail-value">${formatDate(lead.eventDate)}</div>
          </div>
          <div class="detail-item">
            <div class="detail-label">Number of Guests</div>
            <div class="detail-value">${lead.guestCount} ${lead.guestCount === 1 ? 'guest' : 'guests'}</div>
          </div>
          ${quoteAmountDisplay ? `
          <div class="detail-item">
            <div class="detail-label">Quote Amount</div>
            <div class="detail-value large">${quoteAmountDisplay}</div>
          </div>
          ` : ''}
          <div class="detail-item">
            <div class="detail-label">Inquiry ID</div>
            <div class="detail-value">#${lead.id}</div>
          </div>
        </div>
      </div>
      
      ${lead.quoteMessage ? `
      <div class="quote-section">
        <div class="notes-label">Message from Chef ${lead.chefName}</div>
        <div class="quote-message">"${lead.quoteMessage}"</div>
      </div>
      ` : ''}
      
      ${lead.status === 'quoted' ? `
      <div class="trust-section">
        ${trustSignals.chefReviewCount > 0 ? `
        <div class="trust-item">
          <span class="trust-stars">${'★'.repeat(Math.round(trustSignals.chefAvgRating))}${'☆'.repeat(5 - Math.round(trustSignals.chefAvgRating))}</span>
          <span class="trust-rating">${trustSignals.chefAvgRating > 0 ? trustSignals.chefAvgRating.toFixed(1) : '0.0'}</span>
          <span class="trust-count">(${trustSignals.chefReviewCount} review${trustSignals.chefReviewCount !== 1 ? 's' : ''})</span>
        </div>
        ` : ''}
        ${trustSignals.chefBookingCount > 0 ? `
        <div class="trust-item">
          <span class="trust-icon">✓</span>
          <span class="trust-count">${trustSignals.chefBookingCount} booking${trustSignals.chefBookingCount !== 1 ? 's' : ''} completed</span>
        </div>
        ` : ''}
        <div class="trust-item stripe-badge">
          <span class="trust-icon">🔒</span>
          <span class="trust-text">Secure checkout • Powered by Stripe</span>
        </div>
      </div>
      ` : ''}
      
      ${lead.message ? `
      <div class="notes-section">
        <div class="notes-label">Your Message</div>
        <div class="notes-text">"${lead.message}"</div>
      </div>
      ` : ''}
      
      <div class="token-info">
        <p>This link expires on ${tokenExpiryDate || '30 days after booking'}</p>
      </div>
    </div>
    
    ${pendingContextCardHtml}
    
    ${staleFollowupHtml}
    
    <div class="next-steps-card">
      <h3 class="next-steps-title">📋 What Happens Next</h3>
      <ul class="next-steps-list">
        ${nextStepsHtml}
      </ul>
      ${isPaymentNeeded && checkoutUrl ? `
      <div class="info-card">
        <p>💳 <strong>Complete your payment</strong> to confirm your booking before the chef's availability changes.</p>
        <a href="${checkoutUrl}" class="cta-button" style="margin-top: 1rem;">View Quote & Pay →</a>
      </div>
      ` : ''}
    </div>
    
    ${referralCtaHtml}

    <!-- MAI-1147: Post-Booking Upsell Section (only for confirmed bookings) -->
    ${isConverted ? `
    <div class="upsell-card" id="upsellSection">
      <div class="upsell-header">
        <span class="upsell-icon">✨</span>
        <div>
          <h3 class="upsell-title">Enhance Your Experience</h3>
          <p class="upsell-subtitle">Make your event even more special</p>
        </div>
      </div>
      <div class="upsell-cards" id="upsellCards">
        <!-- Upsell cards rendered by JS -->
      </div>
    </div>
    ` : ''}

    ${isConverted ? `
    <div class="book-again-card">
      <h3>Ready for your next event?</h3>
      <p>Book Chef ${lead.chefName} again for your next gathering.</p>
      <a href="/services/chef/${lead.chefId}" class="btn" onclick="console.log('Book Again clicked for chef:', '${lead.chefId}', '| Chef:', '${lead.chefName}');">
        Book Chef ${lead.chefName} Again →
      </a>
    </div>
    ` : ''}
    
    <div class="help-section">
      <p>Questions about your booking?</p>
      <a href="mailto:support@maisondeschefs.com">support@maisondeschefs.com</a>
    </div>
  </div>
  
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>Montreal's premier private chef marketplace.</p>
    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>
  </footer>
  
  <script>
    // MAI-823: Copy referral link to clipboard
    function copyReferralLink(btn, code) {
      const referralLink = window.location.origin + '/booking-status?ref=' + code;
      navigator.clipboard.writeText(referralLink).then(function() {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="share-icon">✓</span> Copied!';
        setTimeout(function() {
          btn.innerHTML = originalText;
        }, 2000);
      }).catch(function() {
        alert('Failed to copy. Please copy the link manually.');
      });
    }
    
    // MAI-1014: Trigger stale lead re-engagement email
    function triggerReengage(token, btn) {
      const spinner = btn.querySelector('.reengage-spinner');
      const text = btn.querySelector('.reengage-text');
      const successMsg = document.getElementById('reengageSuccess');
      const errorMsg = document.getElementById('reengageError');
      
      if (successMsg) successMsg.style.display = 'none';
      if (errorMsg) errorMsg.style.display = 'none';
      
      btn.disabled = true;
      if (spinner) spinner.style.display = 'inline-block';
      if (text) text.textContent = 'Sending...';
      
      fetch('/api/booking-status/' + token + '/reengage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      .then(function(response) {
        if (!response.ok) {
          return response.json().then(function(err) {
            throw new Error(err.error || 'Failed to send reminder');
          });
        }
        return response.json();
      })
      .then(function(data) {
        btn.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (text) text.textContent = 'Reminder Sent ✓';
        btn.style.background = '#15803d';
        if (successMsg) {
          successMsg.style.display = 'block';
          if (data.alreadySent) {
            successMsg.textContent = '✓ A reminder was already sent previously.';
          }
        }
      })
      .catch(function(err) {
        btn.disabled = false;
        if (spinner) spinner.style.display = 'none';
        if (text) text.textContent = 'Send Reminder Email ✉️';
        if (errorMsg) {
          errorMsg.textContent = err.message || 'Failed to send reminder. Please try again.';
          errorMsg.style.display = 'block';
        }
      });
    }
    
    // MAI-1147: Post-Booking Upsell functionality
    const upsellAddons = [
      { id: 'wine-pairing', name: 'Wine Pairing', description: 'Curated wine selection expertly paired with each course by your chef', price: 35, icon: '🍷' },
      { id: 'extra-courses', name: 'Extra Courses', description: "Two additional chef's specialty courses to elevate your dining experience", price: 45, icon: '🥂' },
      { id: 'celebration-package', name: 'Celebration Package', description: 'Special decorations, custom dessert with message, and champagne toast', price: 75, icon: '🎉' },
    ];
    
    function renderUpsellCards() {
      const container = document.getElementById('upsellCards');
      if (!container) return;
      
      container.innerHTML = upsellAddons.map(addon => {
        return '<div class="upsell-card-item" data-addon-id="' + addon.id + '">' +
          '<div class="upsell-card-header">' +
            '<span class="upsell-card-icon">' + addon.icon + '</span>' +
            '<div class="upsell-card-info">' +
              '<div class="upsell-card-name">' + addon.name + '</div>' +
              '<div class="upsell-card-price">+$' + addon.price + '</div>' +
            '</div>' +
          '</div>' +
          '<div class="upsell-card-desc">' + addon.description + '</div>' +
          '<button class="upsell-add-btn" onclick="requestUpsell(\'' + addon.id + '\', \'' + addon.name + '\', ' + addon.price + ', this)">Add to Booking</button>' +
        '</div>';
      }).join('');
    }
    
    function requestUpsell(addonId, addonName, addonPrice, btn) {
      if (btn.classList.contains('requested')) return;
      
      btn.disabled = true;
      btn.textContent = 'Sending...';
      
      fetch('/api/booking-status/' + token + '/request-addon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addonId, addonName, addonPrice })
      })
      .then(function(response) {
        if (!response.ok) {
          return response.json().then(function(err) {
            throw new Error(err.error || 'Failed to request add-on');
          });
        }
        return response.json();
      })
      .then(function(data) {
        btn.classList.add('requested');
        btn.textContent = '✓ Request Sent';
        
        // Track analytics: upsellRequested
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/event', JSON.stringify({
            event: 'upsell_requested',
            addon_id: addonId,
            addon_name: addonName,
            addon_price: addonPrice,
            timestamp: new Date().toISOString()
          }));
        }
        
        // Show success message
        var card = btn.closest('.upsell-card-item');
        var successMsg = document.createElement('div');
        successMsg.className = 'upsell-success-msg';
        successMsg.textContent = 'Request sent to chef for ' + addonName + '! They will confirm availability.';
        card.appendChild(successMsg);
      })
      .catch(function(err) {
        btn.disabled = false;
        btn.textContent = 'Add to Booking';
        var card = btn.closest('.upsell-card-item');
        var existingError = card.querySelector('.upsell-error-msg');
        if (existingError) existingError.remove();
        var errorMsg = document.createElement('div');
        errorMsg.className = 'upsell-error-msg';
        errorMsg.textContent = err.message || 'Failed to send request. Please try again.';
        card.appendChild(errorMsg);
      });
    }
    
    // Initialize upsell cards on page load
    document.addEventListener('DOMContentLoaded', function() {
      renderUpsellCards();
      
      // Track analytics: upsellPresented
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/event', JSON.stringify({
          event: 'upsell_presented',
          booking_id: ${lead?.id || 0},
          timestamp: new Date().toISOString()
        }));
      }
    });
  </script>
</body>
</html>`;
}
