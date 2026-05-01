// Chef Discovery Page - Browse/search chefs (MAI-849)

import { db } from '../db/index.js';
import { users, chefProfiles, services, leads } from '../db/schema.js';
import { eq, sql, isNotNull, and, desc } from 'drizzle-orm';

export default function buildChefDiscoveryPage(): string {
  // Fetch all available chefs with services
  const chefs = db.select({
    id: users.id,
    name: users.name,
    bio: chefProfiles.bio,
    cuisineTypes: chefProfiles.cuisineTypes,
    location: chefProfiles.location,
    pricePerPerson: chefProfiles.pricePerPerson,
    available: chefProfiles.available,
    verified: chefProfiles.verified,
  })
    .from(chefProfiles)
    .innerJoin(users, eq(chefProfiles.userId, users.id))
    .where(eq(chefProfiles.available, true))
    .all();

  // Fetch services for each chef (published only)
  const chefServices: Record<number, any[]> = {};
  const allServiceIds: number[] = [];
  for (const chef of chefs) {
    const svcs = db.select({
      id: services.id,
      name: services.name,
      pricePerPerson: services.pricePerPerson,
      dietaryTags: services.dietaryTags,
    })
      .from(services)
      .where(and(eq(services.chefId, chef.id), eq(services.status, 'published')))
      .all();
    chefServices[chef.id] = svcs;
    for (const s of svcs) allServiceIds.push(s.id);
  }

  // Compute avg response time per chef
  const avgResponseTimes: Record<number, number | null> = {};
  for (const chef of chefs) {
    const result = db.select({
      avgMs: sql `coalesce(avg(${leads.firstChefActionAt} - ${leads.createdAt}), NULL)`
    })
      .from(leads)
      .where(and(eq(leads.chefId, chef.id), isNotNull(leads.firstChefActionAt)))
      .get();
    avgResponseTimes[chef.id] = (result?.avgMs as number | null) ?? null;
  }

  const chefsJson = JSON.stringify(chefs.map(c => ({
    ...c,
    cuisineTypes: JSON.parse(c.cuisineTypes as string || '[]'),
    services: chefServices[c.id]?.map(s => ({
      ...s,
      dietaryTags: JSON.parse(s.dietaryTags || '[]'),
      cuisines: [],
    })) ?? [],
    avgResponseMs: avgResponseTimes[c.id],
  })));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Browse Chefs | Maison des Chefs</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
  nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
  nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
  nav .nav-links { display: flex; gap: 1.5rem; }
  nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
  nav .nav-links a:hover { opacity: 0.8; }

  .page-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); padding: 6rem 2rem 2.5rem; color: white; text-align: center; }
  .page-header h1 { font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 0.5rem; }
  .page-header p { opacity: 0.9; font-size: 1.1rem; max-width: 600px; margin: 0 auto; }

  .discover-layout { max-width: 1300px; margin: 2rem auto; padding: 0 1.5rem; display: grid; grid-template-columns: 280px 1fr; gap: 2rem; }

  .filter-sidebar { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); height: fit-content; position: sticky; top: 90px; }
  .filter-sidebar h3 { font-size: 1rem; color: #2c3e50; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 2px solid #c9a227; }
  .filter-group { margin-bottom: 1.5rem; }
  .filter-group label { font-weight: 600; color: #555; font-size: 0.9rem; display: block; margin-bottom: 0.5rem; }
  .filter-group .filter-options { display: flex; flex-direction: column; gap: 0.5rem; }
  .filter-option { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-size: 0.9rem; color: #444; }
  .filter-option input[type="checkbox"] { width: 16px; height: 16px; accent-color: #c9a227; cursor: pointer; }
  .filter-option:hover { color: #2c3e50; }

  .price-range { display: flex; align-items: center; gap: 0.5rem; }
  .price-range input { width: 80px; padding: 0.4rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.85rem; }
  .price-range span { color: #888; }

  .results-area { min-width: 0; }
  .results-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem; }
  .results-count { font-size: 1.1rem; color: #555; }
  .results-count strong { color: #2c3e50; }
  .sort-select { padding: 0.5rem 1rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; background: white; cursor: pointer; }

  .chef-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
  .chef-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s; cursor: pointer; position: relative; }
  .chef-card.selected { box-shadow: 0 0 0 3px #c9a227, 0 8px 24px rgba(0,0,0,0.15); }
  .chef-card.disabled { opacity: 0.6; pointer-events: none; }
  .chef-card-img { width: 100%; height: 200px; object-fit: cover; }
  .chef-card-checkbox { position: absolute; top: 12px; left: 12px; width: 24px; height: 24px; background: white; border: 2px solid #ddd; border-radius: 50%; display: none; align-items: center; justify-content: center; cursor: pointer; z-index: 10; }
  .chef-card.selected .chef-card-checkbox { background: #c9a227; border-color: #c9a227; display: flex; }
  .chef-card.selected .chef-card-checkbox::after { content: '✓'; color: white; font-size: 14px; font-weight: bold; }
  .chef-card-body { padding: 1.25rem; }
  .chef-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; }
  .chef-name { font-size: 1.2rem; font-weight: 700; color: #2c3e50; }
  .verified-badge { background: #e3f2fd; color: #1565c0; padding: 0.15rem 0.5rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
  .chef-location { color: #888; font-size: 0.9rem; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.25rem; }
  .cuisine-badges { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
  .cuisine-badge { background: #fff3e0; color: #e65100; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.78rem; font-weight: 500; }
  .chef-price { font-size: 1.1rem; font-weight: 700; color: #2c3e50; margin-bottom: 0.5rem; }
  .chef-price span { font-size: 0.85rem; font-weight: 400; color: #888; }
  .chef-stats { display: flex; gap: 1rem; padding-top: 0.75rem; border-top: 1px solid #f0f0f0; }
  .chef-stat { font-size: 0.82rem; color: #666; display: flex; align-items: center; gap: 0.25rem; }

  .loading-state, .error-state, .empty-state { text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .loading-state .spinner { width: 48px; height: 48px; border: 4px solid #f3f3f3; border-top: 4px solid #c9a227; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .error-state h2 { color: #c0392b; margin-bottom: 0.5rem; }
  .empty-state h2 { color: #2c3e50; margin-bottom: 0.5rem; }
  .empty-state p { color: #666; }

  footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 4rem; }
  footer .logo { font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem; }
  footer p { opacity: 0.7; font-size: 0.85rem; }

  .inquiry-floating-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #2c3e50; color: white; padding: 1rem 2rem; display: none; align-items: center; justify-content: space-between; z-index: 200; box-shadow: 0 -4px 16px rgba(0,0,0,0.2); }
  .inquiry-floating-bar.visible { display: flex; }
  .inquiry-bar-info { display: flex; align-items: center; gap: 0.75rem; font-size: 1rem; }
  .inquiry-bar-count { background: #c9a227; color: white; padding: 0.2rem 0.7rem; border-radius: 20px; font-weight: 700; font-size: 0.9rem; }
  .inquiry-bar-btn { background: #c9a227; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
  .inquiry-bar-btn:hover { background: #b8922a; }
  .inquiry-bar-btn:disabled { background: #888; cursor: not-allowed; }

  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.6); display: none; align-items: center; justify-content: center; z-index: 300; }
  .modal-overlay.visible { display: flex; }
  .modal { background: white; border-radius: 12px; max-width: 560px; width: 90%; max-height: 90vh; overflow-y: auto; }
  .modal-header { padding: 1.5rem 2rem; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; }
  .modal-header h2 { font-size: 1.3rem; color: #2c3e50; margin: 0; }
  .modal-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #888; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 4px; }
  .modal-close:hover { background: #f0f0f0; color: #333; }
  .modal-body { padding: 2rem; }
  .modal-chefs-list { background: #f8f9fa; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; max-height: 160px; overflow-y: auto; }
  .modal-chef-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0; font-size: 0.95rem; color: #333; }
  .modal-chef-item:not(:last-child) { border-bottom: 1px solid #eee; }
  .modal-chef-item .chef-avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
  .modal-form-group { margin-bottom: 1.25rem; }
  .modal-form-group label { display: block; font-weight: 500; color: #555; margin-bottom: 0.4rem; font-size: 0.95rem; }
  .modal-form-group label .required { color: #e53935; }
  .modal-form-group input, .modal-form-group textarea { width: 100%; padding: 0.75rem 1rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; font-family: inherit; transition: border-color 0.2s; box-sizing: border-box; }
  .modal-form-group input:focus, .modal-form-group textarea:focus { outline: none; border-color: #c9a227; }
  .modal-form-group textarea { min-height: 80px; resize: vertical; }
  .modal-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
  .modal-submit-btn { width: 100%; background: #c9a227; color: white; border: none; padding: 1rem; border-radius: 6px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-top: 0.5rem; }
  .modal-submit-btn:hover { background: #b8922a; }
  .modal-submit-btn:disabled { background: #ccc; cursor: not-allowed; }
  .modal-success { text-align: center; padding: 2rem; }
  .modal-success .success-icon { font-size: 3rem; margin-bottom: 1rem; }
  .modal-success h3 { color: #2e7d32; margin-bottom: 0.5rem; font-size: 1.3rem; }
  .modal-success p { color: #666; margin-bottom: 1.5rem; }
  .modal-success .chef-list-summary { text-align: left; background: #f8f9fa; border-radius: 8px; padding: 1rem; margin: 1rem 0; font-size: 0.95rem; color: #555; }

  @media (max-width: 1100px) { .chef-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 768px) {
    .discover-layout { grid-template-columns: 1fr; }
    .filter-sidebar { position: static; }
    .chef-grid { grid-template-columns: 1fr; }
    .page-header { padding-top: 5rem; }
    .results-header { flex-direction: column; align-items: flex-start; }
  }
</style>
</head>
<body>
<nav>
  <a href="/" class="logo">Maison des Chefs</a>
  <div class="nav-links">
    <a href="/chefs">Browse Chefs</a>
    <a href="/services">Services</a>
    <a href="/auth/login">Sign In</a>
  </div>
</nav>

<section class="page-header">
  <h1>Discover Local Chefs</h1>
  <p>Find the perfect private chef for your next gathering or celebration</p>
</section>

<div class="discover-layout">
  <aside class="filter-sidebar">
    <h3>Filter Chefs</h3>

    <div class="filter-group">
      <label>Cuisine Type</label>
      <div class="filter-options" id="cuisineFilters">
        <label class="filter-option"><input type="checkbox" value="French" onchange="applyFilters()"> French</label>
        <label class="filter-option"><input type="checkbox" value="Italian" onchange="applyFilters()"> Italian</label>
        <label class="filter-option"><input type="checkbox" value="Japanese" onchange="applyFilters()"> Japanese</label>
        <label class="filter-option"><input type="checkbox" value="Mexican" onchange="applyFilters()"> Mexican</label>
        <label class="filter-option"><input type="checkbox" value="Mediterranean" onchange="applyFilters()"> Mediterranean</label>
        <label class="filter-option"><input type="checkbox" value="Latin American" onchange="applyFilters()"> Latin American</label>
        <label class="filter-option"><input type="checkbox" value="French Fusion" onchange="applyFilters()"> French Fusion</label>
      </div>
    </div>

    <div class="filter-group">
      <label>Dietary Support</label>
      <div class="filter-options" id="dietaryFilters">
        <label class="filter-option"><input type="checkbox" value="vegetarian" onchange="applyFilters()"> Vegetarian</label>
        <label class="filter-option"><input type="checkbox" value="vegan" onchange="applyFilters()"> Vegan</label>
        <label class="filter-option"><input type="checkbox" value="gluten_free" onchange="applyFilters()"> Gluten-Free</label>
        <label class="filter-option"><input type="checkbox" value="halal" onchange="applyFilters()"> Halal</label>
        <label class="filter-option"><input type="checkbox" value="kosher" onchange="applyFilters()"> Kosher</label>
        <label class="filter-option"><input type="checkbox" value="dairy_free" onchange="applyFilters()"> Dairy-Free</label>
        <label class="filter-option"><input type="checkbox" value="nut_free" onchange="applyFilters()"> Nut-Free</label>
      </div>
    </div>

    <div class="filter-group">
      <label>Price Range ($/person)</label>
      <div class="price-range">
        <input type="number" id="minPrice" placeholder="Min" min="0" onchange="applyFilters()">
        <span>-</span>
        <input type="number" id="maxPrice" placeholder="Max" min="0" onchange="applyFilters()">
      </div>
    </div>
  </aside>

  <main class="results-area">
    <div class="results-header">
      <span class="results-count">Showing <strong id="countDisplay">0</strong> chefs</span>
      <select class="sort-select" id="sortSelect" onchange="applyFilters()">
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="response_time">Quickest Response</option>
        <option value="newest">Newest</option>
      </select>
    </div>

    <div id="loadingState" class="loading-state"><div class="spinner"></div><p>Loading chefs...</p></div>
    <div id="errorState" class="error-state" style="display:none"><h2>Something went wrong</h2><p>Unable to load chefs.</p></div>
    <div id="emptyState" class="empty-state" style="display:none"><h2>No chefs found</h2><p>Try adjusting your filters.</p></div>
    <div id="chefGrid" class="chef-grid" style="display:none"></div>
  </main>
</div>

<footer>
  <div class="logo">Maison des Chefs</div>
  <p>&copy; 2026 Maison des Chefs. All rights reserved.</p>
</footer>

<div class="inquiry-floating-bar" id="inquiryFloatingBar">
  <div class="inquiry-bar-info">
    <span class="inquiry-bar-count" id="selectedChefCount">0</span>
    <span>chef<span id="pluralS">s</span> selected</span>
  </div>
  <button class="inquiry-bar-btn" id="openInquiryBtn" onclick="openInquiryModal()">Send Inquiry</button>
</div>

<div class="modal-overlay" id="inquiryModal">
  <div class="modal">
    <div class="modal-header">
      <h2>Send Inquiry</h2>
      <button class="modal-close" onclick="closeInquiryModal()">×</button>
    </div>
    <div class="modal-body" id="inquiryModalBody">
      <div class="modal-chefs-list" id="modalChefsList"></div>
      <form id="multiInquiryForm">
        <input type="hidden" id="selectedServiceIds" name="serviceIds" value="[]">
        <div class="modal-form-row">
          <div class="modal-form-group">
            <label for="modalClientName">Your Name <span class="required">*</span></label>
            <input type="text" id="modalClientName" name="clientName" required placeholder="Full name">
          </div>
          <div class="modal-form-group">
            <label for="modalEmail">Email <span class="required">*</span></label>
            <input type="email" id="modalEmail" name="email" required placeholder="you@example.com">
          </div>
        </div>
        <div class="modal-form-row">
          <div class="modal-form-group">
            <label for="modalPhone">Phone</label>
            <input type="tel" id="modalPhone" name="phone" placeholder="(555) 123-4567">
          </div>
          <div class="modal-form-group">
            <label for="modalGuestCount">Guests <span class="required">*</span></label>
            <input type="number" id="modalGuestCount" name="guestCount" required min="1" value="2">
          </div>
        </div>
        <div class="modal-form-group">
          <label for="modalEventDate">Preferred Date</label>
          <input type="date" id="modalEventDate" name="eventDate">
        </div>
        <div class="modal-form-group">
          <label for="modalMessage">Message to Chefs</label>
          <textarea id="modalMessage" name="message" placeholder="Tell the chefs about your event, dietary requirements, or any special requests..."></textarea>
        </div>
        <button type="submit" class="modal-submit-btn" id="modalSubmitBtn">Send Inquiry to <span id="modalChefCount">0</span> Chef<span id="modalPluralS">s</span></button>
      </form>
    </div>
  </div>
</div>

<script>
var API_BASE = '';
var allChefs = [];
var currentFilters = { cuisines: [], dietary: [], minPrice: null, maxPrice: null, sort: 'price_asc' };

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getChefPhoto(cuisineTypes) {
  var cuisinePhotos = {
    'French': 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&h=400&fit=crop&crop=face',
    'Italian': 'https://images.unsplash.com/photo-1583394293214-28ez6f5b5b96?w=600&h=400&fit=crop&crop=face',
    'Japanese': 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=600&h=400&fit=crop&crop=face',
    'Mexican': 'https://images.unsplash.com/photo-1601628828688-632f38a5a7f0?w=600&h=400&fit=crop&crop=face',
    'Mediterranean': 'https://images.unsplash.com/photo-1560252811-2b291c368f9c?w=600&h=400&fit=crop&crop=face',
    'Latin American': 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=600&h=400&fit=crop&crop=face',
    'French Fusion': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&h=400&fit=crop&crop=face',
  };
  for (var i = 0; i < cuisineTypes.length; i++) {
    if (cuisinePhotos[cuisineTypes[i]]) return cuisinePhotos[cuisineTypes[i]];
  }
  return 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&h=400&fit=crop&crop=face';
}

function getMinPrice(chef) {
  if (!chef.services || chef.services.length === 0) {
    return chef.pricePerPerson || null;
  }
  var prices = chef.services.map(function(s) { return s.pricePerPerson; }).filter(function(p) { return p != null; });
  return prices.length > 0 ? Math.min.apply(null, prices) : (chef.pricePerPerson || null);
}

function formatResponseTime(avgMs) {
  if (avgMs == null) return null;
  var minutes = Math.round(avgMs / 60000);
  if (minutes < 60) return minutes + ' min';
  var hours = Math.round(minutes / 60);
  if (hours < 24) return hours + ' hr';
  var days = Math.round(hours / 24);
  return days + ' day' + (days > 1 ? 's' : '');
}

function renderChefCard(chef) {
  var minPrice = getMinPrice(chef);
  var photo = getChefPhoto(chef.cuisineTypes || []);
  var priceHtml = minPrice != null ? '$' + minPrice.toFixed(0) + '<span>/person</span>' : 'Price on request';
  var responseTime = formatResponseTime(chef.avgResponseMs);
  var responseHtml = responseTime ? '<span class="chef-stat">⚡ ' + responseTime + '</span>' : '';
  var badges = (chef.cuisineTypes || []).slice(0, 3).map(function(c) {
    return '<span class="cuisine-badge">' + escapeHtml(c) + '</span>';
  }).join('');
  var verifiedHtml = chef.verified ? '<span class="verified-badge">✓ Verified</span>' : '';
  var selectedClass = selectedChefIds.has(chef.id) ? ' selected' : '';
  var firstService = chef.services && chef.services.length > 0 ? chef.services[0] : null;
  var serviceId = firstService ? firstService.id : '';
  return '<div class="chef-card' + selectedClass + '" data-chef-id="' + chef.id + '" data-service-id="' + serviceId + '" onclick="handleCardClick(event, ' + chef.id + ', ' + serviceId + ')">' +
    '<div class="chef-card-checkbox"></div>' +
    '<img class="chef-card-img" src="' + photo + '" alt="' + escapeHtml(chef.name) + '">' +
    '<div class="chef-card-body">' +
      '<div class="chef-card-header">' +
        '<span class="chef-name">' + escapeHtml(chef.name) + '</span>' + verifiedHtml +
      '</div>' +
      '<div class="chef-location">📍 ' + escapeHtml(chef.location || 'Location not set') + '</div>' +
      '<div class="cuisine-badges">' + badges + '</div>' +
      '<div class="chef-price">' + priceHtml + '</div>' +
      '<div class="chef-stats">' + responseHtml + '</div>' +
    '</div>' +
  '</div>';
}

function applyFilters() {
  var cuisineCheckboxes = document.querySelectorAll('#cuisineFilters input[type="checkbox"]:checked');
  currentFilters.cuisines = Array.prototype.map.call(cuisineCheckboxes, function(cb) { return cb.value; });

  var dietaryCheckboxes = document.querySelectorAll('#dietaryFilters input[type="checkbox"]:checked');
  currentFilters.dietary = Array.prototype.map.call(dietaryCheckboxes, function(cb) { return cb.value; });

  var minPriceEl = document.getElementById('minPrice');
  var maxPriceEl = document.getElementById('maxPrice');
  currentFilters.minPrice = minPriceEl.value ? parseFloat(minPriceEl.value) : null;
  currentFilters.maxPrice = maxPriceEl.value ? parseFloat(maxPriceEl.value) : null;
  currentFilters.sort = document.getElementById('sortSelect').value;

  renderChefs();
}

function renderChefs() {
  var filtered = allChefs.filter(function(chef) {
    // Cuisine filter
    if (currentFilters.cuisines.length > 0) {
      var chefCuisines = (chef.cuisineTypes || []).map(function(c) { return c.toLowerCase(); });
      var match = currentFilters.cuisines.some(function(f) {
        return chefCuisines.includes(f.toLowerCase());
      });
      if (!match) return false;
    }

    // Dietary filter
    if (currentFilters.dietary.length > 0) {
      var hasDietary = chef.services && chef.services.some(function(s) {
        var tags = (s.dietaryTags || []).map(function(t) { return t.toLowerCase(); });
        return currentFilters.dietary.every(function(d) { return tags.includes(d.toLowerCase()); });
      });
      if (!hasDietary) return false;
    }

    // Price filter
    var minPrice = getMinPrice(chef);
    if (minPrice != null) {
      if (currentFilters.minPrice != null && minPrice < currentFilters.minPrice) return false;
      if (currentFilters.maxPrice != null && minPrice > currentFilters.maxPrice) return false;
    }

    return true;
  });

  // Sort
  if (currentFilters.sort === 'price_asc') {
    filtered.sort(function(a, b) { return (getMinPrice(a) || 999999) - (getMinPrice(b) || 999999); });
  } else if (currentFilters.sort === 'price_desc') {
    filtered.sort(function(a, b) { return (getMinPrice(b) || 999999) - (getMinPrice(a) || 999999); });
  } else if (currentFilters.sort === 'response_time') {
    filtered.sort(function(a, b) { return (a.avgResponseMs || 999999999) - (b.avgResponseMs || 999999999); });
  }

  document.getElementById('countDisplay').textContent = filtered.length;
  var grid = document.getElementById('chefGrid');
  if (filtered.length === 0) {
    grid.style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
  } else {
    document.getElementById('emptyState').style.display = 'none';
    var html = '';
    for (var i = 0; i < filtered.length; i++) { html += renderChefCard(filtered[i]); }
    grid.innerHTML = html;
    grid.style.display = 'grid';
  }
}

async function loadChefs() {
  var loadingEl = document.getElementById('loadingState');
  var errorEl = document.getElementById('errorState');
  var emptyEl = document.getElementById('emptyState');
  var gridEl = document.getElementById('chefGrid');

  try {
    // Prefill from server-side data
    allChefs = PRELOADED_CHEFS;

    loadingEl.style.display = 'none';
    if (allChefs.length === 0) {
      emptyEl.style.display = 'block';
      return;
    }
    renderChefs();
    gridEl.style.display = 'grid';
  } catch (err) {
    console.error('Error loading chefs:', err);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
}

var selectedChefIds = new Set();
var selectedServicesMap = {}; // chefId -> serviceId

function handleCardClick(event, chefId, serviceId) {
  // Don't toggle if clicking the card link - only toggle on checkbox area
  // But since checkbox is inside, we use event delegation
  if (selectedChefIds.has(chefId)) {
    toggleChefSelection(chefId, false);
  } else {
    toggleChefSelection(chefId, true, serviceId);
  }
}

function toggleChefSelection(chefId, selected, serviceId) {
  if (selected) {
    selectedChefIds.add(chefId);
    selectedServicesMap[chefId] = serviceId;
  } else {
    selectedChefIds.delete(chefId);
    delete selectedServicesMap[chefId];
  }
  updateFloatingBar();
  updateCardStates();
}

function updateFloatingBar() {
  var count = selectedChefIds.size;
  var bar = document.getElementById('inquiryFloatingBar');
  var countEl = document.getElementById('selectedChefCount');
  var pluralS = document.getElementById('pluralS');
  if (bar) {
    if (count > 0) {
      bar.classList.add('visible');
      if (countEl) countEl.textContent = count;
      if (pluralS) pluralS.textContent = count > 1 ? 's' : '';
    } else {
      bar.classList.remove('visible');
    }
  }
}

function updateCardStates() {
  var cards = document.querySelectorAll('.chef-card');
  cards.forEach(function(card) {
    var chefId = parseInt(card.getAttribute('data-chef-id'), 10);
    if (selectedChefIds.has(chefId)) {
      card.classList.add('selected');
    } else {
      card.classList.remove('selected');
    }
  });
}

function getCookie(name) {
  var match = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()\[\]\\/^])/g, '\\$1') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
}

function openInquiryModal() {
  if (selectedChefIds.size === 0) return;

  // Populate modal chefs list
  var chefsListEl = document.getElementById('modalChefsList');
  if (chefsListEl) {
    var html = '';
    selectedChefIds.forEach(function(chefId) {
      var chef = allChefs.find(function(c) { return c.id === chefId; });
      if (chef) {
        var photo = getChefPhoto(chef.cuisineTypes || []);
        html += '<div class="modal-chef-item">' +
          '<img class="chef-avatar" src="' + photo + '" alt="' + escapeHtml(chef.name) + '">' +
          '<span>' + escapeHtml(chef.name) + '</span>' +
        '</div>';
      }
    });
    chefsListEl.innerHTML = html;
  }

  // Update submit button text
  var count = selectedChefIds.size;
  var modalCountEl = document.getElementById('modalChefCount');
  var modalPluralEl = document.getElementById('modalPluralS');
  if (modalCountEl) modalCountEl.textContent = count;
  if (modalPluralEl) modalPluralEl.textContent = count > 1 ? 's' : '';

  // Build serviceIds array (use first service per chef)
  var serviceIds = [];
  selectedChefIds.forEach(function(chefId) {
    var serviceId = selectedServicesMap[chefId];
    if (serviceId) serviceIds.push(serviceId);
  });
  var serviceIdsInput = document.getElementById('selectedServiceIds');
  if (serviceIdsInput) serviceIdsInput.value = JSON.stringify(serviceIds);

  // Pre-fill from cookies
  var cookieEmail = getCookie('diner_email');
  var cookieName = getCookie('diner_name');
  var cookiePhone = getCookie('diner_phone');
  var emailEl = document.getElementById('modalEmail');
  var nameEl = document.getElementById('modalClientName');
  var phoneEl = document.getElementById('modalPhone');
  if (emailEl && cookieEmail) emailEl.value = cookieEmail;
  if (nameEl && cookieName) nameEl.value = cookieName;
  if (phoneEl && cookiePhone) phoneEl.value = cookiePhone;

  document.getElementById('inquiryModal').classList.add('visible');
}

function closeInquiryModal() {
  document.getElementById('inquiryModal').classList.remove('visible');
}

// Close modal on overlay click
document.getElementById('inquiryModal').addEventListener('click', function(e) {
  if (e.target === this) closeInquiryModal();
});

// Form submission
document.getElementById('multiInquiryForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var form = e.target;
  var submitBtn = document.getElementById('modalSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending...';

  var serviceIds = JSON.parse(document.getElementById('selectedServiceIds').value || '[]');
  var formData = {
    serviceIds: serviceIds,
    clientName: form.clientName.value,
    email: form.email.value,
    phone: form.phone.value || undefined,
    eventDate: form.eventDate.value || undefined,
    guestCount: parseInt(form.guestCount.value, 10),
    message: form.message.value || undefined,
  };

  try {
    var response = await fetch('/api/multi-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    var result = await response.json();

    if (!response.ok) {
      alert('Error: ' + (result.error || 'Failed to submit inquiry'));
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Inquiry to ' + selectedChefIds.size + ' Chef' + (selectedChefIds.size > 1 ? 's' : '');
      return;
    }

    // Show success
    var modalBody = document.getElementById('inquiryModalBody');
    var chefsSummaryHtml = Array.from(selectedChefIds).map(function(chefId) {
      var chef = allChefs.find(function(c) { return c.id === chefId; });
      return chef ? '<div class="modal-chef-item">' + escapeHtml(chef.name) + '</div>' : '';
    }).join('');

    modalBody.innerHTML = '<div class="modal-success">' +
      '<div class="success-icon">&#x2705;</div>' +
      '<h3>Inquiry Sent!</h3>' +
      '<p>Your inquiry has been sent to ' + result.leadIds.length + ' chef' + (result.leadIds.length > 1 ? 's' : '') + '.</p>' +
      '<div class="chef-list-summary">' + chefsSummaryHtml + '</div>' +
      '<p style="font-size:0.9rem;color:#666">Each chef will respond within 24 hours.</p>' +
      '<button class="modal-submit-btn" onclick="closeInquiryModal(); location.reload();" style="margin-top:1rem;">Back to Chefs<\/button>' +
    '<\/div>';
  } catch (err) {
    alert('Network error. Please try again.');
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Inquiry to ' + selectedChefIds.size + ' Chef' + (selectedChefIds.size > 1 ? 's' : '');
  }
});
<\/script>
</body>
</html>
`;

  return html;
}

