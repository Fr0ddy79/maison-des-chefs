import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { service_id, form_variant, referrer } = body

    // Validate required fields
    if (!service_id) {
      return NextResponse.json(
        { error: 'service_id is required' },
        { status: 400 }
      )
    }

    if (!form_variant || !['standard', 'simplified'].includes(form_variant)) {
      return NextResponse.json(
        { error: 'form_variant must be standard or simplified' },
        { status: 400 }
      )
    }

    // Log the analytics event (in production, this would send to an analytics service)
    const analyticsEvent = {
      event: 'booking_form_viewed',
      service_id,
      form_variant,
      referrer: referrer ?? null,
      timestamp: new Date().toISOString(),
    }

    console.log('[Analytics] booking_form_viewed:', analyticsEvent)

    // TODO: In production, integrate with analytics service (e.g., Mixpanel, Amplitude, PostHog)
    // Example: await mixpanel.track('booking_form_viewed', analyticsEvent)

    return NextResponse.json(
      { success: true, event: analyticsEvent },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error tracking booking form viewed:', err)
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
