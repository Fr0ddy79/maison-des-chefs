// Analytics tracking module for service page views
export function trackServicePageViewEvent(data: {
  serviceId: number;
  chefId: number;
  pricePerPerson: number;
  cuisineType: string;
}): void {
  // Log analytics event to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics] Service page view:', data);
  }
  // In production, this would send to an analytics service
}