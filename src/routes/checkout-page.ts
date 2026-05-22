import { FastifyInstance } from 'fastify';
import Stripe from 'stripe';
import { db } from '../db/index.js';
import { leads, services, users, chefProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { getAddonsByIds } from '../data/addons.js';

const CHECKOUT_URL = process.env.CHECKOUT_URL || 'https://maisondeschefs.com';

// Initialize Stripe for retrieving session info
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
  apiVersion: '2026-04-22.dahlia',
});

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

export default async function checkoutPageRoutes(server: FastifyInstance) {
  // GET /checkout/success - Post-payment success page
  server.get('/checkout/success', async (request, reply) => {
    const query = request.query as { session_id?: string; lead?: string; token?: string };

    if (!query.session_id || !query.lead || !query.token) {
      return buildErrorPage('Missing parameters', 'Please return to your booking status to view details.');
    }

    const leadId = parseInt(query.lead);
    const verified = verifyLeadAccess(leadId, query.token);
    if (!verified) {
      return buildErrorPage('Access denied', 'Invalid or expired access token.');
    }

    const lead = db.select({
      id: leads.id,
      serviceId: leads.serviceId, // MAI-1075: Add for booking_created analytics
      bookingId: leads.bookingId, // MAI-1880: Needed for review submission
      serviceName: services.name,
      serviceDescription: services.description,
      chefName: users.name,
      chefLocation: chefProfiles.location,
      eventDate: leads.eventDate,
      guestCount: leads.guestCount,
      quoteAmount: leads.quoteAmount,
      clientName: leads.clientName,
      referralCode: leads.referralCode,
      status: leads.status,
      selectedAddons: leads.selectedAddons,
    })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .innerJoin(users, eq(leads.chefId, users.id))
      .leftJoin(chefProfiles, eq(leads.chefId, chefProfiles.userId))
      .where(eq(leads.id, leadId))
      .get();

    if (!lead) {
      return buildErrorPage('Booking not found', 'No booking was found with this ID.');
    }

    const isConverted = lead.status === 'converted';
    
    // MAI-1075: Track booking_created event with service attribution
    // Fire-and-forget - should not block page rendering
    const bookingCreatedScript = `
    (function() {
      var cookies = document.cookie.split(';');
      var lastViewedServiceId = null;
      for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i].trim();
        var eqPos = cookie.indexOf('=');
        if (eqPos > -1 && cookie.substring(0, eqPos) === 'last_viewed_service_id') {
          lastViewedServiceId = cookie.substring(eqPos + 1);
          break;
        }
      }
      var originatingServiceId = lastViewedServiceId && lastViewedServiceId !== String(${lead.serviceId}) ? parseInt(lastViewedServiceId, 10) : undefined;
      var bookingEventData = {
        event: 'booking_created',
        bookingId: ${lead.id},
        serviceId: ${lead.serviceId},
        originating_service_id: originatingServiceId,
        lead_id: ${lead.id},
        guestCount: ${lead.guestCount || 0},
        variant: 'unknown',
        auth_status: 'guest',
        timestamp: new Date().toISOString()
      };
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/event', JSON.stringify(bookingEventData));
      }
    })();
    `;
    
    // MAI-875: Parse selected addons
    let selectedAddonIds: string[] = [];
    try {
      selectedAddonIds = JSON.parse(lead.selectedAddons || '[]');
    } catch {
      selectedAddonIds = [];
    }
    const selectedAddons = getAddonsByIds(selectedAddonIds);
    const addonsTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);
    const totalWithAddons = (lead.quoteAmount || 0) + addonsTotal;
    
    const quoteAmountDisplay = lead.quoteAmount != null ? `$${Number(lead.quoteAmount).toFixed(2)}` : null;
    const addonsTotalDisplay = addonsTotal > 0 ? `$${addonsTotal.toFixed(2)}` : null;
    const totalWithAddonsDisplay = `$${totalWithAddons.toFixed(2)}`;

    // MAI-823: Referral CTA for converted bookings
    const referralCtaHtml = isConverted && lead.referralCode ? `
      <div class="referral-card">
        <h3 class="referral-title">🍽️ Share the experience & earn $25 toward your next booking</h3>
        <p class="referral-description">Know someone who'd love this experience? Share your unique referral link and earn $25 credits each time someone books using it!</p>
        <div class="referral-code-section">
          <p class="referral-code-label">Your Referral Code:</p>
          <div class="referral-code-box">${lead.referralCode}</div>
        </div>
        <div class="share-buttons">
          <a href="/referral/track?code=${lead.referralCode}&source=copy" class="share-btn copy-btn" onclick="copyReferralLink(this, '${lead.referralCode}'); return false;">
            <span class="share-icon">📋</span> Copy Link
          </a>
          <a href="/referral/track?code=${lead.referralCode}&source=email" class="share-btn email-btn" onclick="trackReferralShare('email', '${lead.referralCode}'); return true;">
            <span class="share-icon">✉️</span> Email
          </a>
          <a href="/referral/track?code=${lead.referralCode}&source=whatsapp" class="share-btn whatsapp-btn" target="_blank" rel="noopener" onclick="trackReferralShare('whatsapp', '${lead.referralCode}'); return true;">
            <span class="share-icon">💬</span> WhatsApp
          </a>
        </div>
      </div>
    ` : '';

    // MAI-875: Build addons display HTML
    const addonsHtml = selectedAddons.length > 0 ? `
      <div class="addons-card">
        <h3 class="addons-title">✨ Enhance Your Experience</h3>
        <div class="addons-list">
          ${selectedAddons.map(addon => `
            <div class="addon-item">
              <span class="addon-icon">${addon.icon}</span>
              <span class="addon-name">${addon.name}</span>
              <span class="addon-price">+$${addon.price.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    ` : '';

    const dinerName = lead.clientName || 'there';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed! | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.2rem; margin: 0; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; font-size: 0.9rem; }
    
    .page-content { max-width: 700px; margin: 0 auto; padding: 6rem 1.5rem 3rem; text-align: center; }
    
    .success-icon { font-size: 5rem; margin-bottom: 1rem; }
    .page-title { font-size: 2rem; color: #15803d; margin-bottom: 0.5rem; }
    .page-subtitle { font-size: 1.1rem; color: #666; margin-bottom: 2rem; }
    
    .confirmation-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 2rem; margin-bottom: 1.5rem; text-align: left; }
    .confirmation-title { font-size: 1.2rem; font-weight: 600; color: #2c3e50; margin-bottom: 1rem; }
    .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
    .detail-item { }
    .detail-label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .detail-value { font-size: 1rem; color: #2c3e50; font-weight: 500; }
    .detail-value.large { font-size: 1.5rem; font-weight: 700; color: #c9a227; }
    
    .message-box { background: #dcfce7; border: 1px solid #22c55e; border-radius: 8px; padding: 1rem; margin-top: 1.5rem; text-align: left; }
    .message-box p { color: #15803d; font-size: 0.95rem; margin: 0; }
    
    /* MAI-875: Addons card styles */
    .addons-card { background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%); border: 2px solid #c9a227; border-radius: 16px; padding: 1.5rem 2rem; margin-bottom: 1.5rem; text-align: left; }
    .addons-title { font-size: 1.1rem; font-weight: 600; color: #92400e; margin-bottom: 1rem; }
    .addons-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .addon-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; }
    .addon-icon { font-size: 1.25rem; }
    .addon-name { flex: 1; color: #92400e; font-weight: 500; }
    .addon-price { color: #c9a227; font-weight: 700; }
    
    .next-steps { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 1.5rem 2rem; margin-bottom: 1.5rem; text-align: left; }
    .next-steps-title { font-size: 1.1rem; font-weight: 600; color: #2c3e50; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem; }
    .next-steps-list { list-style: none; }
    .next-steps-list li { padding: 0.5rem 0; color: #555; display: flex; align-items: flex-start; gap: 0.75rem; }
    .next-steps-list li::before { content: '✓'; color: #22c55e; font-weight: bold; }
    
    .cta-button { display: inline-block; background: #c9a227; color: white; padding: 0.875rem 1.75rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 1rem; transition: background 0.2s; margin-top: 1rem; }
    .cta-button:hover { background: #b8922a; }
    .cta-button.secondary { background: #6b7280; }
    .cta-button.secondary:hover { background: #5a6268; }
    
    footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 2rem; }
    footer .logo { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
    footer p { color: rgba(255,255,255,0.6); font-size: 0.85rem; }
    
    /* Referral styles */
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
    .share-buttons { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; margin-top: 1rem; }
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
    
    /* MAI-1880: Review prompt styles */
    .review-prompt-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      padding: 2rem;
      margin-bottom: 1.5rem;
      text-align: left;
    }
    .review-prompt-title {
      font-size: 1.2rem;
      font-weight: 600;
      color: #2c3e50;
      margin-bottom: 0.5rem;
    }
    .review-prompt-subtitle {
      color: #666;
      font-size: 0.9rem;
      margin-bottom: 1.25rem;
    }
    .star-rating {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    .star-rating .star {
      font-size: 2rem;
      cursor: pointer;
      color: #d1d5db;
      transition: color 0.2s;
    }
    .star-rating .star:hover,
    .star-rating .star.active {
      color: #f59e0b;
    }
    .star-rating .star.filled {
      color: #f59e0b;
    }
    .review-comment-wrap {
      margin-bottom: 1rem;
    }
    .review-comment-label {
      display: block;
      font-size: 0.85rem;
      color: #555;
      margin-bottom: 0.5rem;
    }
    .review-comment {
      width: 100%;
      min-height: 100px;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      font-family: inherit;
      font-size: 0.95rem;
      resize: vertical;
      box-sizing: border-box;
    }
    .review-comment:focus {
      outline: none;
      border-color: #c9a227;
    }
    .char-count {
      font-size: 0.8rem;
      color: #888;
      text-align: right;
      margin-top: 0.25rem;
    }
    .char-count.warning {
      color: #dc2626;
    }
    .review-submit-btn {
      background: #c9a227;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: background 0.2s;
    }
    .review-submit-btn:hover:not(:disabled) {
      background: #b8922a;
    }
    .review-submit-btn:disabled {
      background: #d1d5db;
      cursor: not-allowed;
    }
    .review-success {
      text-align: center;
      padding: 2rem;
    }
    .review-success-icon {
      font-size: 3rem;
      margin-bottom: 0.75rem;
    }
    .review-success-text {
      font-size: 1.1rem;
      color: #15803d;
      font-weight: 600;
    }
    .review-error {
      background: #fee2e2;
      border: 1px solid #ef4444;
      border-radius: 8px;
      padding: 0.75rem 1rem;
      color: #dc2626;
      font-size: 0.9rem;
      margin-top: 0.75rem;
    }
    
    @media (max-width: 600px) {
      .detail-grid { grid-template-columns: 1fr; }
      .page-content { padding-top: 5rem; }
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
    <div class="success-icon">🎉</div>
    <h1 class="page-title">Booking Confirmed ✓</h1>
    <p class="page-subtitle">Thank you, ${dinerName}! Your payment was successful.</p>
    
    <!-- Checkout progress indicator -->
    <div class="checkout-steps">
      <div class="checkout-step completed">
        <span class="step-num">1</span>
        <span>Review</span>
      </div>
      <div class="step-connector"></div>
      <div class="checkout-step completed">
        <span class="step-num">2</span>
        <span>Payment</span>
      </div>
      <div class="step-connector"></div>
      <div class="checkout-step active">
        <span class="step-num">3</span>
        <span>Confirmed</span>
      </div>
    </div>
    
    <div class="confirmation-card">
      <h2 class="confirmation-title">Booking Details</h2>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Service</div>
          <div class="detail-value">${lead.serviceName || ''}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Chef</div>
          <div class="detail-value">${lead.chefName || ''}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Event Date</div>
          <div class="detail-value">${formatDate(lead.eventDate)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Guests</div>
          <div class="detail-value">${lead.guestCount || 0}</div>
        </div>
        ${quoteAmountDisplay ? `
        <div class="detail-item">
          <div class="detail-label">Base Service</div>
          <div class="detail-value">${quoteAmountDisplay}</div>
        </div>
        ` : ''}
        ${addonsTotalDisplay ? `
        <div class="detail-item">
          <div class="detail-label">Add-ons</div>
          <div class="detail-value" style="color: #c9a227;">${addonsTotalDisplay}</div>
        </div>
        ` : ''}
        <div class="detail-item">
          <div class="detail-label">Total Paid</div>
          <div class="detail-value large">${totalWithAddonsDisplay}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Confirmation ID</div>
          <div class="detail-value">#${lead.id}</div>
        </div>
      </div>
      <div class="message-box">
        <p>📧 A confirmation email has been sent to your email address. Chef ${lead.chefName || ''} will be in touch soon with event details.</p>
      </div>
    </div>
    
    ${addonsHtml}
    
    <div class="next-steps">
      <h3 class="next-steps-title">📋 What Happens Next</h3>
      <ul class="next-steps-list">
        <li>You'll receive an email confirmation with your booking details</li>
        <li>Chef ${lead.chefName || ''} will reach out to confirm event specifics</li>
        <li>Prepare for an unforgettable dining experience!</li>
      </ul>
    </div>
    
    ${referralCtaHtml}
    
    ${isConverted && lead.bookingId ? `
    <div class="review-prompt-card" id="review-prompt">
      <h3 class="review-prompt-title">⭐ How was your experience?</h3>
      <p class="review-prompt-subtitle">Share your feedback to help future diners discover great chefs.</p>
      
      <div id="review-form-container">
        <div class="star-rating" id="star-rating">
          <span class="star" data-value="1">★</span>
          <span class="star" data-value="2">★</span>
          <span class="star" data-value="3">★</span>
          <span class="star" data-value="4">★</span>
          <span class="star" data-value="5">★</span>
        </div>
        <input type="hidden" id="review-rating" name="rating" value="0">
        
        <div class="review-comment-wrap">
          <label class="review-comment-label" for="review-comment">Comment (optional)</label>
          <textarea id="review-comment" class="review-comment" maxlength="1000" placeholder="Tell us about your experience with Chef ${lead.chefName || 'your chef'}..."></textarea>
          <div class="char-count" id="char-count">0 / 1000</div>
        </div>
        
        <button type="button" class="review-submit-btn" id="review-submit" disabled>Submit Review</button>
        <div id="review-error" class="review-error" style="display: none;"></div>
      </div>
      
      <div id="review-success" class="review-success" style="display: none;">
        <div class="review-success-icon">🎉</div>
        <p class="review-success-text">Thanks for your review!</p>
      </div>
    </div>
    ` : ''}
    
    <div style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
      <a href="/diner/bookings" class="cta-button">View My Bookings</a>
      <a href="/services" class="cta-button secondary">Browse More Services</a>
    </div>
  </div>
  
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>Montreal's premier private chef marketplace.</p>
    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>
  </footer>
  
  <script>
    function copyReferralLink(btn, code) {
      const referralLink = window.location.origin + '/booking-status?ref=' + code;
      navigator.clipboard.writeText(referralLink).then(function() {
        const originalText = btn.innerHTML;
        btn.innerHTML = '<span class="share-icon">✓</span> Copied!';
        setTimeout(function() {
          btn.innerHTML = originalText;
        }, 2000);
        // MAI-1036: Track referral share after successful copy
        trackReferralShare('copy', code);
      }).catch(function() {
        alert('Failed to copy. Please copy the link manually.');
      });
    }

    function trackReferralShare(channel, code) {
      // MAI-1036: Track referral share analytics event
      var analyticsData = {
        event: 'referral_share',
        channel: channel,
        code: code,
        auth_status: 'guest',
        timestamp: new Date().toISOString()
      };
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/event', JSON.stringify(analyticsData));
      }
    }

    // MAI-1880: Review prompt interactivity
    (function() {
      var leadId = ${lead.id};
      var bookingId = ${lead.bookingId || 'null'};
      var accessToken = '${query.token}';
      var stars = document.querySelectorAll('.star-rating .star');
      var ratingInput = document.getElementById('review-rating');
      var commentInput = document.getElementById('review-comment');
      var charCount = document.getElementById('char-count');
      var submitBtn = document.getElementById('review-submit');
      var errorDiv = document.getElementById('review-error');
      var formContainer = document.getElementById('review-form-container');
      var successDiv = document.getElementById('review-success');
      var rating = 0;

      if (!stars.length || !submitBtn) return;

      function updateStars(value) {
        stars.forEach(function(star) {
          star.classList.toggle('filled', parseInt(star.dataset.value) <= value);
          star.classList.toggle('active', parseInt(star.dataset.value) === value);
        });
        rating = value;
        ratingInput.value = value;
        submitBtn.disabled = value === 0;
      }

      stars.forEach(function(star) {
        star.addEventListener('click', function() {
          updateStars(parseInt(star.dataset.value));
        });
        star.addEventListener('mouseover', function() {
          var val = parseInt(star.dataset.value);
          stars.forEach(function(s) {
            s.classList.toggle('hovered', parseInt(s.dataset.value) <= val);
          });
        });
        star.addEventListener('mouseout', function() {
          stars.forEach(function(s) { s.classList.remove('hovered'); });
        });
      });

      if (commentInput && charCount) {
        commentInput.addEventListener('input', function() {
          var len = commentInput.value.length;
          charCount.textContent = len + ' / 1000';
          charCount.classList.toggle('warning', len > 900);
        });
      }

      if (submitBtn) {
        submitBtn.addEventListener('click', function() {
          if (rating === 0) return;
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting...';
          errorDiv.style.display = 'none';

          var body = {
            bookingId: bookingId,
            rating: rating,
            comment: commentInput && commentInput.value.trim() ? commentInput.value.trim() : undefined
          };

          fetch('/api/reviews/lead/' + leadId + '?token=' + accessToken, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          .then(function(resp) {
            if (resp.status === 201) {
              formContainer.style.display = 'none';
              successDiv.style.display = 'block';
            } else if (resp.status === 409) {
              errorDiv.textContent = 'You have already submitted a review for this booking.';
              errorDiv.style.display = 'block';
              submitBtn.disabled = false;
              submitBtn.textContent = 'Submit Review';
            } else if (resp.status === 403) {
              errorDiv.textContent = 'Invalid access. Please refresh the page and try again.';
              errorDiv.style.display = 'block';
              submitBtn.disabled = false;
              submitBtn.textContent = 'Submit Review';
            } else if (resp.status === 404) {
              errorDiv.textContent = 'Booking not found.';
              errorDiv.style.display = 'block';
              submitBtn.disabled = false;
              submitBtn.textContent = 'Submit Review';
            } else {
              errorDiv.textContent = 'Something went wrong. Please try again.';
              errorDiv.style.display = 'block';
              submitBtn.disabled = false;
              submitBtn.textContent = 'Submit Review';
            }
          })
          .catch(function() {
            errorDiv.textContent = 'Network error. Please check your connection and try again.';
            errorDiv.style.display = 'block';
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Review';
          });
        });
      }
    })();
  </script>
</body>
</html>`;
  });

  // GET /checkout/failure - Payment failed page
  server.get('/checkout/failure', async (request, reply) => {
    const query = request.query as { reason?: string; lead?: string; token?: string };

    if (!query.lead || !query.token) {
      return buildErrorPage('Missing parameters', 'Please return to your booking status.');
    }

    const leadId = parseInt(query.lead);
    const verified = verifyLeadAccess(leadId, query.token);
    if (!verified) {
      return buildErrorPage('Access denied', 'Invalid or expired access token.');
    }

    const lead = db.select({
      id: leads.id,
      serviceName: services.name,
      chefName: users.name,
      eventDate: leads.eventDate,
      guestCount: leads.guestCount,
      quoteAmount: leads.quoteAmount,
      clientName: leads.clientName,
    })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .innerJoin(users, eq(leads.chefId, users.id))
      .where(eq(leads.id, leadId))
      .get();

    if (!lead) {
      return buildErrorPage('Booking not found', 'No booking was found with this ID.');
    }

    const quoteAmountDisplay = lead.quoteAmount != null ? `$${Number(lead.quoteAmount).toFixed(2)}` : null;
    const dinerName = lead.clientName || 'there';
    const errorMessage = query.reason ? decodeURIComponent(query.reason) : null;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Failed | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.2rem; margin: 0; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; font-size: 0.9rem; }
    
    .page-content { max-width: 700px; margin: 0 auto; padding: 6rem 1.5rem 3rem; text-align: center; }
    
    .failure-icon { font-size: 5rem; margin-bottom: 1rem; }
    .page-title { font-size: 2rem; color: #dc2626; margin-bottom: 0.5rem; }
    .page-subtitle { font-size: 1.1rem; color: #666; margin-bottom: 2rem; }
    
    .error-card { background: #fee2e2; border: 1px solid #ef4444; border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; text-align: left; }
    .error-card p { color: #dc2626; font-size: 0.95rem; margin: 0; }
    
    .booking-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 2rem; margin-bottom: 1.5rem; text-align: left; }
    .booking-title { font-size: 1.2rem; font-weight: 600; color: #2c3e50; margin-bottom: 1rem; }
    .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; }
    .detail-label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .detail-value { font-size: 1rem; color: #2c3e50; font-weight: 500; }
    
    .info-box { background: #f0fdf4; border: 1px solid #22c55e; border-radius: 8px; padding: 1rem; margin-top: 1.5rem; text-align: left; }
    .info-box p { color: #15803d; font-size: 0.95rem; margin: 0; }
    
    .checkout-steps { display: flex; align-items: center; justify-content: center; gap: 0; margin-bottom: 2rem; }
    .checkout-step { display: flex; align-items: center; gap: 0.5rem; color: #9ca3af; font-size: 0.9rem; font-weight: 500; }
    .checkout-step.active { color: #c9a227; }
    .checkout-step.completed { color: #22c55e; }
    .step-num { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; background: #e5e7eb; color: #9ca3af; }
    .checkout-step.active .step-num { background: #c9a227; color: white; }
    .checkout-step.completed .step-num { background: #22c55e; color: white; }
    .step-connector { width: 60px; height: 2px; background: #e5e7eb; margin: 0 0.5rem; }
    .checkout-step.completed + .step-connector { background: #22c55e; }
    
    .cta-buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem; }
    .cta-button { display: inline-block; background: #c9a227; color: white; padding: 0.875rem 1.75rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 1rem; transition: background 0.2s; }
    .cta-button:hover { background: #b8922a; }
    .cta-button.secondary { background: #6b7280; }
    .cta-button.secondary:hover { background: #5a6268; }
    
    footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 2rem; }
    footer .logo { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
    footer p { color: rgba(255,255,255,0.6); font-size: 0.85rem; }
    
    @media (max-width: 600px) {
      .detail-grid { grid-template-columns: 1fr; }
      .page-content { padding-top: 5rem; }
      .cta-buttons { flex-direction: column; }
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
    <div class="failure-icon">❌</div>
    <h1 class="page-title">Payment Unsuccessful</h1>
    <p class="page-subtitle">We're sorry, ${dinerName}. Something went wrong with your payment.</p>
    
    ${errorMessage ? `
    <div class="error-card">
      <p><strong>Error:</strong> ${errorMessage}</p>
    </div>
    ` : ''}
    
    <div class="booking-card">
      <h2 class="booking-title">Booking Details</h2>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Service</div>
          <div class="detail-value">${lead.serviceName || ''}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Chef</div>
          <div class="detail-value">${lead.chefName || ''}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Event Date</div>
          <div class="detail-value">${formatDate(lead.eventDate)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Guests</div>
          <div class="detail-value">${lead.guestCount || 0}</div>
        </div>
        ${quoteAmountDisplay ? `
        <div class="detail-item">
          <div class="detail-label">Quote Amount</div>
          <div class="detail-value">${quoteAmountDisplay}</div>
        </div>
        ` : ''}
      </div>
      <div class="info-box">
        <p>💳 Your booking details are still saved — you can try again below.</p>
      </div>
    </div>
    
    <div class="cta-buttons">
      <a href="/checkout/${lead.id}?token=${query.token}" class="cta-button">Try Again</a>
      <a href="/services" class="cta-button secondary">Browse Services</a>
    </div>
    
    <p style="margin-top: 1.5rem; color: #888; font-size: 0.9rem;">
      Need help? <a href="mailto:support@maisondeschefs.com" style="color: #c9a227; text-decoration: none;">Contact Support</a>
    </p>
  </div>
  
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>Montreal's premier private chef marketplace.</p>
    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>
  </footer>
</body>
</html>`;
  });

  // GET /checkout/cancel - Payment cancelled page
  server.get('/checkout/cancel', async (request, reply) => {
    const query = request.query as { lead?: string; token?: string };

    if (!query.lead || !query.token) {
      return buildErrorPage('Missing parameters', 'Please return to your booking status.');
    }

    const leadId = parseInt(query.lead);
    const verified = verifyLeadAccess(leadId, query.token);
    if (!verified) {
      return buildErrorPage('Access denied', 'Invalid or expired access token.');
    }

    const lead = db.select({
      id: leads.id,
      serviceName: services.name,
      chefName: users.name,
      eventDate: leads.eventDate,
      guestCount: leads.guestCount,
      quoteAmount: leads.quoteAmount,
      clientName: leads.clientName,
    })
      .from(leads)
      .innerJoin(services, eq(leads.serviceId, services.id))
      .innerJoin(users, eq(leads.chefId, users.id))
      .where(eq(leads.id, leadId))
      .get();

    if (!lead) {
      return buildErrorPage('Booking not found', 'No booking was found with this ID.');
    }

    const quoteAmountDisplay = lead.quoteAmount != null ? `$${Number(lead.quoteAmount).toFixed(2)}` : null;
    const dinerName = lead.clientName || 'there';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Cancelled | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.2rem; margin: 0; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; font-size: 0.9rem; }
    
    .page-content { max-width: 700px; margin: 0 auto; padding: 6rem 1.5rem 3rem; text-align: center; }
    
    .cancel-icon { font-size: 5rem; margin-bottom: 1rem; }
    .page-title { font-size: 2rem; color: #b45309; margin-bottom: 0.5rem; }
    .page-subtitle { font-size: 1.1rem; color: #666; margin-bottom: 2rem; }
    
    .info-card { background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); padding: 2rem; margin-bottom: 1.5rem; text-align: left; }
    .info-card p { color: #555; font-size: 0.95rem; margin-bottom: 1rem; }
    .info-card p:last-child { margin-bottom: 0; }
    
    .detail-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.25rem; margin-bottom: 1.5rem; }
    .detail-label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem; }
    .detail-value { font-size: 1rem; color: #2c3e50; font-weight: 500; }
    
    .warning-box { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 1rem; margin-top: 1.5rem; text-align: left; }
    .warning-box p { color: #92400e; font-size: 0.95rem; margin: 0; }
    
    .cta-buttons { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-top: 1.5rem; }
    .cta-button { display: inline-block; background: #c9a227; color: white; padding: 0.875rem 1.75rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 1rem; transition: background 0.2s; }
    .cta-button:hover { background: #b8922a; }
    .cta-button.secondary { background: #6b7280; }
    .cta-button.secondary:hover { background: #4b5563; }
    
    footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 2rem; }
    footer .logo { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
    footer p { color: rgba(255,255,255,0.6); font-size: 0.85rem; }
    
    @media (max-width: 600px) {
      .detail-grid { grid-template-columns: 1fr; }
      .page-content { padding-top: 5rem; }
      .cta-buttons { flex-direction: column; }
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
    <div class="cancel-icon">⏳</div>
    <h1 class="page-title">Payment Cancelled</h1>
    <p class="page-subtitle">No worries, ${dinerName}! Your payment was cancelled.</p>
    
    <div class="info-card">
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Service</div>
          <div class="detail-value">${lead.serviceName || ''}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Chef</div>
          <div class="detail-value">${lead.chefName || ''}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Event Date</div>
          <div class="detail-value">${formatDate(lead.eventDate)}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Guests</div>
          <div class="detail-value">${lead.guestCount || 0}</div>
        </div>
        ${quoteAmountDisplay ? `
        <div class="detail-item">
          <div class="detail-label">Quote Amount</div>
          <div class="detail-value">${quoteAmountDisplay}</div>
        </div>
        ` : ''}
      </div>
      <p>Your booking is still active and awaiting payment. You can return to your booking status to complete the payment at any time before the chef's availability changes.</p>
      
      <div class="warning-box">
        <p>⚠️ <strong>Don't lose your spot!</strong> Chef availability may change. Complete your payment soon to secure your booking.</p>
      </div>
    </div>
    
    <div class="cta-buttons">
      <a href="/booking-status?token=${query.token}" class="cta-button">Return to Booking Status</a>
      <a href="/services" class="cta-button secondary">Browse More Services</a>
    </div>
  </div>
  
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>Montreal's premier private chef marketplace.</p>
    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>
  </footer>
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