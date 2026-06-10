import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/bookings/[id] - Get full booking details for admin
// Includes: diner info, chef info, service, date/time, guest count, total price,
//          status, dietary info, special requests
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params

    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch booking with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Fetch diner info
    const { data: diner } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, created_at')
      .eq('id', booking.diner_id)
      .single()

    // Fetch chef info
    const { data: chef } = await supabase
      .from('chef_profiles')
      .select('*')
      .eq('id', booking.chef_id)
      .single()

    // Fetch chef profile email
    const { data: chefProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', booking.chef_id)
      .single()

    // Fetch service info (if service_id exists)
    let service = null
    if (booking.service_id) {
      const { data: serviceData } = await supabase
        .from('services')
        .select('*')
        .eq('id', booking.service_id)
        .single()
      service = serviceData
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        booking_date: booking.booking_date,
        start_time: booking.start_time,
        end_time: booking.end_time,
        guest_count: booking.guest_count,
        total_price: booking.total_price,
        status: booking.status,
        special_requests: booking.special_requests,
        created_at: booking.created_at,
        quote_amount: booking.quote_amount,
        quote_message: booking.quote_message,
        quote_valid_until: booking.quote_valid_until,
        quote_status: booking.quote_status,
        dietary_restrictions: booking.dietary_restrictions,
        allergies: booking.allergies,
        allergy_severity: booking.allergy_severity,
        food_preferences: booking.food_preferences,
        special_occasion: booking.special_occasion,
        reminder_sent: booking.reminder_sent,
        payment_intent_id: booking.payment_intent_id,
        payment_status: booking.payment_status,
        checkout_session_id: booking.checkout_session_id,
        inquiry_id: booking.inquiry_id,
      },
      diner: diner ? {
        id: diner.id,
        email: diner.email,
        full_name: diner.full_name,
        avatar_url: diner.avatar_url,
        created_at: diner.created_at,
      } : null,
      chef: chef ? {
        id: chef.id,
        display_name: chef.display_name,
        bio: chef.bio,
        location: chef.location,
        cuisines: chef.cuisines,
        years_experience: chef.years_experience,
        is_verified: chef.is_verified,
        avg_rating: chef.avg_rating,
        review_count: chef.review_count,
        price_per_hour: chef.price_per_hour,
        price_per_event: chef.price_per_event,
        max_guests: chef.max_guests,
        hero_image_url: chef.hero_image_url,
        email: chefProfile?.email,
      } : null,
      service: service ? {
        id: service.id,
        title: service.title,
        description: service.description,
        cuisine_type: service.cuisine_type,
        duration_hours: service.duration_hours,
        price_per_person: service.price_per_person,
        max_guests: service.max_guests,
        is_active: service.is_active,
      } : null,
    })
  } catch (err) {
    console.error('Error in GET /api/admin/bookings/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
