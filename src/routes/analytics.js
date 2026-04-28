"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackServicePageViewEvent = trackServicePageViewEvent;
// Analytics tracking module for service page views
function trackServicePageViewEvent(data) {
    // Log analytics event to console in development
    if (process.env.NODE_ENV !== 'production') {
        console.log('[Analytics] Service page view:', data);
    }
    // In production, this would send to an analytics service
}
