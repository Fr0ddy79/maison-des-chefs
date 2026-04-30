// Booking Status Page - Public HTML page for guests to view their booking status
// MAI-805: Guest Booking Recovery via Email Token

import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leads, services, users, chefProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

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

export default async function bookingStatusPageRoutes(server: FastifyInstance) {
  // GET /booking-status - Public booking status page
  // MAI-805: Works with leads (inquiries) to track guest booking status
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

  const nextStepsHtml = nextSteps.map(step => {
    if (step.includes('<a href=')) {
      return `<li>${step}</li>`;
    }
    return `<li>${step}</li>`;
  }).join('');

  // Format quote amount if available
  const quoteAmountDisplay = lead.quoteAmount != null ? `$${Number(lead.quoteAmount).toFixed(2)}` : null;

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
    .referral-code-section {
      margin: 1rem 0;
    }
    .referral-code-label {
      font-size: 0.85rem;
      color: #888;
      margin-bottom: 0.5rem;
    }
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
    .share-btn.copy-btn {
      background: #22c55e;
      color: white;
    }
    .share-btn.copy-btn:hover {
      background: #16a34a;
    }
    .share-btn.email-btn {
      background: #3b82f6;
      color: white;
    }
    .share-btn.email-btn:hover {
      background: #2563eb;
    }
    .share-btn.whatsapp-btn {
      background: #22c55e;
      color: white;
    }
    .share-btn.whatsapp-btn:hover {
      background: #16a34a;
    }
    .share-icon {
      font-size: 1.1rem;
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
  </script>
</body>
</html>`;
}
