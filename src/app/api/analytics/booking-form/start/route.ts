import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/analytics/booking-form/start
// Fires when diner reaches the booking form with chef_id, service_type, guest_count
// If email is provided, stores in abandoned_bookings for follow-up
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chef_id, service_id, service_type, guest_count, email } = body

    // Validate required fields
    if (!chef_id) {
      return NextResponse.json(
        { error: 'chef_id is required' },
        { status: 400 }
      )
    }

    // Log the analytics event
    const analyticsEvent = {
      event: 'booking_form_start',
      chef_id,
      service_id: service_id || null,
      service_type: service_type || null,
      guest_count: guest_count || null,
      email: email || null,
      timestamp: new Date().toISOString(),
    }

    console.log('[Analytics] booking_form_start:', analyticsEvent)

    // If email is provided, store in abandoned_bookings for follow-up
    if (email && typeof email === 'string' && email.includes('@')) {
      const supabase = await createClient()
      
      const { error: insertError } = await supabase.from('abandoned_bookings').insert({
        email: email.toLowerCase().trim(),
        chef_id,
        service_id: service_id || null,
        service_type: service_type || null,
        guest_count: guest_count || 2,
      })

      if (insertError) {
        console.error('[Analytics] Error storing abandoned_booking:', insertError)
        // Non-blocking - don't fail the request for analytics failures
      } else {
        console.log('[Analytics] Stored abandoned booking for follow-up:', email)
      }
    }

    return NextResponse.json(
      { success: true, event: analyticsEvent },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error tracking booking form start:', err)
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