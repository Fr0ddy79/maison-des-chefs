import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { constructWebhookEvent } from '@/lib/stripe'
import Stripe from 'stripe'

// POST /api/webhooks/stripe
// Handle Stripe webhook events
export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      console.error('[Webhook] Missing stripe-signature header')
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      )
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
    if (!webhookSecret) {
      console.error('[Webhook] STRIPE_WEBHOOK_SECRET is not configured')
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      )
    }

    // Construct and verify the event
    const event = constructWebhookEvent(body, signature, webhookSecret)
    
    if (!event) {
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 }
      )
    }

    console.log('[Webhook] Received event:', event.type)

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        
        await handleCheckoutSessionCompleted(session)
        break
      }
      
      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session
        
        await handleCheckoutSessionExpired(session)
        break
      }
      
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        await handlePaymentIntentSucceeded(paymentIntent)
        break
      }
      
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        
        await handlePaymentIntentFailed(paymentIntent)
        break
      }
      
      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        
        await handleChargeRefunded(charge)
        break
      }
      
      default:
        console.log('[Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true }, { status: 200 })
  } catch (err) {
    console.error('[Webhook] Error processing webhook:', err)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    const supabase = await createClient()
    const bookingId = session.metadata?.bookingId

    if (!bookingId) {
      console.error('[Webhook] No bookingId in checkout session metadata')
      return
    }

    // Update booking with payment details and set status to confirmed
    const { error } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
        payment_intent_id: session.payment_intent as string || null,
        checkout_session_id: session.id,
        status: 'confirmed', // Move from payment_pending to confirmed on successful payment
      })
      .eq('id', bookingId)

    if (error) {
      console.error('[Webhook] Error updating booking payment status:', error)
      return
    }

    console.log('[Webhook] Payment completed for booking:', bookingId)
  } catch (err) {
    console.error('[Webhook] Error handling checkout.session.completed:', err)
  }
}

async function handleCheckoutSessionExpired(session: Stripe.Checkout.Session) {
  try {
    const supabase = await createClient()
    const bookingId = session.metadata?.bookingId

    if (!bookingId) {
      console.error('[Webhook] No bookingId in checkout session metadata')
      return
    }

    // Update booking payment status to indicate session expired
    const { error } = await supabase
      .from('bookings')
      .update({
        payment_status: 'failed',
        checkout_session_id: session.id,
      })
      .eq('id', bookingId)
      .is('payment_status', null) // Only update if not already paid

    if (error) {
      console.error('[Webhook] Error updating booking for expired session:', error)
      return
    }

    console.log('[Webhook] Checkout session expired for booking:', bookingId)
  } catch (err) {
    console.error('[Webhook] Error handling checkout.session.expired:', err)
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const supabase = await createClient()

    // Find booking by payment intent ID
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('payment_intent_id', paymentIntent.id)
      .single()

    if (error || !booking) {
      console.log('[Webhook] No booking found for payment intent:', paymentIntent.id)
      return
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'paid',
      })
      .eq('id', booking.id)

    if (updateError) {
      console.error('[Webhook] Error updating booking payment status:', updateError)
      return
    }

    console.log('[Webhook] Payment succeeded for booking:', booking.id)
  } catch (err) {
    console.error('[Webhook] Error handling payment_intent.succeeded:', err)
  }
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const supabase = await createClient()

    // Find booking by payment intent ID
    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('payment_intent_id', paymentIntent.id)
      .single()

    if (error || !booking) {
      console.log('[Webhook] No booking found for payment intent:', paymentIntent.id)
      return
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'failed',
      })
      .eq('id', booking.id)

    if (updateError) {
      console.error('[Webhook] Error updating booking payment status:', updateError)
      return
    }

    console.log('[Webhook] Payment failed for booking:', booking.id)
  } catch (err) {
    console.error('[Webhook] Error handling payment_intent.payment_failed:', err)
  }
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  try {
    const supabase = await createClient()

    // Find booking by payment intent ID
    if (!charge.payment_intent) {
      console.log('[Webhook] No payment_intent on charge:', charge.id)
      return
    }

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id')
      .eq('payment_intent_id', charge.payment_intent)
      .single()

    if (error || !booking) {
      console.log('[Webhook] No booking found for payment intent:', charge.payment_intent)
      return
    }

    // Update payment status to refunded
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        payment_status: 'refunded',
      })
      .eq('id', booking.id)

    if (updateError) {
      console.error('[Webhook] Error updating booking payment status:', updateError)
      return
    }

    console.log('[Webhook] Payment refunded for booking:', booking.id)
  } catch (err) {
    console.error('[Webhook] Error handling charge.refunded:', err)
  }
}