import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/bookings/token/[token]
// Returns booking details by token (no auth required for guests)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'booking_token is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Query booking by token with chef profile join
    const { data: booking, error } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_token,
        booking_date,
        start_time,
        end_time,
        guest_count,
        total_price,
        status,
        special_requests,
        quote_amount,
        quote_message,
        quote_valid_until,
        quote_status,
        created_at,
        chef_profiles (
          id,
          display_name,
          profile_image,
          location
        )
      `)
      .eq('booking_token', token)
      .single()

    if (error || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        booking: {
          id: booking.id,
          booking_token: booking.booking_token,
          booking_date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          guest_count: booking.guest_count,
          total_price: booking.total_price,
          status: booking.status,
          special_requests: booking.special_requests,
          quote_amount: booking.quote_amount,
          quote_message: booking.quote_message,
          quote_valid_until: booking.quote_valid_until,
          quote_status: booking.quote_status,
          created_at: booking.created_at,
          chef: booking.chef_profiles && booking.chef_profiles.length > 0 ? {
            id: booking.chef_profiles[0].id,
            display_name: booking.chef_profiles[0].display_name,
            profile_image: booking.chef_profiles[0].profile_image,
            location: booking.chef_profiles[0].location,
          } : null,
        },
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error fetching booking by token:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}