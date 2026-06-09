import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/analytics/events - Ingest analytics events
// Tracks: page_view, waitlist_signup, booking_started, inquiry_submitted, booking_confirmed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { event_name, event_data, session_id, user_id } = body

    // Validate required fields
    if (!event_name || typeof event_name !== 'string') {
      return NextResponse.json(
        { error: 'event_name is required' },
        { status: 400 }
      )
    }

    // Validate event_name against allowed events
    const allowedEvents = [
      'page_view',
      'waitlist_signup',
      'booking_started',
      'inquiry_submitted',
      'booking_confirmed',
    ]

    if (!allowedEvents.includes(event_name)) {
      return NextResponse.json(
        { error: `event_name must be one of: ${allowedEvents.join(', ')}` },
        { status: 400 }
      )
    }

    // event_data is optional, defaults to empty object
    const eventData = event_data && typeof event_data === 'object' ? event_data : {}

    // session_id is optional
    const sessionId = session_id && typeof session_id === 'string' ? session_id : null

    // user_id is optional
    const userId = user_id && typeof user_id === 'string' ? user_id : null

    const supabase = await createClient()

    // If user_id is provided, verify the user exists
    if (userId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .single()

      if (!profile) {
        // Silently ignore invalid user_id - don't fail the event
        // Just don't associate the event with a user
      }
    }

    // Insert the analytics event
    const { data: event, error } = await supabase
      .from('analytics_events')
      .insert({
        event_name,
        event_data: eventData,
        session_id: sessionId,
        user_id: userId,
      })
      .select('id, event_name, created_at')
      .single()

    if (error) {
      console.error('[Analytics] Error inserting event:', error)
      return NextResponse.json(
        { error: 'Failed to track event' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Event tracked successfully',
        event: {
          id: event.id,
          event_name: event.event_name,
          created_at: event.created_at,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[Analytics] Error processing event:', err)
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
