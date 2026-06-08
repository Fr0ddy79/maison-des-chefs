import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/bookings/[id]/messages - Get all messages for a booking
// Chefs: authenticated via session, must own the booking
// Diners: authenticated via inquiry_link_token or session, must be the diner on the booking
// POST /api/bookings/[id]/messages - Send a message on a booking
// Auth: Chefs use Supabase auth; Diners use x-inquiry-token
// Body: { text: string }
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: booking_id } = await params

    if (!booking_id) {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get booking to validate access
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, chef_id, diner_id, inquiry_id')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Check authorization via inquiry token (diner flow)
    const inquiryToken = request.headers.get('x-inquiry-token')
    let sender_type: 'chef' | 'diner' | null = null
    let sender_id: string | null = null

    if (inquiryToken) {
      try {
        const decoded = Buffer.from(inquiryToken, 'base64').toString('utf-8')
        const [tokenEmail, tokenBookingId] = decoded.split(':')
        
        const { data: inquiry } = await supabase
          .from('inquiries')
          .select('email')
          .eq('id', booking.inquiry_id)
          .single()
        
        if (inquiry && inquiry.email === tokenEmail && tokenBookingId === booking_id) {
          sender_type = 'diner'
          sender_id = booking.diner_id || booking.inquiry_id
        }
      } catch {
        // Token invalid
      }
    }

    // If no token auth, try chef session auth
    if (!sender_type) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser && authUser.id === booking.chef_id) {
        sender_type = 'chef'
        sender_id = authUser.id
      }
    }

    if (!sender_type || !sender_id) {
      return NextResponse.json({ error: 'Not authorized to send messages on this booking' }, { status: 403 })
    }

    // Insert the message
    const { data: newMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        booking_id,
        sender_type,
        sender_id,
        content: text.trim(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting message:', insertError)
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }

    return NextResponse.json({
      id: newMessage.id,
      booking_id: newMessage.booking_id,
      sender_type: newMessage.sender_type,
      content: newMessage.content,
      created_at: newMessage.created_at,
    }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/bookings/[id]/messages:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

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