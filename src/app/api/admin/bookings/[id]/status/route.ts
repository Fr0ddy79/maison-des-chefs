import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/admin/bookings/[id]/status - Update booking status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params

    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    const body = await request.json()
    const { status } = body

    // Validate status
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify booking exists
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ status })
      .eq('id', bookingId)

    if (updateError) {
      console.error('Error updating booking status:', updateError)
      return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Booking status updated successfully',
      booking: {
        id: bookingId,
        status,
      },
    })
  } catch (err) {
    console.error('Error in PATCH /api/admin/bookings/[id]/status:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
