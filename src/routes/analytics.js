"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackServicePageViewEvent = trackServicePageViewEvent;
exports.trackBookingCreatedEvent = trackBookingCreatedEvent;
// Analytics tracking module for service page views
// MAI-1075: Also persist last_viewed_service_id cookie for attribution
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
    // MAI-1075: Persist last_viewed_service_id cookie for booking attribution
    // Cookie set here so booking_created event can attribute back to originating service page
    if (typeof document !== 'undefined') {
        const maxAge = 30 * 24 * 60 * 60; // 30 days in seconds
        document.cookie = `last_viewed_service_id=${data.serviceId}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    }
    // Log analytics event to console in development
    if (process.env.NODE_ENV !== 'production') {
        console.log('[Analytics] Service page view:', eventData);
    }
}
// MAI-1075: Track booking_created event with service attribution from cookie
function trackBookingCreatedEvent(data) {
    // Read last_viewed_service_id from cookie for attribution
    let lastViewedServiceId = undefined;
    if (typeof document !== 'undefined') {
        const cookies = document.cookie.split(';');
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
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/event', JSON.stringify(eventData));
    }
    // Log for debugging
    if (process.env.NODE_ENV !== 'production') {
        console.log('[Analytics] Booking created:', eventData);
    }
}