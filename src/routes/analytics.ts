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

  const eventData = {
    event: 'service_page_view',
    service_id: data.serviceId,
    chef_id: data.chefId,
    price_per_person: data.pricePerPerson,
    cuisine_type: data.cuisineType,
    variant,
    auth_status: 'guest',
    timestamp: new Date().toISOString()
  };

  // Send to analytics API (fire-and-forget)
  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }

  // MAI-1075: Persist last_viewed_service_id cookie for booking attribution
  // Cookie set here so booking_created event can attribute back to originating service page
  if (typeof (globalThis as any).document !== 'undefined') {
    const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
    (globalThis as any).document.cookie = `last_viewed_service_id=${data.serviceId}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
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
export function trackStaleLeadReengagementSent(data: {
  leadId: number;
  chefId: number;
  serviceId: number;
  daysSinceCreated: number;
}): void {
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