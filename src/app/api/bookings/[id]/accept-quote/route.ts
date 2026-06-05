import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteConfirmationEmail } from '@/lib/email/resend'

// POST /api/bookings/[id]/accept-quote
// Accept a quoted booking - diner accepts the chef's quote
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

    // Verify the diner owns this booking
    if (booking.diner_id !== authUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: you do not own this booking' },
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
  } catch (err) {
    console.error('Error accepting quote:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}