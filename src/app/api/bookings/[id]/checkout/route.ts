import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCheckoutSession } from '@/lib/stripe'

// POST /api/bookings/[id]/checkout
// Create a Stripe Checkout session for a confirmed booking
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

    // Check booking is confirmed (ready for payment)
    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        {
          error: `Booking must be confirmed before payment. Current status: ${booking.status}`,
          status: booking.status
        },
        { status: 400 }
      )
    }

    // Check if payment is already complete
    if (booking.payment_status === 'paid') {
      return NextResponse.json(
        { error: 'Payment has already been completed for this booking' },
        { status: 400 }
      )
    }

    // Check if there's already a checkout session
    if (booking.checkout_session_id) {
      // Could return existing session URL, but for simplicity we create a new one
      console.log('[Checkout] Booking already has checkout_session_id:', booking.checkout_session_id)
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

    // Calculate amount in cents (total_price is in dollars)
    const amountInCents = Math.round(booking.quote_amount || booking.total_price * 100)

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
      // Check if it was a placeholder key scenario (logged but not executed)
      if (result.logged) {
        // Return a mock response for placeholder key scenario
        return NextResponse.json(
          {
            message: 'Checkout session created (placeholder mode)',
            bookingId,
            sessionId: 'cs_placeholder_' + bookingId,
            url: `${baseUrl}/dashboard/bookings?payment=pending&booking_id=${bookingId}`,
            note: 'Stripe is in placeholder mode. Set STRIPE_SECRET_KEY to enable real payments.',
          },
          { status: 200 }
        )
      }
      
      return NextResponse.json(
        { error: result.error || 'Failed to create checkout session' },
        { status: 500 }
      )
    }

    // Update booking with checkout session ID
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        checkout_session_id: result.sessionId,
        payment_status: 'pending',
      })
      .eq('id', bookingId)

    if (updateError) {
      console.error('[Checkout] Error updating booking with session ID:', updateError)
      // Don't fail the request, just log the error
    }

    return NextResponse.json(
      {
        message: 'Checkout session created successfully',
        bookingId,
        sessionId: result.sessionId,
        url: result.url,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error creating checkout session:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

// GET /api/bookings/[id]/checkout
// Retrieve checkout session status for a booking
export async function GET(
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
      .select('id, diner_id, checkout_session_id, payment_status, payment_intent_id, status, quote_amount, total_price')
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

    return NextResponse.json(
      {
        bookingId: booking.id,
        checkout_session_id: booking.checkout_session_id,
        payment_status: booking.payment_status,
        payment_intent_id: booking.payment_intent_id,
        booking_status: booking.status,
        amount: booking.quote_amount || booking.total_price,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error retrieving checkout session:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}