// Analytics tracking module for service page views
export function trackServicePageViewEvent(data: {
  serviceId: number;
  chefId: number;
  pricePerPerson: number;
  cuisineType: string;
  variant?: string;
}): void {
  const eventData = {
    event: 'service_page_view',
    service_id: data.serviceId,
    chef_id: data.chefId,
    price_per_person: data.pricePerPerson,
    cuisine_type: data.cuisineType,
    variant: data.variant || 'unknown',
    auth_status: 'guest',
    timestamp: new Date().toISOString()
  };

  // Send to analytics API (fire-and-forget)
  if (typeof navigator !== 'undefined' && (navigator as any).sendBeacon) {
    (navigator as any).sendBeacon('/api/analytics/event', JSON.stringify(eventData));
  }


  // Log analytics event to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Service page view:', eventData);
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