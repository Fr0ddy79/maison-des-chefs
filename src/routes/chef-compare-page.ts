// Chef Compare Page - Side-by-side comparison of selected chefs (MAI-903)
// MAI-1124: Compare bar UI - navigate to this page from discovery

import { db } from '../db/index.js';
import { users, chefProfiles, services, leads } from '../db/schema.js';
import { eq, sql, isNotNull, and } from 'drizzle-orm';
import { trackChefDiscoveryEvent } from './analytics.js';

export default function buildChefComparePage(chefIds: string): string {
  // Parse chef IDs from query string
  const idList = chefIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));

  if (idList.length < 2) {
    return buildErrorPage();
  }

  // Fetch chefs
  const chefs = db.select({
    id: users.id,
    name: users.name,
    bio: chefProfiles.bio,
    cuisineTypes: chefProfiles.cuisineTypes,
    location: chefProfiles.location,
    pricePerPerson: chefProfiles.pricePerPerson,
    available: chefProfiles.available,
    verified: chefProfiles.verified,
    photoUrl: chefProfiles.photoUrl,
    createdAt: chefProfiles.createdAt,
  })
    .from(chefProfiles)
    .innerJoin(users, eq(chefProfiles.userId, users.id))
    .where(eq(chefProfiles.available, true))
    .all()
    .filter(c => idList.includes(c.id));

  if (chefs.length < 2) {
    return buildErrorPage();
  }

  // Fetch services for each chef
  const chefServices: Record<number, any[]> = {};
  for (const chef of chefs) {
    const svcs = db.select({
      id: services.id,
      name: services.name,
      description: services.description,
      pricePerPerson: services.pricePerPerson,
      minGuests: services.minGuests,
      maxGuests: services.maxGuests,
      dietaryTags: services.dietaryTags,
      category: services.category,
      photos: services.photos,
    })
      .from(services)
      .where(and(eq(services.chefId, chef.id), eq(services.status, 'published')))
      .all();
    chefServices[chef.id] = svcs;
  }

  // Compute avg response time per chef
  const avgResponseTimes: Record<number, number | null> = {};
  for (const chef of chefs) {
    const result = db.select({
      avgMs: sql`coalesce(avg(${leads.firstChefActionAt} - ${leads.createdAt}), NULL)`
    })
      .from(leads)
      .where(and(eq(leads.chefId, chef.id), isNotNull(leads.firstChefActionAt)))
      .get();
    avgResponseTimes[chef.id] = (result?.avgMs as number | null) ?? null;
  }

  const chefsJson = JSON.stringify(chefs.map(c => ({
    ...c,
    cuisineTypes: JSON.parse(c.cuisineTypes as string || '[]'),
    services: (chefServices[c.id] || []).map(s => ({
      ...s,
      dietaryTags: JSON.parse(s.dietaryTags || '[]'),
      photos: JSON.parse(s.photos || '[]'),
    })),
    avgResponseMs: avgResponseTimes[c.id],
  })));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Compare Chefs | Maison des Chefs</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
  nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
  nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
  nav .nav-links { display: flex; gap: 1.5rem; }
  nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
  nav .nav-links a:hover { opacity: 0.8; }

  .page-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); padding: 6rem 2rem 2rem; color: white; text-align: center; }
  .page-header h1 { font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 0.5rem; }
  .page-header p { opacity: 0.9; font-size: 1.1rem; }

  .compare-container { max-width: 1300px; margin: 2rem auto; padding: 0 1.5rem; overflow-x: auto; }
  .compare-table { background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); overflow: hidden; min-width: 700px; }
  .compare-row { display: grid; border-bottom: 1px solid #eee; }
  .compare-row:last-child { border-bottom: none; }
  .compare-label { padding: 1rem 1.5rem; background: #f8f9fa; font-weight: 600; color: #555; font-size: 0.9rem; display: flex; align-items: center; }
  .compare-cell { padding: 1rem 1.5rem; display: flex; flex-direction: column; gap: 0.5rem; }
  .compare-chef-header { text-align: center; padding: 1.5rem; background: linear-gradient(135deg, #f8f9fa 0%, #fff 100%); border-bottom: 1px solid #eee; display: grid; grid-template-columns: repeat(${chefs.length}, 1fr); }
  .compare-chef-name { font-size: 1.2rem; font-weight: 700; color: #2c3e50; }
  .compare-chef-location { color: #888; font-size: 0.9rem; }
  .compare-photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; margin: 0 auto 0.75rem; border: 3px solid #c9a227; }
  .compare-verified { display: inline-flex; align-items: center; gap: 0.25rem; background: #e3f2fd; color: #1565c0; padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.75rem; font-weight: 600; margin: 0.25rem auto 0; }
  .compare-value { font-size: 1rem; color: #333; }
  .compare-price { font-size: 1.3rem; font-weight: 700; color: #2c3e50; }
  .compare-price span { font-size: 0.85rem; font-weight: 400; color: #888; }
  .compare-badge { display: inline-flex; flex-wrap: wrap; gap: 0.4rem; justify-content: flex-start; }
  .cuisine-badge { background: #fff3e0; color: #e65100; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.78rem; font-weight: 500; }
  .dietary-badge { background: #e8f5e9; color: #2e7d32; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 500; }
  .response-badge { padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; display: inline-block; }
  .compare-services { display: flex; flex-direction: column; gap: 0.75rem; }
  .service-item { background: #f8f9fa; border-radius: 8px; padding: 0.75rem 1rem; }
  .service-name { font-weight: 600; color: #2c3e50; font-size: 0.95rem; margin-bottom: 0.25rem; }
  .service-meta { font-size: 0.82rem; color: #666; }
  .service-price { font-weight: 700; color: #2c3e50; }
  .compare-action { padding: 1rem 1.5rem; }
  .compare-btn { display: block; width: 100%; background: #c9a227; color: white; border: none; padding: 0.75rem 1rem; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; text-decoration: none; text-align: center; }
  .compare-btn:hover { background: #b8922a; }
  .compare-btn.inquiry-btn { background: #6c757d; margin-top: 0.5rem; }
  .compare-btn.inquiry-btn:hover { background: #5a6268; }

  .back-link { display: inline-flex; align-items: center; gap: 0.5rem; color: #c9a227; text-decoration: none; font-weight: 600; margin: 1.5rem 0 0; transition: opacity 0.2s; }
  .back-link:hover { opacity: 0.8; }

  footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 4rem; }
  footer .logo { font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem; }
  footer p { opacity: 0.7; font-size: 0.85rem; }

  @media (max-width: 768px) {
    .page-header { padding-top: 5rem; }
    .compare-container { padding: 0 1rem; }
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
  <h1>Compare Chefs</h1>
  <p>Side-by-side comparison to help you choose the perfect chef</p>
</section>

<div class="compare-container">
  <a href="/chefs" class="back-link">← Back to Browse Chefs</a>

  <div class="compare-table" id="compareTable">
    <!-- Populated by JS -->
  </div>
</div>

<footer>
  <div class="logo">Maison des Chefs</div>
  <p>&copy; 2026 Maison des Chefs. All rights reserved.</p>
</footer>

<script>
var API_BASE = '';
var PRELOADED_CHEFS = ${chefsJson};
var allChefs = PRELOADED_CHEFS;

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getChefPhoto(cuisineTypes) {
  var cuisinePhotos = {
    'French': 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&crop=face',
    'Italian': 'https://images.unsplash.com/photo-1583394293214-28ez6f5b5b96?w=400&h=400&fit=crop&crop=face',
    'Japanese': 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=400&h=400&fit=crop&crop=face',
    'Mexican': 'https://images.unsplash.com/photo-1601628828688-632f38a5a7f0?w=400&h=400&fit=crop&crop=face',
    'Mediterranean': 'https://images.unsplash.com/photo-1560252811-2b291c368f9c?w=400&h=400&fit=crop&crop=face',
    'Latin American': 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=400&h=400&fit=crop&crop=face',
    'French Fusion': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&crop=face',
  };
  for (var i = 0; i < cuisineTypes.length; i++) {
    if (cuisinePhotos[cuisineTypes[i]]) return cuisinePhotos[cuisineTypes[i]];
  }
  return 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&crop=face';
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

function renderCompare() {
  var table = document.getElementById('compareTable');
  var numChefs = allChefs.length;
  var gridCols = '200px ' + Array(numChefs).fill('1fr').join(' ');
  var html = '';

  // Header row with chef names/photos
  html += '<div class="compare-chef-header">';
  for (var i = 0; i < allChefs.length; i++) {
    var chef = allChefs[i];
    var photo = chef.photoUrl || getChefPhoto(chef.cuisineTypes || []);
    var verifiedHtml = chef.verified ? '<div class="compare-verified">✓ Verified</div>' : '';
    html += '<div>' +
      '<img class="compare-photo" src="' + photo + '" alt="' + escapeHtml(chef.name) + '">' +
      '<div class="compare-chef-name">' + escapeHtml(chef.name) + '</div>' +
      '<div class="compare-chef-location">📍 ' + escapeHtml(chef.location || 'Not set') + '</div>' +
      verifiedHtml +
    '</div>';
  }
  html += '</div>';

  // Photo row
  html += renderRow('Photo', allChefs.map(function(chef) {
    var photo = chef.photoUrl || getChefPhoto(chef.cuisineTypes || []);
    return '<img class="compare-photo" src="' + photo + '" alt="' + escapeHtml(chef.name) + '" style="width:80px;height:80px;border-radius:50%;object-fit:cover;border:3px solid #c9a227;">';
  }), gridCols);

  // Price row
  html += renderRow('Starting Price', allChefs.map(function(chef) {
    var minPrice = chef.pricePerPerson;
    if (chef.services && chef.services.length > 0) {
      var prices = chef.services.map(function(s) { return s.pricePerPerson; }).filter(function(p) { return p != null; });
      if (prices.length > 0) minPrice = Math.min.apply(null, prices);
    }
    if (minPrice != null) {
      return '<div class="compare-price">$' + minPrice.toFixed(0) + '<span>/person</span></div>';
    }
    return '<div class="compare-value">Price on request</div>';
  }), gridCols);

  // Cuisine row
  html += renderRow('Cuisines', allChefs.map(function(chef) {
    var badges = (chef.cuisineTypes || []).slice(0, 3).map(function(c) {
      return '<span class="cuisine-badge">' + escapeHtml(c) + '</span>';
    }).join('');
    return '<div class="compare-badge">' + badges + '</div>';
  }), gridCols);

  // Bio row
  html += renderRow('About', allChefs.map(function(chef) {
    return '<div class="compare-value">' + escapeHtml(chef.bio || 'No bio available.') + '</div>';
  }), gridCols);

  // Response time row
  html += renderRow('Response Time', allChefs.map(function(chef) {
    var responseTime = formatResponseTime(chef.avgResponseMs);
    if (!responseTime) {
      return '<div class="compare-value">New chef</div>';
    }
    var avgMs = chef.avgResponseMs || 0;
    var color = '#495057';
    var bg = '#e2e3e5';
    if (avgMs < 60 * 60 * 1000) { color = '#155724'; bg = '#d4edda'; }
    else if (avgMs < 4 * 60 * 60 * 1000) { color = '#856404'; bg = '#fff3cd'; }
    else if (avgMs < 24 * 60 * 60 * 1000) { color = '#c55a11'; bg = '#ffe5d0'; }
    return '<span class="response-badge" style="background:' + bg + ';color:' + color + ';">' + responseTime + ' avg response</span>';
  }), gridCols);

  // Services row
  html += renderRow('Services', allChefs.map(function(chef) {
    var html = '<div class="compare-services">';
    if (!chef.services || chef.services.length === 0) {
      html += '<div class="compare-value">No services listed</div>';
    } else {
      for (var j = 0; j < chef.services.length; j++) {
        var svc = chef.services[j];
        var tags = (svc.dietaryTags || []).map(function(t) {
          return '<span class="dietary-badge">' + escapeHtml(t.replace('_', ' ')) + '</span>';
        }).join('');
        html += '<div class="service-item">' +
          '<div class="service-name">' + escapeHtml(svc.name) + '</div>' +
          '<div class="service-meta">' +
            (svc.category ? escapeHtml(svc.category) + ' · ' : '') +
            '<span class="service-price">$' + svc.pricePerPerson.toFixed(0) + '/person</span>' +
          '</div>' +
          (tags ? '<div class="compare-badge" style="margin-top:0.25rem;">' + tags + '</div>' : '') +
        '</div>';
      }
    }
    html += '</div>';
    return html;
  }), gridCols);

  // Action row
  html += renderRow('', allChefs.map(function(chef) {
    var firstService = chef.services && chef.services.length > 0 ? chef.services[0] : null;
    var serviceId = firstService ? firstService.id : '';
    return '<div class="compare-action">' +
      (serviceId ? '<a class="compare-btn" href="/book/' + serviceId + '">Book Now</a>' : '') +
      '<a class="compare-btn inquiry-btn" href="/chefs?highlight=' + chef.id + '">View Profile</a>' +
    '</div>';
  }), gridCols);

  table.innerHTML = html;

  // Track compare page view
  (function() {
    trackChefDiscoveryEvent({
      event: 'compare_page_view',
      chefIds: allChefs.map(function(c) { return c.id; })
    });
  })();
}

function renderRow(label, cells, gridCols) {
  var html = '<div class="compare-row" style="grid-template-columns: ' + gridCols + ';">' +
    '<div class="compare-label">' + escapeHtml(label) + '</div>';
  for (var i = 0; i < cells.length; i++) {
    html += '<div class="compare-cell">' + cells[i] + '</div>';
  }
  html += '</div>';
  return html;
}

renderCompare();
<\/script>
</body>
</html>
`;

  return html;
}

function buildErrorPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Compare Chefs | Maison des Chefs</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
  nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
  nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
  nav .nav-links { display: flex; gap: 1.5rem; }
  nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
  .error-container { max-width: 600px; margin: 8rem auto; padding: 2rem; text-align: center; }
  .error-container h1 { font-size: 2rem; color: #2c3e50; margin-bottom: 1rem; }
  .error-container p { color: #666; margin-bottom: 1.5rem; }
  .error-btn { display: inline-block; background: #c9a227; color: white; padding: 0.75rem 1.5rem; text-decoration: none; border-radius: 6px; font-weight: 600; }
  .error-btn:hover { background: #b8922a; }
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
<div class="error-container">
  <h1>Select at least 2 chefs</h1>
  <p>Go back to the chef discovery page and select at least 2 chefs to compare.</p>
  <a href="/chefs" class="error-btn">Browse Chefs</a>
</div>
</body>
</html>`;
}
