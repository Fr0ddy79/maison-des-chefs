import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession, getStripeApiKeyStatus } from '@/lib/stripe'

// POST /api/bookings/[id]/accept-quote
// Accept a quoted booking - diner accepts the chef's quote and initiates payment
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

    // Accept the quote: update status to payment_pending and quote_status to accepted
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'payment_pending',
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

    // Fetch chef details for the checkout description
    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('display_name')
      .eq('id', booking.chef_id)
      .single()

    // Fetch diner email
    const { data: dinerProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', authUser.id)
      .single()

    if (!dinerProfile?.email) {
      // Rollback status if we can't proceed with checkout
      await supabase
        .from('bookings')
        .update({ status: 'pending', quote_status: 'pending' })
        .eq('id', bookingId)
      
      return NextResponse.json(
        { error: 'Diner email not found' },
        { status: 400 }
      )
    }

    const chefName = chefProfile?.display_name || 'Your chef'
    const formattedDate = new Date(booking.booking_date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    // Calculate amount in cents (quote_amount is in dollars)
    const amountInCents = Math.round((booking.quote_amount || booking.total_price) * 100)

    // Build success and cancel URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const successUrl = `${baseUrl}/dashboard/bookings?payment=success&booking_id=${bookingId}`
    const cancelUrl = `${baseUrl}/dashboard/bookings?payment=cancelled&booking_id=${bookingId}`

    // Create Stripe Checkout session
    const result = await createCheckoutSession({
      bookingId,
      amount: amountInCents,
      customerEmail: dinerProfile.email,
      chefName,
      bookingDate: formattedDate,
      successUrl,
      cancelUrl,
    })

    if (!result.success) {
      // Check if it was a placeholder key scenario
      if (result.logged) {
        // Return a mock response for placeholder key scenario
        // Keep status as payment_pending since the flow is correct
        return NextResponse.json(
          {
            message: 'Quote accepted. Redirecting to payment (placeholder mode).',
            booking: {
              id: booking.id,
              status: 'payment_pending',
              quote_status: 'accepted',
              quote_amount: booking.quote_amount
            },
            checkoutUrl: `${baseUrl}/dashboard/bookings?payment=pending&booking_id=${bookingId}`,
            note: 'Stripe is in placeholder mode. Set STRIPE_SECRET_KEY to enable real payments.',
          },
          { status: 200 }
        )
      }

      // Rollback status on failure
      await supabase
        .from('bookings')
        .update({ status: 'pending', quote_status: 'pending' })
        .eq('id', bookingId)

      return NextResponse.json(
        { error: result.error || 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    // Update booking with checkout session ID
    await supabase
      .from('bookings')
      .update({
        checkout_session_id: result.sessionId,
        payment_status: 'pending',
      })
      .eq('id', bookingId)

    return NextResponse.json(
      {
        message: 'Quote accepted. Redirecting to payment.',
        booking: {
          id: booking.id,
          status: 'payment_pending',
          quote_status: 'accepted',
          quote_amount: booking.quote_amount
        },
        checkoutUrl: result.url,
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