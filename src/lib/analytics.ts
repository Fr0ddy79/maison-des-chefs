'use client'

interface ServicePageViewEvent {
  service_id: string
  chef_id: string
  price_per_person: number | null
  cuisine_type: string | null
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
