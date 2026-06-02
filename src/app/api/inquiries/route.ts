import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendBookingConfirmedEmail } from '@/lib/email/resend'

// GET /api/inquiries - Get all inquiries for the authenticated chef
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (profile?.role !== 'chef') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: inquiries, error } = await supabase
      .from('inquiries')
      .select(`
        id,
        email,
        message,
        inquiry_date,
        status,
        created_at,
        service_id,
        services:service_id (title)
      `)
      .eq('chef_id', authUser.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching inquiries:', error)
      return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 })
    }

    return NextResponse.json({ inquiries: inquiries || [] }, { status: 200 })
  } catch (err) {
    console.error('Error fetching inquiries:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

// PATCH /api/inquiries - Accept or reject an inquiry
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { inquiryId, status } = body

    if (!inquiryId || typeof inquiryId !== 'string') {
      return NextResponse.json({ error: 'inquiryId is required' }, { status: 400 })
    }

    if (!status || !['accepted', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'status must be "accepted" or "rejected"' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (profile?.role !== 'chef') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch the inquiry
    const { data: inquiry, error: fetchError } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', inquiryId)
      .eq('chef_id', authUser.id)
      .single()

    if (fetchError || !inquiry) {
      return NextResponse.json({ error: 'Inquiry not found or unauthorized' }, { status: 404 })
    }

    if (inquiry.status !== 'pending') {
      return NextResponse.json({ error: 'Inquiry has already been processed' }, { status: 400 })
    }

    if (status === 'accepted') {
      // Find the availability slot for this date
      const { data: slot } = await supabase
        .from('availability')
        .select('id, start_time, end_time')
        .eq('chef_id', authUser.id)
        .eq('date', inquiry.inquiry_date)
        .eq('is_booked', false)
        .single()

      if (!slot) {
        return NextResponse.json({ error: 'No available slot found for this date' }, { status: 400 })
      }

      // Mark slot as booked
      const { error: slotError } = await supabase
        .from('availability')
        .update({ is_booked: true })
        .eq('id', slot.id)

      if (slotError) {
        console.error('Error marking slot as booked:', slotError)
        return NextResponse.json({ error: 'Failed to book slot' }, { status: 500 })
      }

      // Create booking
      const { data: newBooking, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          chef_id: authUser.id,
          service_id: inquiry.service_id,
          diner_id: inquiry.diner_id,
          booking_date: inquiry.inquiry_date,
          start_time: inquiry.inquiry_time || slot.start_time,
          guest_count: inquiry.guest_count || 2,
          total_price: 0,  // placeholder - in real impl would come from service
          status: 'confirmed',
        })
        .select()
        .single()

      if (bookingError) {
        console.error('Error creating booking:', bookingError)
        return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
      }

      // Update inquiry status
      const { error: updateError } = await supabase
        .from('inquiries')
        .update({ status })
        .eq('id', inquiryId)

      if (updateError) {
        console.error('Error updating inquiry status:', updateError)
        return NextResponse.json({ error: 'Failed to update inquiry status' }, { status: 500 })
      }

      // Send booking confirmation email to diner (non-blocking)
      sendBookingConfirmedEmail({
        bookingId: newBooking.id,
        chefId: authUser.id,
        dinerEmail: inquiry.email,
        dinerName: 'Guest', // inquiry doesn't store diner name
        bookingDate: inquiry.inquiry_date,
        guestCount: inquiry.guest_count,
        serviceTitle: null, // would need additional query if needed
        quoteAmount: newBooking.total_price || null,
      }).catch(err => {
        console.error('[Email] Failed to send booking confirmed email:', err)
      })

      return NextResponse.json({
        message: `Inquiry ${status}`,
        inquiryId,
        status,
      }, { status: 200 })
    }

    return NextResponse.json({
      message: `Inquiry ${status}`,
      inquiryId,
      status,
    }, { status: 200 })

  } catch (err) {
    console.error('Error processing inquiry:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}