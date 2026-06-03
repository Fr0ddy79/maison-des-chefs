import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/analytics/bookings-summary - Get booking analytics for the authenticated chef
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

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString()

    // 1. This Month Bookings count
    const { count: monthlyBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('chef_id', user.id)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)

    // 2. Last Month Bookings (for trend calculation)
    const { count: lastMonthBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('chef_id', user.id)
      .gte('created_at', startOfLastMonth)
      .lte('created_at', endOfLastMonth)

    // 3. Inquiry→Booking Rate (accepted / total inquiries this month)
    const { count: totalInquiries } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('chef_id', user.id)
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)

    const { count: acceptedInquiries } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .eq('chef_id', user.id)
      .in('status', ['accepted', 'converted'])
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)

    const inquiryToBookingRate = (totalInquiries ?? 0) > 0
      ? Math.round(((acceptedInquiries ?? 0) / (totalInquiries ?? 0)) * 100)
      : 0

    // 4. Avg Response Time (hours between inquiry created_at and status update)
    // Get inquiries with status updates this month
    const { data: inquiriesWithStatus } = await supabase
      .from('inquiries')
      .select('created_at, updated_at')
      .eq('chef_id', user.id)
      .in('status', ['accepted', 'rejected', 'converted', 'cancelled'])
      .gte('updated_at', startOfMonth)
      .lte('updated_at', endOfMonth)

    let avgResponseHours = 0
    if (inquiriesWithStatus && inquiriesWithStatus.length > 0) {
      const totalHours = inquiriesWithStatus.reduce((sum, inquiry) => {
        const created = new Date(inquiry.created_at).getTime()
        const updated = new Date(inquiry.updated_at).getTime()
        const hours = (updated - created) / (1000 * 60 * 60)
        return sum + hours
      }, 0)
      avgResponseHours = Math.round(totalHours / inquiriesWithStatus.length * 10) / 10
    }

    // 5. Revenue (confirmed bookings this month - completed + pending)
    const { data: confirmedBookings } = await supabase
      .from('bookings')
      .select('total_price')
      .eq('chef_id', user.id)
      .in('status', ['confirmed', 'pending'])
      .gte('created_at', startOfMonth)
      .lte('created_at', endOfMonth)

    const pendingRevenue = confirmedBookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0

    // 6. Pending bookings count
    const { count: pendingBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('chef_id', user.id)
      .in('status', ['pending', 'confirmed'])

    // 7. Trend calculation (compare this month vs last month)
    let trend: 'up' | 'down' | 'flat' = 'flat'
    const thisMonth = monthlyBookings ?? 0
    const lastMonth = lastMonthBookings ?? 0
    if (thisMonth > lastMonth) {
      trend = 'up'
    } else if (thisMonth < lastMonth) {
      trend = 'down'
    }

    return NextResponse.json({
      monthlyBookings: monthlyBookings || 0,
      inquiryToBookingRate: `${inquiryToBookingRate}%`,
      avgResponseHours,
      pendingRevenue,
      pendingBookings: pendingBookings || 0,
      trend,
    })
  } catch (err) {
    console.error('Error fetching bookings summary:', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}