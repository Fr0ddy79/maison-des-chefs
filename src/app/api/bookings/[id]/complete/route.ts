import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/bookings/[id]/complete
// Chef marks their confirmed booking as completed
// Triggers review reminder email (placeholder for now)
export async function PATCH(
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

    // Verify the chef owns this booking
    if (booking.chef_id !== authUser.id) {
      return NextResponse.json(
        { error: 'Forbidden: you do not own this booking' },
        { status: 403 }
      )
    }

    // Check booking is confirmed (can only complete confirmed bookings)
    if (booking.status !== 'confirmed') {
      return NextResponse.json(
        { error: `Cannot complete a ${booking.status} booking. Only confirmed bookings can be marked as completed.` },
        { status: 400 }
      )
    }

    // Update booking status to completed
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status: 'completed' })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error completing booking:', updateError)
      return NextResponse.json(
        { error: 'Failed to complete booking. Please try again.' },
        { status: 500 }
      )
    }

    // TODO: Trigger review reminder email (placeholder)
    // This will be implemented once email infrastructure is ready
    // sendReviewReminderEmail({ bookingId, chefId: booking.chef_id, dinerId: booking.diner_id })
    //   .catch(err => console.error('[Email] Failed to send review reminder:', err))

    return NextResponse.json(
      {
        message: 'Booking marked as completed',
        booking: {
          id: booking.id,
          status: 'completed'
        }
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error completing booking:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
