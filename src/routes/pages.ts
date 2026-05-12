// Page routes for HTML rendering
// This module serves HTML pages for the frontend

import { FastifyInstance } from 'fastify';
import { db } from '../db/index.js';
import { services, users, chefProfiles, leads, bookings, reviews, dinerPreferences, DIETARY_TAGS } from '../db/schema.js';
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

// Mapping from wizard cuisine tags (snake_case) to display cuisines (Title Case)
const CUISINE_TAG_TO_DISPLAY: Record<string, string> = {
  'italian': 'Italian',
  'mexican': 'Mexican',
  'asian': 'Japanese',
  'american': 'American',
  'mediterranean': 'Mediterranean',
  'indian': 'Indian',
  'french': 'French',
  'middle_eastern': 'Middle Eastern',
  'other': 'Other',
};

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

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
  return text.replace(/[&<>"']/g, m => map[m]);
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

function buildColorCodedResponseBadge(avgResponseMs: number | null): string {
  if (avgResponseMs === null) {
    return '<span class="response-badge" style="background:#e2e3e5;color:#495057;">⚪ New chef</span>';
  }
  const avgMinutes = Math.round(avgResponseMs / 60000);
  if (avgMinutes < 60) {
    return '<span class="response-badge" style="background:#d4edda;color:#155724;">🟢 Responds &lt;1h</span>';
  } else if (avgMinutes < 240) {
    return '<span class="response-badge" style="background:#fff3cd;color:#856404;">🟡 Responds &lt;4h</span>';
  } else if (avgMinutes < 1440) {
    return '<span class="response-badge" style="background:#ffe5d0;color:#c55a11;">🟠 Responds &lt;24h</span>';
  } else {
    return '<span class="response-badge" style="background:#e2e3e5;color:#495057;">⚪ Slow</span>';
  }
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
      chefPhotoUrl: chefProfiles.photoUrl,
    })
      .from(services)
      .innerJoin(users, eq(services.chefId, users.id))
      .leftJoin(chefProfiles, eq(services.chefId, chefProfiles.userId))
      .$dynamic();

    // MAI-1211: Only show published (isPublished !== false) services in public catalog
    result = result.where(sql `(${services.isPublished} IS NULL OR ${services.isPublished} = 1)`);

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

    const servicesWithData = filteredServices.map(s => {
      const avgResponseMs = getChefAvgResponseTime(s.chefId);
      return {
        ...s,
        chefCuisineTypes: JSON.parse(s.chefCuisineTypes || '[]'),
        dietaryTags: JSON.parse(s.dietaryTags || '[]'),
        leadCount: leadCountMap.get(s.id) || 0,
        bookingCount: bookingCountMap.get(s.id) || 0,
        isTopService: s.id === topServiceId && maxLeadCount > 0,
        isUnavailableOnDate: (selectedDate && blockedDatesMap.get(s.chefId)?.includes(selectedDate)) || false,
        avgResponseMs,
      };
    });

    reply.header('Content-Type', 'text/html; charset=utf-8');
    // MAI-1120: Auto-apply diner preferences if logged-in and no prefs explicitly set in URL
    const cookies = request.cookies as Record<string, string>;
    const authToken = cookies?.auth_token;
    const clearPersonalization = query.clear_personalization === '1';
    let autoAppliedPrefs: { cuisines: string[]; dietaryRestrictions: string[]; defaultPartySize?: number } | null = null;
    if (authToken && !clearPersonalization) {
      try {
        const decoded = server.jwt.verify(authToken) as { userId: number; role: string };
        if (decoded.role === 'diner') {
          const prefs = db.select().from(dinerPreferences).where(eq(dinerPreferences.userId, decoded.userId)).get();
          if (prefs && prefs.wizardCompletionStatus === 'completed') {
            autoAppliedPrefs = {
              cuisines: JSON.parse(prefs.cuisines),
              dietaryRestrictions: JSON.parse(prefs.dietaryRestrictions),
              defaultPartySize: prefs.defaultPartySize,
            };
          }
        }
      } catch { /* invalid token - ignore */ }
    }
    // Build augmented query with auto-applied preferences
    const augmentedQuery = { ...query };
    let isPersonalized = false;
    if (autoAppliedPrefs && !query.personalized) {
      // Auto-apply dietary restrictions if not already filtered
      if (!query.dietary_tags && autoAppliedPrefs.dietaryRestrictions.length > 0) {
        const filteredDietary = autoAppliedPrefs.dietaryRestrictions.filter(t => t !== 'none');
        if (filteredDietary.length > 0) {
          augmentedQuery.dietary_tags = filteredDietary.join(',');
          isPersonalized = true;
        }
      }
      // Auto-apply first cuisine preference if not already selected
      if (!query.cuisine && autoAppliedPrefs.cuisines.length > 0) {
        const firstCuisine = autoAppliedPrefs.cuisines[0];
        const displayCuisine = CUISINE_TAG_TO_DISPLAY[firstCuisine] || firstCuisine;
        augmentedQuery.cuisine = displayCuisine;
        isPersonalized = true;
      }
    }
    return buildServicesPage(servicesWithData, augmentedQuery, CUISINE_TYPES, isPersonalized ? autoAppliedPrefs : null);
  });

  // Service detail page
  server.get('/services/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const url = new URL(request.url, 'http://localhost');
    const useSimplifiedLeadForm = url.searchParams.get('lead_form') === 'simplified';
    const useNewSidebarCta = url.searchParams.get('sidebar') === 'new_cta';
    // CTA A/B Test: detect variant from URL param, cookie, or default to control
    // Variants: control, testA (Request Your Date), testB (Request Booking), testC (Check Availability), testD (same as testA)
    const ctaParam = url.searchParams.get('cta');
    const cookies = request.cookies as Record<string, string>;
    const cookieVariant = cookies?.cta_variant;
    const validVariants = ['control', 'testA', 'testB', 'testC', 'testD'];
    // Priority: URL param > cookie > control
    const ctaVariant = validVariants.includes(ctaParam || '') ? ctaParam : (validVariants.includes(cookieVariant || '') ? cookieVariant : 'control');

    const service = db.select({
      id: services.id,
      chefId: services.chefId,
      name: services.name,
      description: services.description,
      pricePerPerson: services.pricePerPerson,
      minGuests: services.minGuests,
      maxGuests: services.maxGuests,

      dietaryTags: services.dietaryTags,
      photos: services.photos,
      createdAt: services.createdAt,
      chefName: users.name,
      chefLocation: chefProfiles.location,
      chefCuisineTypes: chefProfiles.cuisineTypes,
      chefVerified: chefProfiles.verified,
      chefBio: chefProfiles.bio,
      chefPhotoUrl: chefProfiles.photoUrl,
    })
      .from(services)
      .innerJoin(users, eq(services.chefId, users.id))
      .leftJoin(chefProfiles, eq(services.chefId, chefProfiles.userId))
      .where(eq(services.id, parseInt(id)))
      .get();

    // Trust Bar A/B Test: determine variant (priority: URL param > cookie > random 50/50)
    const trustBarParam = url.searchParams.get('trust_bar');
    const trustBarCookie = cookies?.trust_bar_variant;
    let trustBarVariant: string;
    if (trustBarParam === 'A' || trustBarParam === 'B') {
      trustBarVariant = trustBarParam;
    } else if (trustBarCookie === 'A' || trustBarCookie === 'B') {
      trustBarVariant = trustBarCookie;
    } else {
      trustBarVariant = Math.random() < 0.5 ? 'A' : 'B';
    }

    if (!service) {
      reply.header('Content-Type', 'text/html; charset=utf-8');
      return build404Page();
    }

    const cuisineTypes = JSON.parse(service.chefCuisineTypes || '[]');
    const serviceDietaryTags = JSON.parse(service.dietaryTags || '[]');
    const servicePhotos = JSON.parse(service.photos || '[]');
    const serviceWithPhotos = { ...service, photos: servicePhotos, dietaryTags: serviceDietaryTags };

    trackServicePageViewEvent({
      serviceId: service.id,
      chefId: service.chefId,
      pricePerPerson: service.pricePerPerson,
      cuisineType: cuisineTypes[0] || '',
      variant: ctaVariant,
    });

    // Use chef's uploaded photo if available, otherwise fall back to cuisine-based placeholder
    const photo = service.chefPhotoUrl || getChefPhoto(cuisineTypes);
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

    // Reviews - use real reviews table (MAI-940)
    const ratingResult = db.select({
      reviewCount: sql<number>`count(*)`,
      avgRating: sql<number>`coalesce(avg(${reviews.rating}), 0)`,
    })
      .from(reviews)
      .where(eq(reviews.serviceId, service.id))
      .get();
    const reviewCount = (ratingResult?.reviewCount as number | null) ?? 0;
    const avgRating = (ratingResult?.avgRating as number | null) ?? 0;

    // Featured review (most recent review with a comment)
    const featuredReviewRow = db.select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      dinerName: users.name,
    })
      .from(reviews)
      .innerJoin(users, eq(reviews.dinerId, users.id))
      .where(and(eq(reviews.serviceId, service.id), sql `${reviews.comment} IS NOT NULL`))
      .orderBy(sql `${reviews.createdAt} DESC`)
      .limit(1)
      .get();

    const featuredReview = featuredReviewRow ? {
      id: featuredReviewRow.id,
      rating: featuredReviewRow.rating,
      comment: featuredReviewRow.comment,
      createdAt: featuredReviewRow.createdAt,
      dinerName: featuredReviewRow.dinerName,
      dinerFirstName: featuredReviewRow.dinerName?.split(' ')[0] ?? 'Guest',
    } : null;

    // Recent reviews (up to 3, most recent first)
    const recentReviewsRows = db.select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      dinerName: users.name,
    })
      .from(reviews)
      .innerJoin(users, eq(reviews.dinerId, users.id))
      .where(eq(reviews.serviceId, service.id))
      .orderBy(sql `${reviews.createdAt} DESC`)
      .limit(3)
      .all();

    const recentReviews = recentReviewsRows.map(r => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      dinerName: r.dinerName,
      dinerFirstName: r.dinerName?.split(' ')[0] ?? 'Guest',
    }));

    const socialProof = {
      reviewCount,
      avgRating: reviewCount > 0 ? Math.round(avgRating * 10) / 10 : 0,
      featuredReview,
      recentReviews,
    };

    // Trust Bar A/B Test: count confirmed bookings for this chef this month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const bookingsThisMonthResult = db.select({ count: sql`count(*)` })
      .from(bookings)
      .where(and(
        eq(bookings.chefId, service.chefId),
        gte(bookings.eventDate, currentMonth + '-01'),
        sql`${bookings.status} IN ('completed', 'confirmed')`
      ))
      .get();
    const bookingsThisMonth = (bookingsThisMonthResult?.count as number | null) ?? 0;

    const avgResponseMs = getChefAvgResponseTime(service.chefId);
    const responseTimeBadge = buildResponseTimeBadge(avgResponseMs);

    const leadCountResult = db.select({ count: sql `count(${leads.id})` })
      .from(leads)
      .where(eq(leads.serviceId, service.id))
      .get();
    const leadCount = (leadCountResult?.count as number | null) ?? 0;

    reply.header('Content-Type', 'text/html; charset=utf-8');
    // Trust Bar A/B: set cookie for SSR on subsequent requests
    reply.header('Set-Cookie', `trust_bar_variant=${trustBarVariant}; Path=/; Max-Age=86400; SameSite=Lax`);
    return buildServiceDetailPage(serviceWithPhotos, cuisineTypes, photo, verifiedBadge, blockedDates, useSimplifiedLeadForm, useNewSidebarCta, socialProof, ctaVariant, responseTimeBadge, leadCount, trustBarVariant, service.chefVerified ?? false, bookingsThisMonth);
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

function buildServicesPage(services: any[], filters: Record<string, string>, cuisineOptions: string[], autoPrefs: { cuisines: string[]; dietaryRestrictions: string[]; defaultPartySize?: number } | null): string {
  const currentCuisine = filters.cuisine || '';
  const currentMinPrice = filters.minPrice || '';
  const currentMaxPrice = filters.maxPrice || '';
  const currentSort = filters.sort || 'newest';
  const currentDate = filters.date || '';
  const currentDietaryTags = filters.dietary_tags ? filters.dietary_tags.split(',').map((t: string) => t.trim()) : [];
  const isPersonalized = !!autoPrefs;
  const personalizationBanner = isPersonalized
    ? `<div class="personalization-banner">
        <span class="personalization-icon">✨</span>
        <span class="personalization-text">Personalized for you based on your <a href="/onboarding">dietary preferences</a></span>
        <a href="/services?clear_personalization=1" class="clear-personalization">Clear personalization</a>
      </div>`
    : '';
  const dietaryFilterHtml = Object.entries(DIETARY_TAG_LABELS).map(([value, info]) => {
    const checked = currentDietaryTags.includes(value) ? 'checked' : '';
    return `<label class="dietary-filter-checkbox"><input type="checkbox" name="dietary_tags" value="${value}" ${checked}> ${info.icon} ${info.label}</label>`;
  }).join('');

  const serviceCards = services.length > 0
    ? services.map(service => {
      // Use chef's uploaded photo if available, otherwise fall back to cuisine-based placeholder
      const photo = service.chefPhotoUrl || getChefPhoto(service.chefCuisineTypes || []);
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
            <div class="response-badges" style="margin-top:0.5rem;">${buildColorCodedResponseBadge(service.avgResponseMs)}</div>
          </div>
        </a>
        <label class="compare-checkbox-label">
          <input type="checkbox" class="compare-chef-checkbox" data-service-id="${service.id}" data-chef-id="${service.chefId}" data-service-name="${service.name}" data-chef-name="${service.chefName}" onchange="toggleCompareChef(this)">
          <span class="compare-checkbox-custom"></span>
          <span class="compare-checkbox-text">Compare</span>
        </label>
        <div class="card-actions">
          <button class="card-inquire-btn" onclick="openServiceInquiryModal(${service.id}, '${escapeHtml(service.name)}', '${escapeHtml(service.chefName)}')" type="button">Inquire</button>
        </div>
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
    .personalization-banner { background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%); border-bottom: 1px solid #ffe082; padding: 0.75rem 2rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem; }
    .personalization-icon { font-size: 1.1rem; }
    .personalization-text { color: #5d4037; flex: 1; }
    .personalization-text a { color: #c9a227; font-weight: 600; text-decoration: none; }
    .personalization-text a:hover { text-decoration: underline; }
    .clear-personalization { color: #c9a227; font-weight: 600; text-decoration: none; white-space: nowrap; }
    .clear-personalization:hover { text-decoration: underline; }
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
    .inquiry-floating-bar { position: fixed; bottom: 0; left: 0; right: 0; background: #2c3e50; color: white; padding: 1rem 2rem; display: none; align-items: center; justify-content: space-between; z-index: 200; box-shadow: 0 -4px 16px rgba(0,0,0,0.2); }
    .inquiry-floating-bar.visible { display: flex; }
    .inquiry-bar-info { display: flex; align-items: center; gap: 0.75rem; font-size: 1rem; flex-wrap: wrap; }
    .inquiry-bar-count { background: #c9a227; color: white; padding: 0.2rem 0.7rem; border-radius: 20px; font-weight: 700; font-size: 0.9rem; }
    .inquiry-bar-btn { background: #c9a227; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .inquiry-bar-btn:hover { background: #b8922a; }
    .compare-bar-compare-btn { background: #27ae60; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 6px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-right: 0.5rem; }
    .compare-bar-compare-btn:hover { background: #219a52; }
    .compare-bar-chef-tag { background: rgba(255,255,255,0.15); padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 0.4rem; }
    .remove-tag { cursor: pointer; opacity: 0.8; font-weight: bold; }
    .remove-tag:hover { opacity: 1; }
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
    .modal-form-group { margin-bottom: 1.25rem; }
    .modal-form-group label { display: block; font-weight: 500; color: #555; margin-bottom: 0.4rem; font-size: 0.95rem; }
    .modal-form-group label .required { color: #e53935; }
    .modal-form-group input, .modal-form-group textarea { width: 100%; padding: 0.75rem 1rem; border: 1px solid #ddd; border-radius: 6px; font-size: 1rem; font-family: inherit; transition: border-color 0.2s; box-sizing: border-box; }
    .modal-form-group input:focus, .modal-form-group textarea:focus { outline: none; border-color: #c9a227; }
    .modal-form-group textarea { min-height: 80px; resize: vertical; }
    .modal-form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    .modal-submit-btn { width: 100%; background: #c9a227; color: white; border: none; padding: 1rem; border-radius: 6px; font-size: 1.1rem; font-weight: 600; cursor: pointer; transition: background 0.2s; margin-top: 0.5rem; }
    .modal-submit-btn:hover { background: #b8922a; }
    .card-actions { display: flex; gap: 0.5rem; padding: 0 1.5rem 1.5rem; }
    .card-inquire-btn { flex: 1; background: #c9a227; color: white; border: none; padding: 0.6rem 1rem; border-radius: 6px; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: background 0.2s; }
    .card-inquire-btn:hover { background: #b8922a; }
    .service-inquiry-modal .modal-chef-summary { background: #f8f9fa; border-radius: 8px; padding: 0.75rem 1rem; margin-bottom: 1.25rem; font-size: 0.95rem; color: #333; }
    .service-inquiry-modal .modal-chef-summary strong { color: #2c3e50; }
    .modal-success { text-align: center; padding: 1rem 0; }
    .modal-success .success-icon { font-size: 3rem; margin-bottom: 1rem; }
    .modal-success h3 { font-size: 1.4rem; color: #2c3e50; margin-bottom: 0.75rem; }
    .modal-success p { color: #555; margin-bottom: 0.75rem; }
    .modal-success .status-url { background: #f0f8e8; border: 1px solid #a5d6a7; border-radius: 6px; padding: 0.75rem 1rem; margin: 1rem 0; word-break: break-all; }
    .modal-success .status-url a { color: #2e7d32; font-weight: 600; text-decoration: none; }
    .modal-success .status-url a:hover { text-decoration: underline; }
    .modal-success .trust-note { font-size: 0.85rem; color: #888; margin-top: 0.5rem; }
    .modal-success .success-timeline { background: #f8f9fa; border-radius: 8px; padding: 1rem 1.25rem; margin: 1rem 0; text-align: left; }
    .modal-success .timeline-step { display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.5rem 0; font-size: 0.9rem; color: #555; border-left: 2px solid #e0e0e0; margin-left: 0.5rem; padding-left: 1rem; }
    .modal-success .timeline-step.done { color: #2e7d32; border-left-color: #81c784; }
    .modal-success .timeline-step .step-icon { font-size: 1.2rem; flex-shrink: 0; }
    .modal-success .timeline-step .step-time { display: block; font-size: 0.8rem; color: #888; margin-top: 0.15rem; }
    .modal-success .timeline-step.done .step-time { color: #81c784; }
    @media (max-width: 768px) {
      .inquiry-floating-bar { padding: 0.75rem 1rem; flex-direction: column; gap: 0.75rem; align-items: flex-start; }
      .inquiry-bar-info { font-size: 0.9rem; }
      .inquiry-bar-btn { width: 100%; padding: 0.6rem 1rem; }
      .modal-form-row { grid-template-columns: 1fr; }
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
  
  ${personalizationBanner}
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
      const compareBtn = document.getElementById('compareBtn');
      const chefCountEl = document.getElementById('selectedChefCount');
      const pluralSEl = document.getElementById('pluralS');
      if (chefCountEl) chefCountEl.textContent = String(selectedChefs.length);
      if (pluralSEl) pluralSEl.textContent = selectedChefs.length !== 1 ? 's' : '';
      if (selectedContainer) {
        selectedContainer.innerHTML = selectedChefs.map(c => 
          '<span class="compare-bar-chef-tag">' + c.serviceName + ' <span class="remove-tag" onclick="event.preventDefault(); removeChef(' + c.chefId + ')">×</span></span>'
        ).join('');
      }
      if (inquireBtn) {
        inquireBtn.style.display = selectedChefs.length >= 2 ? 'inline-block' : 'none';
      }
      if (compareBtn) {
        compareBtn.style.display = selectedChefs.length >= 2 ? 'inline-block' : 'none';
      }
      bar.classList.toggle('visible', selectedChefs.length >= 2);
    }
    
    function goToCompare() {
      if (selectedChefs.length < 2) return;
      var ids = selectedChefs.map(function(c) { return c.chefId; }).join(',');
      window.location.href = '/compare?chefs=' + ids;
    }
    
    function removeChef(chefId) {
      const checkbox = document.querySelector('.compare-chef-checkbox[data-chef-id="' + chefId + '"]');
      if (checkbox) checkbox.checked = false;
      selectedChefs = selectedChefs.filter(c => c.chefId !== chefId);
      updateCompareBar();
    }
    
    function openCompareModal() {
      // Populate modal chefs list
      var chefsListEl = document.getElementById('modalChefsList');
      if (chefsListEl) {
        var html = '';
        selectedChefs.forEach(function(c) {
          html += '<div class="modal-chef-item"><span>' + escapeHtml(c.chefName) + ' - ' + escapeHtml(c.serviceName) + '</span></div>';
        });
        chefsListEl.innerHTML = html;
      }
      
      // Update submit button text
      var count = selectedChefs.length;
      var modalCountEl = document.getElementById('modalChefCount');
      var modalPluralEl = document.getElementById('modalPluralS');
      if (modalCountEl) modalCountEl.textContent = count;
      if (modalPluralEl) modalPluralEl.textContent = count > 1 ? 's' : '';
      
      // Build serviceIds array
      var serviceIds = selectedChefs.map(function(c) { return c.serviceId; });
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
      
      document.getElementById('compareModal').style.display = 'flex';
    }
    
    function escapeHtml(text) {
      var div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function closeCompareModal() {
      document.getElementById('compareModal').style.display = 'none';
    }
    
    // Close modal on overlay click
    document.getElementById('compareModal').addEventListener('click', function(e) {
      if (e.target === this) closeCompareModal();
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
          submitBtn.textContent = 'Send Inquiry to ' + selectedChefs.length + ' Chef' + (selectedChefs.length > 1 ? 's' : '');
          return;
        }
        
        // Show success
        var modalBody = document.getElementById('inquiryModalBody');
        var chefsSummaryHtml = selectedChefs.map(function(c) {
          return '<div class="modal-chef-item">' + escapeHtml(c.chefName) + ' - ' + escapeHtml(c.serviceName) + '</div>';
        }).join('');
        
        modalBody.innerHTML = '<div class="modal-success">' +
          '<div class="success-icon">&#x2705;</div>' +
          '<h3>Inquiry Sent!</h3>' +
          '<div class="success-timeline">' +
            '<div class="timeline-step done"><span class="step-icon">✅</span><span class="step-text">Your inquiry was sent to ' + result.leadIds.length + ' chef' + (result.leadIds.length > 1 ? 's' : '') + '</span></div>' +
            '<div class="timeline-step"><span class="step-icon">👨‍🍳</span><span class="step-text">Each chef reviews your request <em class="step-time">within 24 hours</em></span></div>' +
            '<div class="timeline-step"><span class="step-icon">📩</span><span class="step-text">Chefs send you personalized quotes <em class="step-time">within 24-48 hours</em></span></div>' +
            '<div class="timeline-step"><span class="step-icon">💳</span><span class="step-text">You confirm & pay to lock in your date</span></div>' +
          '</div>' +
          '<div class="chef-list-summary">' + chefsSummaryHtml + '</div>' +
          '<p style="font-size:0.9rem;color:#666">Each chef will respond within 24 hours.</p>' +
          '<button class="modal-submit-btn" onclick="closeCompareModal(); location.reload();" style="margin-top:1rem;">Back to Services</button>' +
        '</div>';
      } catch (err) {
        alert('Network error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Inquiry to ' + selectedChefs.length + ' Chef' + (selectedChefs.length > 1 ? 's' : '');
      }
    });

    // Service inquiry modal functions
    function openServiceInquiryModal(serviceId, serviceName, chefName) {
      var modal = document.getElementById('serviceInquiryModal');
      var summary = document.getElementById('serviceInquiryChefSummary');
      var serviceIdInput = document.getElementById('serviceInquiryServiceId');
      var form = document.getElementById('serviceInquiryForm');
      if (summary) summary.innerHTML = '<strong>' + escapeHtml(serviceName) + '</strong> by ' + escapeHtml(chefName);
      if (serviceIdInput) serviceIdInput.value = serviceId;
      if (form) form.reset();
      var submitBtn = document.getElementById('serviceInquirySubmitBtn');
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Inquiry'; }
      // Reset to form view if modal was showing success
      var modalBody = document.getElementById('serviceInquiryModalBody');
      if (modalBody && !modalBody.querySelector('#serviceInquiryForm')) {
        // Re-build the form HTML if success state was shown
        modalBody.innerHTML = document.getElementById('serviceInquiryModalBody').dataset.originalBody || '';
      }
      // Store original body for reset
      try {
        var formEl = document.getElementById('serviceInquiryForm');
        if (formEl && !formEl.dataset.originalSet) {
          modalBody.dataset.originalBody = modalBody.innerHTML;
          formEl.dataset.originalSet = 'true';
        }
      } catch(e) {}
      if (modal) modal.style.display = 'flex';
      // Pre-fill from cookies
      var cookieEmail = getCookie('diner_email');
      var cookieName = getCookie('diner_name');
      var cookiePhone = getCookie('diner_phone');
      var emailEl = document.getElementById('serviceInquiryEmail');
      var nameEl = document.getElementById('serviceInquiryClientName');
      var phoneEl = document.getElementById('serviceInquiryPhone');
      if (emailEl && cookieEmail) emailEl.value = cookieEmail;
      if (nameEl && cookieName) nameEl.value = cookieName;
      if (phoneEl && cookiePhone) phoneEl.value = cookiePhone;
    }

    function closeServiceInquiryModal() {
      var modal = document.getElementById('serviceInquiryModal');
      if (modal) modal.style.display = 'none';
    }

    document.getElementById('serviceInquiryModal').addEventListener('click', function(e) {
      if (e.target === this) closeServiceInquiryModal();
    });

    document.getElementById('serviceInquiryForm').addEventListener('submit', async function(e) {
      e.preventDefault();
      var form = e.target;
      var submitBtn = document.getElementById('serviceInquirySubmitBtn');
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      var formData = {
        serviceId: parseInt(document.getElementById('serviceInquiryServiceId').value, 10),
        clientName: form.clientName.value,
        email: form.email.value,
        phone: form.phone.value || undefined,
        eventDate: form.eventDate.value || undefined,
        guestCount: parseInt(form.guestCount.value, 10) || 1,
        message: form.message.value || undefined,
      };
      try {
        var response = await fetch('/api/inquiry', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });
        var result = await response.json();
        if (!response.ok) {
          alert('Error: ' + (result.error || 'Failed to submit inquiry'));
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Inquiry';
          return;
        }
        var modalBody = document.getElementById('serviceInquiryModalBody');
        var statusUrl = result.bookingStatusUrl || ('/booking-status?token=' + (result.accessToken || ''));
        modalBody.innerHTML = '<div class="modal-success">' +
          '<div class="success-icon">&#x2705;</div>' +
          '<h3>Inquiry Sent!</h3>' +
          '<div class="success-timeline">' +
            '<div class="timeline-step done"><span class="step-icon">✅</span><span class="step-text">Your inquiry was sent</span></div>' +
            '<div class="timeline-step"><span class="step-icon">👨‍🍳</span><span class="step-text">Chef reviews your request <em class="step-time">within 24 hours</em></span></div>' +
            '<div class="timeline-step"><span class="step-icon">📩</span><span class="step-text">Chef sends you a personalized quote <em class="step-time">within 24-48 hours</em></span></div>' +
            '<div class="timeline-step"><span class="step-icon">💳</span><span class="step-text">You confirm & pay to lock in your date</span></div>' +
          '</div>' +
          '<div class="status-url">Track your inquiry: <a href="' + statusUrl + '" target="_blank">' + statusUrl + '</a></div>' +
          '<p class="trust-note">No payment required today &bull; Chef will email you directly &bull; Response within 24-48 hours</p>' +
          '<button class="modal-submit-btn" onclick="closeServiceInquiryModal();" style="margin-top:1rem;">Back to Services</button>' +
        '</div>';
      } catch (err) {
        alert('Network error. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Inquiry';
      }
    });
  </script>

  <div class="inquiry-floating-bar" id="compareBar">
    <div class="inquiry-bar-info">
      <span class="inquiry-bar-count" id="selectedChefCount">0</span>
      <span>chef<span id="pluralS">s</span> selected</span>
      <div id="compareBarSelected" style="display:inline-flex;gap:0.4rem;margin-left:0.5rem;flex-wrap:wrap;"></div>
    </div>
    <button class="inquiry-bar-btn" id="compareInquireBtn" onclick="openCompareModal()" style="display:none;">Inquire Selected</button>
    <button class="compare-bar-compare-btn" id="compareBtn" onclick="goToCompare()" style="display:none;">Compare Chefs</button>
  </div>

  <div class="modal-overlay" id="compareModal">
    <div class="modal">
      <div class="modal-header">
        <h2>Send Inquiry</h2>
        <button class="modal-close" onclick="closeCompareModal()">×</button>
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

  <div class="modal-overlay" id="serviceInquiryModal" style="display:none;">
    <div class="modal service-inquiry-modal">
      <div class="modal-header">
        <h2>Inquire About Service</h2>
        <button class="modal-close" onclick="closeServiceInquiryModal()">×</button>
      </div>
      <div class="modal-body" id="serviceInquiryModalBody">
        <div class="modal-chef-summary" id="serviceInquiryChefSummary"></div>
        <form id="serviceInquiryForm">
          <input type="hidden" id="serviceInquiryServiceId" name="serviceId" value="">
          <div class="modal-form-row">
            <div class="modal-form-group">
              <label for="serviceInquiryClientName">Your Name <span class="required">*</span></label>
              <input type="text" id="serviceInquiryClientName" name="clientName" required placeholder="Full name">
            </div>
            <div class="modal-form-group">
              <label for="serviceInquiryEmail">Email <span class="required">*</span></label>
              <input type="email" id="serviceInquiryEmail" name="email" required placeholder="you@example.com">
            </div>
          </div>
          <div class="modal-form-row">
            <div class="modal-form-group">
              <label for="serviceInquiryPhone">Phone</label>
              <input type="tel" id="serviceInquiryPhone" name="phone" placeholder="(555) 123-4567">
            </div>
            <div class="modal-form-group">
              <label for="serviceInquiryGuestCount">Guests <span class="required">*</span></label>
              <input type="number" id="serviceInquiryGuestCount" name="guestCount" required min="1" value="2">
            </div>
          </div>
          <div class="modal-form-group">
            <label for="serviceInquiryEventDate">Preferred Date</label>
            <input type="date" id="serviceInquiryEventDate" name="eventDate">
          </div>
          <div class="modal-form-group">
            <label for="serviceInquiryMessage">Message to Chef</label>
            <textarea id="serviceInquiryMessage" name="message" placeholder="Tell the chef about your event, dietary requirements, or any special requests..."></textarea>
          </div>
          <button type="submit" class="modal-submit-btn" id="serviceInquirySubmitBtn">Send Inquiry</button>
        </form>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildServiceDetailPage(service: any, cuisineTypes: string[], photo: string, verifiedBadge: string, blockedDates: { date: string }[], useSimplifiedLeadForm: boolean, useNewSidebarCta: boolean, socialProof: any, ctaVariant: string, responseTimeBadge: string, leadCount: number, trustBarVariant: string, chefVerified: boolean, bookingsThisMonth: number): string {
  const cuisineList = cuisineTypes.join(', ');
  const sp = socialProof ?? { reviewCount: 0, avgRating: 0, featuredReview: null, recentReviews: [] };
  const hasEnoughReviews = sp.reviewCount >= 3;
  const showRating = hasEnoughReviews && sp.avgRating > 0;
  const showTestimonial = sp.featuredReview?.comment != null;
  const recentReviews = sp.recentReviews ?? [];
  const leadFormCtaText = ctaVariant === 'testB' ? 'Request Booking' : ctaVariant === 'testA' ? 'Request Your Date' : ctaVariant === 'testC' ? 'Check Availability' : 'Book This Service';
  
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
  
  // Photo gallery: build grid HTML and lightbox
  const photos = Array.isArray(service.photos) ? service.photos : [];
  const hasPhotos = photos.length > 0;
  const photoGridHtml = hasPhotos
    ? photos.map((photo: string, idx: number) =>
        `<div class="photo-gallery-item" data-index="${idx}" onclick="openLightbox(${idx})">
          <img src="${photo}" alt="Dish photo ${idx + 1}" loading="lazy" />
        </div>`
      ).join('')
    : '';
  const photoSectionHtml = hasPhotos
    ? `<h2>Dish Photos</h2><div class="photo-gallery">${photoGridHtml}</div>`
    : `<h2>Dish Photos</h2><p class="no-photos">Dish photos coming soon</p>`;
  const lightboxHtml = hasPhotos
    ? `<div id="lightbox" class="lightbox" style="display:none;">
        <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
        <button class="lightbox-prev" onclick="prevPhoto(event)">&#10094;</button>
        <button class="lightbox-next" onclick="nextPhoto(event)">&#10095;</button>
        <img id="lightbox-img" src="" alt="Dish photo" />
        <div class="lightbox-counter"><span id="lightbox-counter">1 / ${photos.length}</span></div>
      </div>`
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
    .photo-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 2rem; }
    .photo-gallery-item { cursor: pointer; border-radius: 8px; overflow: hidden; aspect-ratio: 1; background: #f0f0f0; }
    .photo-gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s; }
    .photo-gallery-item:hover img { transform: scale(1.05); }
    .no-photos { color: #888; font-style: italic; padding: 1rem 0; }
    .lightbox { position: fixed; inset: 0; background: rgba(0,0,0,0.92); z-index: 1000; display: flex; align-items: center; justify-content: center; }
    .lightbox img { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 4px; }
    .lightbox-close { position: absolute; top: 1rem; right: 1.5rem; background: none; border: none; color: white; font-size: 2.5rem; cursor: pointer; line-height: 1; }
    .lightbox-prev, .lightbox-next { position: absolute; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: white; font-size: 2rem; cursor: pointer; padding: 0.75rem 1rem; border-radius: 4px; }
    .lightbox-prev { left: 1rem; }
    .lightbox-next { right: 1rem; }
    .lightbox-counter { position: absolute; bottom: 1rem; left: 50%; transform: translateX(-50%); color: white; font-size: 1rem; background: rgba(0,0,0,0.5); padding: 0.4rem 0.8rem; border-radius: 20px; }
    @media (max-width: 768px) {
      .photo-gallery { grid-template-columns: repeat(2, 1fr); }
    }
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
    .reviews-section { margin-top: 2rem; }
    .reviews-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 0.75rem; }
    .reviews-title { font-size: 1.3rem; color: #2c3e50; margin: 0; display: flex; align-items: center; gap: 0.5rem; }
    .reviews-summary { display: flex; align-items: center; gap: 1rem; }
    .avg-rating { display: flex; align-items: center; gap: 0.4rem; font-size: 1.1rem; font-weight: 700; color: #2c3e50; }
    .avg-rating .star { color: #c9a227; font-size: 1.2rem; }
    .review-count { color: #666; font-size: 0.95rem; }
    .review-card { background: white; border-radius: 8px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 2px 6px rgba(0,0,0,0.05); border: 1px solid #eee; }
    .review-card:last-child { margin-bottom: 0; }
    .review-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
    .review-author { font-weight: 600; color: #2c3e50; }
    .review-rating { color: #c9a227; letter-spacing: 0.1rem; }
    .review-date { color: #888; font-size: 0.85rem; }
    .review-comment { color: #555; line-height: 1.6; }
    .featured-review { background: linear-gradient(135deg, #fefcf5 0%, #f9f3e8 100%); border: 2px solid #c9a227; }
    .featured-label { display: inline-block; background: #c9a227; color: white; font-size: 0.75rem; font-weight: 600; padding: 0.2rem 0.6rem; border-radius: 4px; margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05rem; }
    .no-reviews { text-align: center; padding: 2rem; color: #888; font-style: italic; }
    .hero-rating-badge { display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: white; padding: 0.75rem 1.5rem; border-radius: 8px; margin-top: -1.5rem; position: relative; z-index: 10; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-width: 300px; margin-left: auto; margin-right: auto; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; }
    .hero-rating-badge:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.15); }
    .hero-rating-badge .rating-stars { color: #ffc107; font-size: 1.2rem; letter-spacing: 2px; }
    .hero-rating-badge .rating-text { color: #2c3e50; font-weight: 600; font-size: 1rem; }
    .hero-rating-badge .rating-count { color: #888; font-weight: 400; font-size: 0.9rem; }
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
  
  ${sp.reviewCount > 0 ? `
  <div class="hero-rating-badge" onclick="document.getElementById('reviews-section').scrollIntoView({behavior:'smooth'})">
    <span class="rating-stars">${'★'.repeat(Math.round(sp.avgRating))}${'☆'.repeat(5 - Math.round(sp.avgRating))}</span>
    <span class="rating-text">${sp.avgRating.toFixed(1)}</span>
    <span class="rating-count">(${sp.reviewCount} review${sp.reviewCount !== 1 ? 's' : ''})</span>
  </div>
  ` : `
  <div class="hero-rating-badge" style="cursor:default;">
    <span class="rating-stars">${'★'.repeat(0)}${'☆'.repeat(5)}</span>
    <span class="rating-text" style="color:#888;">No reviews yet</span>
  </div>
  `}
  
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
      
      ${photoSectionHtml}
      
      <h2>About the Chef</h2>
      <p class="description">${service.chefBio || 'A talented private chef ready to create an unforgettable dining experience for you.'}</p>
      
      ${sp.reviewCount > 0 ? `
      <div id="reviews-section" class="reviews-section">
        <div class="reviews-header">
          <h2 class="reviews-title">Reviews</h2>
          <div class="reviews-summary">
            ${showRating ? `<div class="avg-rating"><span class="star">★</span> ${sp.avgRating}</div>` : ''}
            <span class="review-count">${sp.reviewCount} review${sp.reviewCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
        ${sp.featuredReview ? `
        <div class="review-card featured-review">
          <span class="featured-label">Featured</span>
          <div class="review-header">
            <span class="review-author">${sp.featuredReview.dinerFirstName || 'Guest'}</span>
            <span class="review-rating">${'★'.repeat(sp.featuredReview.rating)}${'☆'.repeat(5 - sp.featuredReview.rating)}</span>
          </div>
          <p class="review-comment">${sp.featuredReview.comment || ''}</p>
        </div>
        ` : ''}
        ${recentReviews.filter((r: any) => !sp.featuredReview || r.id !== sp.featuredReview.id).slice(0, 3).map((review: any) => `
        <div class="review-card">
          <div class="review-header">
            <span class="review-author">${review.dinerFirstName || 'Guest'}</span>
            <span class="review-rating">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</span>
          </div>
          ${review.comment ? `<p class="review-comment">${review.comment}</p>` : ''}
        </div>
        `).join('')}
      </div>
      ` : `
      <div id="reviews-section" class="reviews-section">
        <h2 class="reviews-title">Reviews</h2>
        <p class="no-reviews">No reviews yet. Be the first to review this service!</p>
      </div>
      `}
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
      <a href="/book/${service.id}" id="book-btn" class="book-btn" style="display: block; background: #c9a227; color: white; text-align: center; padding: 1rem; border-radius: 4px; text-decoration: none; font-weight: 600;" onclick="trackCTAClick(this)" data-variant="${ctaVariant}" data-service-id="${service.id}" data-chef-id="${service.chefId}" data-cta-text="${(ctaVariant === 'testA' || ctaVariant === 'testD') ? 'Request Your Date' : ctaVariant === 'testB' ? 'Request Booking' : ctaVariant === 'testC' ? 'Check Availability' : 'Book This Service'}">${(ctaVariant === 'testA' || ctaVariant === 'testD') ? 'Request Your Date' : ctaVariant === 'testB' ? 'Request Booking' : ctaVariant === 'testC' ? 'Check Availability' : 'Book This Service'}</a>
      ${trustBarVariant === 'B' ? `
      <div class="trust-bar" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #eee;">
        ${chefVerified ? '<div class="trust-bar-item" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #555; margin-bottom: 0.5rem;"><span style="color: #27ae60;">✓</span> Verified Chef</div>' : ''}
        ${bookingsThisMonth > 3 ? '<div class="trust-bar-item" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #555; margin-bottom: 0.5rem;"><span>📅</span> ' + bookingsThisMonth + ' bookings this month</div>' : ''}
        <div class="trust-bar-item" style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #555;"><span>⏱</span> Typically responds within 24 hours</div>
      </div>` : ''}
    </div>
  </section>
  
  ${lightboxHtml}
  
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

      // CTA A/B Test: persist variant in sessionStorage
      var ctaVariant = '${ctaVariant}';
      var urlParams = new URLSearchParams(window.location.search);
      var urlCta = urlParams.get('cta');
      var validVariants = ['control', 'testA', 'testB', 'testC', 'testD'];

      // If URL has valid cta param, use it and persist to sessionStorage AND cookie (for SSR)
      if (urlCta && validVariants.indexOf(urlCta) !== -1) {
        ctaVariant = urlCta;
        try {
          sessionStorage.setItem('cta_variant', ctaVariant);
        } catch (e) {}
        // MAI-1074: Also set cookie for SSR to read on subsequent navigations
        try {
          document.cookie = 'cta_variant=' + ctaVariant + '; path=/; max-age=86400; SameSite=Lax';
          document.cookie = 'ab_variant=' + ctaVariant + '; path=/; max-age=86400; SameSite=Lax';
        } catch (e) {}
      } else {
        // Otherwise try sessionStorage
        try {
          var stored = sessionStorage.getItem('cta_variant');
          if (stored && validVariants.indexOf(stored) !== -1) {
            ctaVariant = stored;
          }
        } catch (e) {}
      }

      function updateDisplay() {
        document.getElementById('guest-count').textContent = currentGuests;
        document.getElementById('btn-decrease').disabled = currentGuests <= minGuests;
        document.getElementById('btn-increase').disabled = currentGuests >= maxGuests;
        const total = currentGuests * pricePerPerson;
        document.getElementById('total-price').textContent = '$' + total.toLocaleString();
        document.getElementById('guest-multiple').textContent = currentGuests + ' guest' + (currentGuests !== 1 ? 's' : '') + ' × $' + pricePerPerson + '/person';
        document.getElementById('min-notice').style.display = currentGuests < minGuests ? 'block' : 'none';
        document.getElementById('min-notice-text').textContent = 'Minimum ' + minGuests + ' guest' + (minGuests !== 1 ? 's' : '') + ' required';
        // MAI-892: Update book button href with current guest count
        const bookBtn = document.getElementById('book-btn');
        if (bookBtn) {
          const url = new URL(bookBtn.href);
          url.searchParams.set('guests', currentGuests);
          bookBtn.href = url.toString();
        }
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

      function fireCtaClickEvent() {
        // MAI-1021: Send CTA click to analytics API for persistence
        const eventData = {
          event: 'cta_click',
          variant: ctaVariant,
          service_id: ${service.id},
          chef_id: ${service.chefId},
          cta_text: '${leadFormCtaText}',
          auth_status: 'guest',
          timestamp: new Date().toISOString()
        };
        
        // Send to analytics API (fire-and-forget)
        if (navigator.sendBeacon) {
          navigator.sendBeacon('/api/analytics/event', JSON.stringify(eventData));
        }
        
        // Log for debugging
        console.log('[EVENT] cta_variant_click', eventData);
      }

      function trackCTAClick(btn) {
        // MAI-995: CTA click tracking for A/B test (MAI-917/MAI-992)
        var data = {
          variant: btn.getAttribute('data-variant'),
          serviceId: parseInt(btn.getAttribute('data-service-id') || '0', 10),
          chefId: parseInt(btn.getAttribute('data-chef-id') || '0', 10),
          ctaText: btn.getAttribute('data-cta-text') || '',
          timestamp: Date.now()
        };
        console.log('[Analytics] CTA click:', data);
      }

      // Trust Bar A/B Test: persist variant in localStorage, handle URL param override
      var trustBarVariant = '${trustBarVariant}';
      (function() {
        try {
          var urlParams = new URLSearchParams(window.location.search);
          var urlTrustBar = urlParams.get('trust_bar');
          if (urlTrustBar === 'A' || urlTrustBar === 'B') {
            trustBarVariant = urlTrustBar;
            localStorage.setItem('trust_bar_variant', trustBarVariant);
          } else {
            var stored = localStorage.getItem('trust_bar_variant');
            if (stored === 'A' || stored === 'B') {
              trustBarVariant = stored;
            }
          }
        } catch (e) {}
        // Fire trust_bar_viewed event for variant
        if (trustBarVariant === 'B') {
          var eventData = {
            event: 'trust_bar_viewed',
            variant: trustBarVariant,
            service_id: ${service.id},
            chef_id: ${service.chefId},
            timestamp: new Date().toISOString()
          };
          if (navigator.sendBeacon) {
            navigator.sendBeacon('/api/analytics/event', JSON.stringify(eventData));
          }
          console.log('[EVENT] trust_bar_viewed', eventData);
        }
      })();

      window.addEventListener('DOMContentLoaded', function() {
        document.getElementById('btn-decrease').addEventListener('click', decreaseGuests);
        document.getElementById('btn-increase').addEventListener('click', increaseGuests);

        // Attach CTA click analytics
        var bookBtn = document.getElementById('book-btn');
        if (bookBtn) {
          bookBtn.addEventListener('click', fireCtaClickEvent);
        }

        updateDisplay();
      });
      
      // Lightbox functionality
      const photos = ${JSON.stringify(photos)};
      let currentIndex = 0;
      
      function openLightbox(index) {
        currentIndex = index;
        updateLightbox();
        document.getElementById('lightbox').style.display = 'flex';
        document.body.style.overflow = 'hidden';
      }
      
      function closeLightbox() {
        document.getElementById('lightbox').style.display = 'none';
        document.body.style.overflow = '';
      }
      
      function updateLightbox() {
        document.getElementById('lightbox-img').src = photos[currentIndex];
        document.getElementById('lightbox-counter').textContent = (currentIndex + 1) + ' / ' + photos.length;
      }
      
      function prevPhoto(e) {
        if (e) e.stopPropagation();
        currentIndex = (currentIndex - 1 + photos.length) % photos.length;
        updateLightbox();
      }
      
      function nextPhoto(e) {
        if (e) e.stopPropagation();
        currentIndex = (currentIndex + 1) % photos.length;
        updateLightbox();
      }
      
      // Keyboard navigation for lightbox
      document.addEventListener('keydown', function(e) {
        const lightbox = document.getElementById('lightbox');
        if (!lightbox || lightbox.style.display === 'none') return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') prevPhoto();
        if (e.key === 'ArrowRight') nextPhoto();
      });
      
      // Close lightbox on background click
      document.addEventListener('click', function(e) {
        const lightbox = document.getElementById('lightbox');
        if (e.target === lightbox) closeLightbox();
      });
    })();
  </script>
</body>
</html>`;
}

export function buildHomePage(stats: { chefCount: number; serviceCount: number; bookingCount: number; reviewCount: number; avgRating: number }, featuredServices: any[], prefs?: { cuisines: string[]; dietaryRestrictions: string[]; defaultPartySize?: number } | null): string {
  const { chefCount, serviceCount, bookingCount } = stats;
  
  const featuredCards = featuredServices.length > 0
    ? featuredServices.map(service => {
      // Use chef's uploaded photo if available, otherwise fall back to cuisine-based placeholder
      const photo = service.photoUrl || getChefPhoto(service.cuisineTypes || []);
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
    .hero-social-proof { margin-top: 1.25rem; display: flex; align-items: center; justify-content: center; gap: 0.75rem; color: rgba(255,255,255,0.75); font-size: 0.95rem; flex-wrap: wrap; }
    .hero-social-proof .proof-stars { color: #f5c518; letter-spacing: -1px; }
    .hero-social-proof .proof-rating { font-weight: 700; color: white; }
    .hero-social-proof .proof-count { font-weight: 600; }
    .hero-social-proof .proof-divider { color: rgba(255,255,255,0.4); }

    .hero-search { margin-top: 2.5rem; position: sticky; top: 70px; z-index: 50; }
    .hero-search-form { display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; max-width: 700px; margin: 0 auto; background: rgba(26, 26, 46, 0.95); padding: 1rem; border-radius: 12px; backdrop-filter: blur(10px); }
    .search-field { display: flex; flex-direction: column; gap: 0.3rem; background: rgba(255,255,255,0.1); padding: 0.75rem 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.2); min-width: 160px; }
    .search-field label { color: rgba(255,255,255,0.8); font-size: 0.8rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
    .search-field input, .search-field select { background: white; border: none; border-radius: 4px; padding: 0.5rem 0.75rem; font-size: 1rem; color: #333; min-width: 0; }
    .search-field select { cursor: pointer; }
    .search-submit { background: #c9a227; color: white; border: none; padding: 0 2rem; border-radius: 6px; font-size: 1rem; font-weight: 700; cursor: pointer; transition: background 0.2s; align-self: flex-end; min-height: 42px; }
    .search-submit:hover { background: #b8922a; }
    .search-micro-copy { color: #666; font-size: 13px; text-align: center; margin-top: 0.5rem; }

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
      ${stats.reviewCount > 0 || stats.bookingCount > 0 ? `
      <div class="hero-social-proof">
        ${stats.reviewCount > 0 ? `<span class="proof-item"><span class="proof-stars">★ ★ ★ ★ ★</span> <span class="proof-rating">${stats.avgRating.toFixed(1)}</span> (<span class="proof-count">${stats.reviewCount}</span> review${stats.reviewCount !== 1 ? 's' : ''})</span>` : ''}
        ${stats.bookingCount > 0 ? `<span class="proof-divider">·</span><span class="proof-item">${stats.bookingCount} dinner${stats.bookingCount !== 1 ? 's' : ''} booked &amp; loved</span>` : ''}
      </div>
      ` : ''}
      <div class="hero-search">
        <form class="hero-search-form" action="/services" method="get">
          <div class="search-field">
            <label for="search-date">When is your event?</label>
            <input type="date" id="search-date" name="date" min="${new Date().toISOString().split('T')[0]}" required>
          </div>
          <div class="search-field">
            <label for="search-guests">Number of guests</label>
            <input type="number" id="search-guests" name="guests" min="1" max="50" placeholder="Guests" value="${prefs?.defaultPartySize || ''}" required>
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
          <div class="search-field">
            <label for="search-cuisine">Cuisine preference</label>
            <select id="search-cuisine" name="cuisine">
              <option value="">All Cuisines</option>
              <option value="French" ${prefs?.cuisines[0] === 'french' ? 'selected' : ''}>French</option>
              <option value="Italian" ${prefs?.cuisines[0] === 'italian' ? 'selected' : ''}>Italian</option>
              <option value="Japanese" ${prefs?.cuisines[0] === 'asian' ? 'selected' : ''}>Japanese</option>
              <option value="Mexican" ${prefs?.cuisines[0] === 'mexican' ? 'selected' : ''}>Mexican</option>
              <option value="Mediterranean" ${prefs?.cuisines[0] === 'mediterranean' ? 'selected' : ''}>Mediterranean</option>
              <option value="Latin American" ${prefs?.cuisines[0] === 'latin_american' ? 'selected' : ''}>Latin American</option>
              <option value="French Fusion" ${prefs?.cuisines[0] === 'french_fusion' ? 'selected' : ''}>French Fusion</option>
            </select>
          </div>
          <button type="submit" class="search-submit">Search Chefs</button>
          <p class="search-micro-copy">No payment required &bull; Chefs respond within 24h &bull; Verified chefs only</p>
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
  <script>
    document.querySelector('.hero-search-form').addEventListener('submit', function(e) {
      const formData = new FormData(this);
      console.log('[EVENT] homepage_search_submitted', {
        cuisine: formData.get('cuisine'),
        guests: formData.get('guests'),
        date: formData.get('date'),
        eventType: formData.get('type')
      });
    });
  </script>
</body>
</html>`;
}
