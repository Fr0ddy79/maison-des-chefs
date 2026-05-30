import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leads, services, users, chefProfiles, bookings, reviews } from '../db/schema.js';
import { eq, and, sql, count } from 'drizzle-orm';
import { HARDCODED_ADDONS, getAddonsByIds } from '../data/addons.js';

const DASHBOARD_URL = process.env.DASHBOARD_URL || 'https://maisondeschefs.com';

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
 * Verify the access token matches the lead.
 */
function verifyLeadAccess(leadId: number, token: string) {
  const lead = db.select({
    id: leads.id,
    accessToken: leads.accessToken,
    accessTokenExpiresAt: leads.accessTokenExpiresAt,
  })
    .from(leads)
    .where(eq(leads.id, leadId))
    .get();

  if (!lead) return null;
  if (lead.accessToken !== token) return null;
  if (lead.accessTokenExpiresAt && new Date(lead.accessTokenExpiresAt) < new Date()) return null;

  return lead;
}

export default async function checkoutRoutes(server: FastifyInstance) {
  // GET /checkout/:leadId - Main checkout page with "Pay Now" button
  server.get('/:leadId', async (request, reply) => {
    const { leadId } = request.params as { leadId: string };
    const query = request.query as { token?: string };

    // Validate token
    if (!query.token) {
      return buildErrorPage('Access token required', 'Please use the link from your confirmation email to access checkout.');
    }

    const verified = verifyLeadAccess(parseInt(leadId), query.token);
    if (!verified) {
      return buildErrorPage('Invalid or expired link', 'The checkout link is invalid or has expired. Please contact support.');
    }

    // Get lead with full details
    const lead = db.select({
      id: leads.id,
      serviceId: leads.serviceId,
      eventDate: leads.eventDate,
      guestCount: leads.guestCount,
      status: leads.status,
      message: leads.message,
      email: leads.email,
      clientName: leads.clientName,
      quoteAmount: leads.quoteAmount,
      quoteMessage: leads.quoteMessage,
      quoteSentAt: leads.quoteSentAt,
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
      .where(eq(leads.id, parseInt(leadId)))
      .get();

    if (!lead) {
      return buildErrorPage('Booking not found', 'No booking was found with this ID.');
    }

    // Check if lead has a quote (can proceed to checkout)
    const canPay = ['quoted', 'accepted'].includes(lead.status);
    if (!canPay) {
      return buildErrorPage('Payment not available', 'A quote must be sent by the chef before payment can be processed.');
    }

    if (!lead.quoteAmount || lead.quoteAmount <= 0) {
      return buildErrorPage('Invalid quote', 'Quote amount is not set or is invalid. Please contact support.');
    }

    // Parse selected addons
    let selectedAddonIds: string[] = [];
    try {
      selectedAddonIds = JSON.parse(lead.selectedAddons || '[]');
    } catch {
      selectedAddonIds = [];
    }
    const selectedAddons = getAddonsByIds(selectedAddonIds);
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const totalWithAddons = (lead.quoteAmount || 0) + addonsTotal;

    const quoteAmountDisplay = `$${Number(lead.quoteAmount).toFixed(2)}`;
    const addonsTotalDisplay = `$${addonsTotal.toFixed(2)}`;
    const totalWithAddonsDisplay = `$${totalWithAddons.toFixed(2)}`;
    const dinerName = lead.clientName || 'there';

    // MAI-2282: Calculate quote expiry time (48h from quoteSentAt)
    const QUOTE_EXPIRY_HOURS = 48;
    const quoteExpiryMs = lead.quoteSentAt
      ? new Date(lead.quoteSentAt).getTime() + (QUOTE_EXPIRY_HOURS * 60 * 60 * 1000)
      : null;

    // Get real social proof stats for this chef - MAI-2007
    const chefBookingStats = db.select({
      totalBookings: count(bookings.id),
      completedBookings: sql`SUM(CASE WHEN ${bookings.status} IN ('completed', 'confirmed') THEN 1 ELSE 0 END)`,
    })
      .from(bookings)
      .where(eq(bookings.chefId, lead.chefId))
      .get();

    const chefReviewStats = db.select({
      avgRating: sql`AVG(${reviews.rating})`,
      reviewCount: count(reviews.id),
    })
      .from(reviews)
      .where(eq(reviews.chefId, lead.chefId))
      .get();

    const realBookingsCount = (chefBookingStats?.totalBookings as number) || 0;
    const realCompletedCount = parseInt(String(chefBookingStats?.completedBookings || '0'));
    const avgRating = chefReviewStats?.avgRating ? parseFloat(String(chefReviewStats.avgRating)).toFixed(1) : null;
    const reviewCount = (chefReviewStats?.reviewCount as number) || 0;

    // Serialize addons for JS
    const addonsJson = JSON.stringify(HARDCODED_ADDONS);
    const selectedAddonIdsJson = JSON.stringify(selectedAddonIds);

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Checkout | ${lead.serviceName} | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.2rem; margin: 0; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; font-size: 0.9rem; }
    
    .page-content { max-width: 900px; margin: 0 auto; padding: 6rem 1.5rem 3rem; }
    
    .page-header { text-align: center; margin-bottom: 2rem; }
    .page-header h1 { font-size: 1.8rem; color: #2c3e50; margin-bottom: 0.5rem; }
    .page-header p { color: #666; }
    
    .checkout-grid { display: grid; grid-template-columns: 1fr 340px; gap: 2rem; }
    
    .booking-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); overflow: hidden; }
    
    .booking-header { padding: 1.5rem 2rem; background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); color: white; }
    .booking-header h2 { font-size: 1.2rem; margin-bottom: 0.25rem; }
    .booking-header p { opacity: 0.8; font-size: 0.9rem; }
    
    .booking-details { padding: 1.5rem 2rem; }
    .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; margin-bottom: 1.5rem; }
    .detail-item { }
    .detail-label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .detail-value { font-size: 1rem; color: #2c3e50; font-weight: 500; }
    
    .quote-section { background: #f8f9fa; padding: 1.5rem 2rem; border-top: 1px solid #eee; }
    .quote-amount { font-size: 2.5rem; font-weight: 700; color: #c9a227; }
    .quote-label { font-size: 0.9rem; color: #888; margin-bottom: 0.75rem; }
    .quote-message-label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .quote-message { color: #555; font-size: 0.95rem; font-style: italic; padding: 1rem; background: white; border-radius: 8px; border-left: 3px solid #c9a227; }
    
    .notes-section { padding: 1.5rem 2rem; border-top: 1px solid #eee; }
    .notes-label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; }
    .notes-text { color: #555; font-size: 0.95rem; font-style: italic; }
    
    /* MAI-875: Upsell Section */
    .upsell-section { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 1.5rem 2rem; margin-top: 1.5rem; }
    .upsell-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.25rem; }
    .upsell-icon { font-size: 1.5rem; }
    .upsell-title { font-size: 1.1rem; font-weight: 600; color: #2c3e50; }
    .upsell-subtitle { font-size: 0.9rem; color: #666; margin-top: 0.25rem; }
    .upsell-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; }
    .addon-card { border: 2px solid #e5e7eb; border-radius: 12px; padding: 1.25rem; transition: all 0.2s; cursor: pointer; }
    .addon-card:hover { border-color: #c9a227; }
    .addon-card.selected { border-color: #c9a227; background: #fffbeb; }
    .addon-card-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 0.75rem; }
    .addon-icon { font-size: 1.75rem; }
    .addon-info { flex: 1; }
    .addon-name { font-size: 1rem; font-weight: 600; color: #2c3e50; }
    .addon-price { font-size: 1.1rem; font-weight: 700; color: #c9a227; }
    .addon-description { font-size: 0.85rem; color: #666; line-height: 1.4; margin-bottom: 0.75rem; }
    .addon-toggle { display: flex; align-items: center; gap: 0.5rem; }
    .addon-toggle-btn { 
      background: #e5e7eb; color: #666; border: none; padding: 0.5rem 1rem; border-radius: 6px; 
      font-size: 0.85rem; font-weight: 500; cursor: pointer; transition: all 0.2s;
    }
    .addon-card.selected .addon-toggle-btn { background: #c9a227; color: white; }
    .addon-toggle-btn:hover { background: #c9a227; color: white; }
    .addon-card.selected .addon-toggle-btn:hover { background: #b8922a; }
    .skip-upsell { text-align: center; margin-top: 1rem; }
    .skip-upsell-btn { background: none; border: none; color: #888; font-size: 0.85rem; cursor: pointer; text-decoration: underline; }
    .skip-upsell-btn:hover { color: #666; }
    
    .payment-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 2rem; height: fit-content; position: sticky; top: 80px; }
    .payment-title { font-size: 1.2rem; font-weight: 600; color: #2c3e50; margin-bottom: 1.5rem; }
    
    .payment-summary { margin-bottom: 1.5rem; }
    .summary-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee; }
    .summary-row:last-child { border-bottom: none; }
    .summary-label { color: #666; }
    .summary-value { font-weight: 500; color: #2c3e50; }
    .summary-total { font-size: 1.2rem; font-weight: 700; color: #2c3e50; padding-top: 0.75rem; margin-top: 0.5rem; border-top: 2px solid #2c3e50; }
    .addons-row { color: #c9a227; }
    
    .pay-button { display: block; width: 100%; background: #c9a227; color: white; padding: 1rem; border: none; border-radius: 6px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; text-align: center; text-decoration: none; }
    .pay-button:hover { background: #b8922a; }
    .pay-button:disabled { background: #ccc; cursor: not-allowed; }
    
    .pay-button.loading { position: relative; }
    .pay-button.loading::after { content: ''; position: absolute; width: 20px; height: 20px; border: 2px solid white; border-top-color: transparent; border-radius: 50%; animation: spin 0.8s linear infinite; top: 50%; left: 50%; transform: translate(-50%, -50%); }
    
    @keyframes spin { to { transform: translate(-50%, -50%) rotate(360deg); } }
    
    .secure-badge { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 1rem; color: #666; font-size: 0.85rem; }
    .secure-badge span { color: #22c55e; }
    
    /* MAI-2271: Trust Badges */
    .payment-methods { display: flex; align-items: center; justify-content: center; gap: 0.75rem; margin-top: 1rem; padding: 0.75rem; background: #f8f9fa; border-radius: 8px; }
    .payment-methods img { height: 24px; width: auto; }
    .payment-methods .visa { height: 22px; }
    .payment-methods .mc { height: 28px; }
    .payment-methods .amex { height: 20px; }
    
    .money-back-badge { display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.75rem; color: #16a34a; font-size: 0.85rem; font-weight: 500; }
    .money-back-badge .icon { font-size: 1.1rem; }
    
    /* MAI-2271: What Happens After Payment Expandable */
    .after-payment-section { margin-top: 1.25rem; border-top: 1px solid #eee; padding-top: 1rem; }
    
    /* MAI-2282: Quote Expiry Countdown */
    .quote-countdown { padding: 1rem; border-radius: 8px; text-align: center; margin-bottom: 1rem; border: 2px solid; }
    .quote-countdown.green { background: #d1fae5; border-color: #10b981; color: #065f46; }
    .quote-countdown.yellow { background: #fef3c7; border-color: #f59e0b; color: #92400e; }
    .quote-countdown.red { background: #fee2e2; border-color: #ef4444; color: #991b1b; animation: pulse-countdown 2s infinite; }
    .quote-countdown.expired { background: #f3f4f6; border-color: #6b7280; color: #374151; }
    @keyframes pulse-countdown { 0%, 100% { opacity: 1; } 50% { opacity: 0.75; } }
    .countdown-label { font-size: 0.85rem; margin-bottom: 0.25rem; }
    .countdown-timer { font-size: 1.5rem; font-weight: 700; margin: 0.25rem 0; }
    .countdown-message { font-size: 0.8rem; opacity: 0.9; }
    
    /* MAI-2282: Expired Overlay */
    .quote-expired-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .quote-expired-modal { background: white; border-radius: 16px; padding: 2.5rem; max-width: 400px; text-align: center; }
    .quote-expired-icon { font-size: 3rem; margin-bottom: 1rem; }
    .quote-expired-title { font-size: 1.5rem; font-weight: 700; color: #2c3e50; margin-bottom: 0.5rem; }
    .quote-expired-message { color: #666; margin-bottom: 1.5rem; }
    .quote-expired-cta { background: #c9a227; color: white; border: none; padding: 0.875rem 1.5rem; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; text-decoration: none; display: inline-block; }
    .after-payment-toggle { display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: none; border: none; color: #666; font-size: 0.9rem; cursor: pointer; padding: 0.5rem; width: 100%; transition: color 0.2s; }
    .after-payment-toggle:hover { color: #c9a227; }
    .after-payment-toggle .chevron { transition: transform 0.3s; font-size: 0.8rem; }
    .after-payment-toggle.expanded .chevron { transform: rotate(180deg); }
    .after-payment-content { max-height: 0; overflow: hidden; transition: max-height 0.3s ease-out; }
    .after-payment-content.expanded { max-height: 300px; }
    .after-payment-list { list-style: none; padding: 0; margin: 0; }
    .after-payment-list li { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem 0; border-bottom: 1px solid #f0f0f0; font-size: 0.9rem; color: #555; }
    .after-payment-list li:last-child { border-bottom: none; }
    .after-payment-list .check { color: #22c55e; font-weight: bold; font-size: 1rem; flex-shrink: 0; }
    
    .help-text { text-align: center; margin-top: 1.5rem; color: #888; font-size: 0.85rem; }
    .help-text a { color: #c9a227; text-decoration: none; }
    .help-text a:hover { text-decoration: underline; }
    
    /* Social Proof Card - MAI-1967 */
    .social-proof-card { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; }
    .social-proof-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
    .chef-avatar-section { display: flex; align-items: center; gap: 0.75rem; }
    .chef-avatar { width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #c9a227 0%, #b8922a 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1.1rem; }
    .chef-info { }
    .chef-name { font-weight: 600; color: #2c3e50; font-size: 1rem; }
    .chef-badge { display: inline-flex; align-items: center; gap: 0.25rem; background: #dcfce7; color: #16a34a; font-size: 0.75rem; font-weight: 500; padding: 0.2rem 0.5rem; border-radius: 4px; margin-top: 0.25rem; }
    .rating-section { text-align: right; }
    .rating-stars { color: #f59e0b; font-size: 1.1rem; letter-spacing: 2px; }
    .rating-value { font-weight: 700; color: #2c3e50; font-size: 1.1rem; }
    .rating-count { color: #666; font-size: 0.8rem; }
    .social-proof-stats { display: flex; gap: 1rem; border-top: 1px solid #e2e8f0; padding-top: 1rem; }
    .stat-item { flex: 1; text-align: center; }
    .stat-number { font-weight: 700; color: #2c3e50; font-size: 1.1rem; }
    .stat-label { color: #666; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .verified-badge { display: inline-flex; align-items: center; }
    
    .info-box { background: #e8f4f8; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
    .info-box p { color: #0c5460; font-size: 0.9rem; margin: 0; }
    
    /* Checkout step indicator */
    .checkout-steps { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 2rem; }
    .checkout-step { display: flex; align-items: center; gap: 0.5rem; color: #9ca3af; font-size: 0.9rem; font-weight: 500; }
    .checkout-step.active { color: #c9a227; }
    .checkout-step.completed { color: #22c55e; }
    .step-num { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; background: #e5e7eb; color: #9ca3af; }
    .checkout-step.active .step-num { background: #c9a227; color: white; }
    .checkout-step.completed .step-num { background: #22c55e; color: white; }
    .step-connector { width: 60px; height: 2px; background: #e5e7eb; margin: 0 0.5rem; }
    .checkout-step.completed + .step-connector { background: #22c55e; }
    
    footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 2rem; }
    footer .logo { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
    footer p { color: rgba(255,255,255,0.6); font-size: 0.85rem; }
    
    #error-message { display: none; background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; color: #dc2626; font-size: 0.9rem; }
    #error-message.show { display: block; }
    
    /* MAI-2251: Exit Intent Modal */
    .exit-intent-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .exit-intent-overlay.show {
      display: flex;
    }
    .exit-intent-modal {
      background: white;
      border-radius: 16px;
      max-width: 480px;
      width: 90%;
      padding: 2rem;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideUp 0.3s ease-out;
    }
    @keyframes slideUp {
      from { transform: translateY(30px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
    .exit-intent-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }
    .exit-intent-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: #2c3e50;
      margin-bottom: 0.75rem;
    }
    .exit-intent-description {
      color: #666;
      font-size: 1rem;
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }
    .exit-intent-offer {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 2px solid #22c55e;
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .exit-intent-offer-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #15803d;
      margin-bottom: 0.5rem;
    }
    .exit-intent-offer-detail {
      color: #555;
      font-size: 0.95rem;
    }
    .exit-intent-email-form {
      margin-bottom: 1rem;
    }
    .exit-intent-email-input {
      width: 100%;
      padding: 0.875rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      box-sizing: border-box;
      margin-bottom: 0.75rem;
    }
    .exit-intent-email-input:focus {
      outline: none;
      border-color: #22c55e;
    }
    .exit-intent-complete-btn {
      width: 100%;
      background: #22c55e;
      color: white;
      border: none;
      padding: 1rem;
      border-radius: 8px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }
    .exit-intent-complete-btn:hover {
      background: #16a34a;
    }
    .exit-intent-complete-btn:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }
    .exit-intent-decline-btn {
      background: none;
      border: none;
      color: #888;
      font-size: 0.9rem;
      cursor: pointer;
      text-decoration: underline;
      padding: 0.5rem;
    }
    .exit-intent-decline-btn:hover {
      color: #666;
    }
    
    @media (max-width: 768px) {
      .checkout-grid { grid-template-columns: 1fr; }
      .payment-card { position: static; }
      .page-content { padding-top: 5rem; }
      .upsell-cards { grid-template-columns: 1fr; }
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
      <h1>Complete Your Payment</h1>
      <p>Hi ${dinerName}, review your booking and complete payment to confirm your experience.</p>
    </div>
    
    <!-- Checkout progress indicator -->
    <div class="checkout-steps">
      <div class="checkout-step completed">
        <span class="step-num">1</span>
        <span>Review</span>
      </div>
      <div class="step-connector"></div>
      <div class="checkout-step active">
        <span class="step-num">2</span>
        <span>Payment</span>
      </div>
      <div class="step-connector"></div>
      <div class="checkout-step">
        <span class="step-num">3</span>
        <span>Confirmed</span>
      </div>
    </div>
    
    <div class="checkout-grid">
      <div>
        <div class="booking-card">
          <div class="booking-header">
            <h2>${lead.serviceName || ''}</h2>
            <p>with Chef ${lead.chefName || ''}</p>
          </div>
          
          <div class="booking-details">
            <div class="detail-grid">
              <div class="detail-item">
                <div class="detail-label">Event Date</div>
                <div class="detail-value">${formatDate(lead.eventDate)}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Number of Guests</div>
                <div class="detail-value">${lead.guestCount || 0} ${lead.guestCount === 1 ? 'guest' : 'guests'}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Location</div>
                <div class="detail-value">${lead.chefLocation || 'Montreal'}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Inquiry ID</div>
                <div class="detail-value">#${lead.id}</div>
              </div>
            </div>
          </div>
          
          ${lead.quoteMessage ? `
          <div class="quote-section">
            <div class="quote-label">Quote from Chef ${lead.chefName || ''}</div>
            <div class="quote-message">"${lead.quoteMessage}"</div>
          </div>
          ` : ''}
          
          ${lead.message ? `
          <div class="notes-section">
            <div class="notes-label">Your Message</div>
            <div class="notes-text">"${lead.message}"</div>
          </div>
          ` : ''}
        </div>
        
        <!-- MAI-875: Upsell Section -->
        <div class="upsell-section">
          <div class="upsell-header">
            <span class="upsell-icon">✨</span>
            <div>
              <div class="upsell-title">Enhance Your Experience</div>
              <div class="upsell-subtitle">Add special touches to make your event unforgettable</div>
            </div>
          </div>
          <div class="upsell-cards" id="upsell-cards">
            <!-- Addon cards rendered by JS -->
          </div>
          <div class="skip-upsell">
            <button class="skip-upsell-btn" onclick="skipUpsell()">Skip add-ons</button>
          </div>
        </div>
      </div>
      
      <div class="payment-card">
        <!-- Social Proof - MAI-1967 -->
        <div class="social-proof-card">
          <div class="social-proof-header">
            <div class="chef-avatar-section">
              <div class="chef-avatar">${(lead.chefName || 'M').charAt(0).toUpperCase()}${lead.chefName ? lead.chefName.split(' ').pop()?.[0] || '' : ''}</div>
              <div class="chef-info">
                <div class="chef-name">Chef ${lead.chefName || 'Your Chef'}</div>
                <div class="chef-badge">
                  <span class="verified-badge">✓</span> Verified Chef
                </div>
              </div>
            </div>
            <div class="rating-section">
              ${avgRating ? `
              <div class="rating-stars">${'★'.repeat(Math.round(parseFloat(avgRating)))}</div>
              <div class="rating-value">${avgRating}</div>
              <div class="rating-count">${reviewCount} review${reviewCount !== 1 ? 's' : ''}</div>
              ` : `
              <div class="rating-stars">★★★★★</div>
              <div class="rating-value">5.0</div>
              <div class="rating-count">New chef</div>
              `}
            </div>
          </div>
          ${realBookingsCount > 0 ? `
          <div class="social-proof-stats">
            <div class="stat-item">
              <div class="stat-number">${realBookingsCount}</div>
              <div class="stat-label">People booked</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${realCompletedCount}+</div>
              <div class="stat-label">Events completed</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${avgRating ? '★' + avgRating : 'New'}</div>
              <div class="stat-label">${avgRating ? 'Rating' : 'Just launched'}</div>
            </div>
          </div>
          ` : `
          <div class="social-proof-stats">
            <div class="stat-item">
              <div class="stat-number">Be first</div>
              <div class="stat-label">to book this chef</div>
            </div>
          </div>
          `}
        </div>
        
        <h3 class="payment-title">Payment Summary</h3>
        
        <div id="error-message"></div>
        
        <div class="payment-summary">
          <div class="summary-row">
            <span class="summary-label">Service</span>
            <span class="summary-value">${lead.serviceName || ''}</span>
          </div>
          <div class="summary-row">
            <span class="summary-label">${lead.guestCount || 0} guests ×</span>
            <span class="summary-value">${quoteAmountDisplay}/person</span>
          </div>
          <div class="summary-row" id="addons-row" style="display: none;">
            <span class="summary-label">Add-ons</span>
            <span class="summary-value" id="addons-total">${addonsTotalDisplay}</span>
          </div>
          <div class="summary-row summary-total">
            <span class="summary-label">Total</span>
            <span class="summary-value" id="grand-total">${totalWithAddonsDisplay}</span>
          </div>
        </div>
        
        ${quoteExpiryMs ? `
        <div class="quote-countdown" id="quote-countdown" data-expiry="${quoteExpiryMs}">
          <div class="countdown-label">⏰ Your quote expires in:</div>
          <div class="countdown-timer" id="countdown-timer">--:--:--</div>
          <div class="countdown-message">Complete payment to lock in this price.</div>
        </div>
        ` : ''}
        
        <button id="pay-button" class="pay-button" onclick="startCheckout()">
          Pay Now
        </button>
        
        <div class="secure-badge">
          <span>🔒</span>
          <span>Secure payment powered by Stripe</span>
        </div>
        
        <!-- MAI-2271: Payment Method Icons -->
        <div class="payment-methods">
          <img src="https://cdn.jsdelivr.net/gh/lipis/flag-icons@6.6.6/flags/4x3/visa.svg" alt="Visa" class="visa" onerror="this.style.display='none'" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" class="mc" onerror="this.style.display='none'" />
          <img src="https://upload.wikimedia.org/wikipedia/commons/3/30/American_Express_logo_%282018%29.svg" alt="Amex" class="amex" onerror="this.style.display='none'" />
        </div>
        
        <!-- MAI-2271: Money-Back Guarantee Badge -->
        <div class="money-back-badge">
          <span class="icon">🛡️</span>
          <span>Money-Back Guarantee</span>
        </div>
        
        <!-- MAI-2271: What Happens After Payment -->
        <div class="after-payment-section">
          <button class="after-payment-toggle" onclick="toggleAfterPayment()">
            <span>What happens after payment?</span>
            <span class="chevron">▼</span>
          </button>
          <div class="after-payment-content" id="after-payment-content">
            <ul class="after-payment-list">
              <li><span class="check">✓</span> You'll receive an email confirmation instantly</li>
              <li><span class="check">✓</span> Chef will receive your booking and contact you within 24h</li>
              <li><span class="check">✓</span> Chef will confirm final event details 1 week before</li>
              <li><span class="check">✓</span> You can manage or cancel from "My Bookings" anytime</li>
            </ul>
          </div>
        </div>
        
        <div class="info-box">
          <p>💳 Complete your payment to confirm your booking before chef availability changes.</p>
        </div>
        
        <p class="help-text">
          Need help? <a href="mailto:support@maisondeschefs.com">Contact Support</a>
        </p>
      </div>
    </div>
    
    <!-- MAI-2251: Exit Intent Modal -->
    <div class="exit-intent-overlay" id="exit-intent-overlay">
      <div class="exit-intent-modal">
        <div class="exit-intent-icon">🍰</div>
        <h2 class="exit-intent-title">Wait! Get a Free Dessert</h2>
        <p class="exit-intent-description">Complete your booking today and receive a complimentary dessert for your event.</p>
        <div class="exit-intent-offer">
          <div class="exit-intent-offer-title">🎁 Free Dessert with Your Booking</div>
          <div class="exit-intent-offer-detail">Offer valid when you complete your payment today</div>
        </div>
        <div class="exit-intent-email-form">
          <input type="email" class="exit-intent-email-input" id="exit-intent-email" placeholder="Enter your email to claim">
          <button class="exit-intent-complete-btn" id="exit-intent-complete" onclick="handleExitIntentComplete()">Complete My Booking</button>
        </div>
        <button class="exit-intent-decline-btn" onclick="handleExitIntentDecline()">No thanks, I'll pass</button>
      </div>
    </div>
    
    <!-- MAI-2282: Quote Expired Overlay -->
    <div class="quote-expired-overlay" id="quote-expired-overlay" style="display:none;">
      <div class="quote-expired-modal">
        <div class="quote-expired-icon">⏰</div>
        <h2 class="quote-expired-title">Quote Expired</h2>
        <p class="quote-expired-message">Your quote from Chef ${lead.chefName || 'your chef'} has expired. To confirm your booking, you'll need to submit a new inquiry.</p>
        <a href="/chefs" class="quote-expired-cta">Find a Chef →</a>
      </div>
    </div>
  </div>
  
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>Montreal's premier private chef marketplace.</p>
    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>
  </footer>
  
  <script>
    const leadId = '${lead.id}';
    const token = '${query.token}';
    const baseQuoteAmount = ${lead.quoteAmount || 0};
    const payButton = document.getElementById('pay-button');
    const errorMessage = document.getElementById('error-message');
    
    // MAI-875: Available addons and selected state
    const availableAddons = ${addonsJson};
    let selectedAddonIds = ${selectedAddonIdsJson};
    
    // MAI-2282: Quote Expiry Countdown
    const quoteCountdownEl = document.getElementById('quote-countdown');
    const quoteExpiryMs = quoteCountdownEl ? parseInt(quoteCountdownEl.dataset.expiry) : null;
    
    function updateCountdown() {
      if (!quoteExpiryMs) return;
      const remaining = quoteExpiryMs - Date.now();
      const countdownTimer = document.getElementById('countdown-timer');
      if (!countdownTimer) return;
      
      if (remaining <= 0) {
        // Quote expired - show overlay and disable pay button
        countdownTimer.textContent = 'EXPIRED';
        if (quoteCountdownEl) {
          quoteCountdownEl.classList.remove('green', 'yellow', 'red');
          quoteCountdownEl.classList.add('expired');
        }
        if (payButton) {
          payButton.disabled = true;
          payButton.style.opacity = '0.5';
          payButton.style.cursor = 'not-allowed';
          payButton.textContent = 'Quote Expired';
        }
        document.getElementById('quote-expired-overlay').style.display = 'flex';
        // Fire analytics
        if (typeof fireExitIntentEvent === 'function') {
          fireExitIntentEvent('checkout_quote_expired', null, null);
        }
        return;
      }
      
      const hours = Math.floor(remaining / 3600000);
      const minutes = Math.floor((remaining % 3600000) / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      countdownTimer.textContent = \`\${hours}h \${minutes}m \${seconds}s\`;
      
      // Update urgency color
      if (quoteCountdownEl) {
        quoteCountdownEl.classList.remove('green', 'yellow', 'red', 'expired');
        if (remaining < 6 * 3600000) {
          quoteCountdownEl.classList.add('red');
        } else if (remaining < 12 * 3600000) {
          quoteCountdownEl.classList.add('yellow');
        } else {
          quoteCountdownEl.classList.add('green');
        }
      }
    }
    
    // Initialize UI
    document.addEventListener('DOMContentLoaded', function() {
      renderAddonCards();
      updatePaymentSummary();
      if (quoteExpiryMs) {
        updateCountdown();
        setInterval(updateCountdown, 1000);
      }
    });
    
    function renderAddonCards() {
      const container = document.getElementById('upsell-cards');
      container.innerHTML = availableAddons.map(addon => {
        const isSelected = selectedAddonIds.includes(addon.id);
        return \`
          <div class="addon-card \${isSelected ? 'selected' : ''}" data-addon-id="\${addon.id}" onclick="toggleAddon('\${addon.id}')">
            <div class="addon-card-header">
              <span class="addon-icon">\${addon.icon}</span>
              <div class="addon-info">
                <div class="addon-name">\${addon.name}</div>
                <div class="addon-price">+$\${addon.price}</div>
              </div>
            </div>
            <div class="addon-description">\${addon.description}</div>
            <div class="addon-toggle">
              <button class="addon-toggle-btn">\${isSelected ? 'Added ✓' : 'Add'}</button>
            </div>
          </div>
        \`;
      }).join('');
    }
    
    function toggleAddon(addonId) {
      const index = selectedAddonIds.indexOf(addonId);
      const { name: addonName, price: addonPrice } = getAddonDetails(addonId);
      
      if (index === -1) {
        selectedAddonIds.push(addonId);
        // Fire analytics: addon_selected
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/event', JSON.stringify({
            event: 'addon_selected',
            leadId: parseInt(leadId),
            addon_id: addonId,
            addon_name: addonName,
            addon_price: addonPrice,
            total_selected: selectedAddonIds.length,
            timestamp: new Date().toISOString()
          }));
        }
      } else {
        selectedAddonIds.splice(index, 1);
        // Fire analytics: addon_deselected
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/event', JSON.stringify({
            event: 'addon_deselected',
            leadId: parseInt(leadId),
            addon_id: addonId,
            addon_name: addonName,
            addon_price: addonPrice,
            total_selected: selectedAddonIds.length,
            timestamp: new Date().toISOString()
          }));
        }
      }
      renderAddonCards();
      updatePaymentSummary();
      saveAddonSelection();
    }
    
    function skipUpsell() {
      selectedAddonIds = [];
      renderAddonCards();
      updatePaymentSummary();
      saveAddonSelection();
    }
    
    let addonViewedFired = false;
    function updatePaymentSummary() {
      const addonsRow = document.getElementById('addons-row');
      const addonsTotal = document.getElementById('addons-total');
      const grandTotal = document.getElementById('grand-total');
      
      // Calculate addons total
      const addonsTotalAmount = selectedAddonIds.reduce((sum, id) => {
        const addon = availableAddons.find(a => a.id === id);
        return sum + (addon ? addon.price : 0);
      }, 0);
      
      if (addonsTotalAmount > 0) {
        addonsRow.style.display = 'flex';
        addonsTotal.textContent = '+$' + addonsTotalAmount.toFixed(2);
      } else {
        addonsRow.style.display = 'none';
      }
      
      const grandTotalAmount = baseQuoteAmount + addonsTotalAmount;
      grandTotal.textContent = '$' + grandTotalAmount.toFixed(2);
      
      // Fire addon_viewed once when addon section becomes visible
      if (!addonViewedFired && selectedAddonIds.length > 0) {
        addonViewedFired = true;
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/event', JSON.stringify({
            event: 'addon_viewed',
            leadId: parseInt(leadId),
            timestamp: new Date().toISOString()
          }));
        }
      }
    }
    
    function getAddonDetails(addonId) {
      const addon = availableAddons.find(a => a.id === addonId);
      return addon ? { name: addon.name, price: addon.price } : { name: addonId, price: 0 };
    }
    
    async function saveAddonSelection() {
      try {
        await fetch('/api/booking/' + leadId + '/addons', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ addonIds: selectedAddonIds })
        });
      } catch (err) {
        console.error('Failed to save addon selection:', err);
      }
    }
    
    function showError(message) {
      errorMessage.textContent = message;
      errorMessage.classList.add('show');
      payButton.disabled = false;
      payButton.classList.remove('loading');
      payButton.textContent = 'Pay Now';
    }
    
    function hideError() {
      errorMessage.classList.remove('show');
    }
    
    async function startCheckout() {
      hideError();
      payButton.disabled = true;
      payButton.classList.add('loading');
      payButton.textContent = '';
      
      // Fire analytics: checkout_session_attempted
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/event', JSON.stringify({
          event: 'checkout_session_attempted',
          leadId: parseInt(leadId),
          timestamp: new Date().toISOString()
        }));
      }
      
      // MAI-2271: Fire analytics for what_happens_after_payment_viewed if user expanded it
      window.toggleAfterPayment = function() {
        var btn = document.querySelector('.after-payment-toggle');
        var content = document.getElementById('after-payment-content');
        var isExpanding = !content.classList.contains('expanded');
        
        btn.classList.toggle('expanded');
        content.classList.toggle('expanded');
        
        // Fire analytics event
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/event', JSON.stringify({
            event: isExpanding ? 'what_happens_after_payment_viewed' : 'what_happens_after_payment_collapsed',
            leadId: parseInt(leadId),
            timestamp: new Date().toISOString()
          }));
        }
      };
      
      try {
        const response = await fetch('/api/checkout/' + leadId + '/create-session?token=' + token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          // Fire analytics: checkout_session_failed
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics/event', JSON.stringify({
              event: 'checkout_session_failed',
              leadId: parseInt(leadId),
              error: data.message || data.error || 'HTTP ' + response.status,
              status: response.status,
              timestamp: new Date().toISOString()
            }));
          }
          throw new Error(data.message || data.error || 'Failed to create checkout session');
        }
        
        if (data.url) {
          // Fire analytics: checkout_session_created
          if (navigator.sendBeacon && data.sessionId) {
            navigator.sendBeacon('/api/analytics/event', JSON.stringify({
              event: 'checkout_session_created',
              leadId: parseInt(leadId),
              sessionId: data.sessionId,
              timestamp: new Date().toISOString()
            }));
          }
          // Redirect to Stripe Checkout
          window.location.href = data.url;
        } else {
          throw new Error('No checkout URL received');
        }
      } catch (error) {
        // Fire analytics: checkout_session_failed
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/event', JSON.stringify({
            event: 'checkout_session_failed',
            leadId: parseInt(leadId),
            error: error.message || 'Unknown error',
            timestamp: new Date().toISOString()
          }));
        }
        showError(error.message || 'An error occurred. Please try again.');
      }
    }
    
    // MAI-2251: Exit Intent Detection
    (function() {
      var exitIntentShown = sessionStorage.getItem('exitIntentShown') === 'true';
      var leadIdNum = parseInt(leadId);
      var hasEnteredCheckout = sessionStorage.getItem('checkoutEntered_' + leadIdNum) === 'true';
      
      // Mark that user has entered checkout for this lead
      sessionStorage.setItem('checkoutEntered_' + leadIdNum, 'true');
      
      if (exitIntentShown || hasEnteredCheckout === false) {
        return; // Already shown or not a valid checkout scenario
      }
      
      // Detect exit intent (mouse leaving viewport)
      function handleExitIntent(e) {
        if (e.clientY <= 0 && !exitIntentShown) {
          exitIntentShown = true;
          sessionStorage.setItem('exitIntentShown', 'true');
          showExitIntentModal();
          // Fire analytics: exit_intent_shown
          fireExitIntentEvent('exit_intent_shown', null, null);
        }
      }
      
      function showExitIntentModal() {
        var overlay = document.getElementById('exit-intent-overlay');
        if (overlay) {
          overlay.classList.add('show');
        }
      }
      
      function fireExitIntentEvent(eventName, email, offerType) {
        if (navigator.sendBeacon) {
          var payload = {
            event: eventName,
            leadId: leadIdNum,
            exit_intent_offer_type: offerType || 'free_dessert',
            timestamp: new Date().toISOString()
          };
          if (email) {
            payload.exit_intent_email = email;
          }
          navigator.sendBeacon('/api/analytics/event', JSON.stringify(payload));
        }
      }
      
      window.handleExitIntentComplete = function() {
        var emailInput = document.getElementById('exit-intent-email');
        var email = emailInput ? emailInput.value.trim() : '';
        
        if (!email) {
          if (emailInput) emailInput.style.borderColor = '#ef4444';
          return;
        }
        
        // Hide modal
        var overlay = document.getElementById('exit-intent-overlay');
        if (overlay) {
          overlay.classList.remove('show');
        }
        
        // Fire analytics: exit_intent_accepted (and email_captured if email provided)
        var analyticsPayload = {
          event: 'exit_intent_accepted',
          leadId: leadIdNum,
          exit_intent_offer_type: 'free_dessert',
          timestamp: new Date().toISOString()
        };
        if (email) {
          analyticsPayload.exit_intent_email = email;
        }
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/event', JSON.stringify(analyticsPayload));
        }
        
        // Proceed to checkout
        startCheckout();
      };
      
      window.handleExitIntentDecline = function() {
        var overlay = document.getElementById('exit-intent-overlay');
        if (overlay) {
          overlay.classList.remove('show');
        }
        // Fire analytics: exit_intent_declined
        fireExitIntentEvent('exit_intent_declined', null, 'free_dessert');
      };
      
      // Attach exit intent listener after a small delay to avoid immediate trigger
      setTimeout(function() {
        document.addEventListener('mouseout', handleExitIntent);
        
        // MAI-2264: Mobile/Touch exit intent - trigger on scroll depth or time
        var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        var hasTriggedMobile = false;
        
        function triggerMobileExitIntent() {
          if (!exitIntentShown && !hasTriggedMobile) {
            hasTriggedMobile = true;
            exitIntentShown = true;
            sessionStorage.setItem('exitIntentShown', 'true');
            showExitIntentModal();
            fireExitIntentEvent('exit_intent_shown', null, 'mobile_scroll_trigger');
          }
        }
        
        if (isMobile) {
          // Mobile: trigger after 45 seconds on page OR when user scrolls near bottom (within 20% of page)
          setTimeout(function() {
            triggerMobileExitIntent();
          }, 45000);
          
          // Scroll depth trigger: when user scrolls to bottom 20% of page
          window.addEventListener('scroll', function() {
            var scrollTop = window.scrollY || document.documentElement.scrollTop;
            var scrollHeight = document.documentElement.scrollHeight;
            var clientHeight = document.documentElement.clientHeight;
            var scrolledToBottom = scrollTop + clientHeight >= scrollHeight * 0.80;
            if (scrolledToBottom) {
              triggerMobileExitIntent();
            }
          });
        } else {
          // Desktop: also add time-based trigger as backup after 60 seconds
          setTimeout(function() {
            if (!exitIntentShown) {
              // Show after 60 seconds if no mouse exit detected
              exitIntentShown = true;
              sessionStorage.setItem('exitIntentShown', 'true');
              showExitIntentModal();
              fireExitIntentEvent('exit_intent_shown', null, 'desktop_time_trigger');
            }
          }, 60000);
        }
      }, 2000);
    })();
  </script>
</body>
</html>`;
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