import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/analytics/summary - Get admin analytics summary (admin only)
// Returns funnel metrics for the admin dashboard
export async function GET(request: NextRequest) {
  try {
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

    // Time ranges
    const now = new Date()
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    //1. Waitlist Signups (from emails table - source = 'waitlist')
    const { count: waitlistSignupsThisMonth } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    const { count: waitlistSignupsLastMonth } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfLastMonth.toISOString())
      .lte('created_at', endOfLastMonth.toISOString())

    // 2. Booking Funnel: Inquiries → Quotes Sent → Bookings Confirmed
    // Inquiries this month
    const { count: inquiriesThisMonth } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString())

    // Quotes sent (inquiries with status 'contacted' or 'converted')
    const { count: quotesSentThisMonth } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .in('status', ['contacted', 'converted'])
      .gte('created_at', startOfMonth.toISOString())

    // Bookings confirmed this month
    const { count: bookingsConfirmedThisMonth } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('created_at', startOfMonth.toISOString())

    // 3. Analytics Events (from analytics_events table)
    // Page views this month
    const { count: pageViewsThisMonth } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'page_view')
      .gte('created_at', startOfMonth.toISOString())

    // Waitlist signups from analytics_events (alternative tracking)
    const { count: waitlistSignupEventsThisMonth } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'waitlist_signup')
      .gte('created_at', startOfMonth.toISOString())

    // Booking started events
    const { count: bookingStartedThisMonth } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'booking_started')
      .gte('created_at', startOfMonth.toISOString())

    // Inquiry submitted events
    const { count: inquirySubmittedThisMonth } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'inquiry_submitted')
      .gte('created_at', startOfMonth.toISOString())

    // Booking confirmed events
    const { count: bookingConfirmedThisMonth } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'booking_confirmed')
      .gte('created_at', startOfMonth.toISOString())

    // 4. Conversion Rates
    const waitlistConversionRate = (pageViewsThisMonth ?? 0) > 0
      ? Math.round(((waitlistSignupsThisMonth ?? 0) / (pageViewsThisMonth ?? 0)) * 100 * 100) / 100
      : 0

    const inquiryToQuoteRate = (inquiriesThisMonth ?? 0) > 0
      ? Math.round(((quotesSentThisMonth ?? 0) / (inquiriesThisMonth ?? 0)) * 100 * 100) / 100
      : 0

    const quoteToBookingRate = (quotesSentThisMonth ?? 0) > 0
      ? Math.round(((bookingsConfirmedThisMonth ?? 0) / (quotesSentThisMonth ?? 0)) * 100 * 100) / 100
      : 0

    // 5. Weekly Trends (last 4 weeks of page views)
    const weeklyTrends: { week: string; page_views: number; waitlist_signups: number; inquiries: number }[] = []
    for (let i = 3; i >= 0; i--) {
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (now.getDay() + 7 * i))
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000 - 1)

      const { count: weekPageViews } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'page_view')
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString())

      const { count: weekWaitlistSignups } = await supabase
        .from('analytics_events')
        .select('*', { count: 'exact', head: true })
        .eq('event_name', 'waitlist_signup')
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString())

      const { count: weekInquiries } = await supabase
        .from('inquiries')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', weekStart.toISOString())
        .lte('created_at', weekEnd.toISOString())

      weeklyTrends.push({
        week: weekStart.toISOString().split('T')[0],
        page_views: weekPageViews || 0,
        waitlist_signups: weekWaitlistSignups || 0,
        inquiries: weekInquiries || 0,
      })
    }

    // 6. Monthly Comparison (this month vs last month)
    const { count: inquiriesLastMonth } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfLastMonth.toISOString())
      .lte('created_at', endOfLastMonth.toISOString())

    const { count: bookingsLastMonth } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('created_at', startOfLastMonth.toISOString())
      .lte('created_at', endOfLastMonth.toISOString())

    // 7. Chef Performance (top5 chefs by confirmed bookings this month)
    const { data: topChefs } = await supabase
      .from('bookings')
      .select('chef_id, status')
      .eq('status', 'confirmed')
      .gte('created_at', startOfMonth.toISOString())

    const chefBookingCounts: Record<string, number> = {}
    if (topChefs) {
      topChefs.forEach((booking) => {
        chefBookingCounts[booking.chef_id] = (chefBookingCounts[booking.chef_id] || 0) + 1
      })
    }

    // Get chef details for top5
    const topChefIds = Object.entries(chefBookingCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id]) => id)

    let topChefsWithDetails: { chef_id: string; display_name: string | null; booking_count: number }[] = []
    if (topChefIds.length > 0) {
      const { data: chefProfiles } = await supabase
        .from('chef_profiles')
        .select('id, display_name')
        .in('id', topChefIds)

      if (chefProfiles) {
        topChefsWithDetails = topChefIds.map((id) => {
          const chef = chefProfiles.find((c) => c.id === id)
          return {
            chef_id: id,
            display_name: chef?.display_name || 'Unknown Chef',
            booking_count: chefBookingCounts[id] || 0,
          }
        })
      }
    }

    return NextResponse.json({
      // Waitlist metrics
      waitlist_signups_this_month: waitlistSignupsThisMonth || 0,
      waitlist_signups_last_month: waitlistSignupsLastMonth || 0,
      waitlist_signup_events: waitlistSignupEventsThisMonth || 0,

      // Booking funnel
      inquiries_this_month: inquiriesThisMonth || 0,
      quotes_sent_this_month: quotesSentThisMonth || 0,
      bookings_confirmed_this_month: bookingsConfirmedThisMonth || 0,

      // Analytics events
      page_views_this_month: pageViewsThisMonth || 0,
      booking_started_this_month: bookingStartedThisMonth || 0,
      inquiry_submitted_this_month: inquirySubmittedThisMonth || 0,
      booking_confirmed_events: bookingConfirmedThisMonth || 0,

      // Conversion rates
      waitlist_conversion_rate: `${waitlistConversionRate}%`,
      inquiry_to_quote_rate: `${inquiryToQuoteRate}%`,
      quote_to_booking_rate: `${quoteToBookingRate}%`,

      // Monthly comparison
      inquiries_last_month: inquiriesLastMonth || 0,
      bookings_last_month: bookingsLastMonth || 0,

      // Trends
      weekly_trends: weeklyTrends,

      // Top chefs
      top_chefs: topChefsWithDetails,
    })
  } catch (err) {
    console.error('[Analytics] Error fetching summary:', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
