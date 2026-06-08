import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAbandonedBookingFollowUpEmail } from '@/lib/email/resend'

// POST /api/cron/abandoned-bookings
// Checks for abandoned bookings and sends follow-up emails
// This endpoint should be called by a cron job daily
export async function POST(request: NextRequest) {
  try {
    // Optional: Add a secret header check to prevent unauthorized calls
    const authHeader = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET

    if (expectedSecret && authHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Find abandoned bookings that:
    // 1. Were created more than 24 hours ago (> 24h old)
    // 2. Were created less than 72 hours ago (< 72h old)
    // 3. Have not been contacted yet (contacted_at IS NULL)
    const now = new Date()
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    const seventyTwoHoursAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000).toISOString()

    const { data: abandonedBookings, error: fetchError } = await supabase
      .from('abandoned_bookings')
      .select('id, email, chef_id, service_id, service_type, guest_count, created_at')
      .gt('created_at', seventyTwoHoursAgo)  // created before 72h ago
      .lt('created_at', twentyFourHoursAgo)  // created after 24h ago
      .is('contacted_at', null)

    if (fetchError) {
      console.error('[Cron] Error fetching abandoned bookings:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch abandoned bookings' },
        { status: 500 }
      )
    }

    if (!abandonedBookings || abandonedBookings.length === 0) {
      return NextResponse.json({
        message: 'No abandoned bookings found to process',
        processed: 0,
      })
    }

    console.log(`[Cron] Found ${abandonedBookings.length} abandoned bookings to process`)

    const results = {
      processed: 0,
      emails_sent: 0,
      emails_failed: 0,
      skipped: 0,
      errors: [] as string[],
    }

    for (const abandoned of abandonedBookings) {
      try {
        // Check if a booking already exists for this email + chef_id
        // (either via inquiries linked to bookings, or direct bookings)
        const { data: existingBooking } = await supabase
          .from('bookings')
          .select('id')
          .eq('chef_id', abandoned.chef_id)
          .or(`diner_id.eq.null,inquiries.email.ilike.${abandoned.email}`)
          .limit(1)

        // Alternative check: look for inquiries with same email that converted
        const { data: convertedInquiry } = await supabase
          .from('inquiries')
          .select('id')
          .eq('email', abandoned.email)
          .eq('chef_id', abandoned.chef_id)
          .in('status', ['converted', 'contacted'])
          .limit(1)

        // If either a booking exists or inquiry converted, skip this abandoned booking
        if (existingBooking && existingBooking.length > 0) {
          console.log(`[Cron] Skipping abandoned booking ${abandoned.id} - booking already exists`)
          results.skipped++
          // Mark as contacted so we don't process again
          await supabase
            .from('abandoned_bookings')
            .update({ contacted_at: now.toISOString() })
            .eq('id', abandoned.id)
          continue
        }

        if (convertedInquiry && convertedInquiry.length > 0) {
          console.log(`[Cron] Skipping abandoned booking ${abandoned.id} - inquiry already converted`)
          results.skipped++
          await supabase
            .from('abandoned_bookings')
            .update({ contacted_at: now.toISOString() })
            .eq('id', abandoned.id)
          continue
        }

        // Fetch chef name
        const { data: chefProfile } = await supabase
          .from('chef_profiles')
          .select('display_name')
          .eq('id', abandoned.chef_id)
          .single()

        const chefName = chefProfile?.display_name || 'your chef'

        // Send follow-up email
        const emailResult = await sendAbandonedBookingFollowUpEmail({
          abandonedBookingId: abandoned.id,
          email: abandoned.email,
          chefId: abandoned.chef_id,
          chefName,
          serviceType: abandoned.service_type,
          guestCount: abandoned.guest_count,
        })

        if (emailResult.success) {
          // Mark as contacted
          await supabase
            .from('abandoned_bookings')
            .update({ contacted_at: now.toISOString() })
            .eq('id', abandoned.id)
          
          results.emails_sent++
        } else {
          results.emails_failed++
          results.errors.push(`Email failed for abandoned booking ${abandoned.id}: ${emailResult.error}`)
        }

        results.processed++
      } catch (err) {
        console.error(`[Cron] Error processing abandoned booking ${abandoned.id}:`, err)
        results.errors.push(`Processing error for abandoned booking ${abandoned.id}: ${err}`)
      }
    }

    console.log(`[Cron] Abandoned bookings check complete:`, results)

    return NextResponse.json({
      message: 'Abandoned bookings check complete',
      ...results,
    })
  } catch (err) {
    console.error('[Cron] Error in abandoned bookings check:', err)
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