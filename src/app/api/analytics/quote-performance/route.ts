import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/analytics/quote-performance - Get quote conversion analytics for the authenticated chef
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get chef profile to verify role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'chef') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get all bookings where chef sent a quote (quote_status is not null)
    const { data: quotedBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_date,
        start_time,
        guest_count,
        total_price,
        quote_amount,
        quote_status,
        quote_valid_until,
        created_at,
        services:service_id (title),
        profiles:diner_id (full_name, email)
      `)
      .eq('chef_id', user.id)
      .not('quote_status', 'is', null)
      .order('created_at', { ascending: false })

    if (bookingsError) {
      console.error('Error fetching quote performance:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch quote analytics' }, { status: 500 })
    }

    // Calculate metrics
    const allQuotes = quotedBookings || []
    
    // Count by status
    const quotesSent = allQuotes.length
    const pendingResponse = allQuotes.filter(b => b.quote_status === 'pending').length
    const accepted = allQuotes.filter(b => b.quote_status === 'accepted').length
    const declined = allQuotes.filter(b => b.quote_status === 'declined').length
    const expired = allQuotes.filter(b => b.quote_status === 'expired').length

    // Calculate conversion rate: Accepted / (Accepted + Declined)
    // Excludes pending and expired from denominator
    const conversionRate = (accepted + declined) > 0
      ? Math.round((accepted / (accepted + declined)) * 100)
      : 0

    // Format bookings for the list view
    const bookingList = allQuotes.map(booking => ({
      id: booking.id,
      booking_date: booking.booking_date,
      start_time: booking.start_time,
      guest_count: booking.guest_count,
      quote_amount: booking.quote_amount,
      quote_status: booking.quote_status,
      quote_valid_until: booking.quote_valid_until,
      service_title: (booking.services as any)?.title || 'Service',
      diner_name: (booking.profiles as any)?.full_name || 'Client',
      diner_email: (booking.profiles as any)?.email || '',
    }))

    return NextResponse.json({
      metrics: {
        quotesSent,
        pendingResponse,
        accepted,
        declined,
        expired,
        conversionRate,
      },
      bookings: bookingList,
    })
  } catch (err) {
    console.error('Error fetching quote performance analytics:', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}