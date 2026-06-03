import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteNotificationEmail } from '@/lib/email/resend'

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