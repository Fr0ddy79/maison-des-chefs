// Standalone booking page - avoids pages.ts complexity for cookie pre-fill
import { db } from '../db/index.js';
import { services, users, chefProfiles, bookings, leads } from '../db/schema.js';
import { eq, gte, lte, sql, and } from 'drizzle-orm';

export default async function buildBookingPage(serviceId: number, dinerEmail: string, dinerName: string, dinerPhone: string, prefillGuests?: number, referralCodeFromUrl?: string, ctaFromUrl?: string): Promise<string> {
  // Simple query without complex joins to avoid drizzle issues
  const serviceBase = db.select({
    id: services.id,
    chefId: services.chefId,
    name: services.name,
    description: services.description,
    pricePerPerson: services.pricePerPerson,
    minGuests: services.minGuests,
    maxGuests: services.maxGuests,
  })
    .from(services)
    .where(eq(services.id, serviceId))
    .get();

  if (!serviceBase) {
    return build404Page();
  }

  // Get chef info separately
  const chef = db.select({ name: users.name })
    .from(users)
    .where(eq(users.id, serviceBase.chefId))
    .get();


  // Get chef profile for location and cuisine if available
  const chefProfile = db.select({
    location: chefProfiles.location,
    cuisineTypes: chefProfiles.cuisineTypes,
  })
    .from(chefProfiles)
    .where(eq(chefProfiles.userId, serviceBase.chefId))
    .get();

  // Compute avg response time for this chef (for trust badge)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const chefLeads = db.select({
    firstResponseAt: leads.firstResponseAt,
    createdAt: leads.createdAt,
  })
    .from(leads)
    .where(eq(leads.chefId, serviceBase.chefId))
    .all();
  
  let avgResponseTimeMs = null;
  if (chefLeads.length > 0) {
    const responseTimes = chefLeads
      .filter(l => l.firstResponseAt && l.createdAt)
      .map(l => new Date(l.firstResponseAt!).getTime() - new Date(l.createdAt!).getTime());
    if (responseTimes.length > 0) {
      avgResponseTimeMs = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    }
  }

  // Build response time badge if we have data
  function formatResponseTimeBadge(avgMs) {
    if (avgMs == null || avgMs <= 0) return null;
    const minutes = Math.round(avgMs / 60000);
    if (minutes < 60) return '⚡ Typically responds within ' + minutes + ' min';
    const hours = Math.round(minutes / 60);
    if (hours < 24) return '⚡ Typically responds within ' + hours + ' hr';
    const days = Math.round(hours / 24);
    return '⚡ Typically responds within ' + days + ' day' + (days > 1 ? 's' : '');
  }
  const responseTimeBadge = formatResponseTimeBadge(avgResponseTimeMs);

  const service = {
    ...serviceBase,
    chefName: chef?.name || 'Unknown Chef',
    chefLocation: chefProfile?.location || '',
    chefCuisineTypes: chefProfile?.cuisineTypes || '[]',
  };


  const defaultGuests = prefillGuests !== undefined ? prefillGuests : service.minGuests;
  const cuisineTypes = JSON.parse(service.chefCuisineTypes || '[]');
  const cuisineList = cuisineTypes.join(', ');
  const isReturningDiner = !!dinerEmail;
  const welcomeBackHtml = isReturningDiner && dinerName
    ? `<div class="welcome-back"><span class="welcome-icon">👋</span> Welcome back, <strong>${escapeHtml(dinerName)}</strong>! Your info has been pre-filled below.</div>`
    : '';

  // MAI-1867: Map CTA variant to button text (extends service detail page A/B test to booking page)
  // Variants: control, testA (Request Your Date), testB (Request Booking), testC (Check Availability)
  const ctaVariant = ctaFromUrl && ['control', 'testA', 'testB', 'testC', 'testD'].includes(ctaFromUrl) ? ctaFromUrl : null;
  const ctaButtonText = ctaVariant === 'testB' ? 'Request Booking'
    : ctaVariant === 'testA' || ctaVariant === 'testD' ? 'Request Your Date'
    : ctaVariant === 'testC' ? 'Check Availability'
    : 'Get Your Quote'; // Default — backwards compatible

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Book ${service.name} | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; }
    .auth-panel { background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 1.5rem; display: none; }
    .auth-panel.visible { display: block; }
    .auth-panel h2 { font-size: 1.2rem; color: #2c3e50; margin-bottom: 0.5rem; }
    .auth-panel p { color: #666; font-size: 0.9rem; margin-bottom: 1.25rem; }
    .auth-toggle { display: flex; gap: 0; border-bottom: 2px solid #eee; margin-bottom: 1.25rem; }
    .auth-toggle button { flex: 1; padding: 0.75rem; background: none; border: none; font-size: 0.95rem; font-weight: 500; color: #888; cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -2px; transition: color 0.2s, border-color 0.2s; }
    .auth-toggle button.active { color: #c9a227; border-bottom-color: #c9a227; }
    .auth-form-group { margin-bottom: 1rem; }
    .auth-form-group label { display: block; font-weight: 500; color: #555; margin-bottom: 0.4rem; font-size: 0.9rem; }
    .auth-form-group input { width: 100%; padding: 0.7rem 0.9rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; font-family: inherit; transition: border-color 0.2s; }
    .auth-form-group input:focus { outline: none; border-color: #c9a227; }
    .auth-form-group input.error { border-color: #e53935; }
    .auth-error { background: #ffebee; border: 1px solid #ffcdd2; color: #c62828; padding: 0.6rem 0.9rem; border-radius: 6px; font-size: 0.9rem; margin-bottom: 1rem; display: none; }
    .auth-error.visible { display: block; }
    .magic-link-note { font-size: 0.8rem; color: #888; margin: 0.5rem 0 1rem; text-align: center; }
    .auth-spinner { display: inline-block; width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-radius: 50%; border-top-color: white; animation: spin 0.8s linear infinite; margin-right: 0.5rem; vertical-align: middle; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .signin-btn { background: #c9a227; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background 0.2s; }
    .signin-btn:hover { background: #b8922a; }
    .signin-btn:disabled { background: #ccc; cursor: not-allowed; }
    .divider { display: flex; align-items: center; gap: 1rem; margin: 1rem 0; color: #aaa; font-size: 0.85rem; }
    .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #eee; }
    .magic-btn { background: #f5f5f5; color: #333; border: 1px solid #ddd; padding: 0.75rem 1.5rem; border-radius: 6px; font-size: 0.95rem; cursor: pointer; width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; transition: background 0.2s; }
    .magic-btn:hover { background: #eee; }
    .magic-btn:disabled { cursor: not-allowed; opacity: 0.6; }
    .magic-sent { background: #e8f5e9; border: 1px solid #a5d6a7; color: #2e7d32; padding: 0.75rem 1rem; border-radius: 6px; font-size: 0.9rem; text-align: center; }
    .page-wrapper { max-width: 900px; margin: 0 auto; padding: 7rem 2rem 3rem; }
    .back-link { display: inline-flex; align-items: center; gap: 0.5rem; color: #666; text-decoration: none; margin-bottom: 1.5rem; font-size: 0.95rem; }
    .back-link:hover { color: #c9a227; }
    .page-header { margin-bottom: 2rem; }
    .page-header h1 { font-size: 2rem; color: #2c3e50; margin-bottom: 0.5rem; }
    .page-header .chef-info { color: #666; font-size: 1rem; }
    .welcome-back { background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%); border: 1px solid #a5d6a7; color: #2e7d32; padding: 1rem 1.25rem; border-radius: 8px; margin-bottom: 1.5rem; font-size: 1rem; display: flex; align-items: center; gap: 0.75rem; }
    .welcome-back .welcome-icon { font-size: 1.25rem; }
    .content-grid { display: grid; grid-template-columns: 1fr 320px; gap: 2rem; }
    .booking-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); height: fit-content; }
    .service-summary { background: #f8f9fa; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; }
    .service-summary h3 { font-size: 1.1rem; color: #2c3e50; margin-bottom: 0.5rem; }
    .service-summary p { color: #666; font-size: 0.9rem; margin-bottom: 0.5rem; }
    .service-summary .price { font-size: 1.5rem; font-weight: 700; color: #c9a227; margin-top: 0.75rem; }
    .form-section { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .form-section h2 { font-size: 1.3rem; color: #2c3e50; margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1.25rem; }
    .form-group label { display: block; font-weight: 500; color: #555; margin-bottom: 0.4rem; font-size: 0.95rem; }
    .form-group label .required { color: #e53935; }
    .form-group input, .form-group textarea { width: 100%; padding: 0.75rem 1rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; font-family: inherit; transition: border-color 0.2s; }
    .form-group input:focus, .form-group textarea:focus { outline: none; border-color: #c9a227; }
    .form-group input.prefilled { background: #fff9e6; border-color: #ffe082; }
    .form-group textarea { min-height: 100px; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .submit-btn { width: 100%; background: #c9a227; color: white; border: none; padding: 1rem; border-radius: 6px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .submit-btn:hover { background: #b8922a; }
    .submit-btn:disabled { background: #ccc; cursor: not-allowed; }
    .success-message { background: #e8f5e9; border: 1px solid #a5d6a7; color: #2e7d32; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; display: none; }
    .success-message.show { display: block; }
    .privacy-note { font-size: 0.85rem; color: #888; margin-top: 1rem; text-align: center; }
    footer { background: #1a1a1a; color: white; padding: 3rem 2rem; text-align: center; margin-top: 4rem; }
    footer .logo { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
    footer p { color: rgba(255,255,255,0.7); }
    .price-callout { background: #fff9e6; border: 1px solid #ffe082; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
    .price-callout .price-label { font-size: 0.85rem; color: #666; margin-bottom: 0.25rem; }
    .price-callout .price-value { font-size: 1.4rem; font-weight: 700; color: #c9a227; }
    .price-callout .price-quote { font-size: 1rem; color: #666; font-style: italic; }
    .estimated-total { margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid #e0e0e0; }
    .estimated-total .total-label { font-size: 0.85rem; color: #666; }
    .estimated-total .total-value { font-size: 1.1rem; font-weight: 600; color: #2c3e50; }
    .next-steps { background: #f0f4ff; border: 1px solid #c5d5ff; border-radius: 8px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
    .next-steps h4 { font-size: 0.9rem; color: #2c3e50; margin-bottom: 0.5rem; }
    .next-steps ul { margin: 0; padding-left: 1.25rem; font-size: 0.9rem; color: #555; }
    .next-steps li { margin-bottom: 0.25rem; }
    .trust-messaging { display: flex; justify-content: center; gap: 1.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .trust-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; color: #666; }
    .trust-item .icon { font-size: 1rem; }
    .reviews-section { margin: 1.5rem 0; padding: 1.25rem 0; border-top: 1px solid #eee; }
    .aggregate-rating { display: inline-flex; align-items: center; gap: 0.5rem; background: #fff9e6; border: 1px solid #ffe082; padding: 0.6rem 1rem; border-radius: 8px; margin-bottom: 1rem; cursor: pointer; text-decoration: none; }
    .aggregate-rating:hover { background: #fff3cd; }
    .aggregate-rating .rating-number { font-size: 1.1rem; font-weight: 700; color: #2c3e50; }
    .aggregate-rating .rating-stars { color: #f5a623; font-size: 1rem; }
    .aggregate-rating .rating-count { color: #666; font-size: 0.9rem; }
    .reviews-list { list-style: none; padding: 0; margin: 0; }
    .review-card { background: #f8f9fa; padding: 1rem 1.25rem; border-radius: 8px; margin-bottom: 0.75rem; }
    .review-card:last-child { margin-bottom: 0; }
    .review-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .review-stars { color: #f5a623; letter-spacing: 1px; }
    .review-author { font-weight: 600; color: #2c3e50; font-size: 0.9rem; }
    .review-date { color: #999; font-size: 0.85rem; }
    .review-comment { color: #555; font-size: 0.9rem; line-height: 1.5; margin: 0; }
    .show-all-reviews { display: block; text-align: center; color: #c9a227; font-size: 0.9rem; font-weight: 500; margin-top: 0.75rem; cursor: pointer; }
    .show-all-reviews:hover { color: #b8922a; text-decoration: underline; }
    @media (max-width: 768px) { .content-grid { grid-template-columns: 1fr; } .form-row { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">Maison des Chefs</a>
    <div class="nav-links">
      <a href="/services">Services</a>
      <a href="/chefs">Chefs</a>
      <a href="/auth/login">Sign In</a>
    </div>
  </nav>
  <div class="page-wrapper">
    <a href="/services/${service.id}" class="back-link">← Back to service details</a>
    <div class="page-header">
      <h1>Get a Personalized Quote</h1>
      <p class="chef-info">${service.name} by ${service.chefName} • ${cuisineList}</p>
    </div>
    ${welcomeBackHtml}
    <div class="auth-panel" id="authPanel">
      <h2>Track Your Bookings</h2>
      <p>Sign in to save your progress and get faster updates.</p>
      <div class="auth-toggle">
        <button id="tabSignIn" class="active" onclick="showAuthTab('signin')">Sign In</button>
        <button id="tabMagic" onclick="showAuthTab('magic')">Magic Link</button>
      </div>
      <div id="authError" class="auth-error"></div>
      <div id="authContent">
        <div id="signinContent">
          <div class="auth-form-group">
            <label for="authEmail">Email</label>
            <input type="email" id="authEmail" placeholder="you@example.com" autocomplete="email">
          </div>
          <div class="auth-form-group" id="authPasswordGroup">
            <label for="authPassword">Password</label>
            <input type="password" id="authPassword" placeholder="Your password" autocomplete="current-password">
          </div>
          <button class="signin-btn" id="signinBtn" onclick="submitAuth()">
            Sign In &amp; Continue
          </button>
        </div>
        <div id="magicContent" style="display:none;">
          <div class="auth-form-group">
            <label for="magicEmail">Email</label>
            <input type="email" id="magicEmail" placeholder="you@example.com" autocomplete="email">
          </div>
          <button class="magic-btn" id="magicBtn" onclick="submitMagicLink()">Send Magic Link</button>
          <p class="magic-link-note">We'll email you a link to sign in instantly - no password needed.</p>
          <div id="magicSentMsg" class="magic-sent" style="display:none;">Check your email for the magic link!</div>
        </div>
      </div>
    </div>
    <div class="success-message" id="successMessage">
      <strong>✓ Your quote request was sent!</strong>
      <p style="margin-top: 0.5rem;">The chef will respond within 24-48 hours with a personalized quote.</p>
      <p style="margin-top: 0.25rem;">Save your booking status link to track your inquiry.</p>
      <div id="bookingStatusUrlSection" style="display:none; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #a5d6a7;">
        <p style="margin-bottom: 0.5rem;">Track your inquiry status:</p>
        <div style="background: #f0f8e8; border: 1px solid #a5d6a7; border-radius: 6px; padding: 0.75rem 1rem; word-break: break-all;">
          <a href="#" id="bookingStatusUrlLink" style="color: #2e7d32; font-weight: 600; text-decoration: none;"></a>
        </div>
        <p style="font-size: 0.85rem; color: #888; margin-top: 0.5rem;">Save this link to check your inquiry status at any time.</p>
      </div>
    </div>
    <div class="content-grid">
      <div class="form-section">
        <h2>Your Details</h2>
        ${service.pricePerPerson && service.pricePerPerson > 0
          ? `<div class="price-callout">
              <div class="price-label">Price per person</div>
              <div class="price-value">$${service.pricePerPerson}/person</div>
              <div class="estimated-total">
                <div class="total-label">Estimated Total</div>
                <div class="total-value" id="estimatedTotal">$${((service.pricePerPerson ?? 0) * defaultGuests).toLocaleString()}</div>
              </div>
            </div>`
          : `<div class="price-callout">
              <div class="price-quote">Chef will provide a quote</div>
            </div>`}
        <form id="inquiryForm" data-cta-text="${ctaButtonText}">
          <input type="hidden" name="serviceId" value="${service.id}">
          <input type="hidden" id="referralCodeInput" name="referralCode" value="${escapeHtml(referralCodeFromUrl || '')}">
          <div class="form-row">
            <div class="form-group">
              <label for="clientName">Your Name <span class="required">*</span></label>
              <input type="text" id="clientName" name="clientName" required value="${escapeHtml(dinerName)}" placeholder="Full name">
            </div>
            <div class="form-group">
              <label for="email">Email <span class="required">*</span></label>
              <input type="email" id="email" name="email" required value="${escapeHtml(dinerEmail)}" placeholder="you@example.com">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="phone">Phone</label>
              <input type="tel" id="phone" name="phone" value="${escapeHtml(dinerPhone)}" placeholder="(555) 123-4567">
            </div>
            <div class="form-group">
              <label for="guestCount">Number of Guests <span class="required">*</span></label>
              <input type="number" id="guestCount" name="guestCount" required min="${service.minGuests}" max="${service.maxGuests}" value="${defaultGuests}">
              ${service.pricePerPerson && service.pricePerPerson > 0
                ? `<div class="estimated-total"><div class="total-label">Estimated Total</div><div class="total-value" id="estimatedTotalInline">$${((service.pricePerPerson ?? 0) * defaultGuests).toLocaleString()}</div></div>`
                : ''}
            </div>
          </div>
          <div class="form-group">
            <label for="eventDate">Preferred Date</label>
            <input type="date" id="eventDate" name="eventDate" min="${new Date().toISOString().split('T')[0]}">
          </div>
          <div class="form-group">
            <label for="message">Message to Chef</label>
            <textarea id="message" name="message" placeholder="Tell the chef about your event, dietary requirements, or any special requests..."></textarea>
          </div>
          <div class="next-steps">
            <h4>What happens next</h4>
            <ul>
              <li>The chef will confirm within 24-48 hours</li>
              <li>You'll receive an email with the chef's response</li>
            </ul>
          </div>
          <div class="trust-messaging">
            <div class="trust-item"><span class="icon">🔒</span><span>No payment required today</span></div>
            <div class="trust-item"><span class="icon">✓</span><span>Free cancellation</span></div>
            <div class="trust-item"><span class="icon">⭐</span><span>Verified chefs</span></div>
            ${responseTimeBadge ? `<div class="trust-item"><span class="icon">⚡</span><span>${responseTimeBadge}</span></div>` : ''}
          </div>
          <button type="submit" class="submit-btn" id="submitBtn">${ctaButtonText}</button>
          <p class="privacy-note">Your information is only used to send your quote request to the chef.</p>
        </form>
      </div>
      <div class="reviews-section" id="reviewsSection">
        <div id="aggregateRating"></div>
        <div id="reviewsContainer"></div>
      </div>
      <div class="booking-card">
        <div class="service-summary">
          <h3>${service.name}</h3>
          <p>by ${service.chefName}</p>
          <p>📍 ${service.chefLocation || 'Location TBD'}</p>
          <p>👥 ${service.minGuests}-${service.maxGuests} guests</p>
          ${service.pricePerPerson && service.pricePerPerson > 0
            ? `<div class="price">$${service.pricePerPerson}/person</div>`
            : `<div class="price">Chef will provide a quote</div>`}
        </div>
      </div>
    </div>
  </div>
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>Montreal's premier private chef marketplace.</p>
    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>
  </footer>
  <script>
    const pricePerPerson = ${service.pricePerPerson && service.pricePerPerson > 0 ? service.pricePerPerson : 'null'};
    const serviceId = ${service.id};
    document.querySelectorAll('input[value]').forEach(field => { if (field.value) field.classList.add('prefilled'); });
    const estimatedTotalEl = document.getElementById('estimatedTotal');
    const estimatedTotalInlineEl = document.getElementById('estimatedTotalInline');
    const guestCountInput = document.getElementById('guestCount');

    // MAI-834: Form state preservation through login redirect
    const FORM_STATE_KEY = 'booking_form_state_' + serviceId;
    function saveFormState() {
      const form = document.getElementById('inquiryForm');
      if (!form) return;
      const state = {
        clientName: form.clientName?.value || '',
        email: form.email?.value || '',
        phone: form.phone?.value || '',
        guestCount: form.guestCount?.value || '',
        eventDate: form.eventDate?.value || '',
        message: form.message?.value || '',
      };
      sessionStorage.setItem(FORM_STATE_KEY, JSON.stringify(state));
    }
    function restoreFormState() {
      const saved = sessionStorage.getItem(FORM_STATE_KEY);
      if (!saved) return;
      try {
        const state = JSON.parse(saved);
        const form = document.getElementById('inquiryForm');
        if (!form) return;
        if (state.clientName && form.clientName) form.clientName.value = state.clientName;
        if (state.email && form.email) form.email.value = state.email;
        if (state.phone && form.phone) form.phone.value = state.phone;
        if (state.guestCount && form.guestCount) form.guestCount.value = state.guestCount;
        if (state.eventDate && form.eventDate) form.eventDate.value = state.eventDate;
        if (state.message && form.message) form.message.value = state.message;
        sessionStorage.removeItem(FORM_STATE_KEY);
      } catch (e) {
        sessionStorage.removeItem(FORM_STATE_KEY);
      }
    }
    // Restore form state on page load (e.g., after login redirect)
    restoreFormState();
    // Save form state before page unload (user navigates to login)
    window.addEventListener('beforeunload', saveFormState);

    function updateEstimatedTotal() {
      if (pricePerPerson && guestCountInput) {
        const guests = parseInt(guestCountInput.value) || 0;
        const total = pricePerPerson * guests;
        const formatted = '$' + total.toLocaleString();
        if (estimatedTotalEl) estimatedTotalEl.textContent = formatted;
        if (estimatedTotalInlineEl) estimatedTotalInlineEl.textContent = formatted;
      }
    }
    if (guestCountInput) guestCountInput.addEventListener('change', updateEstimatedTotal);
    // Guest session handling for returning guests (MAI-1744)
    function getGuestSessionId() {
      const match = document.cookie.match(/guest_session_id=([^;]+)/);
      return match ? match[1] : null;
    }
    function setGuestSessionId(sessionId) {
      document.cookie = "guest_session_id=" + sessionId + "; path=/; max-age=2592000; SameSite=Lax";
    }
    function generateGuestSessionId() {
      return "g_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    function ensureGuestSessionId() {
      let id = getGuestSessionId();
      if (!id) { id = generateGuestSessionId(); setGuestSessionId(id); }
      return id;
    }


    // MAI-834: Track analytics with auth_status dimension
    function trackAnalytics(event, data) {
      const authStatus = '${isReturningDiner ? 'authenticated' : 'guest'}';
      const analyticsData = {
        event: event,
        service_id: serviceId,
        auth_status: authStatus,
        timestamp: new Date().toISOString(),
        ...data
      };
      // Fire-and-forget analytics ping (extendable to real analytics provider)
      try {
        navigator.sendBeacon && navigator.sendBeacon('/api/analytics/event', JSON.stringify(analyticsData));
      } catch (e) {
        // Silently fail - analytics should not break user flow
      }
    }

    // MAI-1010: Track booking form view on page load
    trackAnalytics('booking_form_view', { service_id: serviceId });
    // Pre-fill for returning guests with cookie (MAI-1744)
    (async function() {
      var sid = getGuestSessionId();
      if (sid && !${isReturningDiner ? 'true' : 'false'}) {
        try {
          var r = await fetch('/api/guest/prefill?session=' + encodeURIComponent(sid));
          if (r.ok) {
            var p = await r.json();
            if (p.name && document.getElementById('clientName')) { document.getElementById('clientName').value = p.name; document.getElementById('clientName').classList.add('prefilled'); }
            if (p.email && document.getElementById('email')) { document.getElementById('email').value = p.email; document.getElementById('email').classList.add('prefilled'); }
            if (p.phone && document.getElementById('phone')) { document.getElementById('phone').value = p.phone; document.getElementById('phone').classList.add('prefilled'); }
            if (p.guestCount && document.getElementById('guestCount')) document.getElementById('guestCount').value = p.guestCount;
          }
        } catch (_) {}
      }
    })();


    // MAI-1366: Inline Auth Panel
    const isAuthenticated = ${isReturningDiner ? 'true' : 'false'};
    const authPanel = document.getElementById('authPanel');
    const authError = document.getElementById('authError');
    const signinContent = document.getElementById('signinContent');
    const magicContent = document.getElementById('magicContent');
    const signinBtn = document.getElementById('signinBtn');
    const magicBtn = document.getElementById('magicBtn');
    let pendingFormData = null;

    function showAuthPanel() {
      if (isAuthenticated) return;
      if (authPanel) {
        authPanel.classList.add('visible');
        authPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        trackAnalytics('booking_form_auth_panel_shown', { service_id: serviceId });
      }
    }

    function hideAuthPanel() {
      if (authPanel) {
        authPanel.classList.remove('visible');
        authPanel.style.display = 'none';
      }
    }

    function showAuthTab(tab) {
      document.getElementById('tabSignIn').classList.toggle('active', tab === 'signin');
      document.getElementById('tabMagic').classList.toggle('active', tab === 'magic');
      signinContent.style.display = tab === 'signin' ? 'block' : 'none';
      magicContent.style.display = tab === 'magic' ? 'block' : 'none';
      authError.classList.remove('visible');
      authError.textContent = '';
    }

    function showAuthError(msg) {
      authError.textContent = msg;
      authError.classList.add('visible');
    }

    function setAuthLoading(loading) {
      if (signinBtn) {
        signinBtn.disabled = loading;
        signinBtn.innerHTML = loading
          ? '<span class="auth-spinner"></span>Signing in...'
          : 'Sign In & Continue';
      }
      if (magicBtn) {
        magicBtn.disabled = loading;
        magicBtn.textContent = loading ? 'Sending...' : 'Send Magic Link';
      }
    }

    async function submitAuth() {
      const email = document.getElementById('authEmail')?.value?.trim();
      const password = document.getElementById('authPassword')?.value;
      if (!email || !password) { showAuthError('Please enter your email and password.'); return; }
      setAuthLoading(true);
      authError.classList.remove('visible');
      try {
        const res = await fetch('/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          showAuthError(data.error || 'Sign in failed. Please try again.');
          setAuthLoading(false);
          return;
        }
        // Store tokens in cookies for server-side session
        document.cookie = "auth_token=" + data.accessToken + "; path=/; max-age=86400";
        document.cookie = "refresh_token=" + data.refreshToken + "; path=/; max-age=604800";
        trackAnalytics('booking_form_auth_panel_completed', { service_id: serviceId, method: 'password' });
        hideAuthPanel();
        if (pendingFormData) {
          submitInquiryWithData(pendingFormData);
          pendingFormData = null;
        }
      } catch {
        showAuthError('Network error. Please try again.');
        setAuthLoading(false);
      }
    }

    async function submitMagicLink() {
      const email = document.getElementById('magicEmail')?.value?.trim();
      if (!email) { showAuthError('Please enter your email address.'); return; }
      setAuthLoading(true);
      authError.classList.remove('visible');
      try {
        const res = await fetch('/auth/magic-link', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) {
          showAuthError(data.error || 'Failed to send magic link.');
          setAuthLoading(false);
          return;
        }
        document.getElementById('magicSentMsg').style.display = 'block';
        setAuthLoading(false);
      } catch {
        showAuthError('Network error. Please try again.');
        setAuthLoading(false);
      }
    }

    // MAI-823 / MAI-1836: Copy referral link to clipboard
    function copyReferralLink(btn, code) {
      const referralLink = window.location.origin + '/booking-status?ref=' + code;
      navigator.clipboard.writeText(referralLink).then(function() {
        btn.textContent = 'Copied!';
        btn.style.background = '#ffe082';
      }).catch(function() {
        btn.textContent = 'Error';
      });
    }

    async function submitInquiryWithData(formData) {
      const submitBtn = document.getElementById('submitBtn');
      const successMessage = document.getElementById('successMessage');
      if (!formData.email) { alert('Please enter your email address.'); return; }
      trackAnalytics('booking_form_submit', { service_id: formData.serviceId });
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      // Assign guest session cookie for pre-fill tracking (MAI-1744)
      formData.guestSessionId = ensureGuestSessionId();
      try {
        const response = await fetch('/api/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        if (response.ok) {
          const result = await response.clone().json();
          trackAnalytics('booking_inquiry_success', { service_id: formData.serviceId, lead_id: result.leadId });
          document.getElementById('inquiryForm').style.display = 'none';
          let successHtml = '<strong>\xe2\x9c\x93 Your quote request was sent!</strong><p style="margin-top: 0.5rem;">The chef will respond within 24-48 hours with a personalized quote.</p>';
          if (result.bookingStatusUrl) {
            successHtml += '<div style="margin-top:1.25rem;padding:1.25rem;background:#f0f8e8;border:1px solid #a5d6a7;border-radius:10px;text-align:center;"><p style="margin-bottom:0.75rem;font-size:0.9rem;color:#555;">Save your booking status link to track your inquiry.</p><p style="margin-bottom:1rem;font-size:1.1rem;font-weight:600;color:#2e7d32;">Track your booking status</p><div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;"><a href="' + result.bookingStatusUrl + '" style="min-width:180px;flex:1;max-width:280px;display:inline-block;background:#2e7d32;color:white;padding:0.85rem 1rem;border-radius:8px;text-decoration:none;font-weight:600;font-size:1rem;text-align:center;cursor:pointer;">Track your booking status \xe2\x9e\xa6</a><button onclick="navigator.clipboard.writeText(\' + result.bookingStatusUrl + \');this.textContent=\'Copied!\';this.style.background=\'#c8e6c9\'" style="min-width:100px;padding:0.85rem 1rem;background:white;border:2px solid #a5d6a7;border-radius:8px;font-weight:600;font-size:0.95rem;cursor:pointer;">\xe2\x9b\x8b Copy</button></div></div>';
          }
          // MAI-1836: Referral share card for inquiry success
          if (result.referralCode) {
            const refCode = result.referralCode;
            successHtml += '<div style="margin-top:1.25rem;padding:1.25rem;background:#fff8e1;border:1px solid #ffe082;border-radius:10px;text-align:center;"><h3 style="margin-bottom:0.5rem;font-size:1.1rem;color:#f57c00;">\xf0\x9f\x8d\xad Know someone who loves private dining?</h3><p style="margin-bottom:1rem;font-size:0.9rem;color:#555;">Share and you\'ll both get $25 credit when they book.</p><div style="display:flex;gap:0.5rem;justify-content:center;flex-wrap:wrap;"><button onclick="copyReferralLink(this, \'' + refCode + '\')" style="min-width:100px;padding:0.75rem 1rem;background:#fff;color:#f57c00;border:2px solid #ffe082;border-radius:8px;font-weight:600;font-size:0.9rem;cursor:pointer;">\xe2\x9b\x8b Copy Link</button><a href="/referral/track?code=' + refCode + '&source=email" style="min-width:100px;padding:0.75rem 1rem;background:#fff;color:#f57c00;border:2px solid #ffe082;border-radius:8px;font-weight:600;font-size:0.9rem;text-decoration:none;text-align:center;cursor:pointer;">\xe2\x9c\x89 Email</a><a href="/referral/track?code=' + refCode + '&source=whatsapp" target="_blank" style="min-width:100px;padding:0.75rem 1rem;background:#fff;color:#f57c00;border:2px solid #ffe082;border-radius:8px;font-weight:600;font-size:0.9rem;text-decoration:none;text-align:center;cursor:pointer;">\xf0\x9f\x92\xac WhatsApp</a></div></div>';
          }
          successMessage.innerHTML = successHtml;
          successMessage.classList.add('show');
          successMessage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
          const error = await response.json();
          trackAnalytics('booking_inquiry_error', { service_id: formData.serviceId, error: error.error || 'unknown' });
          alert('Error: ' + (error.error || 'Failed to submit inquiry'));
        }
      } catch (err) {
        trackAnalytics('booking_inquiry_error', { service_id: formData.serviceId, error: 'network_error' });
        alert('Network error. Please try again.');
      }
      finally { submitBtn.disabled = false; submitBtn.textContent = submitBtn.textContent || 'Get Your Quote'; }
    }

    // Load service reviews on page load
    (function() {
      function renderStars(rating) {
        var stars = '';
        for (var i = 1; i <= 5; i++) { stars += i <= rating ? '★' : '☆'; }
        return stars;
      }
      function formatDate(dateStr) {
        if (!dateStr) return '';
        var date = new Date(dateStr);
        var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return months[date.getMonth()] + ' ' + date.getFullYear();
      }
      function escapeHtml(text) {
        if (!text) return '';
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }
      function renderReviewCards(reviewsData) {
        if (!reviewsData || !reviewsData.reviews || reviewsData.reviews.length === 0) return '';
        var html = '<ul class="reviews-list">';
        reviewsData.reviews.slice(0, 3).forEach(function(r) {
          var authorName = r.dinerName || 'Guest Diner';
          html += '<li class="review-card">';
          html += '<div class="review-header">';
          html += '<span class="review-stars">' + renderStars(r.rating) + '</span>';
          html += '<span class="review-author">' + escapeHtml(authorName) + '</span>';
          html += '<span class="review-date">' + formatDate(r.createdAt) + '</span>';
          html += '</div>';
          if (r.comment) {
            html += '<p class="review-comment">"' + escapeHtml(r.comment) + '"</p>';
          }
          html += '</li>';
        });
        html += '</ul>';
        if (reviewsData.reviewCount > 3) {
          html += '<span class="show-all-reviews">Show all ' + reviewsData.reviewCount + ' reviews</span>';
        }
        return html;
      }
      function renderAggregateRating(reviewsData) {
        if (!reviewsData || reviewsData.reviewCount === 0) return '';
        var stars = renderStars(Math.round(reviewsData.avgRating));
        var singular = reviewsData.reviewCount === 1 ? 'review' : 'reviews';
        return '<a href="#reviewsSection" class="aggregate-rating" onclick="document.getElementById('reviewsContainer').scrollIntoView({behavior:'smooth'}); return false;">' +
          '<span class="rating-number">' + reviewsData.avgRating.toFixed(1) + '</span>' +
          '<span class="rating-stars">' + stars + '</span>' +
          '<span class="rating-count">(' + reviewsData.reviewCount + ' ' + singular + ')</span>' +
          '</a>';
      }
      async function loadServiceReviews() {
        try {
          var response = await fetch('/api/services/' + serviceId + '/reviews');
          if (!response.ok) return;
          var data = await response.json();
          var aggEl = document.getElementById('aggregateRating');
          var container = document.getElementById('reviewsContainer');
          if (aggEl) aggEl.innerHTML = renderAggregateRating(data);
          if (container) container.innerHTML = renderReviewCards(data);
        } catch (err) { console.error('Error loading reviews:', err); }
      }
      loadServiceReviews();
    })();

    document.getElementById('inquiryForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const formData = {
        serviceId: parseInt(form.serviceId.value),
        clientName: form.clientName.value || undefined,
        email: form.email.value,
        phone: form.phone.value || undefined,
        eventDate: form.eventDate.value || undefined,
        guestCount: parseInt(form.guestCount.value) || 1,
        message: form.message.value || undefined,
        referralCode: form.referralCode?.value || undefined,
      };
      if (!formData.email) { alert('Please enter your email address.'); return; }
      // Auth is optional - submit immediately (MAI-1744)
      submitInquiryWithData(formData);
    });
  </script>
</body>
</html>`;
}

function build404Page(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Service Not Found | Maison des Chefs</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8f9fa; }
    .error-container { text-align: center; padding: 2rem; }
    h1 { font-size: 4rem; color: #2c3e50; margin-bottom: 1rem; }
    p { color: #666; margin-bottom: 2rem; }
    a { background: #c9a227; color: white; padding: 0.875rem 2rem; text-decoration: none; border-radius: 4px; font-weight: 600; }
    a:hover { background: #b8922a; }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>404</h1>
    <p>The service you're looking for doesn't exist.</p>
    <a href="/services">Browse Services</a>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}