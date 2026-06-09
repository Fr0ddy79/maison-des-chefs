import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendInquiryConfirmationEmail, sendNewInquiryNotificationToChef } from '@/lib/email/resend'

// POST /api/inquiry - Submit an inquiry with chef availability conflict detection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      service_id,
      chef_id,
      diner_id,
      email,
      message,
      inquiry_date,
      guest_count,
      inquiry_time,
      inquiry_time_end,
      lead_id,
      lead_source_id,
      dietary_preferences,
      nut_allergy,
    } = body

    // Validate required fields
    if (!chef_id || typeof chef_id !== 'string') {
      return NextResponse.json(
        { error: 'chef_id is required' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'message is required' },
        { status: 400 }
      )
    }

    if (!inquiry_date || typeof inquiry_date !== 'string') {
      return NextResponse.json(
        { error: 'inquiry_date is required' },
        { status: 400 }
      )
    }

    // Validate guest_count if provided
    if (guest_count !== undefined && guest_count !== null) {
      if (typeof guest_count !== 'number' || guest_count < 1 || guest_count > 50) {
        return NextResponse.json(
          { error: 'guest_count must be between 1 and 50' },
          { status: 400 }
        )
      }
    }

    const supabase = await createClient()

    // ========================================
    // CONFLICT DETECTION
    // ========================================

    // a) Check for availability slot on this date
    const bookingDateObj = new Date(inquiry_date)
    if (isNaN(bookingDateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid inquiry_date format. Use YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    // Check if chef has an availability slot on this date
    // NOTE: If no slots are configured at all (MAI-2376), we allow the inquiry to proceed
    // rather than blocking the entire flow. The chef can still respond manually.
    const { data: availabilitySlot } = await supabase
      .from('availability')
      .select('id, start_time, end_time')
      .eq('chef_id', chef_id)
      .eq('date', inquiry_date)
      .eq('is_booked', false)
      .single()


    const hasAvailabilitySlotsConfigured = availabilitySlot !== null

    // Only block if a slot was explicitly checked and found unavailable (i.e. booked)
    // If no slots exist at all, allow the inquiry to proceed — chef has not set up availability yet
    if (!availabilitySlot) {
      // Check if ANY slots exist for this chef at all — if none, allow inquiry
      const { data: anySlot } = await supabase
        .from('availability')
        .select('id')
        .eq('chef_id', chef_id)
        .limit(1)
        .single()

      if (!anySlot) {
        // Chef has no availability slots configured — allow inquiry anyway
        // Frontend will show a note: "Chef will confirm availability"
      } else {
        // Chef has slots but none available on this specific date — it's genuinely booked
        return NextResponse.json(
          {
            error: `Chef is not available on ${inquiry_date}. Please select a different date or time.`,
            conflictType: 'NO_AVAILABILITY_SLOT',
          },
          { status: 409 }
        )
      }
    }

    // b) Check if date is blocked
    const { data: blockedDate } = await supabase
      .from('chef_blocked_dates')
      .select('id')
      .eq('chef_id', chef_id)
      .eq('blocked_date', inquiry_date)
      .single()

    if (blockedDate) {
      return NextResponse.json(
        {
          error: `Chef is not available on ${inquiry_date}. Please select a different date or time.`,
          conflictType: 'DATE_BLOCKED',
        },
        { status: 409 }
      )
    }

    // c) Check for conflicting bookings on the same date
    const { data: conflictingBooking } = await supabase
      .from('bookings')
      .select('id, booking_date, start_time, end_time, status')
      .eq('chef_id', chef_id)
      .eq('booking_date', inquiry_date)
      .neq('status', 'cancelled')
      .single()

    if (conflictingBooking) {
      return NextResponse.json(
        {
          error: `Chef is already booked on ${inquiry_date}. Please select a different date or time.`,
          conflictType: 'DATE_ALREADY_BOOKED',
        },
        { status: 409 }
      )
    }

    // d) Check for time overlap with existing bookings on the same date
    if (inquiry_time) {
      // Compute inquiryTimeEnd: explicit end time, or default to inquiry_time + 2 hours
      let inquiryTimeEnd: string
      if (inquiry_time_end) {
        inquiryTimeEnd = inquiry_time_end
      } else {
        // Default to inquiry_time + 2 hours
        const [hours, minutes] = inquiry_time.split(':').map(Number)
        const startDate = new Date(2000, 0, 1, hours, minutes)
        startDate.setHours(startDate.getHours() + 2)
        inquiryTimeEnd = `${String(startDate.getHours()).padStart(2, '0')}:${String(startDate.getMinutes()).padStart(2, '0')}`
      }

      // Fetch all non-cancelled bookings for this chef + date to check time overlap
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('id, start_time, end_time')
        .eq('chef_id', chef_id)
        .eq('booking_date', inquiry_date)
        .neq('status', 'cancelled')

      if (existingBookings && existingBookings.length > 0) {
        for (const booking of existingBookings) {
          // Skip if booking has no end_time (shouldn't happen but be safe)
          if (!booking.end_time) continue

          // Time overlap: (inquiry_time < booking.end_time) AND (inquiryTimeEnd > booking.start_time)
          if (inquiry_time < booking.end_time && inquiryTimeEnd > booking.start_time) {
            return NextResponse.json(
              {
                error: `Chef is already booked on ${inquiry_date} from ${booking.start_time} to ${booking.end_time}. Please select a different time.`,
                conflictType: 'TIME_OVERLAP',
                conflictingBooking: {
                  start_time: booking.start_time,
                  end_time: booking.end_time,
                },
              },
              { status: 409 }
            )
          }
        }
      }
    }

    // ========================================
    // CREATE INQUIRY
    // ========================================

    const { data: newInquiry, error } = await supabase
      .from('inquiries')
      .insert({
        service_id: service_id || null,
        chef_id,
        diner_id: diner_id || null,
        email: email.toLowerCase().trim(),
        message,
        inquiry_date,
        guest_count: guest_count || null,
        inquiry_time: inquiry_time || null,
        lead_id: lead_id || null,
        lead_source_id: lead_source_id || null,
        dietary_preferences: Array.isArray(dietary_preferences) ? dietary_preferences : [],
        nut_allergy: nut_allergy === true,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating inquiry:', error)
      return NextResponse.json(
        { error: 'Failed to submit inquiry. Please try again.' },
        { status: 500 }
      )
    }

    // Send confirmation email (non-blocking - failures don't affect inquiry success)
    sendInquiryConfirmationEmail({
      chefId: chef_id,
      dinerEmail: email,
      inquiryDate: inquiry_date,
      inquiryId: newInquiry.id,
    }).catch(err => {
      console.error('[Inquiry] Failed to send confirmation email:', err)
    })

    // Fetch service title for chef notification email
    let serviceTitle: string | null = null
    if (service_id) {
      const { data: service } = await supabase
        .from('services')
        .select('title')
        .eq('id', service_id)
        .single()
      serviceTitle = service?.title || null
    }

    // Notify chef of new inquiry (non-blocking)
    sendNewInquiryNotificationToChef({
      chefId: chef_id,
      dinerEmail: email,
      message,
      inquiryDate: inquiry_date,
      inquiryTime: inquiry_time,
      inquiryId: newInquiry.id,
      serviceType: serviceTitle,
    }).catch(err => {
      console.error('[Inquiry] Failed to send chef notification email:', err)
    })

    return NextResponse.json(
      {
        message: 'Inquiry submitted successfully',
        has_availability_slot: hasAvailabilitySlotsConfigured,
        inquiry: {
          id: newInquiry.id,
          chef_id: newInquiry.chef_id,
          email: newInquiry.email,
          message: newInquiry.message,
          inquiry_date: newInquiry.inquiry_date,
          guest_count: newInquiry.guest_count,
          inquiry_time: newInquiry.inquiry_time,
          status: newInquiry.status,
          dietary_preferences: newInquiry.dietary_preferences || [],
          nut_allergy: newInquiry.nut_allergy || false,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Error creating inquiry:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}