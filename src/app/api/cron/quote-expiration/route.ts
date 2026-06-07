import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendQuoteExpiredEmail } from '@/lib/email/resend'

// POST /api/cron/quote-expiration
// Checks for expired quotes and sends follow-up emails to diners
// This endpoint should be called by a cron job every hour
export async function POST(request: NextRequest) {
  try {
    // Optional: Add a secret header check to prevent unauthorized calls
    const authHeader = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET

    if (expectedSecret && authHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Find all bookings with pending quotes that have expired
    // A quote is expired when:
    // 1. quote_status is 'pending'
    // 2. quote_valid_until is set and is in the past
    const now = new Date().toISOString()

    const { data: expiredQuotes, error: fetchError } = await supabase
      .from('bookings')
      .select('id, chef_id, diner_id, quote_amount, quote_message, quote_valid_until, booking_date')
      .eq('quote_status', 'pending')
      .lt('quote_valid_until', now)
      .not('quote_valid_until', 'is', null)

    if (fetchError) {
      console.error('[Cron] Error fetching expired quotes:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch expired quotes' },
        { status: 500 }
      )
    }

    if (!expiredQuotes || expiredQuotes.length === 0) {
      return NextResponse.json({
        message: 'No expired quotes found',
        processed: 0
      })
    }

    console.log(`[Cron] Found ${expiredQuotes.length} expired quotes to process`)

    const results = {
      processed: 0,
      emails_sent: 0,
      emails_failed: 0,
      errors: [] as string[]
    }

    for (const booking of expiredQuotes) {
      try {
        // Mark the quote as expired in the database
        const { error: updateError } = await supabase
          .from('bookings')
          .update({ quote_status: 'expired' })
          .eq('id', booking.id)
          .eq('quote_status', 'pending') // Only update if still pending (prevent race conditions)

        if (updateError) {
          console.error(`[Cron] Error marking quote ${booking.id} as expired:`, updateError)
          results.errors.push(`Failed to update booking ${booking.id}: ${updateError.message}`)
          continue
        }

        // Send expiration email to diner
        const emailResult = await sendQuoteExpiredEmail({
          bookingId: booking.id,
          chefId: booking.chef_id,
          dinerId: booking.diner_id,
          quoteAmount: booking.quote_amount || 0,
          quoteMessage: booking.quote_message,
          quoteValidUntil: booking.quote_valid_until || now,
        })

        if (emailResult.success) {
          results.emails_sent++
        } else {
          results.emails_failed++
          results.errors.push(`Email failed for booking ${booking.id}: ${emailResult.error}`)
        }

        results.processed++
      } catch (err) {
        console.error(`[Cron] Error processing booking ${booking.id}:`, err)
        results.errors.push(`Processing error for booking ${booking.id}: ${err}`)
      }
    }

    console.log(`[Cron] Quote expiration check complete:`, results)

    return NextResponse.json({
      message: 'Quote expiration check complete',
      ...results
    })
  } catch (err) {
    console.error('[Cron] Error in quote expiration check:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  // Redirect to POST behavior for simple health checks
  return POST(request)
}