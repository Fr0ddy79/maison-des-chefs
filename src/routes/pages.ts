// Page routes for HTML rendering
// This module serves HTML pages for the frontend

import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { services, users, chefProfiles, chefBlockedDates, reviews, leads, bookings, DIETARY_TAGS } from '../db/schema.js';
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
  return result?.avgMs ?? null;
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
      const chefIds = [...new Set(filteredServices.map(s => s.chefId))];
      const blockedDatesData = db.select({
        chefId: chefBlockedDates.chefId,
        date: chefBlockedDates.date,
      })
        .from(chefBlockedDates)
        .where(and(sql `${chefBlockedDates.chefId} IN (${sql.join(chefIds.map((id: number) => sql `${id}`), sql `, `)})`, eq(chefBlockedDates.date, selectedDate)))
        .all();
      blockedDatesData.forEach((bd: { chefId: number; date: string }) => {
        const existing = blockedDatesMap.get(bd.chefId) || [];
        existing.push(bd.date);
        blockedDatesMap.set(bd.chefId, existing);
      });
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
      if (l.count > maxLeadCount) {
        maxLeadCount = l.count;
        topServiceId = l.serviceId;
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
      filteredServices.sort((a, b) => (leadCountMap.get(b.id) || 0) - (leadCountMap.get(a.id) || 0));
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
      photos: services.photos,
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
    const servicePhotos = JSON.parse(service.photos || '[]');
    const serviceDietaryTags = JSON.parse(service.dietaryTags || '[]');
    const serviceWithPhotos = { ...service, photos: servicePhotos, dietaryTags: serviceDietaryTags };

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

    // Blocked dates
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 90);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    const blockedDates = db.select({ date: chefBlockedDates.date })
      .from(chefBlockedDates)
      .where(and(eq(chefBlockedDates.chefId, service.chefId), gte(chefBlockedDates.date, today), lte(chefBlockedDates.date, futureDateStr)))
      .orderBy(chefBlockedDates.date)
      .all();

    // Reviews
    const ratingResult = db.select({
      reviewCount: sql `count(*)`,
      avgRating: sql `coalesce(avg(${reviews.rating}), 0)`,
    })
      .from(reviews)
      .where(eq(reviews.serviceId, service.id))
      .get();
    const reviewCount = ratingResult?.reviewCount ?? 0;
    const avgRating = ratingResult?.avgRating ?? 0;

    // Featured review
    const featuredReview = db.select({
      comment: reviews.comment,
      rating: reviews.rating,
      createdAt: reviews.createdAt,
      dinerFirstName: users.name,
    })
      .from(reviews)
      .innerJoin(users, eq(reviews.dinerId, users.id))
      .where(and(eq(reviews.serviceId, service.id), isNotNull(reviews.comment), gteCol(sql `length(${reviews.comment})`, 20)))
      .orderBy(desc(reviews.createdAt))
      .limit(1)
      .get();

    const socialProof = {
      reviewCount,
      avgRating: reviewCount > 0 ? Math.round(avgRating * 10) / 10 : 0,
      featuredReview: featuredReview ? {
        comment: featuredReview.comment || '',
        rating: featuredReview.rating,
        createdAt: featuredReview.createdAt,
        dinerFirstName: featuredReview.dinerFirstName,
      } : null,
    };

    const avgResponseMs = getChefAvgResponseTime(service.chefId);
    const responseTimeBadge = buildResponseTimeBadge(avgResponseMs);

    const leadCountResult = db.select({ count: sql `count(${leads.id})` })
      .from(leads)
      .where(eq(leads.serviceId, service.id))
      .get();
    const leadCount = leadCountResult?.count ?? 0;

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
        const desktopCb = document.querySelector(`.dietary-filter-group.desktop-only input[value="${cb.value}"]`);
        if (desktopCb) cb.checked = desktopCb.checked;
      });
    }
    syncDietaryCheckboxes();
    
    document.querySelectorAll('.dietary-filter-collapsible input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const desktopCb = document.querySelector(`.dietary-filter-group.desktop-only input[value="${cb.value}"]`);
        if (desktopCb) desktopCb.checked = cb.checked;
        document.querySelector('.filter-container').closest('form').submit();
      });
    });
    
    document.querySelectorAll('.dietary-filter-group.desktop-only input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => {
        const mobileCb = document.querySelector(`.dietary-filter-collapsible input[value="${cb.value}"]`);
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
  const leadFormCtaText = ctaVariant === 'testB' ? 'Request Booking' : 'Send Inquiry';
  
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
      <a href="/services/${service.id}/book" class="book-btn" style="display: block; background: #c9a227; color: white; text-align: center; padding: 1rem; border-radius: 4px; text-decoration: none; font-weight: 600;">Book This Service</a>
    </div>
  </section>
  
  <footer>
    <div class="logo">Maison des Chefs</div>
    <p>Montreal's premier private chef marketplace.</p>
    <p>&copy; 2024 Maison des Chefs. All rights reserved.</p>
  </footer>
</body>
</html>`;
}
