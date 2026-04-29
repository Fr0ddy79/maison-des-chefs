// Chef Discovery Page — Browse/search chefs (MAI-849)

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
  .chef-card { background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); transition: transform 0.2s, box-shadow 0.2s; cursor: pointer; }
  .chef-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.12); }
  .chef-card-img { width: 100%; height: 200px; object-fit: cover; }
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
        <span>–</span>
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
  return '<div class="chef-card" onclick="location.href=\'/chefs/' + chef.id + '\'">' +
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

// Preload chefs from server-side rendered data
var PRELOADED_CHEFS = ${chefsJson};

loadChefs();
</script>
</body>
</html>`;

  return html;
}