// MAI-1074: Read ab_variant cookie directly for accurate A/B test tracking
function getVariantFromCookie(): string {
  if (typeof (globalThis as any).document !== 'undefined') {
    const cookies = (globalThis as any).document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'ab_variant') {
        return value;
      }
    }
  }
  return '';
}

// Analytics tracking module for service page views
// MAI-1075: Also persist last_viewed_service_id cookie for attribution
export function trackServicePageViewEvent(data: {
  serviceId: number;
  chefId: number;
  pricePerPerson: number;
  cuisineType: string;
  variant?: string;
}): void {
  // MAI-1074: Read ab_variant cookie directly for accurate A/B test tracking
  // Cookie is set by client-side code when variant is determined
  // This ensures SSR-called events use the correct variant from cookie
  const cookieVariant = getVariantFromCookie();
  const variant = cookieVariant || data.variant || 'unknown';

// MAI-2333: UTM parameter capture for channel attribution
  // Read UTM params from URL and persist for downstream attribution
  let utmData = { utm_source: null as string | null, utm_medium: null as string | null, utm_campaign: null as string | null, utm_content: null as string | null, utm_term: null as string | null };
  if (typeof (globalThis as any).window !== 'undefined') {
    try {
      const url = new URL((globalThis as any).window.location.href);
      const params = new URLSearchParams(url.search);
      utmData = {
        utm_source: params.get('utm_source') || null,
        utm_medium: params.get('utm_medium') || null,
        utm_campaign: params.get('utm_campaign') || null,
        utm_content: params.get('utm_content') || null,
        utm_term: params.get('utm_term') || null,
      };
    } catch (e) { /* ignore URL parse errors */ }
  }

  const eventData = {
    event: 'service_page_view',
    service_id: data.serviceId,
    chef_id: data.chefId,
    price_per_person: data.pricePerPerson,
    cuisine_type: data.cuisineType,
    variant,
    auth_status: 'guest',
    timestamp: new Date().toISOString(),
    // MAI-2333: Include UTM params for channel attribution
    utm_source: utmData.utm_source,
    utm_medium: utmData.utm_medium,
    utm_campaign: utmData.utm_campaign,
    utm_content: utmData.utm_content,
    utm_term: utmData.utm_term,
  };

  // MAI-2333: Persist UTM params in cookies for 30 days for downstream attribution
  if (typeof (globalThis as any).document !== 'undefined') {
    const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
    if (utmData.utm_source) (globalThis as any).document.cookie = `utm_source=${utmData.utm_source}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    if (utmData.utm_medium) (globalThis as any).document.cookie = `utm_medium=${utmData.utm_medium}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    if (utmData.utm_campaign) (globalThis as any).document.cookie = `utm_campaign=${utmData.utm_campaign}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  }

  // Send to analytics API (fire-and-forget)
  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  // MAI-1075: Persist last_viewed_service_id cookie for booking attribution
  // MAI-2333: Also read existing UTM cookies for this event
  if (typeof (globalThis as any).document !== 'undefined') {
    const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
    (globalThis as any).document.cookie = `last_viewed_service_id=${data.serviceId}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    // MAI-2333: Also persist UTM params from this view if not already set
    if (utmData.utm_source) (globalThis as any).document.cookie = `utm_source=${utmData.utm_source}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    if (utmData.utm_medium) (globalThis as any).document.cookie = `utm_medium=${utmData.utm_medium}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    if (utmData.utm_campaign) (globalThis as any).document.cookie = `utm_campaign=${utmData.utm_campaign}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  }

  // Log analytics event to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Service page view:', eventData);
  }
}

// MAI-1036: Referral share tracking for channel performance analysis
export function trackReferralShareEvent(data: {
  code: string;
  channel: 'copy' | 'email' | 'whatsapp';
  serviceId?: number;
}): void {
  const eventData = {
    event: 'referral_share',
    code: data.code,
    channel: data.channel,
    service_id: data.serviceId || null,
    auth_status: 'guest',
    timestamp: new Date().toISOString()
  };

  // Send to analytics API (fire-and-forget)
  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  // Log for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Referral share:', eventData);
  }
}

// MAI-845: Stale lead re-engagement email sent
interface StaleLeadReengagementSentData {
  leadId: number;
  chefId: number;
  serviceId: number;
  daysSinceCreated?: number;
  touchNumber?: 1 | 2 | 3;
  emailType?: string;
  quoteAmount?: number;
  daysSinceQuote?: number;
}

export function trackStaleLeadReengagementSent(data: StaleLeadReengagementSentData): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Stale lead re-engagement sent:', data);
  }
  // In production, this would send to an analytics service
}

// MAI-995: CTA click tracking for A/B test (MAI-917/MAI-992)
export function trackCTAClickEvent(data: {
  variant: string;
  serviceId: number;
  chefId: number;
  ctaText: string;
  timestamp: number;
}): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] CTA click:', data);
  }
  // TODO: Forward to analytics service
}

// MAI-1079: Chef discovery page analytics for funnel visibility
export function trackChefDiscoveryEvent(data: {
  event: 'chef_discovery_view' | 'chef_card_view' | 'chef_select' | 'chef_deselect' | 'filter_applied' | 'inquiry_modal_open' | 'inquiry_modal_submit';
  chefId?: number;
  serviceId?: number;
  filterType?: string;
  filterValue?: string;
  selectedCount?: number;
  guestCount?: number;
  cuisineTypes?: string[];
}): void {
  const eventData = {
    event: data.event,
    chef_id: data.chefId || null,
    service_id: data.serviceId || null,
    filter_type: data.filterType || null,
    filter_value: data.filterValue || null,
    selected_count: data.selectedCount ?? null,
    guest_count: data.guestCount ?? null,
    cuisine_types: data.cuisineTypes || null,
    auth_status: 'guest',
    timestamp: new Date().toISOString()
  };

  // Send to analytics API (fire-and-forget)
  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  // Log for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Chef discovery:', eventData);
  }
}

// MAI-1177: Track chef service published event (from onboarding)
export function trackChefServicePublished(data: {
  userId: number;
  serviceId: number;
  serviceName: string;
  onboarding: boolean;
}): void {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Chef service published:', data);
  }
  // TODO: Forward to analytics service (Mixpanel, Segment, etc.)
}

// MAI-1075: Track booking_created event with service attribution from cookie
export function trackBookingCreatedEvent(data: {
  bookingId: number;
  serviceId: number;
  leadId: number;
  guestCount: number;
  variant?: string;
}): void {
  // MAI-1075: Read last_viewed_service_id from cookie for attribution
  let lastViewedServiceId: number | undefined;
  if (typeof (globalThis as any).document !== 'undefined') {
    const cookies = (globalThis as any).document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'last_viewed_service_id') {
        lastViewedServiceId = parseInt(value, 10);
        break;
      }
    }
  }

  const eventData = {
    event: 'booking_created',
    bookingId: data.bookingId,
    serviceId: data.serviceId,
    // MAI-1075: Include originating service_id from cookie if different
    originating_service_id: lastViewedServiceId && lastViewedServiceId !== data.serviceId ? lastViewedServiceId : undefined,
    lead_id: data.leadId,
    guestCount: data.guestCount,
    variant: data.variant || 'unknown',
    auth_status: 'guest',
    timestamp: new Date().toISOString()
  };

  // Send to analytics API (fire-and-forget)
  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  // Log for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Booking created:', eventData);
  }
}

// MAI-1670: Track quote_sent event when chef sends a price quote to a diner
interface QuoteSentEventData {
  leadId: number;
  chefId: number;
  serviceId: number;
  quoteAmount: number;
  guestCount: number;
  variant?: string;
}

export function trackQuoteSentEvent(data: QuoteSentEventData): void {
  const eventData = {
    event: 'quote_sent',
    lead_id: data.leadId,
    chef_id: data.chefId,
    service_id: data.serviceId,
    quote_amount: data.quoteAmount,
    guestCount: data.guestCount,
    variant: data.variant || 'unknown',
    auth_status: 'chef',
    timestamp: new Date().toISOString()
  };

  // Send to analytics API (fire-and-forget)
  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  // Log for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Quote sent:', eventData);
  }
}

// MAI-1670: Track quote_converted event when a quoted lead is converted to a booking
interface QuoteConvertedEventData {
  leadId: number;
  chefId: number;
  serviceId: number;
  quoteAmount: number;
  guestCount: number;
  referralCode?: string;
  variant?: string;
}

export function trackQuoteConvertedEvent(data: QuoteConvertedEventData): void {
  const eventData = {
    event: 'quote_converted',
    lead_id: data.leadId,
    chef_id: data.chefId,
    service_id: data.serviceId,
    quote_amount: data.quoteAmount,
    guestCount: data.guestCount,
    referral_code: data.referralCode || null,
    variant: data.variant || 'unknown',
    auth_status: 'chef',
    timestamp: new Date().toISOString()
  };

  // Send to analytics API (fire-and-forget)
  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  // Log for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Quote converted:', eventData);
  }
}

// MAI-1684: Hero search analytics — instrument hero search form on homepage
interface HeroSearchEventData {
  cuisine: string | null;
  location: string | null;
  date: string | null;
  guests: number | null;
}

export function trackHeroSearchEvent(data: HeroSearchEventData): void {
  const eventData = {
    event: 'hero_search_submitted',
    cuisine_type: data.cuisine,
    location: data.location,
    date: data.date,
    guestCount: data.guests,
    auth_status: 'anonymous',
    timestamp: new Date().toISOString()
  };

  // Send to analytics API (fire-and-forget)
  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  // Log for debugging
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Hero search submitted:', eventData);
  }
}

// MAI-2151: Homepage view event for funnel analytics
export function trackHomepageViewEvent(): void {
  const eventData = {
    event: 'homepage_view',
    auth_status: 'anonymous',
    timestamp: new Date().toISOString()
  };

  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Homepage view:', eventData);
  }
}

// MAI-2151: Booking page view event for funnel analytics
interface BookingPageViewEventData {
  serviceId: number;
  chefId: number;
  cardVariant: string;
  ctaVariant: string;
}

export function trackBookingPageViewEvent(data: BookingPageViewEventData): void {
  const eventData = {
    event: 'booking_page_view',
    service_id: data.serviceId,
    chef_id: data.chefId,
    card_variant: data.cardVariant,
    cta_variant: data.ctaVariant,
    auth_status: 'guest',
    timestamp: new Date().toISOString()
  };

  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Booking page view:', eventData);
  }
}

// MAI-2151: Booking submit event for funnel analytics
interface BookingSubmitEventData {
  serviceId: number;
  chefId: number;
  guestCount: number;
  cardVariant: string;
  ctaVariant: string;
}

export function trackBookingSubmitEvent(data: BookingSubmitEventData): void {
  const eventData = {
    event: 'booking_submit',
    service_id: data.serviceId,
    chef_id: data.chefId,
    guest_count: data.guestCount,
    card_variant: data.cardVariant,
    cta_variant: data.ctaVariant,
    auth_status: 'guest',
    timestamp: new Date().toISOString()
  };

  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Booking submit:', eventData);
  }
}

// MAI-2151: Booking success event for funnel analytics
interface BookingSuccessEventData {
  bookingId: number;
  serviceId: number;
  chefId: number;
  leadId: number;
  guestCount: number;
  cardVariant: string;
  ctaVariant: string;
}

export function trackBookingSuccessEvent(data: BookingSuccessEventData): void {
  const eventData = {
    event: 'booking_success',
    booking_id: data.bookingId,
    service_id: data.serviceId,
    chef_id: data.chefId,
    lead_id: data.leadId,
    guest_count: data.guestCount,
    card_variant: data.cardVariant,
    cta_variant: data.ctaVariant,
    auth_status: 'guest',
    timestamp: new Date().toISOString()
  };

  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Booking success:', eventData);
  }
}