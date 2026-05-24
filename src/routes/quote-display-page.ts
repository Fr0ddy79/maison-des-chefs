// Quote Display Page - Public token-authenticated quote view for diners
// MAI-2000: FE Quote Display Page

import { createHash, timingSafeEqual } from 'crypto';
import { db } from '../db/index.js';
import { leads, services, users, chefProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Format price as USD.
 */
function formatPrice(amount: number | null): string {
  if (amount == null) return 'TBD';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

/**
 * Format a date for display.
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
 * Hash token with SHA-256 (must match chef-leads.ts and quotes.ts).
 */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Build the quote display page.
 * States: quote_received | accepted | expired | invalid_token | not_found
 */
export default async function buildQuoteDisplayPage(
  leadId: number,
  token: string
): Promise<string> {
  // Fetch lead with service and chef info
  const lead = db
    .select({
      id: leads.id,
      status: leads.status,
      quoteAmount: leads.quoteAmount,
      quoteMessage: leads.quoteMessage,
      quoteSentAt: leads.quoteSentAt,
      quoteTokenHash: leads.quoteTokenHash,
      eventDate: leads.eventDate,
      guestCount: leads.guestCount,
      clientName: leads.clientName,
      email: leads.email,
      chefId: leads.chefId,
      serviceId: leads.serviceId,
      serviceName: services.name,
      serviceDescription: services.description,
    })
    .from(leads)
    .innerJoin(services, eq(leads.serviceId, services.id))
    .where(eq(leads.id, leadId))
    .get();

  if (!lead) return buildStatePage('not_found');

  // Validate token using constant-time comparison
  if (!lead.quoteTokenHash) return buildStatePage('invalid_token');
  const tokenHash = hashToken(token);
  if (!secureCompare(tokenHash, lead.quoteTokenHash)) return buildStatePage('invalid_token');

  // Determine state
  const isAcceptedStatus = lead.status === 'accepted' || lead.status === 'converted';
  const isQuotedStatus = lead.status === 'quoted' || lead.status === 'responded';

  let state: 'quote_received' | 'accepted' | 'expired';
  if (isAcceptedStatus) {
    state = 'accepted';
  } else if (isQuotedStatus) {
    // Check 48h expiry from quoteSentAt
    if (lead.quoteSentAt) {
      const elapsedMs = Date.now() - new Date(lead.quoteSentAt).getTime();
      state = elapsedMs > 48 * 60 * 60 * 1000 ? 'expired' : 'quote_received';
    } else {
      state = 'quote_received';
    }
  } else {
    return buildStatePage('not_found');
  }

  // Get chef info
  const chefResult = db
    .select({ name: users.name, photoUrl: chefProfiles.photoUrl })
    .from(users)
    .leftJoin(chefProfiles, eq(users.id, chefProfiles.userId))
    .where(eq(users.id, lead.chefId))
    .get();

  const chefName = chefResult?.name || 'Your Chef';
  const chefPhotoUrl = chefResult?.photoUrl || null;
  const dinerName = (lead.clientName || '').trim().split(/\s+/)[0] || 'there';

  // Calculate expiry timestamp for countdown
  let expiresAtIso: string | null = null;
  if (lead.quoteSentAt && state === 'quote_received') {
    const expiry = new Date(new Date(lead.quoteSentAt).getTime() + 48 * 60 * 60 * 1000);
    expiresAtIso = expiry.toISOString();
  }

  return buildQuotePage({
    leadId: lead.id,
    state,
    chefName,
    chefPhotoUrl,
    serviceName: lead.serviceName || 'Service',
    serviceDescription: lead.serviceDescription || '',
    quoteAmount: lead.quoteAmount,
    quoteMessage: lead.quoteMessage,
    eventDate: lead.eventDate,
    guestCount: lead.guestCount,
    dinerName,
    email: lead.email,
    token,
    expiresAtIso,
  });
}

interface QuotePageData {
  leadId: number;
  state: 'quote_received' | 'accepted' | 'expired';
  chefName: string;
  chefPhotoUrl: string | null;
  serviceName: string;
  serviceDescription: string;
  quoteAmount: number | null;
  quoteMessage: string | null;
  eventDate: string | null;
  guestCount: number | null;
  dinerName: string;
  email: string;
  token: string;
  expiresAtIso: string | null;
}

function buildQuotePage(data: QuotePageData): string {
  const { leadId, state, chefName, chefPhotoUrl, serviceName, serviceDescription,
    quoteAmount, quoteMessage, eventDate, guestCount, dinerName, email, token, expiresAtIso } = data;

  let mainContent = '';
  if (state === 'quote_received') {
    mainContent = `
      <div class="quote-card">
        ${chefPhotoUrl ? `<img src="${chefPhotoUrl}" alt="${escapeHtml(chefName)}" class="chef-photo">` : '<div class="chef-avatar">👨‍🍳</div>'}
        <div class="chef-name">${escapeHtml(chefName)}</div>
        <div class="service-name">${escapeHtml(serviceName)}</div>
        ${quoteAmount != null ? `<div class="quote-amount">${formatPrice(quoteAmount)}</div><div class="quote-label">total price</div>` : '<div class="quote-amount">Custom Quote</div>'}
        ${quoteMessage ? `<div class="quote-message">${escapeHtml(quoteMessage)}</div>` : ''}
        <div class="event-details">
          ${eventDate ? `<div class="event-detail"><span class="detail-icon">📅</span><span>${formatDate(eventDate)}</span></div>` : ''}
          ${guestCount ? `<div class="event-detail"><span class="detail-icon">👥</span><span>${guestCount} guests</span></div>` : ''}
        </div>
        <div class="countdown-container">
          <div class="countdown-label">This offer expires in</div>
          <div class="countdown-timer" id="countdownTimer" data-expires-at="${expiresAtIso || ''}">--:--:--</div>
        </div>
        <button class="accept-btn" id="acceptBtn" onclick="acceptQuote()">Accept &amp; Continue to Payment</button>
        <div class="accept-note">No payment today — your card will be charged after the event</div>
      </div>`;
  } else if (state === 'accepted') {
    mainContent = `
      <div class="accepted-card">
        <div class="accepted-icon">✓</div>
        <div class="accepted-title">Quote Accepted!</div>
        <div class="accepted-message">Hi <strong>${escapeHtml(dinerName)}</strong>, your quote from <strong>${escapeHtml(chefName)}</strong> has been accepted. You'll receive a confirmation email at <strong>${escapeHtml(email)}</strong> shortly.</div>
        <div class="booking-summary">
          <div class="summary-row"><span>Service</span><span>${escapeHtml(serviceName)}</span></div>
          <div class="summary-row"><span>Total</span><span>${formatPrice(quoteAmount)}</span></div>
          ${eventDate ? `<div class="summary-row"><span>Date</span><span>${formatDate(eventDate)}</span></div>` : ''}
          ${guestCount ? `<div class="summary-row"><span>Guests</span><span>${guestCount}</span></div>` : ''}
        </div>
      </div>`;
  } else if (state === 'expired') {
    mainContent = `
      <div class="expired-card">
        <div class="expired-icon">⏰</div>
        <div class="expired-title">Quote Expired</div>
        <div class="expired-message">Hi <strong>${escapeHtml(dinerName)}</strong>, this quote from <strong>${escapeHtml(chefName)}</strong> has expired. No payment was made.</div>
        <a href="/services" class="browse-btn">Browse Other Chefs</a>
      </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Quote | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); min-height: 100vh; color: #333; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.85); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
    .quote-page { max-width: 560px; margin: 0 auto; padding: 6rem 1.5rem 3rem; }
    .page-title { color: white; font-size: 1.5rem; font-weight: 600; text-align: center; margin-bottom: 0.5rem; }
    .page-subtitle { color: rgba(255,255,255,0.7); font-size: 0.95rem; text-align: center; margin-bottom: 2rem; }
    .quote-card, .accepted-card, .expired-card { background: white; border-radius: 16px; padding: 2.5rem 2rem; text-align: center; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
    .chef-photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto 1rem; border: 3px solid #c9a227; display: block; }
    .chef-avatar { width: 80px; height: 80px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 2.5rem; }
    .chef-name { font-size: 1.1rem; font-weight: 600; color: #2c3e50; }
    .service-name { font-size: 0.9rem; color: #666; margin-top: 0.25rem; margin-bottom: 1.5rem; }
    .quote-amount { font-size: 2.75rem; font-weight: 700; color: #c9a227; margin-bottom: 0.25rem; }
    .quote-label { font-size: 0.8rem; color: #888; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 1rem; }
    .quote-message { background: #f8f9fa; border-radius: 8px; padding: 1rem; font-size: 0.95rem; color: #555; margin-bottom: 1.5rem; line-height: 1.5; }
    .event-details { display: flex; justify-content: center; gap: 1.5rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .event-detail { display: flex; align-items: center; gap: 0.4rem; font-size: 0.9rem; color: #666; }
    .detail-icon { font-size: 1rem; }
    .countdown-container { background: #fff3cd; border: 1px solid #ffe082; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; }
    .countdown-label { font-size: 0.8rem; color: #856404; margin-bottom: 0.25rem; }
    .countdown-timer { font-size: 1.5rem; font-weight: 700; color: #856404; font-variant-numeric: tabular-nums; }
    .accept-btn { width: 100%; background: #c9a227; color: white; border: none; padding: 1rem; border-radius: 8px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-bottom: 0.75rem; }
    .accept-btn:hover { background: #b8922a; }
    .accept-btn:disabled { background: #ccc; cursor: not-allowed; }
    .accept-note { font-size: 0.85rem; color: #888; }
    .accepted-icon { width: 64px; height: 64px; background: #dcfce7; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 2rem; color: #15803d; margin: 0 auto 1rem; }
    .accepted-title { font-size: 1.5rem; font-weight: 700; color: #15803d; margin-bottom: 1rem; }
    .accepted-message { font-size: 0.95rem; color: #555; line-height: 1.5; margin-bottom: 1.5rem; }
    .booking-summary { background: #f8f9fa; border-radius: 8px; padding: 1rem; text-align: left; }
    .summary-row { display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee; }
    .summary-row:last-child { border-bottom: none; }
    .summary-row span:first-child { color: #888; font-size: 0.9rem; }
    .summary-row span:last-child { font-weight: 600; color: #2c3e50; }
    .expired-icon { font-size: 3rem; margin-bottom: 1rem; }
    .expired-title { font-size: 1.5rem; font-weight: 700; color: #6b7280; margin-bottom: 1rem; }
    .expired-message { font-size: 0.95rem; color: #666; line-height: 1.5; margin-bottom: 1.5rem; }
    .browse-btn { display: inline-block; background: #c9a227; color: white; padding: 0.875rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600; transition: background 0.2s; }
    .browse-btn:hover { background: #b8922a; }
    footer { text-align: center; padding: 2rem; color: rgba(255,255,255,0.5); font-size: 0.85rem; }
    @media (max-width: 480px) {
      .quote-card, .accepted-card, .expired-card { padding: 1.5rem 1rem; }
      .quote-amount { font-size: 2.25rem; }
      .event-details { flex-direction: column; gap: 0.5rem; }
    }
  </style>
</head>
<body>
  <nav><a href="/" class="logo">Maison des Chefs</a></nav>
  <div class="quote-page">
    <h1 class="page-title">Your Personalized Quote</h1>
    <p class="page-subtitle">Exclusive offer for you from ${escapeHtml(chefName)}</p>
    ${mainContent}
  </div>
  <footer><p>&copy; 2024 Maison des Chefs. All rights reserved.</p></footer>
  <script>
    (function() {
      const timerEl = document.getElementById('countdownTimer');
      const expiresAt = timerEl ? timerEl.getAttribute('data-expires-at') : null;
      if (timerEl && expiresAt) {
        function updateCountdown() {
          const diff = new Date(expiresAt).getTime() - Date.now();
          if (diff <= 0) { timerEl.textContent = 'EXPIRED'; timerEl.style.color = '#dc2626'; location.reload(); return; }
          const s = Math.floor(diff / 1000);
          timerEl.textContent = String(Math.floor(s / 3600)).padStart(2,'0') + ':' + String(Math.floor((s % 3600) / 60)).padStart(2,'0') + ':' + String(s % 60).padStart(2,'0');
        }
        updateCountdown();
        setInterval(updateCountdown, 1000);
      }
    })();

    async function acceptQuote() {
      const btn = document.getElementById('acceptBtn');
      if (!btn) return;
      btn.disabled = true; btn.textContent = 'Processing...';
      try {
        const res = await fetch('/api/quotes/${leadId}/accept', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: '${escapeHtml(token)}' }),
        });
        const data = await res.json();
        if (data.success) { location.reload(); }
        else { alert(data.error || 'Failed to accept quote.'); btn.disabled = false; btn.textContent = 'Accept & Continue to Payment'; }
      } catch { alert('Network error. Please try again.'); btn.disabled = false; btn.textContent = 'Accept & Continue to Payment'; }
    }
  </script>
</body>
</html>`;
}

function buildStatePage(state: 'invalid_token' | 'not_found'): string {
  const isNotFound = state === 'not_found';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isNotFound ? 'Quote Not Found' : 'Invalid Link'} | Maison des Chefs</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f8f9fa; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .error-container { text-align: center; padding: 2rem; }
    .error-icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { font-size: 2rem; color: #2c3e50; margin-bottom: 0.5rem; }
    p { color: #666; margin-bottom: 1.5rem; }
    a { background: #c9a227; color: white; padding: 0.875rem 2rem; text-decoration: none; border-radius: 6px; font-weight: 600; }
    a:hover { background: #b8922a; }
  </style>
</head>
<body>
  <div class="error-container">
    <div class="error-icon">${isNotFound ? '🔍' : '🚫'}</div>
    <h1>${isNotFound ? 'Quote Not Found' : 'Invalid Quote Link'}</h1>
    <p>${isNotFound ? "This quote doesn't exist or has been removed." : 'This link appears to be invalid or expired. Please check your email for the correct link.'}</p>
    <a href="/">Return Home</a>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
}