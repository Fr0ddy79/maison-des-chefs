import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { leads, services, users, chefProfiles } from '../db/schema.js';
import { eq } from 'drizzle-orm';
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
    
    .help-text { text-align: center; margin-top: 1.5rem; color: #888; font-size: 0.85rem; }
    .help-text a { color: #c9a227; text-decoration: none; }
    .help-text a:hover { text-decoration: underline; }
    
    .info-box { background: #e8f4f8; border-radius: 8px; padding: 1rem; margin-top: 1rem; }
    .info-box p { color: #0c5460; font-size: 0.9rem; margin: 0; }
    
    footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 2rem; }
    footer .logo { font-size: 1.2rem; font-weight: bold; margin-bottom: 0.5rem; }
    footer p { color: rgba(255,255,255,0.6); font-size: 0.85rem; }
    
    #error-message { display: none; background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; color: #dc2626; font-size: 0.9rem; }
    #error-message.show { display: block; }
    
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
        
        <button id="pay-button" class="pay-button" onclick="startCheckout()">
          Pay Now
        </button>
        
        <div class="secure-badge">
          <span>🔒</span>
          <span>Secure payment powered by Stripe</span>
        </div>
        
        <div class="info-box">
          <p>💳 Complete your payment to confirm your booking before chef availability changes.</p>
        </div>
        
        <p class="help-text">
          Need help? <a href="mailto:support@maisondeschefs.com">Contact Support</a>
        </p>
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
    
    // Initialize UI
    document.addEventListener('DOMContentLoaded', function() {
      renderAddonCards();
      updatePaymentSummary();
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
      if (index === -1) {
        selectedAddonIds.push(addonId);
      } else {
        selectedAddonIds.splice(index, 1);
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
      
      try {
        const response = await fetch('/api/checkout/' + leadId + '/create-session?token=' + token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to create checkout session');
        }
        
        if (data.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
        } else {
          throw new Error('No checkout URL received');
        }
      } catch (error) {
        showError(error.message || 'An error occurred. Please try again.');
      }
    }
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