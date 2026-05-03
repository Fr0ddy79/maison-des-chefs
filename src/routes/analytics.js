"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackServicePageViewEvent = trackServicePageViewEvent;
// Analytics tracking module for service page views
function trackServicePageViewEvent(data) {
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
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/event', JSON.stringify(eventData));
    }
    // Log analytics event to console in development
    if (process.env.NODE_ENV !== 'production') {
        console.log('[Analytics] Service page view:', eventData);
    }
}
