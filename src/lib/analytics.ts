'use client'

interface ServicePageViewEvent {
  service_id: string
  chef_id: string
  price_per_person: number | null
  cuisine_type: string | null
}

interface BookingFormViewedEvent {
  service_id: string
  form_variant: 'standard' | 'simplified'
  referrer: string | null
}

interface BookingFormSubmittedEvent {
  service_id: string
  form_variant: 'standard' | 'simplified'
  lead_id: string | null
  guest_count: number
  event_date: string
}

export async function trackServicePageView(event: ServicePageViewEvent): Promise<void> {
  try {
    const response = await fetch(`/api/analytics/service-view/${event.service_id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chef_id: event.chef_id,
        price_per_person: event.price_per_person,
        cuisine_type: event.cuisine_type,
      }),
    })

    if (!response.ok) {
      console.error('[Analytics] Failed to track service_page_view:', response.statusText)
    }
  } catch (error) {
    console.error('[Analytics] Error tracking service_page_view:', error)
  }
}

export async function trackBookingFormViewed(event: BookingFormViewedEvent): Promise<void> {
  try {
    const response = await fetch('/api/analytics/booking-form/viewed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: event.service_id,
        form_variant: event.form_variant,
        referrer: event.referrer,
      }),
    })

    if (!response.ok) {
      console.error('[Analytics] Failed to track booking_form_viewed:', response.statusText)
    }
  } catch (error) {
    console.error('[Analytics] Error tracking booking_form_viewed:', error)
  }
}

export async function trackBookingFormSubmitted(event: BookingFormSubmittedEvent): Promise<void> {
  try {
    const response = await fetch('/api/analytics/booking-form/submitted', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: event.service_id,
        form_variant: event.form_variant,
        lead_id: event.lead_id,
        guest_count: event.guest_count,
        event_date: event.event_date,
      }),
    })

    if (!response.ok) {
      console.error('[Analytics] Failed to track booking_form_submitted:', response.statusText)
    }
  } catch (error) {
    console.error('[Analytics] Error tracking booking_form_submitted:', error)
  }
}
