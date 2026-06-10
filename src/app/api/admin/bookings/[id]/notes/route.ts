import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/bookings/[id]/notes - Get internal notes for a booking (admin only)
// POST /api/admin/bookings/[id]/notes - Add an internal note to a booking (admin only)
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

    // Fetch internal notes ordered by created_at
    const { data: notes, error: notesError } = await supabase
      .from('booking_internal_notes')
      .select('id, admin_id, content, created_at')
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: true })

    if (notesError) {
      console.error('Error fetching internal notes:', notesError)
      return NextResponse.json({ error: 'Failed to fetch internal notes' }, { status: 500 })
    }

    return NextResponse.json(notes || [])
  } catch (err) {
    console.error('Error in GET /api/admin/bookings/[id]/notes:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params

    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ error: 'booking_id is required' }, { status: 400 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json({ error: 'content is required and must be a non-empty string' }, { status: 400 })
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

    // Insert the note
    const { data: newNote, error: insertError } = await supabase
      .from('booking_internal_notes')
      .insert({
        booking_id: bookingId,
        admin_id: user.id,
        content: content.trim(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting internal note:', insertError)
      return NextResponse.json({ error: 'Failed to add internal note' }, { status: 500 })
    }

    return NextResponse.json({
      id: newNote.id,
      booking_id: newNote.booking_id,
      admin_id: newNote.admin_id,
      content: newNote.content,
      created_at: newNote.created_at,
    }, { status: 201 })
  } catch (err) {
    console.error('Error in POST /api/admin/bookings/[id]/notes:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
