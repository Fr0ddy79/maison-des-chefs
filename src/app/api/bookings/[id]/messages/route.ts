import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/bookings/[id]/messages - Get all messages for a booking
// Chefs: authenticated via session, must own the booking
// Diners: authenticated via inquiry_link_token or session, must be the diner on the booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: booking_id } = await params

    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get auth user
    const { data: { user: authUser } } = await supabase.auth.getUser()

    // Get booking to validate access
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, chef_id, diner_id, inquiry_id')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check authorization
    const inquiryToken = request.headers.get('x-inquiry-token')
    let isAuthorized = false

    if (authUser) {
      // Authenticated user: must be chef or diner on the booking
      isAuthorized = authUser.id === booking.chef_id || authUser.id === booking.diner_id
    } else if (inquiryToken) {
      // Inquiry token: validate and allow diner access
      try {
        const decoded = Buffer.from(inquiryToken, 'base64').toString('utf-8')
        const [tokenEmail, tokenBookingId] = decoded.split(':')
        
        const { data: inquiry } = await supabase
          .from('inquiries')
          .select('email')
          .eq('id', booking.inquiry_id)
          .single()
        
        isAuthorized = !!(inquiry && inquiry.email === tokenEmail && tokenBookingId === booking_id)
      } catch {
        isAuthorized = false
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Not authorized to view these messages' }, { status: 403 })
    }

    // Fetch messages ordered by created_at
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, sender_type, sender_id, content, created_at')
      .eq('booking_id', booking_id)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('Error fetching messages:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    return NextResponse.json(messages || [])
  } catch (err) {
    console.error('Error in GET /api/bookings/[id]/messages:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}