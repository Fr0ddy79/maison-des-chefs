import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/messages - Send a message on a booking
// Auth: Chefs use Supabase auth; Diners use inquiry_id token
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { booking_id, content, sender_type, inquiry_id } = body

    // Validate required fields
    if (!booking_id || typeof booking_id !== 'string') {
      return NextResponse.json(
        { error: 'booking_id is required' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400 }
      )
    }

    if (!sender_type || !['chef', 'diner'].includes(sender_type)) {
      return NextResponse.json(
        { error: 'sender_type must be "chef" or "diner"' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Fetch the booking to verify authorization
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, chef_id, inquiry_id, diner_id')
      .eq('id', booking_id)
      .single()

    if (fetchError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    let sender_id: string

    if (sender_type === 'chef') {
      // Chef authentication: require Supabase auth
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Verify the chef owns this booking
      if (booking.chef_id !== authUser.id) {
        return NextResponse.json(
          { error: 'Forbidden: you do not own this booking' },
          { status: 403 }
        )
      }

      sender_id = authUser.id
    } else {
      // Diner authentication: require inquiry_id token
      if (!inquiry_id || typeof inquiry_id !== 'string') {
        return NextResponse.json(
          { error: 'inquiry_id is required for diner authorization' },
          { status: 400 }
        )
      }

      // Verify the inquiry_id matches the booking's inquiry_id
      if (booking.inquiry_id !== inquiry_id) {
        return NextResponse.json(
          { error: 'Forbidden: inquiry_id does not match this booking' },
          { status: 403 }
        )
      }

      // For diners, sender_id is the diner_id from the booking
      sender_id = booking.diner_id || booking.inquiry_id
    }

    // Insert the message
    const { data: newMessage, error: insertError } = await supabase
      .from('messages')
      .insert({
        booking_id,
        sender_type,
        sender_id,
        content: content.trim(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting message:', insertError)
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        id: newMessage.id,
        booking_id: newMessage.booking_id,
        sender_type: newMessage.sender_type,
        content: newMessage.content,
        created_at: newMessage.created_at,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Error sending message:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}