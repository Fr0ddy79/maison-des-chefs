import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/bookings - Create a new booking with chef availability conflict detection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      service_id,
      chef_id,
      diner_id,
      booking_date,
      start_time,
      end_time,
      guest_count,
      total_price,
      special_requests,
    } = body

    // Validate required fields
    if (!chef_id || typeof chef_id !== 'string') {
      return NextResponse.json(
        { error: 'chef_id is required' },
        { status: 400 }
      )
    }

    if (!diner_id || typeof diner_id !== 'string') {
      return NextResponse.json(
        { error: 'diner_id is required' },
        { status: 400 }
      )
    }

    if (!booking_date || typeof booking_date !== 'string') {
      return NextResponse.json(
        { error: 'booking_date is required' },
        { status: 400 }
      )
    }

    if (!start_time || typeof start_time !== 'string') {
      return NextResponse.json(
        { error: 'start_time is required' },
        { status: 400 }
      )
    }

    if (!guest_count || typeof guest_count !== 'number' || guest_count < 1) {
      return NextResponse.json(
        { error: 'guest_count must be a positive number' },
        { status: 400 }
      )
    }

    if (!total_price || typeof total_price !== 'number' || total_price < 0) {
      return NextResponse.json(
        { error: 'total_price must be a non-negative number' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // ========================================
    // CONFLICT DETECTION
    // ========================================

    // a) Check for availability slot on this date
    const bookingDateObj = new Date(booking_date)
    if (isNaN(bookingDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid booking_date format. Use YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    // Check if chef has an availability slot on this date
    const { data: availabilitySlot } = await supabase
      .from('availability')
      .select('id, start_time, end_time')
      .eq('chef_id', chef_id)
      .eq('date', booking_date)
      .eq('is_booked', false)
      .single()

    if (!availabilitySlot) {
      return NextResponse.json(
        {
          error: `Chef is not available on ${booking_date}. Please select a different date or time.`,
          conflictType: 'NO_AVAILABILITY_SLOT',
        },
        { status: 409 }
      )
    }

    // b) Check if date is blocked
    const { data: blockedDate } = await supabase
      .from('chef_blocked_dates')
      .select('id')
      .eq('chef_id', chef_id)
      .eq('blocked_date', booking_date)
      .single()

    if (blockedDate) {
      return NextResponse.json(
        {
          error: `Chef is not available on ${booking_date}. Please select a different date or time.`,
          conflictType: 'DATE_BLOCKED',
        },
        { status: 409 }
      )
    }

    // c) Check for conflicting bookings on the same date
    const { data: conflictingBooking } = await supabase
      .from('bookings')
      .select('id, booking_date, start_time, status')
      .eq('chef_id', chef_id)
      .eq('booking_date', booking_date)
      .neq('status', 'cancelled')
      .single()

    if (conflictingBooking) {
      return NextResponse.json(
        {
          error: `Chef is already booked on ${booking_date}. Please select a different date or time.`,
          conflictType: 'DATE_ALREADY_BOOKED',
        },
        { status: 409 }
      )
    }

    // ========================================
    // CREATE BOOKING
    // ========================================

    const { data: newBooking, error } = await supabase
      .from('bookings')
      .insert({
        service_id: service_id || null,
        chef_id,
        diner_id,
        booking_date,
        start_time,
        end_time: end_time || null,
        guest_count,
        total_price,
        status: 'pending',
        special_requests: special_requests || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating booking:', error)
      return NextResponse.json(
        { error: 'Failed to create booking. Please try again.' },
        { status: 500 }
      )
    }

    // Mark the availability slot as booked
    await supabase
      .from('availability')
      .update({ is_booked: true })
      .eq('id', availabilitySlot.id)

    return NextResponse.json(
      {
        message: 'Booking created successfully',
        booking: {
          id: newBooking.id,
          chef_id: newBooking.chef_id,
          diner_id: newBooking.diner_id,
          booking_date: newBooking.booking_date,
          start_time: newBooking.start_time,
          end_time: newBooking.end_time,
          guest_count: newBooking.guest_count,
          total_price: newBooking.total_price,
          status: newBooking.status,
          special_requests: newBooking.special_requests,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Error creating booking:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
