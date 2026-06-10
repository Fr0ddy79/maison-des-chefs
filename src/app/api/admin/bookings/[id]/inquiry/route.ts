import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/bookings/[id]/inquiry - Get original inquiry for a booking (admin only)
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

    // Get booking to find inquiry_id
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, inquiry_id')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (!booking.inquiry_id) {
      return NextResponse.json({ error: 'No inquiry associated with this booking' }, { status: 404 })
    }

    // Fetch inquiry
    const { data: inquiry, error: inquiryError } = await supabase
      .from('inquiries')
      .select('*')
      .eq('id', booking.inquiry_id)
      .single()

    if (inquiryError || !inquiry) {
      return NextResponse.json({ error: 'Inquiry not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: inquiry.id,
      service_id: inquiry.service_id,
      chef_id: inquiry.chef_id,
      diner_id: inquiry.diner_id,
      email: inquiry.email,
      message: inquiry.message,
      inquiry_date: inquiry.inquiry_date,
      guest_count: inquiry.guest_count,
      inquiry_time: inquiry.inquiry_time,
      status: inquiry.status,
      created_at: inquiry.created_at,
      lead_id: inquiry.lead_id,
    })
  } catch (err) {
    console.error('Error in GET /api/admin/bookings/[id]/inquiry:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
