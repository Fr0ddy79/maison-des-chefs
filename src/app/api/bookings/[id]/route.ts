import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendBookingCancellationEmail, sendBookingModificationConfirmationEmail } from '@/lib/email/resend'

// PATCH /api/bookings/[id]
// Cancel or modify a booking
// For cancellation: diner cancels their pending or confirmed booking
// For modification: diner changes date/time for pending bookings (requires new availability check)
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

    const body = await request.json()
    const { action, new_booking_date, new_start_time } = body

    // Validate action
    if (!action || !['cancel', 'modify'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be "cancel" or "modify"' },
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

    // Check booking is not already cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      )
    }

    // ========================================
    // CANCEL ACTION
    // ========================================
    if (action === 'cancel') {
      // Can only cancel pending or confirmed bookings
      if (!['pending', 'confirmed'].includes(booking.status)) {
        return NextResponse.json(
          { error: `Cannot cancel a ${booking.status} booking` },
          { status: 400 }
        )
      }

      // Update booking status to cancelled
      const { error: updateError } = await supabase
        .from('bookings')
        .update({ status: 'cancelled' })
        .eq('id', bookingId)

      if (updateError) {
        console.error('Error cancelling booking:', updateError)
        return NextResponse.json(
          { error: 'Failed to cancel booking. Please try again.' },
          { status: 500 }
        )
      }

      // Release the availability slot
      const { data: slot } = await supabase
        .from('availability')
        .select('id')
        .eq('chef_id', booking.chef_id)
        .eq('date', booking.booking_date)
        .eq('is_booked', true)
        .single()

      if (slot) {
        const { error: slotError } = await supabase
          .from('availability')
          .update({ is_booked: false })
          .eq('id', slot.id)

        if (slotError) {
          console.error('Error releasing availability slot:', slotError)
        }
      }

      // Send cancellation emails to both diner and chef (non-blocking)
      sendBookingCancellationEmail({
        bookingId,
        chefId: booking.chef_id,
        dinerId: booking.diner_id,
        action: 'cancelled'
      }).catch(err => {
        console.error('[Email] Failed to send cancellation email:', err)
      })

      return NextResponse.json(
        {
          message: 'Booking cancelled successfully',
          booking: {
            id: booking.id,
            status: 'cancelled'
          }
        },
        { status: 200 }
      )
    }

    // ========================================
    // MODIFY ACTION
    // ========================================
    if (action === 'modify') {
      // Can only modify pending bookings
      if (booking.status !== 'pending') {
        return NextResponse.json(
          { error: `Cannot modify a ${booking.status} booking. Only pending bookings can be modified.` },
          { status: 400 }
        )
      }

      // Validate new date and time are provided
      if (!new_booking_date || !new_start_time) {
        return NextResponse.json(
          { error: 'new_booking_date and new_start_time are required for modification' },
          { status: 400 }
        )
      }

      // Check if the new date is different from current
      if (new_booking_date === booking.booking_date && new_start_time === booking.start_time) {
        return NextResponse.json(
          { error: 'No changes detected. Please provide different date or time.' },
          { status: 400 }
        )
      }

      // Validate new date format
      const newDateObj = new Date(new_booking_date)
      if (isNaN(newDateObj.getTime())) {
        return NextResponse.json(
          { error: 'Invalid new_booking_date format. Use YYYY-MM-DD.' },
          { status: 400 }
        )
      }

      // Check if new date is not in the past
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (newDateObj < today) {
        return NextResponse.json(
          { error: 'Cannot modify booking to a past date' },
          { status: 400 }
        )
      }

      // ========================================
      // AVAILABILITY CONFLICT CHECK FOR NEW DATE
      // ========================================

      // a) Check for availability slot on new date
      const { data: newAvailabilitySlot } = await supabase
        .from('availability')
        .select('id, start_time, end_time')
        .eq('chef_id', booking.chef_id)
        .eq('date', new_booking_date)
        .eq('is_booked', false)
        .single()

      if (!newAvailabilitySlot) {
        return NextResponse.json(
          {
            error: `Chef is not available on ${new_booking_date}. Please select a different date or time.`,
            conflictType: 'NO_AVAILABILITY_SLOT',
          },
          { status: 409 }
        )
      }

      // b) Check if new date is blocked
      const { data: blockedDate } = await supabase
        .from('chef_blocked_dates')
        .select('id')
        .eq('chef_id', booking.chef_id)
        .eq('blocked_date', new_booking_date)
        .single()

      if (blockedDate) {
        return NextResponse.json(
          {
            error: `Chef is not available on ${new_booking_date}. Please select a different date or time.`,
            conflictType: 'DATE_BLOCKED',
          },
          { status: 409 }
        )
      }

      // c) Check for conflicting bookings on new date (excluding current booking)
      const { data: conflictingBooking } = await supabase
        .from('bookings')
        .select('id, booking_date, start_time, status')
        .eq('chef_id', booking.chef_id)
        .eq('booking_date', new_booking_date)
        .neq('id', bookingId) // Exclude current booking
        .neq('status', 'cancelled')
        .single()

      if (conflictingBooking) {
        return NextResponse.json(
          {
            error: `Chef is already booked on ${new_booking_date}. Please select a different date or time.`,
            conflictType: 'DATE_ALREADY_BOOKED',
          },
          { status: 409 }
        )
      }

      // ========================================
      // PERFORM THE MODIFICATION
      // ========================================

      // Release the old availability slot
      const { data: oldSlot } = await supabase
        .from('availability')
        .select('id')
        .eq('chef_id', booking.chef_id)
        .eq('date', booking.booking_date)
        .eq('is_booked', true)
        .single()

      if (oldSlot) {
        await supabase
          .from('availability')
          .update({ is_booked: false })
          .eq('id', oldSlot.id)
      }

      // Update booking with new date/time
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          booking_date: new_booking_date,
          start_time: new_start_time
        })
        .eq('id', bookingId)

      if (updateError) {
        console.error('Error modifying booking:', updateError)
        return NextResponse.json(
          { error: 'Failed to modify booking. Please try again.' },
          { status: 500 }
        )
      }

      // Mark the new availability slot as booked
      if (newAvailabilitySlot) {
        await supabase
          .from('availability')
          .update({ is_booked: true })
          .eq('id', newAvailabilitySlot.id)
      }

      // Fetch updated booking
      const { data: updatedBooking } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      // Fetch chef's display name for the confirmation email
      const { data: chefProfile } = await supabase
        .from('chef_profiles')
        .select('display_name')
        .eq('id', booking.chef_id)
        .single()

      const chefName = chefProfile?.display_name || 'Your chef'

      // Send modification confirmation email to diner (fire-and-forget)
      sendBookingModificationConfirmationEmail({
        bookingId,
        dinerId: booking.diner_id,
        chefName,
        oldBookingDate: booking.booking_date,
        oldStartTime: booking.start_time,
        newBookingDate: new_booking_date,
        newStartTime: new_start_time,
        guestCount: booking.guest_count,
      }).catch(err => {
        console.error('[Email] Failed to send booking modification confirmation:', err)
      })

      return NextResponse.json(
        {
          message: 'Booking modified successfully',
          booking: {
            id: updatedBooking?.id,
            booking_date: updatedBooking?.booking_date,
            start_time: updatedBooking?.start_time,
            status: updatedBooking?.status
          }
        },
        { status: 200 }
      )
    }
  } catch (err) {
    console.error('Error processing booking action:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}