// Page routes for HTML rendering
// This module serves HTML pages for the frontend

import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { services, users, chefProfiles, leads, bookings, DIETARY_TAGS } from '../db/schema.js';
import { eq, gte, lte, sql, and, desc, isNotNull, gte as gteCol } from 'drizzle-orm';
import { trackServicePageViewEvent } from './analytics.js';

// Dietary tag labels and icons
const DIETARY_TAG_LABELS: Record<string, { label: string; icon: string }> = {
  'vegetarian': { label: 'Vegetarian', icon: '🥬' },
  'vegan': { label: 'Vegan', icon: '🌱' },
  'gluten_free': { label: 'Gluten-Free', icon: '🌾' },
  'halal': { label: 'Halal', icon: '✓' },
  'kosher': { label: 'Kosher', icon: '✡' },
  'dairy_free': { label: 'Dairy-Free', icon: '🥛' },
  'nut_free': { label: 'Nut-Free', icon: '🥜' },
};

function buildDietaryBadges(dietaryTags: string[], maxDisplay = 3): string {
  if (!dietaryTags || dietaryTags.length === 0) return '';
  const tags = Array.isArray(dietaryTags) ? dietaryTags : JSON.parse(dietaryTags || '[]');
  if (tags.length === 0) return '';
  const displayTags = tags.slice(0, maxDisplay);
  const badges = displayTags.map(tag => {
    const info = DIETARY_TAG_LABELS[tag];
    if (!info) return '';
    return `<span class="dietary-badge">${info.icon} ${info.label}</span>`;
  }).join('');
  const overflow = tags.length > maxDisplay
    ? `<span class="dietary-badge overflow">+${tags.length - maxDisplay} more</span>`
    : '';
  return `<div class="dietary-badges">${badges}${overflow}</div>`;
}

const CUISINE_TYPES = ['French', 'Italian', 'Japanese', 'Mexican', 'Mediterranean', 'Latin American', 'French Fusion'];

function getChefPhoto(cuisineTypes: string[]): string {
  const cuisinePhotos: Record<string, string> = {
    'French': 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&crop=face',
    'Italian': 'https://images.unsplash.com/photo-1583394293214-28ez6f5b5b96?w=400&h=400&fit=crop&crop=face',
    'Japanese': 'https://images.unsplash.com/photo-1581299894007-aaa50297cf16?w=400&h=400&fit=crop&crop=face',
    'Mexican': 'https://images.unsplash.com/photo-1601628828688-632f38a5a7f0?w=400&h=400&fit=crop&crop=face',
    'Mediterranean': 'https://images.unsplash.com/photo-1560252811-2b291c368f9c?w=400&h=400&fit=crop&crop=face',
    'Latin American': 'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=400&h=400&fit=crop&crop=face',
    'French Fusion': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop&crop=face',
  };
  for (const cuisine of cuisineTypes) {
    if (cuisinePhotos[cuisine]) {
      return cuisinePhotos[cuisine];
    }
  }
  return 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=400&h=400&fit=crop&crop=face';
}

function getChefAvgResponseTime(chefId: number): number | null {
  const result = db.select({
    avgMs: sql `coalesce(avg(${leads.firstChefActionAt} - ${leads.createdAt}), NULL)`
  })
    .from(leads)
    .where(and(eq(leads.chefId, chefId), isNotNull(leads.firstChefActionAt)))
    .get();
  return (result?.avgMs as number | null) ?? null;
}

function buildResponseTimeBadge(avgResponseMs: number | null): string {
  if (avgResponseMs === null) {
    return '<span class="trust-badge"><span class="icon">⚡</span><span>Quick responses</span></span>';
  }
  const avgMinutes = Math.round(avgResponseMs / 60000);
  if (avgMinutes < 60) {
    return `<span class="trust-badge highlight"><span class="icon">⚡</span><span>Typically responds in ${avgMinutes} min</span></span>`;
  }
  else if (avgMinutes < 1440) {
    const hours = Math.round(avgMinutes / 60);
    return `<span class="trust-badge"><span class="icon">⏱</span><span>Responds within ${hours} hour${hours > 1 ? 's' : ''}</span></span>`;
  }
  else {
    const days = Math.round(avgMinutes / 1440);
    return `<span class="trust-badge"><span class="icon">📅</span><span>Responds within ${days} day${days > 1 ? 's' : ''}</span></span>`;
  }
}

export default async function pageRoutes(server: FastifyInstance) {
  // Services catalog page
  server.get('/services', async (request, reply) => {
    const query = request.query as Record<string, string>;
    let result = db.select({
      id: services.id,
      chefId: services.chefId,
      name: services.name,
      description: services.description,
      pricePerPerson: services.pricePerPerson,
      minGuests: services.minGuests,
      maxGuests: services.maxGuests,
      createdAt: services.createdAt,
      dietaryTags: services.dietaryTags,
      chefName: users.name,
      chefLocation: chefProfiles.location,
      chefCuisineTypes: chefProfiles.cuisineTypes,
      chefVerified: chefProfiles.verified,
      chefPricePerPerson: chefProfiles.pricePerPerson,
    })
      .from(services)
      .innerJoin(users, eq(services.chefId, users.id))
      .leftJoin(chefProfiles, eq(services.chefId, chefProfiles.userId))
      .$dynamic();

    // Filter by cuisine type
    if (query.cuisine) {
      result = result.where(sql `${chefProfiles.cuisineTypes} LIKE ${'%' + query.cuisine + '%'}`);
    }
    // Filter by price range
    if (query.minPrice) {
      result = result.where(gte(services.pricePerPerson, parseFloat(query.minPrice)));
    }
    if (query.maxPrice) {
      result = result.where(lte(services.pricePerPerson, parseFloat(query.maxPrice)));
    }
    // MAI-722: Dietary filter
    const dietaryFilterTags = query.dietary_tags
      ? query.dietary_tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
      : [];

    // Sort
    if (query.sort === 'price_asc') {
      result = result.orderBy(services.pricePerPerson);
    }
    else if (query.sort === 'price_desc') {
      result = result.orderBy(sql `${services.pricePerPerson} DESC`);
    }
    else if (query.sort === 'newest') {
      result = result.orderBy(sql `${services.createdAt} DESC`);
    }
    else {
      result = result.orderBy(services.id);
    }

    const allServices = result.all();

    // MAI-722: Apply dietary tags filter (OR logic)
    let filteredServices = allServices;
    if (dietaryFilterTags.length > 0) {
      filteredServices = allServices.filter(service => {
        const serviceTags = JSON.parse(service.dietaryTags || '[]');
        return dietaryFilterTags.some((filterTag: string) => serviceTags.includes(filterTag));
      });
    }

    // Fetch blocked dates for date filtering
    const selectedDate = query.date;
    let blockedDatesMap = new Map();
    if (selectedDate) {
      // chefBlockedDates table not available - blocked dates map stays empty
      // This feature gracefully degrades if table doesn't exist
    }

    // Fetch lead counts
    const leadCounts = db.select({
      serviceId: leads.serviceId,
      count: sql `count(${leads.id})`
    })
      .from(leads)
      .groupBy(leads.serviceId)
      .all();
    const leadCountMap = new Map(leadCounts.map(l => [l.serviceId, l.count]));

    // Find top service
    let topServiceId: number | null = null;
    let maxLeadCount = 0;
    leadCounts.forEach(l => {
      if ((l.count as number) > maxLeadCount) {
        maxLeadCount = l.count as number;
        topServiceId = l.serviceId as number | null;
      }
    });

    // Fetch booking counts
    const bookingCounts = db.select({
      serviceId: bookings.serviceId,
      count: sql `count(${bookings.id})`
    })
      .from(bookings)
      .where(sql `${bookings.status} IN ('completed', 'confirmed')`)
      .groupBy(bookings.serviceId)
      .all();
    const bookingCountMap = new Map(bookingCounts.map(b => [b.serviceId, b.count]));

    // Sort by popularity if requested
    if (query.sort === 'popular') {
      filteredServices.sort((a, b) => ((leadCountMap.get(b.id) as number) || 0) - ((leadCountMap.get(a.id) as number) || 0));
    }

    const servicesWithData = filteredServices.map(s => ({
      ...s,
      chefCuisineTypes: JSON.parse(s.chefCuisineTypes || '[]'),
      dietaryTags: JSON.parse(s.dietaryTags || '[]'),
      leadCount: leadCountMap.get(s.id) || 0,
      bookingCount: bookingCountMap.get(s.id) || 0,
      isTopService: s.id === topServiceId && maxLeadCount > 0,
      isUnavailableOnDate: (selectedDate && blockedDatesMap.get(s.chefId)?.includes(selectedDate)) || false,
    }));

    reply.header('Content-Type', 'text/html; charset=utf-8');
    return buildServicesPage(servicesWithData, query, CUISINE_TYPES);
  });

  // Service detail page
  server.get('/services/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const url = new URL(request.url, 'http://localhost');
    const useSimplifiedLeadForm = url.searchParams.get('lead_form') === 'simplified';
    const useNewSidebarCta = url.searchParams.get('sidebar') === 'new_cta';
    const ctaVariant = url.searchParams.get('cta') === 'testB' ? 'testB' : 'control';

    const service = db.select({
      id: services.id,
      chefId: services.chefId,
      name: services.name,
      description: services.description,
      pricePerPerson: services.pricePerPerson,
      minGuests: services.minGuests,
      maxGuests: services.maxGuests,

      dietaryTags: services.dietaryTags,
      createdAt: services.createdAt,
      chefName: users.name,
      chefLocation: chefProfiles.location,
      chefCuisineTypes: chefProfiles.cuisineTypes,
      chefVerified: chefProfiles.verified,
      chefBio: chefProfiles.bio,
    })
      .from(services)
      .innerJoin(users, eq(services.chefId, users.id))
      .leftJoin(chefProfiles, eq(services.chefId, chefProfiles.userId))
      .where(eq(services.id, parseInt(id)))
      .get();

    if (!service) {
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return build404Page();
    }

    const cuisineTypes = JSON.parse(service.chefCuisineTypes || '[]');
    const serviceDietaryTags = JSON.parse(service.dietaryTags || '[]');
    const serviceWithPhotos = { ...service, photos: [], dietaryTags: serviceDietaryTags };

    trackServicePageViewEvent({
      serviceId: service.id,
      chefId: service.chefId,
      pricePerPerson: service.pricePerPerson,
      cuisineType: cuisineTypes[0] || '',
    });

    const photo = getChefPhoto(cuisineTypes);
    const verifiedBadge = service.chefVerified
      ? '<span class="verified-badge-tooltip">✓ Verified Chef<span class="tooltip-text">This chef has been verified by Maison des Chefs</span></span>'
      : '';

    // Blocked dates - using bookings as proxy
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    const blockedDatesResult = db.select({ date: bookings.eventDate })
      .from(bookings)
      .where(and(
        eq(bookings.chefId, service.chefId),
        gte(bookings.eventDate, today),
        lte(bookings.eventDate, futureDateStr)
      ))
      .all();
    const blockedDates = blockedDatesResult.filter(b => b.date).map(b => ({ date: b.date }));

    // Reviews - using bookings as proxy (actual reviews table not available)
    const ratingResult = db.select({
      reviewCount: sql `count(*)`,
      avgRating: sql `coalesce(avg(${bookings.totalPrice}), 0)`,
    })
      .from(bookings)
      .where(eq(bookings.serviceId, service.id))
      .get();
    const avgMs = ratingResult?.avgRating as number | null;
    const reviewCount = (ratingResult?.reviewCount as number | null) ?? 0;
    const avgRating = avgMs ?? 0;

    // Featured review - not available without reviews table
    const featuredReview = null;

    const socialProof = {
      reviewCount,
      avgRating: reviewCount > 0 ? Math.round((avgRating as number) * 10) / 10 : 0,
      featuredReview: null,
    };

    const avgResponseMs = getChefAvgResponseTime(service.chefId);
    const responseTimeBadge = buildResponseTimeBadge(avgResponseMs);

    const leadCountResult = db.select({ count: sql `count(${leads.id})` })
      .from(leads)
      .where(eq(leads.serviceId, service.id))
      .get();
    const leadCount = (leadCountResult?.count as number | null) ?? 0;

    reply.header('Content-Type', 'text/html; charset=utf-8');
    return buildServiceDetailPage(serviceWithPhotos, cuisineTypes, photo, verifiedBadge, blockedDates, useSimplifiedLeadForm, useNewSidebarCta, socialProof, ctaVariant, responseTimeBadge, leadCount);
  });
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
    a { background: #c9a227; color: white; padding: 1rem 2rem; text-decoration: none; border-radius: 4px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="error-container">
    <h1>404</h1>
    <p>The service you're looking for doesn't exist.</p>
    <a href="/services">Browse All Services</a>
  </div>
</body>
</html>`;
}

function buildServicesPage(services: any[], filters: Record<string, string>, cuisineOptions: string[]): string {
  const currentCuisine = filters.cuisine || '';
  const currentMinPrice = filters.minPrice || '';
  const currentMaxPrice = filters.maxPrice || '';
  const currentSort = filters.sort || 'newest';
  const currentDate = filters.date || '';
  const currentDietaryTags = filters.dietary_tags ? filters.dietary_tags.split(',').map((t: string) => t.trim()) : [];
  const dietaryFilterHtml = Object.entries(DIETARY_TAG_LABELS).map(([value, info]) => {
    const checked = currentDietaryTags.includes(value) ? 'checked' : '';
    return `<label class="dietary-filter-checkbox"><input type="checkbox" name="dietary_tags" value="${value}" ${checked}> ${info.icon} ${info.label}</label>`;
  }).join('');

  const serviceCards = services.length > 0
    ? services.map(service => {
      const photo = getChefPhoto(service.chefCuisineTypes || []);
      const cuisineList = (service.chefCuisineTypes || []).slice(0, 3).join(', ');
      const verifiedBadge = service.chefVerified
        ? '<span class="verified-badge-tooltip">✓ Verified<span class="tooltip-text">This chef has been verified by Maison des Chefs</span></span>'
        : '';
      const leadCount = service.leadCount || 0;
      const inquiryBadge = leadCount > 0
        ? `<span class="inquiry-badge">${leadCount} inquiry${leadCount !== 1 ? 'ies' : 'y'}</span>`
        : '';
      const topServiceBanner = service.isTopService
        ? '<div class="top-service-banner">🏆 Most Popular</div>'
        : '';
      const bookingCount = service.bookingCount || 0;
      const bookingBadge = bookingCount > 0
        ? `<span class="booking-badge">✓ ${bookingCount} booking${bookingCount !== 1 ? 's' : ''}</span>`
        : '';
      const notAvailableBadge = service.isUnavailableOnDate
        ? '<span class="not-available-badge">Not available</span>'
        : '';
      const dietaryBadgesHtml = buildDietaryBadges(service.dietaryTags);
      return `
        <div class="service-card-wrapper" data-service-id="${service.id}" data-chef-id="${service.chefId}">
        <a href="/services/${service.id}" class="service-card" style="position:relative;">
          ${topServiceBanner}
          <div class="service-photo" style="background-image: url('${photo}')"></div>
          <div class="service-info">
            <h3>${service.name}</h3>
            <p class="service-chef">by ${service.chefName} ${verifiedBadge} ${inquiryBadge} ${bookingBadge} ${notAvailableBadge}</p>
            <p class="service-cuisine">${cuisineList}</p>
            <p class="service-location">📍 ${service.chefLocation}</p>
            <p class="service-description">${service.description}</p>
            ${dietaryBadgesHtml}
            <div class="service-meta">
              ${service.pricePerPerson && service.pricePerPerson > 0
                ? `<span class="service-price">$${service.pricePerPerson}/person</span>`
                : `<span class="service-price no-price">Price upon request</span>`}
              <span class="service-guests">${service.minGuests}-${service.maxGuests} guests</span>
            </div>
          </div>
        </a>
        <label class="compare-checkbox-label">
          <input type="checkbox" class="compare-chef-checkbox" data-service-id="${service.id}" data-chef-id="${service.chefId}" data-service-name="${service.name}" data-chef-name="${service.chefName}" onchange="toggleCompareChef(this)">
          <span class="compare-checkbox-custom"></span>
          <span class="compare-checkbox-text">Compare</span>
        </label>
        </div>`;
    }).join('')
    : `<div class="no-results">
        <p>No services found matching your criteria.</p>
        ${currentDietaryTags.length > 0 ? '<p class="no-results-hint">Try removing dietary filters or adjusting your search.</p>' : ''}
        <a href="/services" class="reset-link">Clear filters</a>
      </div>`;

  const cuisineOptionsHtml = cuisineOptions.map(c => `<option value="${c}" ${currentCuisine === c ? 'selected' : ''}>${c}</option>`).join('');
  const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
  ].map(o => `<option value="${o.value}" ${currentSort === o.value ? 'selected' : ''}>${o.label}</option>`).join('');

  const pageTitle = currentCuisine
    ? `${currentCuisine} Private Chefs in Montreal | Maison des Chefs`
    : 'Private Chefs in Montreal | Browse Services | Maison des Chefs';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageTitle}</title>
  <meta name="description" content="Browse and book private chefs for intimate dinners, parties, and special events in Montreal.">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
    nav .nav-links a:hover { opacity: 0.8; }
    .page-header { background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%); padding: 7rem 2rem 3rem; text-align: center; color: white; }
    .page-header h1 { font-size: clamp(2rem, 4vw, 2.8rem); margin-bottom: 0.5rem; }
    .page-header p { font-size: 1.1rem; opacity: 0.9; max-width: 600px; margin: 0 auto; }
    .filter-section { background: white; padding: 1.5rem 2rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08); position: sticky; top: 60px; z-index: 50; }
    .quick-filters { max-width: 1200px; margin: 0 auto 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .quick-filter-label { font-size: 0.85rem; color: #888; font-weight: 500; margin-right: 0.5rem; }
    .quick-filter-pill { padding: 0.35rem 0.85rem; background: #f0f0f0; color: #555; border-radius: 20px; font-size: 0.85rem; font-weight: 500; text-decoration: none; transition: all 0.2s; border: 1px solid transparent; }
    .quick-filter-pill:hover { background: #e8e8e8; color: #333; }
    .quick-filter-pill.active { background: #c9a227; color: white; }
    .filter-container { max-width: 1200px; margin: 0 auto; display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; }
    .filter-group { display: flex; align-items: center; gap: 0.5rem; }
    .filter-group label { font-weight: 500; color: #555; font-size: 0.9rem; }
    .filter-group select, .filter-group input { padding: 0.5rem 0.75rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.95rem; }
    .filter-group input[type="number"] { width: 90px; }
    .price-range { display: flex; align-items: center; gap: 0.5rem; }
    .price-range span { color: #888; }
    .reset-filters { margin-left: auto; color: #c9a227; text-decoration: none; font-weight: 500; font-size: 0.9rem; }
    .reset-filters:hover { text-decoration: underline; }
    .dietary-filter-group { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
    .dietary-filter-options { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .dietary-filter-checkbox { display: flex; align-items: center; gap: 0.3rem; padding: 0.3rem 0.6rem; background: #f5f5f5; border-radius: 16px; font-size: 0.85rem; cursor: pointer; transition: background 0.2s; }
    .dietary-filter-checkbox:hover { background: #e8e8e8; }
    .dietary-filter-checkbox input { margin: 0; }
    .dietary-filter-checkbox:has(input:checked) { background: #c9a227; color: white; }
    .desktop-only { display: flex; }
    .mobile-only { display: none; }
    .dietary-filter-collapsible { display: none; }
    @media (min-width: 769px) {
      .desktop-only { display: flex; }
      .mobile-only { display: none; }
    }
    @media (max-width: 768px) {
      .desktop-only { display: none !important; }
      .mobile-only { display: block; }
    }
    .services-container { max-width: 1200px; margin: 2rem auto; padding: 0 2rem; }
    .results-count { color: #666; margin-bottom: 1.5rem; font-size: 0.95rem; }
    .services-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 2rem; }
    .service-card-wrapper { position: relative; display: flex; flex-direction: column; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.1); transition: transform 0.3s, box-shadow 0.3s; }
    .service-card-wrapper:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.15); }
    .service-card { position: relative; display: flex; flex-direction: column; flex: 1; text-decoration: none; color: inherit; -webkit-tap-highlight-color: transparent; }
    .top-service-banner { position: absolute; top: 12px; left: 12px; background: linear-gradient(135deg, #c9a227, #a88620); color: white; padding: 0.35rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700; z-index: 10; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
    .service-photo { width: 100%; height: 180px; background-size: cover; background-position: center; }
    .service-info { padding: 1.5rem; flex: 1; display: flex; flex-direction: column; }
    .service-info h3 { font-size: 1.2rem; color: #2c3e50; margin-bottom: 0.25rem; }
    .service-chef { color: #666; font-size: 0.9rem; margin-bottom: 0.3rem; display: flex; align-items: center; gap: 0.4rem; }
    .verified-badge { font-size: 0.7rem; background: #27ae60; color: white; padding: 0.1rem 0.4rem; border-radius: 10px; font-weight: 600; }
    .inquiry-badge, .booking-badge, .not-available-badge { font-size: 0.7rem; padding: 0.15rem 0.5rem; border-radius: 12px; font-weight: 600; margin-left: 0.4rem; }
    .inquiry-badge { background: #e8f5e9; color: #2e7d32; }
    .booking-badge { background: #e3f2fd; color: #1565c0; }
    .not-available-badge { background: #ffebee; color: #c62828; }
    .service-cuisine { color: #c9a227; font-weight: 500; font-size: 0.9rem; margin-bottom: 0.3rem; }
    .service-location { color: #888; font-size: 0.85rem; margin-bottom: 0.75rem; }
    .service-description { color: #555; font-size: 0.9rem; margin-bottom: 0.5rem; flex: 1; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .dietary-badges { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-bottom: 0.75rem; }
    .dietary-badge { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.2rem 0.5rem; background: #f0f8e8; color: #2d5a0b; border-radius: 12px; font-size: 0.75rem; font-weight: 500; }
    .dietary-badge.overflow { background: #f5f5f5; color: #666; }
    .service-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; padding-top: 0.75rem; border-top: 1px solid #eee; }
    .service-price { font-size: 1.15rem; font-weight: 700; color: #2c3e50; }
    .service-price.no-price { color: #888; font-size: 0.95rem; font-weight: 500; }
    .service-guests { color: #888; font-size: 0.85rem; }
    .compare-checkbox-label { display: flex; align-items: center; gap: 0.5rem; cursor: pointer; padding: 0.5rem 1.5rem; font-size: 0.85rem; color: #555; }
    .compare-chef-checkbox { display: none; }
    .compare-checkbox-custom { width: 20px; height: 20px; border: 2px solid #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; background: white; }
    .compare-chef-checkbox:checked + .compare-checkbox-custom { background: #c9a227; border-color: #c9a227; }
    .compare-chef-checkbox:checked + .compare-checkbox-custom::after { content: '✓'; color: white; font-size: 0.75rem; font-weight: bold; }
    .no-results { text-align: center; padding: 4rem 2rem; background: white; border-radius: 12px; }
    .no-results p { color: #666; font-size: 1.1rem; margin-bottom: 1rem; }
    .reset-link { color: #c9a227; font-weight: 500; }
    footer { background: #1a1a1a; color: white; padding: 3rem 2rem; text-align: center; margin-top: 4rem; }
    footer .logo { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
    footer p { color: rgba(255,255,255,0.7); margin-bottom: 0.5rem; }
    footer a { color: rgba(255,255,255,0.7); text-decoration: none; }
    @media (max-width: 768px) {
      .services-grid { grid-template-columns: 1fr; }
      .filter-container { flex-direction: column; align-items: stretch; }
      .filter-group { width: 100%; }
      .dietary-filter-options { gap: 0.3rem; }
      .dietary-filter-group { display: none; }
      .dietary-filter-collapsible { display: block; }
      .dietary-filter-collapsible.collapsed .dietary-filter-content { display: none; }
      .dietary-filter-collapsible .dietary-filter-header { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: #f5f5f5; border-radius: 8px; cursor: pointer; font-weight: 500; color: #555; }
      .dietary-filter-collapsible .dietary-filter-header::after { content: '▼'; font-size: 0.75rem; transition: transform 0.2s; }
      .dietary-filter-collapsible.collapsed .dietary-filter-header::after { transform: rotate(-90deg); }
      .dietary-filter-collapsible .dietary-filter-content { padding-top: 0.75rem; }
      .no-results-hint { color: #888; font-size: 0.95rem; margin-top: 0.5rem; }
    }
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
  
  <section class="page-header">
    <h1>Discover Our Services</h1>
    <p>From intimate dinners to grand celebrations, find the perfect private chef experience</p>
  </section>
  
  <section class="filter-section">
    <div class="quick-filters">
      <span class="quick-filter-label">Quick filters:</span>
      <a href="/services?maxPrice=100" class="quick-filter-pill ${filters.maxPrice === '100' && !filters.minPrice ? 'active' : ''}">Under $100</a>
      <a href="/services?minPrice=100&maxPrice=150" class="quick-filter-pill ${filters.minPrice === '100' && filters.maxPrice === '150' ? 'active' : ''}">$100-$150</a>
      <a href="/services?minPrice=150&maxPrice=200" class="quick-filter-pill ${filters.minPrice === '150' && filters.maxPrice === '200' ? 'active' : ''}">$150-$200</a>
      <a href="/services?minPrice=200" class="quick-filter-pill ${filters.minPrice === '200' && !filters.maxPrice ? 'active' : ''}">$200+</a>
    </div>
    <form class="filter-container" method="get" action="/services">
      <div class="filter-group">
        <label for="cuisine">Cuisine:</label>
        <select id="cuisine" name="cuisine">
          <option value="">All Cuisines</option>
          ${cuisineOptionsHtml}
        </select>
      </div>
      <div class="filter-group price-range">
        <label>Price:</label>
        <input type="number" name="minPrice" placeholder="Min" value="${currentMinPrice}" min="0">
        <span>to</span>
        <input type="number" name="maxPrice" placeholder="Max" value="${currentMaxPrice}" min="0">
        <span>/person</span>
      </div>
      <div class="filter-group">
        <label for="sort">Sort by:</label>
        <select id="sort" name="sort">${sortOptions}</select>
      </div>
      <div class="filter-group">
        <label for="date">Date:</label>
        <input type="date" id="date" name="date" value="${currentDate}" min="${new Date().toISOString().split('T')[0]}">
      </div>
      <div class="filter-group dietary-filter-group desktop-only">
        <label>Dietary:</label>
        <div class="dietary-filter-options">${dietaryFilterHtml}</div>
      </div>
      <div class="dietary-filter-collapsible mobile-only collapsed">
        <div class="dietary-filter-header" onclick="toggleDietaryFilter(this)">Dietary Needs</div>
        <div class="dietary-filter-content">
          <div class="dietary-filter-options">${dietaryFilterHtml}</div>
        </div>
      </div>
      <a href="/services" class="reset-filters">Clear filters</a>
    </form>
  </section>
  
  <section class="services-container">
    <p class="results-count">${services.length} service${services.length !== 1 ? 's' : ''} available</p>
    <div class="services-grid">${serviceCards}</div>
  </section>
  
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>Montreal's premier private chef marketplace.</p>
    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>
  </footer>

  <script>
    document.querySelectorAll('.filter-container select, .filter-container input').forEach(el => {
      el.addEventListener('change', () => {
        document.querySelector('.filter-container').closest('form').submit();
      });
    });
    
    function toggleDietaryFilter(header) {
      const collapsible = header.closest('.dietary-filter-collapsible');
      collapsible.classList.toggle('collapsed');
    }
    
    // Sync mobile checkboxes with desktop checkboxes
    function syncDietaryCheckboxes() {
      document.querySelectorAll('.dietary-filter-collapsible input[type="checkbox"]').forEach(cb => {
        const checkboxes = document.querySelectorAll('.dietary-filter-group.desktop-only input[type="checkbox"]');
        const desktopCb = Array.from(checkboxes).find(cb2 => cb2.value === (cb as any).value);
        if (desktopCb) cb.checked = desktopCb.checked;
      });
    }
    syncDietaryCheckboxes();
    
    document.querySelectorAll('.dietary-filter-collapsible input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('.dietary-filter-group.desktop-only input[type="checkbox"]');
        const desktopCb = Array.from(checkboxes).find(cb2 => cb2.value === (cb as any).value);
        if (desktopCb) desktopCb.checked = cb.checked;
        document.querySelector('.filter-container').closest('form').submit();
      });
    });
    
    document.querySelectorAll('.dietary-filter-group.desktop-only input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const checkboxes = document.querySelectorAll('.dietary-filter-collapsible input[type="checkbox"]');
        const mobileCb = Array.from(checkboxes).find(cb2 => cb2.value === (cb as any).value);
        if (mobileCb) mobileCb.checked = cb.checked;
      });
    });
    
    const MAX_COMPARE_CHEFS = 5;
    let selectedChefs = [];
    
    function toggleCompareChef(checkbox) {
      const serviceId = parseInt(checkbox.dataset.serviceId);
      const chefId = parseInt(checkbox.dataset.chefId);
      const chefName = checkbox.dataset.chefName;
      const serviceName = checkbox.dataset.serviceName;
      
      if (checkbox.checked) {
        if (selectedChefs.length >= MAX_COMPARE_CHEFS) {
          checkbox.checked = false;
          alert('You can compare up to ' + MAX_COMPARE_CHEFS + ' chefs at a time.');
          return;
        }
        selectedChefs.push({ serviceId, chefId, chefName, serviceName });
      } else {
        selectedChefs = selectedChefs.filter(c => c.chefId !== chefId);
      }
      updateCompareBar();
    }
    
    function updateCompareBar() {
      const bar = document.getElementById('compareBar');
      if (!bar) return;
      const selectedContainer = document.getElementById('compareBarSelected');
      const inquireBtn = document.getElementById('compareInquireBtn');
      if (selectedContainer) {
        selectedContainer.innerHTML = selectedChefs.map(c => 
          '<span class="compare-bar-chef-tag">' + c.serviceName + ' <span class="remove-tag" onclick="event.preventDefault(); removeChef(' + c.chefId + ')">×</span></span>'
        ).join('');
      }
      if (inquireBtn) {
        inquireBtn.style.display = selectedChefs.length >= 2 ? 'inline-block' : 'none';
      }
      bar.classList.toggle('visible', selectedChefs.length > 0);
    }
    
    function removeChef(chefId) {
      const checkbox = document.querySelector('.compare-chef-checkbox[data-chef-id="' + chefId + '"]');
      if (checkbox) checkbox.checked = false;
      selectedChefs = selectedChefs.filter(c => c.chefId !== chefId);
      updateCompareBar();
    }
    
    function openCompareModal() {
      document.getElementById('compareModal').style.display = 'flex';
    }
    
    function closeCompareModal() {
      document.getElementById('compareModal').style.display = 'none';
    }
  </script>
</body>
</html>`;
}

function buildServiceDetailPage(service: any, cuisineTypes: string[], photo: string, verifiedBadge: string, blockedDates: { date: string }[], useSimplifiedLeadForm: boolean, useNewSidebarCta: boolean, socialProof: any, ctaVariant: string, responseTimeBadge: string, leadCount: number): string {
  const cuisineList = cuisineTypes.join(', ');
  const sp = socialProof ?? { reviewCount: 0, avgRating: 0, featuredReview: null };
  const hasEnoughReviews = sp.reviewCount >= 3;
  const showRating = hasEnoughReviews && sp.avgRating > 0;
  const showTestimonial = sp.featuredReview?.comment != null;
  const leadFormCtaText = ctaVariant === 'testB' ? 'Request Booking' : ctaVariant === 'testA' ? 'Request Your Date' : ctaVariant === 'testC' ? 'Check Availability' : 'Send Inquiry';
  
  // Urgency and social proof for booking card
  const leadCountNum = typeof leadCount === 'number' ? leadCount : 0;
  const urgencyLine = leadCountNum > 0 
    ? `<div style="background: #fff3cd; color: #856404; padding: 0.6rem 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;"><span>📅</span><span>Typically books out 2–3 weeks in advance</span></div>`
    : `<div style="background: #d4edda; color: #155724; padding: 0.6rem 0.75rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.9rem; display: flex; align-items: center; gap: 0.5rem;"><span>📅</span><span>Availability varies — submit a request to check</span></div>`;
  
  const demandBadge = leadCountNum > 3
    ? `<div style="background: #e8f4f8; color: #0c5460; padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;"><span>🔥</span><span>${leadCountNum} diners are interested in this service</span></div>`
    : leadCountNum > 0
    ? `<div style="background: #e8f4f8; color: #0c5460; padding: 0.5rem 0.75rem; border-radius: 6px; margin-bottom: 1rem; font-size: 0.85rem; display: flex; align-items: center; gap: 0.4rem;"><span>🔥</span><span>${leadCountNum} diner${leadCountNum === 1 ? ' has' : 's have'} inquired about this service</span></div>`
    : '';
  
  let testimonialText = '';
  let testimonialAuthor = '';
  let testimonialRating = 0;
  if (showTestimonial && sp.featuredReview) {
    const fullComment = sp.featuredReview.comment;
    testimonialText = fullComment.length > 150 ? fullComment.substring(0, 150) + '...' : fullComment;
    testimonialAuthor = sp.featuredReview.dinerFirstName || 'Guest';
    testimonialRating = sp.featuredReview.rating;
  }
  
  let availabilityInfo = '';
  if (blockedDates.length > 0) {
    availabilityInfo = `<div class="availability-warning"><span class="warning-icon">⚠️</span><span>This chef has blocked some upcoming dates.</span></div>`;
  } else {
    availabilityInfo = `<div class="availability-info"><span class="info-icon">📅</span><span>Availability varies. Submit a booking request and the chef will confirm.</span></div>`;
  }
  
  const blockedDatesJson = JSON.stringify(blockedDates.map(b => b.date));
  const dietaryBadgesHtml = service.dietaryTags && service.dietaryTags.length > 0
    ? service.dietaryTags.map((tag: string) => {
        const info = DIETARY_TAG_LABELS[tag];
        return info ? `<span class="dietary-badge-detail">${info.icon} ${info.label}</span>` : '';
      }).join('')
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${service.name} by ${service.chefName} | Maison des Chefs</title>
  <meta name="description" content="${service.name} in ${service.chefLocation}. ${service.description.substring(0, 120)}...">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #f8f9fa; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; }
    .hero { height: 50vh; background-size: cover; background-position: center; position: relative; display: flex; align-items: flex-end; }
    .hero-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.7), transparent); }
    .hero-content { position: relative; z-index: 1; padding: 2rem; color: white; }
    .hero-content h1 { font-size: clamp(2rem, 5vw, 3rem); margin-bottom: 0.5rem; }
    .hero-chef { font-size: 1.1rem; opacity: 0.9; }
    .hero-price-badge { position: absolute; top: 1rem; right: 1rem; background: rgba(0,0,0,0.75); backdrop-filter: blur(10px); color: white; padding: 0.6rem 1rem; border-radius: 8px; font-size: 1rem; font-weight: 700; }
    .content { max-width: 1200px; margin: 0 auto; padding: 2rem; display: grid; grid-template-columns: 1fr 380px; gap: 2rem; }
    .main-info { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .availability-warning, .availability-info { padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; display: flex; align-items: center; gap: 0.75rem; }
    .availability-warning { background: #fff3cd; color: #856404; }
    .availability-info { background: #d4edda; color: #155724; }
    h2 { font-size: 1.3rem; color: #2c3e50; margin-bottom: 1rem; margin-top: 1.5rem; }
    h2:first-of-type { margin-top: 0; }
    .description { color: #555; margin-bottom: 2rem; font-size: 1.05rem; }
    .details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .detail-item { background: white; padding: 1.25rem; border-radius: 8px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
    .detail-label { color: #888; font-size: 0.85rem; margin-bottom: 0.3rem; }
    .detail-value { font-size: 1.1rem; font-weight: 600; color: #2c3e50; }
    .dietary-options-detail { display: flex; flex-wrap: wrap; gap: 0.75rem; margin-bottom: 2rem; }
    .dietary-badge-detail { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 1rem; background: #f0f8e8; color: #2d5a0b; border-radius: 20px; font-size: 0.95rem; font-weight: 500; }
    .booking-card { background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.1); height: fit-content; position: sticky; top: 80px; }
    .booking-card .price { font-size: 2rem; font-weight: 700; color: #2c3e50; margin-bottom: 0.5rem; }
    .booking-card .per-person { color: #888; font-size: 0.95rem; margin-bottom: 1.5rem; }
    .guest-selector { margin-bottom: 1rem; }
    .guest-selector-label { font-size: 0.9rem; color: #555; margin-bottom: 0.5rem; font-weight: 500; }
    .guest-selector-controls { display: flex; align-items: center; gap: 0.75rem; }
    .guest-btn { width: 36px; height: 36px; border: 2px solid #e0e0e0; background: white; border-radius: 50%; font-size: 1.2rem; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; color: #333; }
    .guest-btn:hover { border-color: #c9a227; background: #fefcf5; }
    .guest-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .guest-count-display { font-size: 1.3rem; font-weight: 700; color: #2c3e50; min-width: 40px; text-align: center; }
    .price-calculator { background: #f8f9fa; border-radius: 8px; padding: 1rem; margin-top: 0.75rem; }
    .price-line { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; font-size: 0.9rem; color: #555; }
    .price-line:last-child { margin-bottom: 0; padding-top: 0.5rem; border-top: 1px solid #e0e0e0; font-weight: 700; font-size: 1.1rem; color: #2c3e50; }
    footer { background: #1a1a1a; color: white; padding: 3rem 2rem; text-align: center; margin-top: 4rem; }
    footer .logo { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
    footer p { color: rgba(255,255,255,0.7); }
    @media (max-width: 768px) {
      .content { grid-template-columns: 1fr; }
      .booking-card { position: static; }
    }
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
  
  <section class="hero" style="background-image: url('${photo}')">
    <div class="hero-overlay"></div>
    ${service.pricePerPerson && service.pricePerPerson > 0
      ? `<div class="hero-price-badge">$${service.pricePerPerson}<span>/person</span></div>`
      : `<div class="hero-price-badge no-price">Price upon request</div>`}
    <div class="hero-content">
      <h1>${service.name}</h1>
      <div class="hero-chef">by ${service.chefName} ${verifiedBadge}</div>
    </div>
  </section>
  
  <section class="content">
    <div class="main-info">
      ${availabilityInfo}
      
      <h2>About This Service</h2>
      <p class="description">${service.description}</p>
      
      <h2>Service Details</h2>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Cuisine</div>
          <div class="detail-value">${cuisineList}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Location</div>
          <div class="detail-value">${service.chefLocation}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Min Guests</div>
          <div class="detail-value">${service.minGuests}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Max Guests</div>
          <div class="detail-value">${service.maxGuests}</div>
        </div>
      </div>
      
      ${dietaryBadgesHtml ? `
      <h2>Dietary Options</h2>
      <div class="dietary-options-detail">${dietaryBadgesHtml}</div>
      ` : ''}
      
      <h2>About the Chef</h2>
      <p class="description">${service.chefBio || 'A talented private chef ready to create an unforgettable dining experience for you.'}</p>
    </div>
    
    <div class="booking-card">
      <div class="price">${service.pricePerPerson && service.pricePerPerson > 0 ? '$' + service.pricePerPerson : 'Price'}</div>
      <div class="per-person">${service.pricePerPerson && service.pricePerPerson > 0 ? 'per person' : 'upon request'}</div>
      <p style="color: #666; margin-bottom: 1rem;">${service.minGuests}-${service.maxGuests} guests</p>
      ${service.pricePerPerson && service.pricePerPerson > 0 ? `
      <div class="guest-selector">
        <div class="guest-selector-label">How many guests?</div>
        <div class="guest-selector-controls">
          <button type="button" id="btn-decrease" class="guest-btn" aria-label="Decrease guests">−</button>
          <span id="guest-count" class="guest-count-display">${Math.min(Math.max(service.minGuests, 4), service.maxGuests)}</span>
          <button type="button" id="btn-increase" class="guest-btn" aria-label="Increase guests">+</button>
        </div>
        <div class="price-calculator">
          <div class="price-line">
            <span id="guest-multiple">4 guests × $${service.pricePerPerson}/person</span>
            <span id="total-price">$${(Math.min(Math.max(service.minGuests, 4), service.maxGuests) * service.pricePerPerson).toLocaleString()}</span>
          </div>
          <div id="min-notice" class="price-line" style="display:none;">
            <span id="min-notice-text"></span>
          </div>
        </div>
      </div>`
      : ''}
      ${urgencyLine}
      ${demandBadge}
      <a href="/book/${service.id}" class="book-btn" style="display: block; background: #c9a227; color: white; text-align: center; padding: 1rem; border-radius: 4px; text-decoration: none; font-weight: 600;">${ctaVariant === 'testA' ? 'Request Your Date' : ctaVariant === 'testB' ? 'Request Booking' : ctaVariant === 'testC' ? 'Check Availability' : 'Book This Service'}</a>
    </div>
  </section>
  
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>Montreal's premier private chef marketplace.</p>
    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>
  </footer>
  <script>
    (function() {
      const minGuests = ${service.minGuests};
      const maxGuests = ${service.maxGuests};
      const pricePerPerson = ${service.pricePerPerson || 0};
      const defaultGuests = Math.min(Math.max(minGuests, 4), maxGuests);
      let currentGuests = defaultGuests;

      function updateDisplay() {
        document.getElementById('guest-count').textContent = currentGuests;
        document.getElementById('btn-decrease').disabled = currentGuests <= minGuests;
        document.getElementById('btn-increase').disabled = currentGuests >= maxGuests;
        const total = currentGuests * pricePerPerson;
        document.getElementById('total-price').textContent = '$' + total.toLocaleString();
        document.getElementById('guest-multiple').textContent = currentGuests + ' guest' + (currentGuests !== 1 ? 's' : '') + ' × $' + pricePerPerson + '/person';
        document.getElementById('min-notice').style.display = currentGuests < minGuests ? 'block' : 'none';
        document.getElementById('min-notice-text').textContent = 'Minimum ' + minGuests + ' guest' + (minGuests !== 1 ? 's' : '') + ' required';
      }

      function decreaseGuests() {
        if (currentGuests > minGuests) {
          currentGuests--;
          updateDisplay();
        }
      }

      function increaseGuests() {
        if (currentGuests < maxGuests) {
          currentGuests++;
          updateDisplay();
        }
      }

      window.addEventListener('DOMContentLoaded', function() {
        document.getElementById('btn-decrease').addEventListener('click', decreaseGuests);
        document.getElementById('btn-increase').addEventListener('click', increaseGuests);
        updateDisplay();
      });
    })();
  </script>
</body>
</html>`;
}

export function buildHomePage(stats: { chefCount: number; serviceCount: number; bookingCount: number }, featuredServices: any[]): string {
  const { chefCount, serviceCount, bookingCount } = stats;
  
  const featuredCards = featuredServices.length > 0
    ? featuredServices.map(service => {
      const photo = getChefPhoto(service.cuisineTypes || []);
      const cuisineList = (service.cuisineTypes || []).slice(0, 3).join(', ');
      const verifiedBadge = service.verified
        ? '<span class="verified-chip">✓ Verified</span>'
        : '';
      const leadCount = service.leadCount || 0;
      const inquiryNote = leadCount > 0
        ? `<span class="inquiry-chip">🔥 ${leadCount} inquiry${leadCount !== 1 ? 'ies' : 'y'}</span>`
        : '';
      return `
        <a href="/services/${service.id}" class="featured-card">
          <div class="featured-photo" style="background-image: url('${photo}')"></div>
          <div class="featured-info">
            <h3>${service.name}</h3>
            <p class="featured-chef">by ${service.chefName} ${verifiedBadge} ${inquiryNote}</p>
            <p class="featured-cuisine">${cuisineList}</p>
            <p class="featured-location">📍 ${service.location}</p>
            <p class="featured-desc">${(service.description || '').substring(0, 100)}...</p>
            <div class="featured-meta">
              ${service.pricePerPerson && service.pricePerPerson > 0
                ? `<span class="featured-price">$${service.pricePerPerson}/person</span>`
                : `<span class="featured-price">Price upon request</span>`}
              <span class="featured-guests">${service.minGuests}-${service.maxGuests} guests</span>
            </div>
          </div>
        </a>`;
    }).join('')
    : `<p class="no-featured">Be the first to book a private chef experience in Montreal!</p>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Private Chefs in Montreal | Maison des Chefs</title>
  <meta name="description" content="Book a private chef for intimate dinners, parties, and special events in Montreal. Discover verified chefs, browse curated services, and create unforgettable dining experiences at home.">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background: #fafaf8; }
    nav { position: fixed; top: 0; left: 0; right: 0; background: rgba(0,0,0,0.9); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; z-index: 100; backdrop-filter: blur(10px); }
    nav .logo { color: white; font-size: 1.5rem; font-weight: bold; text-decoration: none; }
    nav .nav-links { display: flex; gap: 1.5rem; }
    nav .nav-links a { color: white; text-decoration: none; transition: opacity 0.3s; }
    nav .nav-links a:hover { opacity: 0.8; }
    nav .nav-links a.cta-link { background: #c9a227; color: white; padding: 0.5rem 1.2rem; border-radius: 4px; font-weight: 600; }

    .hero { min-height: 90vh; display: flex; align-items: center; justify-content: center; text-align: center; padding: 8rem 2rem 4rem; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); position: relative; overflow: hidden; }
    .hero::before { content: ''; position: absolute; inset: 0; background: url('https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1600&q=80') center/cover no-repeat; opacity: 0.15; }
    .hero-content { position: relative; z-index: 1; max-width: 760px; }
    .hero-eyebrow { color: #c9a227; font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 1rem; }
    .hero h1 { color: white; font-size: clamp(2.5rem, 6vw, 4rem); line-height: 1.15; margin-bottom: 1.25rem; font-weight: 800; }
    .hero h1 span { color: #c9a227; }
    .hero-sub { color: rgba(255,255,255,0.85); font-size: 1.2rem; margin-bottom: 2.5rem; max-width: 560px; margin-left: auto; margin-right: auto; }
    .hero-ctas { display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap; }
    .hero-cta-primary { background: #c9a227; color: white; padding: 1rem 2.5rem; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 1.1rem; transition: background 0.2s, transform 0.2s; }
    .hero-cta-primary:hover { background: #b8922a; transform: translateY(-2px); }
    .hero-cta-secondary { background: rgba(255,255,255,0.1); color: white; padding: 1rem 2.5rem; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 1.1rem; border: 1px solid rgba(255,255,255,0.3); transition: background 0.2s; }
    .hero-cta-secondary:hover { background: rgba(255,255,255,0.2); }
    .hero-trust { margin-top: 2rem; color: rgba(255,255,255,0.6); font-size: 0.9rem; display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; }
    .hero-trust span { display: flex; align-items: center; gap: 0.4rem; }

    .hero-search { margin-top: 2.5rem; position: sticky; top: 70px; z-index: 50; }
    .hero-search-form { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; max-width: 700px; margin: 0 auto; background: rgba(26, 26, 46, 0.95); padding: 1rem; border-radius: 12px; backdrop-filter: blur(10px); }
    .search-field { display: flex; flex-direction: column; gap: 0.3rem; background: rgba(255,255,255,0.1); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); min-width: 160px; }
    .search-field label { color: rgba(255,255,255,0.8); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .search-field input, .search-field select { background: white; border: none; border-radius: 4px; padding: 0.5rem 0.75rem; font-size: 1rem; color: #333; min-width: 0; }
    .search-field select { cursor: pointer; }
    .search-submit { background: #c9a227; color: white; border: none; padding: 0 2rem; border-radius: 6px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: background 0.2s; align-self: flex-end; min-height: 42px; }
    .search-submit:hover { background: #b8922a; }

    .stats-bar { background: white; padding: 2rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; max-width: 900px; margin: -2rem auto 0; position: relative; z-index: 2; box-shadow: 0 8px 32px rgba(0,0,0,0.12); border-radius: 12px; }
    .stat-item { text-align: center; padding: 1rem; }
    .stat-number { font-size: 2.2rem; font-weight: 800; color: #2c3e50; }
    .stat-label { color: #888; font-size: 0.9rem; margin-top: 0.25rem; }

    .how-it-works { padding: 5rem 2rem; text-align: center; background: white; }
    .section-eyebrow { color: #c9a227; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 0.75rem; }
    .section-title { font-size: clamp(1.8rem, 4vw, 2.5rem); color: #2c3e50; margin-bottom: 3rem; font-weight: 700; }
    .steps { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 2rem; max-width: 900px; margin: 0 auto; }
    .step { padding: 1.5rem; }
    .step-icon { width: 64px; height: 64px; background: #f8f5ef; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; font-size: 1.8rem; }
    .step h3 { font-size: 1.15rem; color: #2c3e50; margin-bottom: 0.5rem; }
    .step p { color: #666; font-size: 0.95rem; }

    .featured { padding: 5rem 2rem; background: #f8f9fa; }
    .featured-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; max-width: 1100px; margin: 0 auto; }
    .featured-card { background: white; border-radius: 12px; overflow: hidden; text-decoration: none; color: inherit; box-shadow: 0 2px 12px rgba(0,0,0,0.08); transition: transform 0.2s, box-shadow 0.2s; display: block; }
    .featured-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.14); }
    .featured-photo { height: 200px; background-size: cover; background-position: center; }
    .featured-info { padding: 1.25rem; }
    .featured-info h3 { font-size: 1.1rem; color: #2c3e50; margin-bottom: 0.35rem; }
    .featured-chef { color: #666; font-size: 0.9rem; margin-bottom: 0.35rem; }
    .featured-cuisine { color: #888; font-size: 0.85rem; margin-bottom: 0.35rem; }
    .featured-location { color: #888; font-size: 0.85rem; margin-bottom: 0.5rem; }
    .featured-desc { color: #555; font-size: 0.9rem; margin-bottom: 0.75rem; line-height: 1.5; }
    .featured-meta { display: flex; justify-content: space-between; align-items: center; padding-top: 0.75rem; border-top: 1px solid #f0f0f0; }
    .featured-price { font-weight: 700; color: #2c3e50; font-size: 1rem; }
    .featured-guests { color: #888; font-size: 0.85rem; }
    .verified-chip { background: #e8f5e9; color: #2e7d32; padding: 0.2rem 0.5rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .inquiry-chip { color: #e65100; font-size: 0.8rem; }
    .no-featured { color: #888; text-align: center; padding: 2rem; font-style: italic; }

    .trust-section { padding: 4rem 2rem; background: #2c3e50; color: white; text-align: center; }
    .trust-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 3rem; max-width: 900px; margin: 2rem auto 0; }
    .trust-item { display: flex; align-items: center; gap: 0.75rem; }
    .trust-icon { font-size: 1.5rem; }
    .trust-text { text-align: left; }
    .trust-text strong { display: block; font-size: 1rem; }
    .trust-text span { font-size: 0.85rem; opacity: 0.8; }

    .cta-section { padding: 5rem 2rem; text-align: center; background: linear-gradient(135deg, #c9a227 0%, #e8b923 100%); }
    .cta-section h2 { color: white; font-size: clamp(1.8rem, 4vw, 2.5rem); margin-bottom: 1rem; font-weight: 700; }
    .cta-section p { color: rgba(255,255,255,0.9); font-size: 1.1rem; margin-bottom: 2rem; max-width: 500px; margin-left: auto; margin-right: auto; }
    .cta-section a { background: white; color: #2c3e50; padding: 1rem 2.5rem; border-radius: 6px; text-decoration: none; font-weight: 700; font-size: 1.1rem; display: inline-block; transition: transform 0.2s; }
    .cta-section a:hover { transform: translateY(-2px); }

    footer { background: #1a1a1a; color: white; padding: 3rem 2rem; text-align: center; }
    footer .logo { font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem; }
    footer p { color: rgba(255,255,255,0.6); font-size: 0.9rem; }
    footer a { color: rgba(255,255,255,0.6); text-decoration: none; }
    footer a:hover { color: white; }
    .footer-links { margin-top: 1.5rem; display: flex; gap: 1.5rem; justify-content: center; flex-wrap: wrap; }

    @media (max-width: 768px) {
      .stats-bar { grid-template-columns: 1fr; margin: 0 1rem 0; }
      .hero-ctas { flex-direction: column; align-items: center; }
      .hero-ctas a { width: 100%; max-width: 300px; }
    }
  </style>
</head>
<body>
  <nav>
    <a href="/" class="logo">Maison des Chefs</a>
    <div class="nav-links">
      <a href="/services">Browse Chefs</a>
      <a href="/auth/login">Sign In</a>
      <a href="/services" class="cta-link">Book a Chef</a>
    </div>
  </nav>

  <section class="hero">
    <div class="hero-content">
      <p class="hero-eyebrow">Montreal's Premium Private Chef Marketplace</p>
      <h1>Your Private Chef,<br><span>For Every Occasion</span></h1>
      <p class="hero-sub">From intimate dinner parties to corporate events — discover and book verified private chefs in Montreal in minutes.</p>
      <div class="hero-ctas">
        <a href="/services" class="hero-cta-primary">Browse Chefs & Services</a>
        <a href="/services?sort=popular" class="hero-cta-secondary">🔥 See Most Popular</a>
      </div>
      <div class="hero-search">
        <form class="hero-search-form" action="/services" method="get">
          <div class="search-field">
            <label for="search-date">When is your event?</label>
            <input type="date" id="search-date" name="date" min="${new Date().toISOString().split('T')[0]}" required>
          </div>
          <div class="search-field">
            <label for="search-guests">Number of guests</label>
            <input type="number" id="search-guests" name="guests" min="1" max="50" placeholder="Guests" required>
          </div>
          <div class="search-field">
            <label for="search-type">Event type</label>
            <select id="search-type" name="type">
              <option value="">Select event type</option>
              <option value="private_dinner">Private Dinner</option>
              <option value="cooking_class">Cooking Class</option>
              <option value="birthday_party">Birthday Party</option>
              <option value="corporate_event">Corporate Event</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button type="submit" class="search-submit">Search Chefs</button>
        </form>
      </div>
      <div class="hero-trust">
        <span>✓ Verified chefs</span>
        <span>✓ Free to browse</span>
        <span>✓ No commitment to book</span>
      </div>
    </div>
  </section>

  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-number">${chefCount}+</div>
      <div class="stat-label">Verified Private Chefs</div>
    </div>
    <div class="stat-item">
      <div class="stat-number">${serviceCount}</div>
      <div class="stat-label">Curated Services</div>
    </div>
    <div class="stat-item">
      <div class="stat-number">${bookingCount > 0 ? bookingCount + '+' : '0'}</div>
      <div class="stat-label">Memorable Experiences</div>
    </div>
  </div>

  <section class="how-it-works">
    <p class="section-eyebrow">How It Works</p>
    <h2 class="section-title">Book Your Private Chef in 3 Steps</h2>
    <div class="steps">
      <div class="step">
        <div class="step-icon">🔍</div>
        <h3>Browse & Discover</h3>
        <p>Explore verified chefs by cuisine, price, and availability. Read about their specialties and past experiences.</p>
      </div>
      <div class="step">
        <div class="step-icon">📅</div>
        <h3>Submit a Request</h3>
        <p>Found your perfect chef? Submit a booking request with your event details. No payment required upfront.</p>
      </div>
      <div class="step">
        <div class="step-icon">🍽️</div>
        <h3>Enjoy Your Event</h3>
        <p>The chef confirms your date, handles all the cooking, and delivers an unforgettable dining experience at your home.</p>
      </div>
    </div>
  </section>

  ${featuredServices.length > 0 ? `
  <section class="featured">
    <p class="section-eyebrow" style="text-align:center; color:#c9a227; font-size:0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:0.15em; margin-bottom:0.75rem;">Popular Right Now</p>
    <h2 class="section-title" style="text-align:center;">Featured Services</h2>
    <div class="featured-grid">${featuredCards}</div>
    <p style="text-align:center; margin-top:2rem;"><a href="/services" style="color:#c9a227; font-weight:600; text-decoration:none; font-size:1.05rem;">View all services →</a></p>
  </section>
  ` : ''}

  <section class="trust-section">
    <p class="section-eyebrow" style="text-align:center; color:#c9a227; font-size:0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:0.15em; margin-bottom:0.75rem;">Why Maison des Chefs</p>
    <h2 class="section-title" style="color:white; text-align:center;">Built on Trust. Designed for You.</h2>
    <div class="trust-grid">
      <div class="trust-item">
        <div class="trust-icon">✓</div>
        <div class="trust-text"><strong>Verified Chefs</strong><span>Every chef is vetted before joining</span></div>
      </div>
      <div class="trust-item">
        <div class="trust-icon">🔒</div>
        <div class="trust-text"><strong>Secure Booking</strong><span>Your information is always protected</span></div>
      </div>
      <div class="trust-item">
        <div class="trust-icon">⚡</div>
        <div class="trust-text"><strong>Quick Response</strong><span>Chefs typically respond within hours</span></div>
      </div>
      <div class="trust-item">
        <div class="trust-icon">💬</div>
        <div class="trust-text"><strong>Dedicated Support</strong><span>We're here to help every step of the way</span></div>
      </div>
    </div>
  </section>

  <section class="cta-section">
    <h2>Ready for an Unforgettable Dining Experience?</h2>
    <p>Browse our curated selection of private chefs and find the perfect match for your next event.</p>
    <a href="/services">Browse All Services</a>
  </section>

  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>Montreal's premier private chef marketplace.</p>
    <div class="footer-links">
      <a href="/services">Browse Chefs</a>
      <a href="/services?sort=popular">Most Popular</a>
      <a href="/auth/login">Chef Login</a>
    </div>
    <p style="margin-top:1.5rem;">&copy; 2024 Maison des Chefs. All rights reserved.</p>
  </footer>
</body>
</html>`;
}
