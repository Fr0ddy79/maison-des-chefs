import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendAbandonedBookingFollowUpEmail } from '@/lib/email/resend'

// POST /api/abandoned-bookings/follow-up
// Manually trigger follow-up email for specific abandoned booking(s)
// Body: { id?: string, email?: string } - if neither provided, sends to all uncontacted
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, email } = body

    let abandonedBookings

    if (id) {
      // Get specific abandoned booking by ID
      const { data, error } = await supabase
        .from('abandoned_bookings')
        .select('id, email, chef_id, service_id, service_type, guest_count, created_at, contacted_at')
        .eq('id', id)
        .single()

      if (error || !data) {
        return NextResponse.json({ error: 'Abandoned booking not found' }, { status: 404 })
      }

      abandonedBookings = [data]
    } else if (email) {
      // Get all uncontacted abandoned bookings for this email
      const { data, error } = await supabase
        .from('abandoned_bookings')
        .select('id, email, chef_id, service_id, service_type, guest_count, created_at, contacted_at')
        .eq('email', email.toLowerCase().trim())
        .is('contacted_at', null)

      if (error) {
        console.error('[API] Error fetching abandoned bookings:', error)
        return NextResponse.json({ error: 'Failed to fetch abandoned bookings' }, { status: 500 })
      }

      abandonedBookings = data || []
    } else {
      return NextResponse.json(
        { error: 'Either id or email is required' },
        { status: 400 }
      )
    }

    if (abandonedBookings.length === 0) {
      return NextResponse.json({
        message: 'No uncontacted abandoned bookings found',
        emails_sent: 0,
      })
    }

    const results = {
      processed: 0,
      emails_sent: 0,
      emails_failed: 0,
      errors: [] as string[],
    }

    const now = new Date().toISOString()

    for (const abandoned of abandonedBookings) {
      try {
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
            .update({ contacted_at: now })
            .eq('id', abandoned.id)

          results.emails_sent++
        } else {
          results.emails_failed++
          results.errors.push(`Email failed for ${abandoned.id}: ${emailResult.error}`)
        }

        results.processed++
      } catch (err) {
        console.error(`[API] Error processing abandoned booking ${abandoned.id}:`, err)
        results.errors.push(`Processing error for ${abandoned.id}: ${err}`)
      }
    }

    return NextResponse.json({
      message: 'Follow-up emails processed',
      ...results,
    })
  } catch (err) {
    console.error('[API] Error in abandoned bookings follow-up:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

// DELETE /api/abandoned-bookings/follow-up
// Remove an abandoned booking entry (e.g., when user completes booking)
// Body: { id?: string, email?: string, chef_id?: string }
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, email, chef_id } = body

    if (!id && (!email || !chef_id)) {
      return NextResponse.json(
        { error: 'Either id or (email + chef_id) is required' },
        { status: 400 }
      )
    }

    if (id) {
      const { error } = await supabase
        .from('abandoned_bookings')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('[API] Error deleting abandoned booking:', error)
        return NextResponse.json({ error: 'Failed to delete abandoned booking' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Abandoned booking deleted', id })
    } else {
      const { error } = await supabase
        .from('abandoned_bookings')
        .delete()
        .eq('email', email.toLowerCase().trim())
        .eq('chef_id', chef_id)

      if (error) {
        console.error('[API] Error deleting abandoned bookings:', error)
        return NextResponse.json({ error: 'Failed to delete abandoned bookings' }, { status: 500 })
      }

      return NextResponse.json({ message: 'Abandoned bookings deleted', email, chef_id })
    }
  } catch (err) {
    console.error('[API] Error deleting abandoned booking:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}