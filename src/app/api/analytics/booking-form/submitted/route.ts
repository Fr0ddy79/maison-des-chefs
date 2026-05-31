import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chef_id, service_id, form_variant, lead_id, guest_count, event_date } = body

    // Validate required fields
    if (!chef_id) {
      return NextResponse.json(
        { error: 'chef_id is required' },
        { status: 400 }
      )
    }

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

    if (!event_date) {
      return NextResponse.json(
        { error: 'event_date is required' },
        { status: 400 }
      )
    }

    // Log the analytics event (in production, this would send to an analytics service)
    const analyticsEvent = {
      event: 'booking_form_submitted',
      chef_id,
      service_id,
      form_variant,
      lead_id: lead_id ?? null,
      guest_count: guest_count ?? null,
      event_date,
      timestamp: new Date().toISOString(),
    }

    console.log('[Analytics] booking_form_submitted:', analyticsEvent)

    // TODO: In production, integrate with analytics service (e.g., Mixpanel, Amplitude, PostHog)
    // Example: await mixpanel.track('booking_form_submitted', analyticsEvent)

    return NextResponse.json(
      { success: true, event: analyticsEvent },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error tracking booking form submitted:', err)
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
