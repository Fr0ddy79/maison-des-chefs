import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/bookings/[id]/messages - Get all messages for a booking (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params

    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
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
      .select('id')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Fetch messages ordered by created_at
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_type, sender_id, content, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json(messages || [])
  } catch (err) {
    console.error('Error in GET /api/admin/bookings/[id]/messages:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
