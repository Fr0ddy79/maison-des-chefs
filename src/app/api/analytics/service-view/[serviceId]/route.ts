import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    const { serviceId } = await params
    const body = await request.json()
    const { chef_id, price_per_person, cuisine_type } = body

    // Validate required fields
    if (!serviceId) {
      return NextResponse.json(
        { error: 'service_id is required' },
        { status: 400 }
      )
    }

    if (!chef_id) {
      return NextResponse.json(
        { error: 'chef_id is required' },
        { status: 400 }
      )
    }

    // Log the analytics event (in production, this would send to an analytics service)
    const analyticsEvent = {
      event: 'service_page_view',
      service_id: serviceId,
      chef_id,
      price_per_person: price_per_person ?? null,
      cuisine_type: cuisine_type ?? null,
      timestamp: new Date().toISOString(),
    }

    console.log('[Analytics] service_page_view:', analyticsEvent)

    // TODO: In production, integrate with analytics service (e.g., Mixpanel, Amplitude, PostHog)
    // Example: await mixpanel.track('service_page_view', analyticsEvent)

    return NextResponse.json(
      { success: true, event: analyticsEvent },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error tracking service page view:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
