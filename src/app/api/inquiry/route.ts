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
    const { data: availabilitySlot } = await supabase
      .from('availability')
      .select('id, start_time, end_time')
      .eq('chef_id', chef_id)
      .eq('date', inquiry_date)
      .eq('is_booked', false)
      .single()

    if (!availabilitySlot) {
      return NextResponse.json(
        {
          error: `Chef is not available on ${inquiry_date}. Please select a different date or time.`,
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
      .select('id, booking_date, start_time, status')
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

    // Notify chef of new inquiry (non-blocking)
    sendNewInquiryNotificationToChef({
      chefId: chef_id,
      dinerEmail: email,
      message,
      inquiryDate: inquiry_date,
      inquiryTime: inquiry_time,
      inquiryId: newInquiry.id,
    }).catch(err => {
      console.error('[Inquiry] Failed to send chef notification email:', err)
    })

    return NextResponse.json(
      {
        message: 'Inquiry submitted successfully',
        inquiry: {
          id: newInquiry.id,
          chef_id: newInquiry.chef_id,
          email: newInquiry.email,
          message: newInquiry.message,
          inquiry_date: newInquiry.inquiry_date,
          guest_count: newInquiry.guest_count,
          inquiry_time: newInquiry.inquiry_time,
          status: newInquiry.status,
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