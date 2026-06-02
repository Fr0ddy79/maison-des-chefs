import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteConfirmationEmail } from '@/lib/email/resend'

// POST /api/bookings/[id]/decline-quote
// Decline a quoted booking - diner rejects the chef's quote and frees the slot
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
  } catch (err) {
    console.error('Error declining quote:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}