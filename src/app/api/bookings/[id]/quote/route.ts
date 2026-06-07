import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteNotificationEmail, sendQuoteConfirmationEmail } from '@/lib/email/resend'

// POST /api/bookings/[id]/quote
// Chef sends a quote to the diner for a booking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params

    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json(
        { error: 'booking_id is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { quote_amount, quote_message, quote_valid_days } = body

    // Validate quote_amount
    if (typeof quote_amount !== 'number' || quote_amount <= 0) {
      return NextResponse.json(
        { error: 'quote_amount must be a positive number' },
        { status: 400 }
      )
    }

    // quote_valid_days defaults to 7 if not provided
    const validDays = typeof quote_valid_days === 'number' && quote_valid_days > 0 ? quote_valid_days : 7

    const supabase = await createClient()

    // Authenticate user
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch the booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Verify the chef owns this booking
    if (booking.chef_id !== authUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: you do not own this booking' },
        { status: 403 }
      )
    }

    // Check booking is not already quoted
    if (booking.quote_status !== null) {
      return NextResponse.json(
        {
          error: `Booking has already been quoted (status: ${booking.quote_status})`,
          quote_status: booking.quote_status
        },
        { status: 400 }
      )
    }

    // Calculate quote_valid_until (default 7 days from now)
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)
    const quoteValidUntilISO = validUntil.toISOString()

    // Update booking with quote data
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        quote_amount,
        quote_message: typeof quote_message === 'string' ? quote_message : null,
        quote_valid_until: quoteValidUntilISO,
        quote_status: 'pending',
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error sending quote:', updateError)
      return NextResponse.json(
        { error: 'Failed to send quote. Please try again.' },
        { status: 500 }
      )
    }

    // Fetch updated booking to return
    const { data: updatedBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    // Send email notification to diner (non-blocking)
    sendQuoteNotificationEmail({
      bookingId,
      chefId: booking.chef_id,
      dinerId: booking.diner_id,
      quoteAmount: quote_amount,
      quoteMessage: typeof quote_message === 'string' ? quote_message : null,
      quoteValidUntil: quoteValidUntilISO,
    }).catch(err => {
      console.error('[Email] Failed to send quote notification email:', err)
    })

    return NextResponse.json(
      {
        message: 'Quote sent successfully',
        booking: {
          id: updatedBooking?.id,
          quote_amount: updatedBooking?.quote_amount,
          quote_message: updatedBooking?.quote_message,
          quote_valid_until: updatedBooking?.quote_valid_until,
          quote_status: updatedBooking?.quote_status,
        }
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error sending quote:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

// PATCH /api/bookings/[id]/quote
// Accept or decline a quote - works WITHOUT authentication
// Authorization: diner reached this page via their inquiry link (inquiry_id is the secret)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params

    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json(
        { error: 'booking_id is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { quote_status, inquiry_id } = body

    // Validate quote_status
    if (!quote_status || !['accepted', 'declined'].includes(quote_status)) {
      return NextResponse.json(
        { error: 'quote_status must be "accepted" or "declined"' },
        { status: 400 }
      )
    }

    // Validate inquiry_id is provided (it's the implicit authorization)
    if (!inquiry_id || typeof inquiry_id !== 'string') {
      return NextResponse.json(
        { error: 'inquiry_id is required for authorization' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch the booking
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Verify the inquiry_id matches the booking's inquiry_id (implicit authorization)
    if (booking.inquiry_id !== inquiry_id) {
      return NextResponse.json(
        { error: 'Forbidden: inquiry_id does not match this booking' },
        { status: 403 }
      )
    }

    // Check if booking has a pending quote
    if (!booking.quote_status) {
      return NextResponse.json(
        { error: 'No quote found for this booking. Please request a quote first.' },
        { status: 400 }
      )
    }

    if (booking.quote_status !== 'pending') {
      return NextResponse.json(
        {
          error: `Quote has already been ${booking.quote_status}`,
          quote_status: booking.quote_status
        },
        { status: 409 }
      )
    }

    // Check if quote has expired
    if (booking.quote_valid_until) {
      const validUntil = new Date(booking.quote_valid_until)
      if (isNaN(validUntil.getTime()) || validUntil < new Date()) {
        // Mark as expired
        await supabase
          .from('bookings')
          .update({ quote_status: 'expired' })
          .eq('id', bookingId)

        return NextResponse.json(
          { error: 'Quote has expired. Please contact the chef for a new quote.' },
          { status: 400 }
        )
      }
    }

    if (quote_status === 'accepted') {
      // Accept the quote: update status and quote_status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          quote_status: 'accepted'
        })
        .eq('id', bookingId)

      if (updateError) {
        console.error('Error accepting quote:', updateError)
        return NextResponse.json(
          { error: 'Failed to accept quote. Please try again.' },
          { status: 500 }
        )
      }

      // Mark the availability slot as booked to prevent double-booking
      const { data: slot } = await supabase
        .from('availability')
        .select('id')
        .eq('chef_id', booking.chef_id)
        .eq('date', booking.booking_date)
        .eq('is_booked', false)
        .single()

      if (slot) {
        await supabase
          .from('availability')
          .update({ is_booked: true })
          .eq('id', slot.id)
      }

      // Send confirmation email (non-blocking)
      sendQuoteConfirmationEmail({
        bookingId,
        chefId: booking.chef_id,
        dinerId: booking.diner_id,
        action: 'accepted'
      }).catch(err => {
        console.error('[Email] Failed to send quote acceptance email:', err)
      })

      return NextResponse.json(
        {
          message: 'Quote accepted successfully',
          booking: {
            id: booking.id,
            status: 'confirmed',
            quote_status: 'accepted',
            quote_amount: booking.quote_amount
          }
        },
        { status: 200 }
      )
    } else {
      // Decline the quote: update quote_status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ quote_status: 'declined' })
        .eq('id', bookingId)

      if (updateError) {
        console.error('Error declining quote:', updateError)
        return NextResponse.json(
          { error: 'Failed to decline quote. Please try again.' },
          { status: 500 }
        )
      }

      // Free the availability slot so other diners can book
      const { data: slot } = await supabase
        .from('availability')
        .select('id')
        .eq('chef_id', booking.chef_id)
        .eq('date', booking.booking_date)
        .eq('is_booked', true)
        .single()

      if (slot) {
        await supabase
          .from('availability')
          .update({ is_booked: false })
          .eq('id', slot.id)
      }

      // Send confirmation email (non-blocking)
      sendQuoteConfirmationEmail({
        bookingId,
        chefId: booking.chef_id,
        dinerId: booking.diner_id,
        action: 'declined'
      }).catch(err => {
        console.error('[Email] Failed to send quote decline email:', err)
      })

      return NextResponse.json(
        {
          message: 'Quote declined successfully',
          booking: {
            id: booking.id,
            quote_status: 'declined'
          }
        },
        { status: 200 }
      )
    }
  } catch (err) {
    console.error('Error processing quote:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}