import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  sendBookingReminderEmailToDiner,
  sendBookingReminderEmailToChef,
} from '@/lib/email/resend'

// POST /api/cron/booking-reminders
// Checks for confirmed bookings happening in ~48 hours and sends reminder emails
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

    // Find confirmed bookings happening in approximately 48 hours
    // We look for bookings where:
    // 1. status is 'confirmed'
    // 2. reminder_sent is false (not yet sent)
    // 3. booking_date is between 44 and 52 hours from now (to catch bookings within the reminder window)
    const now = new Date()
    const fortyFourHoursFromNow = new Date(now.getTime() + 44 * 60 * 60 * 1000).toISOString()
    const fiftyTwoHoursFromNow = new Date(now.getTime() + 52 * 60 * 60 * 1000).toISOString()

    const { data: upcomingBookings, error: fetchError } = await supabase
      .from('bookings')
      .select(
        'id, chef_id, diner_id, booking_date, start_time, guest_count, reminder_sent, status'
      )
      .eq('status', 'confirmed')
      .eq('reminder_sent', false)
      .gte('booking_date', fortyFourHoursFromNow.slice(0, 10))
      .lte('booking_date', fiftyTwoHoursFromNow.slice(0, 10))

    if (fetchError) {
      console.error('[Cron] Error fetching upcoming bookings:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch upcoming bookings' },
        { status: 500 }
      )
    }

    // Filter to only bookings that are truly in the 44-52 hour window
    // (date comparison alone isn't precise enough)
    const bookingsInWindow = (upcomingBookings || []).filter((booking) => {
      const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time || '00:00'}`)
      const hoursUntilBooking =
        (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60)
      return hoursUntilBooking >= 44 && hoursUntilBooking <= 52
    })

    if (bookingsInWindow.length === 0) {
      return NextResponse.json({
        message: 'No bookings require reminders',
        processed: 0,
      })
    }

    console.log(`[Cron] Found ${bookingsInWindow.length} bookings to send reminders for`)

    const results = {
      processed: 0,
      diners_reminded: 0,
      chefs_reminded: 0,
      diners_failed: 0,
      chefs_failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const booking of bookingsInWindow) {
      try {
        // Skip cancelled bookings (double-check)
        if (booking.status === 'cancelled') {
          results.skipped++
          continue
        }

        // Send reminder to diner
        const dinerResult = await sendBookingReminderEmailToDiner({
          bookingId: booking.id,
          chefId: booking.chef_id,
          dinerId: booking.diner_id,
          bookingDate: booking.booking_date,
          startTime: booking.start_time,
          guestCount: booking.guest_count,
        })

        if (dinerResult.success) {
          results.diners_reminded++
        } else {
          results.diners_failed++
          results.errors.push(`Diner email failed for booking ${booking.id}: ${dinerResult.error}`)
        }

        // Send reminder to chef
        const chefResult = await sendBookingReminderEmailToChef({
          bookingId: booking.id,
          chefId: booking.chef_id,
          dinerId: booking.diner_id,
          bookingDate: booking.booking_date,
          startTime: booking.start_time,
          guestCount: booking.guest_count,
        })

        if (chefResult.success) {
          results.chefs_reminded++
        } else {
          results.chefs_failed++
          results.errors.push(`Chef email failed for booking ${booking.id}: ${chefResult.error}`)
        }

        // Mark reminder as sent (only if at least one email succeeded)
        if (dinerResult.success || chefResult.success) {
          await supabase
            .from('bookings')
            .update({ reminder_sent: true })
            .eq('id', booking.id)
            .eq('reminder_sent', false) // Only update if not already sent (prevent race conditions)
        }

        results.processed++
      } catch (err) {
        console.error(`[Cron] Error processing booking ${booking.id}:`, err)
        results.errors.push(`Processing error for booking ${booking.id}: ${err}`)
      }
    }

    console.log(`[Cron] Booking reminders check complete:`, results)

    return NextResponse.json({
      message: 'Booking reminders check complete',
      ...results,
    })
  } catch (err) {
    console.error('[Cron] Error in booking reminders check:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}