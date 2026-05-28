// Chef Discovery Page - Browse/search chefs (MAI-849)
// MAI-1079: Added chef discovery analytics tracking

import { db } from '../db/index.js';
import { users, chefProfiles, services, leads, reviews } from '../db/schema.js';
import { eq, sql, isNotNull, and, desc } from 'drizzle-orm';
import { trackChefDiscoveryEvent } from './analytics.js';

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
    photoUrl: chefProfiles.photoUrl,
    createdAt: chefProfiles.createdAt,
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

  // MAI-1490: Compute lead count per chef (last 7 days) for trust signal badge
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoTs = Math.floor(sevenDaysAgo.getTime() / 1000);
  const leadCounts: Record<number, number> = {};
  for (const chef of chefs) {
    const result = db.select({ count: sql `count(*)` })
      .from(leads)
      .where(and(eq(leads.chefId, chef.id), sql `${leads.createdAt} > ${sevenDaysAgoTs}`))
      .get();
    leadCounts[chef.id] = (result?.count as number) ?? 0;
  }

  // MAI-1578: Compute review stats per chef for discovery cards
  const reviewStats: Record<number, { avgRating: number | null; reviewCount: number }> = {};
  for (const chef of chefs) {
    const result = db.select({
      count: sql<number>`count(*)`,
      avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
    })
      .from(reviews)
      .where(eq(reviews.chefId, chef.id))
      .get();
    const count = (result?.count as number) ?? 0;
    reviewStats[chef.id] = {
      avgRating: count > 0 ? Math.round((result?.avgRating as number || 0) * 10) / 10 : null,
      reviewCount: count,
    };
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
    leadCount: leadCounts[c.id] ?? 0,
    avgRating: reviewStats[c.id]?.avgRating ?? null,
    reviewCount: reviewStats[c.id]?.reviewCount ?? 0,
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

  .filter-date-input, .filter-guests-input, .filter-occasion-select { width: 100%; padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.9rem; background: white; color: #333; cursor: pointer; transition: border-color 0.2s; }
  .filter-date-input:focus, .filter-guests-input:focus, .filter-occasion-select:focus { outline: none; border-color: #c9a227; }
  .filter-guests-input::placeholder { color: #aaa; }

  .clear-all-btn { width: 100%; background: #f0f0f0; color: #555; border: 1px solid #ddd; padding: 0.5rem 1rem; border-radius: 6px; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s; margin-top: 0.5rem; }
  .clear-all-btn:hover { background: #e0e0e0; color: #333; }

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
  .chef-card-checkbox { position: absolute; top: 12px; left: 12px; width: 24px; height: 24px; background: white; border: 2px solid #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; z-index: 10; transition: background 0.2s, border-color 0.2s; }
  .chef-card.selected .chef-card-checkbox { background: #c9a227; border-color: #c9a227; }
  .chef-card.selected .chef-card-checkbox::after { content: '✓'; color: white; font-size: 14px; font-weight: bold; }
  .chef-card-body { padding: 1.25rem; }
  .chef-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; }
  .chef-name { font-size: 1.2rem; font-weight: 700; color: #2c3e50; }
  .verified-badge { background: #e3f2fd; color: #1565c0; padding: 0.15rem 0.5rem; border-radius: 20px; font-size: 0.7rem; font-weight: 600; }
  .chef-location { color: #888; font-size: 0.9rem; margin-bottom: 0.25rem; display: flex; align-items: center; gap: 0.25rem; }
  .avail-badge { font-size: 0.8rem; font-weight: 600; }
  .avail-badge.available { color: #27ae60; }
  .avail-badge.unavailable { color: #aaa; }
  .cuisine-badges { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.75rem; }
  .cuisine-badge { background: #fff3e0; color: #e65100; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.78rem; font-weight: 500; }
  .chef-price { font-size: 1.1rem; font-weight: 700; color: #2c3e50; margin-bottom: 0.5rem; }
  .chef-price span { font-size: 0.85rem; font-weight: 400; color: #888; }
  .chef-stats { display: flex; gap: 1rem; padding-top: 0.75rem; border-top: 1px solid #f0f0f0; }
  .chef-stat { font-size: 0.82rem; color: #666; display: flex; align-items: center; gap: 0.25rem; }
  .lead-badge { background: #e8f5e9; color: #2e7d32; padding: 0.15rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }
  .chef-rating { color: #f57c00; font-size: 0.85rem; margin-bottom: 0.25rem; }

  .loading-state, .error-state, .empty-state { text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
  .loading-state .spinner { width: 48px; height: 48px; border: 4px solid #f3f3f3; border-top: 4px solid #c9a227; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem; }
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  .error-state h2 { color: #c0392b; margin-bottom: 0.5rem; }
  .empty-state h2 { color: #2c3e50; margin-bottom: 0.5rem; }
  .empty-state p { color: #666; margin-bottom: 1.5rem; }
  .empty-actions { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; margin-bottom: 1rem; }
  .empty-action-btn { background: #c9a227; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
  .empty-action-btn:hover { background: #b8922a; }
  .empty-action-btn.secondary { background: #6c757d; }
  .empty-action-btn.secondary:hover { background: #5a6268; }
  .empty-hint { font-size: 0.9rem; color: #888; margin-bottom: 0; }

  footer { background: #1a1a1a; color: white; padding: 2rem; text-align: center; margin-top: 4rem; }
  footer .logo { font-size: 1.3rem; font-weight: bold; margin-bottom: 0.5rem; }
  footer p { opacity: 0.7; font-size: 0.85rem; }

  .compare-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #2c3e50; color: white; padding: 1rem 2rem; display: none; align-items: center; justify-content: space-between; z-index: 200; box-shadow: 0 -4px 16px rgba(0,0,0,0.2); }
  .compare-bar.visible { display: flex; }
  .compare-bar-info { display: flex; align-items: center; gap: 0.75rem; font-size: 1rem; }
  .compare-bar-count { background: #c9a227; color: white; padding: 0.2rem 0.7rem; border-radius: 20px; font-weight: 700; font-size: 0.9rem; }
  .compare-bar-actions { display: flex; gap: 0.75rem; }
  .compare-bar-btn { background: #c9a227; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; text-decoration: none; display: inline-flex; align-items: center; }
  .compare-bar-btn:hover { background: #b8922a; }
  .compare-bar-btn.inquiry-btn { background: #6c757d; }
  .compare-bar-btn.inquiry-btn:hover { background: #5a6268; }
  .compare-bar-btn:disabled { background: #888; cursor: not-allowed; }

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
  .modal-success .success-timeline { background: #f8f9fa; border-radius: 8px; padding: 1rem 1.25rem; margin: 1rem 0; text-align: left; }
  .modal-success .timeline-step { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem 0; font-size: 0.9rem; color: #555; border-left: 2px solid #e0e0e0; margin-left: 0.5rem; padding-left: 1rem; }
  .modal-success .timeline-step.done { color: #2e7d32; border-left-color: #81c784; }
  .modal-success .timeline-step .step-icon { font-size: 1.2rem; flex-shrink: 0; }
  .modal-success .timeline-step .step-time { display: block; font-size: 0.8rem; color: #888; margin-top: 0.15rem; }
  .modal-success .timeline-step.done .step-time { color: #81c784; }

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

    <div class="filter-group">
      <label>Date</label>
      <input type="date" id="filterDate" class="filter-date-input" min="" onchange="applyFilters()">
    </div>

    <div class="filter-group">
      <label>Guests</label>
      <input type="number" id="filterGuests" class="filter-guests-input" placeholder="Any" min="1" max="50" onchange="applyFilters()">
    </div>

    <div class="filter-group">
      <label>Occasion</label>
      <select id="filterOccasion" class="filter-occasion-select" onchange="applyFilters()">
        <option value="">Any Occasion</option>
        <option value="Birthday">Birthday</option>
        <option value="Corporate">Corporate</option>
        <option value="Date Night">Date Night</option>
        <option value="Holiday">Holiday</option>
        <option value="Celebration">Celebration</option>
        <option value="Other">Other</option>
      </select>
    </div>

    <button class="clear-all-btn" onclick="clearAllFilters()">Clear all</button>
  </aside>

  <main class="results-area">
    <div class="results-header">
      <span class="results-count">Showing <strong id="countDisplay">0</strong> chefs</span>
      <select class="sort-select" id="sortSelect" onchange="applyFilters()">
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="response_time">Quickest Response</option>
        <option value="newest">Recently Added</option>
        <option value="best_value">Best Value</option>
        <option value="top_rated">★★★★★ Top Rated</option>
      </select>
    </div>

    <div id="loadingState" class="loading-state"><div class="spinner"></div><p>Loading chefs...</p></div>
    <div id="errorState" class="error-state" style="display:none"><h2>Something went wrong</h2><p>Unable to load chefs.</p></div>
    <div id="emptyState" class="empty-state" style="display:none">
      <h2>No chefs found</h2>
      <p>Try adjusting your filters or browse all chefs.</p>
      <div class="empty-actions">
        <button class="empty-action-btn" onclick="resetFilters()">Broaden Filters</button>
        <button class="empty-action-btn secondary" onclick="clearAllFilters()">View All Chefs</button>
      </div>
      <p class="empty-hint">Tip: Our chefs offer a variety of cuisines and dietary options</p>
    </div>
    <div id="chefGrid" class="chef-grid" style="display:none"></div>
  </main>
</div>

<footer>
  <div class="logo">Maison des Chefs</div>
  <p>&copy; 2026 Maison des Chefs. All rights reserved.</p>
</footer>

<div class="compare-bar" id="compareBar">
  <div class="compare-bar-info">
    <span class="compare-bar-count" id="compareChefCount">0</span>
    <span>chef<span id="comparePluralS">s</span> selected for comparison</span>
  </div>
  <div class="compare-bar-actions">
    <button class="compare-bar-btn inquiry-btn" id="compareClearBtn" onclick="clearChefSelection()">Clear</button>
    <button class="compare-bar-btn" id="compareGoBtn" onclick="goToCompare()">Compare Chefs</button>
  </div>
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
        <div class="inquiry-header-section" id="inquiryHeaderSection" style="display:none; margin-bottom:1.5rem;">
        <div style="background:#f8f9fa;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1rem;">
          <p style="font-size:0.9rem;color:#666;margin:0 0 0.25rem;">Inquiry for:</p>
          <div id="inquiryChefName" style="font-weight:700;font-size:1.1rem;color:#2c3e50;"></div>
        </div>
      </div>
      <div class="trust-signal" style="background:#e8f5e9;border-radius:8px;padding:0.75rem 1rem;margin-bottom:1.5rem;display:flex;align-items:center;gap:0.5rem;">
        <span style="font-size:1.2rem;">⏱️</span>
        <span style="font-size:0.9rem;color:#2e7d32;"><strong>Typically responds within 24 hours</strong></span>
      </div>
      <div class="modal-form-row">
        <div class="modal-form-group">
          <label for="modalClientName">Your Name <span class="required">*</span></label>
          <input type="text" id="modalClientName" name="clientName" required placeholder="Full name">
          <span class="field-error" id="modalClientNameError" style="color:#e53935;font-size:0.8rem;display:none;"></span>
        </div>
        <div class="modal-form-group">
          <label for="modalEmail">Email <span class="required">*</span></label>
          <input type="email" id="modalEmail" name="email" required placeholder="you@example.com">
          <span class="field-error" id="modalEmailError" style="color:#e53935;font-size:0.8rem;display:none;"></span>
        </div>
      </div>
      <div class="modal-form-row">
        <div class="modal-form-group">
          <label for="modalGuestCount">Guests <span class="required">*</span></label>
          <input type="number" id="modalGuestCount" name="guestCount" required min="1" value="2">
          <span class="field-error" id="modalGuestCountError" style="color:#e53935;font-size:0.8rem;display:none;"></span>
        </div>
        <div class="modal-form-group">
          <label for="modalEventDate">Preferred Date <span style="color:#888;font-weight:400;">(optional)</span></label>
          <input type="date" id="modalEventDate" name="eventDate">
        </div>
      </div>
      <div class="modal-form-group">
        <label for="modalMessage">Message <span style="color:#888;font-weight:400;">(optional)</span></label>
        <textarea id="modalMessage" name="message" placeholder="Tell the chef about your event, dietary needs, or any special requests..." maxlength="500"></textarea>
        <span style="font-size:0.8rem;color:#888;">
          <span id="messageCharCount">0</span>/500
        </span>
        <span class="field-error" id="modalMessageError" style="color:#e53935;font-size:0.8rem;display:none;"></span>
      </div>
        <button type="submit" class="modal-submit-btn" id="modalSubmitBtn">Request Free Quotes</button>
      </form>
    </div>
  </div>
</div>

<script>
var API_BASE = '';
var allChefs = [];
var currentFilters = { cuisines: [], dietary: [], minPrice: null, maxPrice: null, sort: 'price_asc', date: '', guests: '', occasion: '' };

// MAI-1079: Track chef discovery page view on load
(function() {
  trackChefDiscoveryEvent({ event: 'chef_discovery_view' });
  // MAI-2135: Fetch availability badges for all chefs
  (async function() {
    var today = new Date().toISOString().split('T')[0];
    var endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);
    var endStr = endDate.toISOString().split('T')[0];
    var chefIds = ${JSON.stringify(chefs.map(c => c.id))};
    for (var i = 0; i < chefIds.length; i++) {
      (function(cid) {
        setTimeout(function() {
          fetch('/api/chefs/' + cid + '/availability?start=' + today + '&end=' + endStr)
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(data) {
              if (!data || !data.slots) return;
              var hasSlots = data.slots.some(function(s) { return !s.is_blocked && s.time_windows && s.time_windows.length > 0; });
              var badge = document.getElementById('availBadge' + cid);
              if (badge) {
                if (hasSlots) {
                  badge.innerHTML = '<span style="color:#27ae60;">● Available this week</span>';
                  badge.className = 'avail-badge available';
                } else {
                  badge.innerHTML = '<span style="color:#aaa;">○ Check availability</span>';
                  badge.className = 'avail-badge unavailable';
                }
              }
            })
            .catch(function() {});
        }, i * 100); // stagger requests to avoid overwhelming the server
      })(chefIds[i]);
    }
  })();
})();

// Initialize date input min to today
(function() {
  var dateInput = document.getElementById('filterDate');
  if (dateInput) {
    dateInput.min = new Date().toISOString().split('T')[0];
  }
})();

// Read URL params on load and pre-fill filters
(function() {
  var params = new URLSearchParams(window.location.search);
  var date = params.get('date');
  var guests = params.get('guests');
  var occasion = params.get('occasion');
  var minPrice = params.get('minPrice');
  var maxPrice = params.get('maxPrice');
  var sort = params.get('sort');
  var cuisines = params.get('cuisines');
  var dietary = params.get('dietary');

  if (date) {
    var dateInput = document.getElementById('filterDate');
    if (dateInput) dateInput.value = date;
    currentFilters.date = date;
  }
  if (guests) {
    var guestsInput = document.getElementById('filterGuests');
    if (guestsInput) guestsInput.value = guests;
    currentFilters.guests = guests;
  }
  if (occasion) {
    var occasionSelect = document.getElementById('filterOccasion');
    if (occasionSelect) occasionSelect.value = occasion;
    currentFilters.occasion = occasion;
  }
  if (minPrice) {
    var minPriceInput = document.getElementById('minPrice');
    if (minPriceInput) minPriceInput.value = minPrice;
    currentFilters.minPrice = parseFloat(minPrice);
  }
  if (maxPrice) {
    var maxPriceInput = document.getElementById('maxPrice');
    if (maxPriceInput) maxPriceInput.value = maxPrice;
    currentFilters.maxPrice = parseFloat(maxPrice);
  }
  if (sort) {
    var sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.value = sort;
    currentFilters.sort = sort;
  }
  if (cuisines) {
    cuisines.split(',').forEach(function(c) {
      var cb = document.querySelector('#cuisineFilters input[value="' + c + '"]');
      if (cb) cb.checked = true;
    });
    currentFilters.cuisines = cuisines.split(',').filter(Boolean);
  }
  if (dietary) {
    dietary.split(',').forEach(function(d) {
      var cb = document.querySelector('#dietaryFilters input[value="' + d + '"]');
      if (cb) cb.checked = true;
    });
    currentFilters.dietary = dietary.split(',').filter(Boolean);
  }
})();

function updateUrlParams() {
  var params = new URLSearchParams();

  if (currentFilters.date) params.set('date', currentFilters.date);
  if (currentFilters.guests) params.set('guests', currentFilters.guests);
  if (currentFilters.occasion) params.set('occasion', currentFilters.occasion);
  if (currentFilters.minPrice != null) params.set('minPrice', currentFilters.minPrice.toString());
  if (currentFilters.maxPrice != null) params.set('maxPrice', currentFilters.maxPrice.toString());
  if (currentFilters.sort && currentFilters.sort !== 'price_asc') params.set('sort', currentFilters.sort);
  if (currentFilters.cuisines.length > 0) params.set('cuisines', currentFilters.cuisines.join(','));
  if (currentFilters.dietary.length > 0) params.set('dietary', currentFilters.dietary.join(','));

  var newUrl = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
  window.history.replaceState({}, '', newUrl);
}

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

function getPriceRangeHtml(chef) {
  if (!chef.services || chef.services.length === 0) {
    var pp = chef.pricePerPerson;
    return pp != null ? '$' + pp.toFixed(0) + '<span>/person</span>' : 'Price on request';
  }
  var prices = chef.services.map(function(s) { return s.pricePerPerson; }).filter(function(p) { return p != null && p > 0; });
  if (prices.length === 0) {
    return 'Price on request';
  }
  var minPrice = Math.min.apply(null, prices);
  var maxPrice = Math.max.apply(null, prices);
  if (prices.length === 1) {
    return '$' + minPrice.toFixed(0) + '<span>/person</span>';
  }
  // Multiple price points: show full range to set accurate expectations
  return '$' + minPrice.toFixed(0) + ' – $' + maxPrice.toFixed(0) + '<span>/person</span>';
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
  // Use chef's uploaded photo if available, otherwise fall back to cuisine-based placeholder
  var photo = chef.photoUrl || getChefPhoto(chef.cuisineTypes || []);
  var priceHtml = getPriceRangeHtml(chef);
  var responseTime = formatResponseTime(chef.avgResponseMs);
  var responseHtml = responseTime ? '<span class="chef-stat">⚡ ' + responseTime + '</span>' : '';
  var responseBadge = '';
  if (responseTime) {
    var avgMs = chef.avgResponseMs || 0;
    if (avgMs < 60 * 60 * 1000) {
      responseBadge = '<span class="response-badge" style="background:#d4edda;color:#155724;">🟢 Responds &lt;1h</span>';
    } else if (avgMs < 4 * 60 * 60 * 1000) {
      responseBadge = '<span class="response-badge" style="background:#fff3cd;color:#856404;">🟡 Responds &lt;4h</span>';
    } else if (avgMs < 24 * 60 * 60 * 1000) {
      responseBadge = '<span class="response-badge" style="background:#ffe5d0;color:#c55a11;">🟠 Responds &lt;24h</span>';
    } else {
      responseBadge = '<span class="response-badge" style="background:#e2e3e5;color:#495057;">⚪ Slow</span>';
    }
  } else {
    responseBadge = '<span class="response-badge" style="background:#e2e3e5;color:#495057;">⚪ New chef</span>';
  }
  var badges = (chef.cuisineTypes || []).slice(0, 3).map(function(c) {
    return '<span class="cuisine-badge">' + escapeHtml(c) + '</span>';
  }).join('');
  var verifiedHtml = chef.verified ? '<span class="verified-badge">✓ Verified</span>' : '';
  var responseBadgeHtml = responseBadge;
  // MAI-1490: Lead count trust badge
  var leadCount = chef.leadCount || 0;
  var leadBadgeHtml = '';
  if (leadCount > 0) {
    var label = leadCount >= 5 ? '🔥 Popular' : leadCount + ' lead' + (leadCount !== 1 ? 's' : '');
    leadBadgeHtml = '<span class="lead-badge" style="margin-left:0.5rem;">' + label + '</span>';
  }
  // MAI-1578: Rating display
  var ratingHtml = '';
  if (chef.avgRating && chef.avgRating > 0) {
    var stars = '';
    for (var i = 1; i <= 5; i++) stars += i <= Math.round(chef.avgRating) ? '★' : '☆';
    var reviewLabel = (chef.reviewCount || 0) === 1 ? 'review' : 'reviews';
    ratingHtml = '<div class="chef-rating" style="color:#f57c00;font-size:0.85rem;margin-bottom:0.25rem;">' + stars + ' ' + chef.avgRating + ' (' + (chef.reviewCount || 0) + ' ' + reviewLabel + ')</div>';
  }
  var selectedClass = selectedChefIds.has(chef.id) ? ' selected' : '';
  var firstService = chef.services && chef.services.length > 0 ? chef.services[0] : null;
  var serviceId = firstService ? firstService.id : '';
  return '<div class="chef-card' + selectedClass + '" data-chef-id="' + chef.id + '" data-service-id="' + serviceId + '" onclick="handleCardClick(event, ' + chef.id + ', ' + serviceId + ')">' +
    '<div class="chef-card-checkbox"></div>' +
    '<img class="chef-card-img" src="' + photo + '" alt="' + escapeHtml(chef.name) + '">' +
    '<div class="chef-card-body">' +
      '<div class="chef-card-header">' +
        '<span class="chef-name">' + escapeHtml(chef.name) + '</span>' + verifiedHtml + leadBadgeHtml +
      '</div>' +
      ratingHtml +
      '<div class="chef-location">📍 ' + escapeHtml(chef.location || 'Location not set') + '</div>' +
      '<div id="availBadge' + chef.id + '" class="avail-badge" style="margin-bottom:0.4rem;"></div>' +
      '<div class="cuisine-badges">' + badges + '</div>' +
      '<div class="chef-price">' + priceHtml + '</div>' +
      '<div class="chef-stats">' + responseHtml + '</div>' +
      '<div class="response-badges" style="margin-top:0.5rem;">' + responseBadgeHtml + '</div>' +
    '</div>' +
  '</div>';
}

function resetFilters() {
  document.querySelectorAll('#cuisineFilters input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
  document.querySelectorAll('#dietaryFilters input[type="checkbox"]').forEach(function(cb) { cb.checked = false; });
  document.getElementById('minPrice').value = '';
  document.getElementById('maxPrice').value = '';
  document.getElementById('filterDate').value = '';
  document.getElementById('filterGuests').value = '';
  document.getElementById('filterOccasion').value = '';
  applyFilters();
}

function clearAllFilters() {
  resetFilters();
  document.getElementById('sortSelect').value = 'price_asc';
  applyFilters();
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

  var dateEl = document.getElementById('filterDate');
  currentFilters.date = dateEl.value || '';
  var guestsEl = document.getElementById('filterGuests');
  currentFilters.guests = guestsEl.value || '';
  var occasionEl = document.getElementById('filterOccasion');
  currentFilters.occasion = occasionEl.value || '';

  // MAI-1079: Track filter application
  var activeFilters = currentFilters.cuisines.length + currentFilters.dietary.length +
    (currentFilters.minPrice ? 1 : 0) + (currentFilters.maxPrice ? 1 : 0) + (currentFilters.sort !== 'price_asc' ? 1 : 0) +
    (currentFilters.date ? 1 : 0) + (currentFilters.guests ? 1 : 0) + (currentFilters.occasion ? 1 : 0);
  if (activeFilters > 0) {
    trackChefDiscoveryEvent({
      event: 'filter_applied',
      filterType: 'multiple',
      filterValue: currentFilters.cuisines.join(',') + '|' + currentFilters.dietary.join(','),
      selectedCount: activeFilters
    });
  }

  // MAI-1960: When date, guests, or occasion filters are set, call the API
  // instead of client-side filtering (those filters require server-side logic)
  var hasApiFilters = currentFilters.date || currentFilters.guests || currentFilters.occasion;
  if (hasApiFilters) {
    fetchChefsFromApi();
  } else {
    renderChefs();
  }
  updateUrlParams();
}

// MAI-1960: Fetch chefs from API when date/guests/occasion filters are active
async function fetchChefsFromApi() {
  var loadingEl = document.getElementById('loadingState');
  var errorEl = document.getElementById('errorState');
  var emptyEl = document.getElementById('emptyState');
  var gridEl = document.getElementById('chefGrid');

  loadingEl.style.display = 'block';
  errorEl.style.display = 'none';
  emptyEl.style.display = 'none';
  gridEl.style.display = 'none';

  try {
    var params = new URLSearchParams();
    if (currentFilters.date) params.set('date', currentFilters.date);
    if (currentFilters.guests) params.set('partySize', currentFilters.guests);
    if (currentFilters.occasion) params.set('occasion', currentFilters.occasion);
    if (currentFilters.minPrice != null) params.set('minPrice', currentFilters.minPrice.toString());
    if (currentFilters.maxPrice != null) params.set('maxPrice', currentFilters.maxPrice.toString());
    if (currentFilters.cuisines.length > 0) params.set('cuisines', currentFilters.cuisines.join(','));
    if (currentFilters.dietary.length > 0) params.set('dietary', currentFilters.dietary.join(','));

    var url = API_BASE + '/api/chefs?' + params.toString();
    var response = await fetch(url);
    if (!response.ok) throw new Error('API error');
    var chefs = await response.json();

    // Enrich with services and stats from preloaded data for display
    allChefs = chefs.map(function(chef: any) {
      var preloaded = PRELOADED_CHEFS.find(function(p: any) { return p.id === chef.id; });
      return Object.assign({}, preloaded || {}, chef, {
        services: preloaded ? preloaded.services : [],
        avgResponseMs: preloaded ? preloaded.avgResponseMs : null,
        leadCount: preloaded ? preloaded.leadCount : 0,
        avgRating: preloaded ? preloaded.avgRating : null,
        reviewCount: preloaded ? preloaded.reviewCount : 0,
      });
    });

    loadingEl.style.display = 'none';
    renderChefs();
    gridEl.style.display = 'grid';
  } catch (err) {
    console.error('Error fetching chefs from API:', err);
    loadingEl.style.display = 'none';
    errorEl.style.display = 'block';
  }
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
  } else if (currentFilters.sort === 'newest') {
    filtered.sort(function(a, b) { return ((b.createdAt ? new Date(b.createdAt).getTime() : 0) || 9999999999999999) - ((a.createdAt ? new Date(a.createdAt).getTime() : 0) || 9999999999999999); });
  } else if (currentFilters.sort === 'best_value') {
    filtered.sort(function(a, b) { return (getMinPrice(a) || 999999) - (getMinPrice(b) || 999999); });
  } else if (currentFilters.sort === 'top_rated') {
    // Chefs with ratings first (highest first), then by review count (more = more reliable), unrated last
    filtered.sort(function(a, b) {
      var aRating = a.avgRating || 0;
      var bRating = b.avgRating || 0;
      if (bRating !== aRating) return bRating - aRating;
      return (b.reviewCount || 0) - (a.reviewCount || 0);
    });
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
    // MAI-1079: Track chef selection
    var chef = allChefs.find(function(c) { return c.id === chefId; });
    trackChefDiscoveryEvent({
      event: 'chef_select',
      chefId: chefId,
      serviceId: serviceId || null,
      selectedCount: selectedChefIds.size,
      cuisineTypes: chef ? chef.cuisineTypes : []
    });
  } else {
    selectedChefIds.delete(chefId);
    delete selectedServicesMap[chefId];
    // MAI-1079: Track chef deselection
    trackChefDiscoveryEvent({
      event: 'chef_deselect',
      chefId: chefId,
      selectedCount: selectedChefIds.size
    });
  }
  updateCompareBar();
  updateCardStates();
}

function updateCompareBar() {
  var count = selectedChefIds.size;
  var bar = document.getElementById('compareBar');
  var countEl = document.getElementById('compareChefCount');
  var pluralS = document.getElementById('comparePluralS');
  var goBtn = document.getElementById('compareGoBtn');
  if (bar) {
    if (count >= 2) {
      bar.classList.add('visible');
      if (countEl) countEl.textContent = count;
      if (pluralS) pluralS.textContent = count > 1 ? 's' : '';
    } else {
      bar.classList.remove('visible');
    }
  }
}

function clearChefSelection() {
  selectedChefIds.clear();
  selectedServicesMap = {};
  updateCompareBar();
  updateCardStates();
}

function goToCompare() {
  if (selectedChefIds.size < 2) return;
  var ids = Array.from(selectedChefIds).join(',');
  window.location.href = '/compare?chefs=' + ids;
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

  // MAI-1079: Track inquiry modal open
  var selectedChefIdList = Array.from(selectedChefIds);
  var serviceIdList = selectedChefIdList.map(function(chefId) {
    return selectedServicesMap[chefId] || null;
  });
  trackChefDiscoveryEvent({
    event: 'inquiry_modal_open',
    selectedCount: selectedChefIds.size
  });

  // Populate modal chefs list
  var chefsListEl = document.getElementById('modalChefsList');
  if (chefsListEl) {
    var html = '';
    selectedChefIds.forEach(function(chefId) {
      var chef = allChefs.find(function(c) { return c.id === chefId; });
      if (chef) {
        // Use chef's uploaded photo if available, otherwise fall back to cuisine-based placeholder
        var photo = chef.photoUrl || getChefPhoto(chef.cuisineTypes || []);
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
  var emailEl = document.getElementById('modalEmail');
  var nameEl = document.getElementById('modalClientName');
  if (emailEl && cookieEmail) emailEl.value = cookieEmail;
  if (nameEl && cookieName) nameEl.value = cookieName;

  document.getElementById('inquiryModal').classList.add('visible');
}

function closeInquiryModal() {
  document.getElementById('inquiryModal').classList.remove('visible');
}

// Close modal on overlay click
document.getElementById('inquiryModal').addEventListener('click', function(e) {
  if (e.target === this) closeInquiryModal();
});

// Character count for message textarea
document.getElementById('modalMessage').addEventListener('input', function(e) {
  var charCountEl = document.getElementById('messageCharCount');
  if (charCountEl) charCountEl.textContent = e.target.value.length;
});

// Clear inline errors on input
['modalClientName', 'modalEmail', 'modalGuestCount', 'modalMessage'].forEach(function(id) {
  var el = document.getElementById(id);
  if (el) {
    el.addEventListener('input', function() {
      var errorEl = document.getElementById(id + 'Error');
      if (errorEl) errorEl.style.display = 'none';
    });
  }
});

// Form submission
document.getElementById('multiInquiryForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  var form = e.target;
  // Character count for message
  var messageEl = document.getElementById('modalMessage');
  var charCountEl = document.getElementById('messageCharCount');
  if (messageEl && charCountEl) {
    charCountEl.textContent = messageEl.value.length;
  }

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
    var controller = new AbortController();
    var timeoutId = setTimeout(function() { controller.abort(); }, 10000);

    var response = await fetch('/api/multi-inquiry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    var result = await response.json();

    if (!response.ok) {
      var errorEl = document.getElementById('modalEmailError');
      if (errorEl) {
        errorEl.textContent = result.error || 'Failed to submit inquiry. Please try again.';
        errorEl.style.display = 'block';
      }
      submitBtn.disabled = false;
      submitBtn.textContent = 'Request Free Quotes';
      return;
    }

    // MAI-1079: Track successful inquiry submission
    trackChefDiscoveryEvent({
      event: 'inquiry_modal_submit',
      selectedCount: selectedChefIds.size,
      guestCount: parseInt(formData.guestCount, 10)
    });

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
      '<div class="success-timeline">' +
        '<div class="timeline-step done"><span class="step-icon">✅</span><span class="step-text">Your inquiry was sent to ' + result.leadIds.length + ' chef' + (result.leadIds.length > 1 ? 's' : '') + '</span></div>' +
        '<div class="timeline-step"><span class="step-icon">👨🍳</span><span class="step-text">Each chef reviews your request <em class="step-time">within 24 hours</em></span></div>' +
        '<div class="timeline-step"><span class="step-icon">📩</span><span class="step-text">Chefs send you personalized quotes <em class="step-time">within 24-48 hours</em></span></div>' +
        '<div class="timeline-step"><span class="step-icon">💳</span><span class="step-text">You confirm & pay to lock in your date</span></div>' +
      '</div>' +
      '<button class="modal-submit-btn" onclick="closeInquiryModal(); location.reload();" style="margin-top:1rem;">Back to Chefs<\/button>' +
    '<\/div>';
  } catch (err) {
    var isTimeout = err.name === 'AbortError';
    var errorEl = document.getElementById('modalEmailError');
    if (errorEl) {
      errorEl.textContent = isTimeout ? 'Request timed out. Please check your connection and try again.' : 'Network error. Please check your connection and try again.';
      errorEl.style.display = 'block';
    }
    submitBtn.disabled = false;
    submitBtn.textContent = 'Request Free Quotes';
  }
});
<\/script>
</body>
</html>
`;

  return html;
}

