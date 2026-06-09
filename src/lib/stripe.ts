import Stripe from 'stripe'

// Initialize Stripe with the secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
})

const PLACEHOLDER_KEYS = ['your_stripe_secret_key_here', 'sk_placeholder', 'placeholder']

export function isPlaceholderApiKey(key: string | undefined): boolean {
  if (!key) return true
  const lower = key.toLowerCase()
  return PLACEHOLDER_KEYS.some(p => lower === p || lower.includes(p))
}

export interface StripeApiKeyStatus {
  isConfigured: boolean
  isPlaceholder: boolean
  status: 'valid' | 'placeholder' | 'missing'
  message: string
}

export function getStripeApiKeyStatus(): StripeApiKeyStatus {
  const key = process.env.STRIPE_SECRET_KEY
  
  if (!key) {
    return {
      isConfigured: false,
      isPlaceholder: false,
      status: 'missing',
      message: 'STRIPE_SECRET_KEY is not set',
    }
  }
  
  if (isPlaceholderApiKey(key)) {
    return {
      isConfigured: true,
      isPlaceholder: true,
      status: 'placeholder',
      message: 'STRIPE_SECRET_KEY is set to a placeholder value — Stripe operations will be logged but not executed',
    }
  }
  
  return {
    isConfigured: true,
    isPlaceholder: false,
    status: 'valid',
    message: 'STRIPE_SECRET_KEY is properly configured',
  }
}

interface CreateCheckoutSessionParams {
  bookingId: string
  amount: number // in cents
  customerEmail: string
  chefName: string
  bookingDate: string
  successUrl: string
  cancelUrl: string
}

interface CheckoutSessionResult {
  success: boolean
  sessionId?: string
  url?: string
  error?: string
  logged?: boolean
}

// Create a Stripe Checkout session for a booking
export async function createCheckoutSession({
  bookingId,
  amount,
  customerEmail,
  chefName,
  bookingDate,
  successUrl,
  cancelUrl,
}: CreateCheckoutSessionParams): Promise<CheckoutSessionResult> {
  const keyStatus = getStripeApiKeyStatus()
  
  if (!keyStatus.isConfigured) {
    console.warn('[Stripe] STRIPE_SECRET_KEY not set — cannot create checkout session')
    return { success: false, error: 'Stripe is not configured' }
  }
  
  if (keyStatus.isPlaceholder) {
    console.log('[Stripe] ===== CHECKOUT SESSION FALLBACK (placeholder key) =====')
    console.log(`[Stripe] Booking ID: ${bookingId}`)
    console.log(`[Stripe] Amount: $${(amount / 100).toFixed(2)}`)
    console.log(`[Stripe] Customer: ${customerEmail}`)
    console.log(`[Stripe] Chef: ${chefName}`)
    console.log(`[Stripe] Date: ${bookingDate}`)
    console.log(`[Stripe] Success URL: ${successUrl}`)
    console.log(`[Stripe] Cancel URL: ${cancelUrl}`)
    console.log('[Stripe] =======================================================')
    return { success: true, logged: true }
  }
  
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: `Private Dining Experience with ${chefName}`,
              description: `Booking for ${bookingDate}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        bookingId,
        chefName,
        bookingDate,
      },
    })
    
    return {
      success: true,
      sessionId: session.id,
      url: session.url || undefined,
    }
  } catch (err) {
    console.error('[Stripe] Error creating checkout session:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

// Verify and parse Stripe webhook event
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event | null {
  const keyStatus = getStripeApiKeyStatus()
  
  if (!keyStatus.isConfigured || keyStatus.isPlaceholder) {
    console.warn('[Stripe] Cannot verify webhook — Stripe not configured or using placeholder key')
    return null
  }
  
  try {
    return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
  } catch (err) {
    console.error('[Stripe] Webhook signature verification failed:', err)
    return null
  }
}

// Format amount from cents to display string
export function formatAmount(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// Parse amount to cents from dollars
export function parseAmount(dollars: number): number {
  return Math.round(dollars * 100)
}

export { stripe }