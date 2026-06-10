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

    // Date range: 7d, 30d, or 90d (default 30d)
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30d'
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30

    const now = new Date()
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1)
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    // Previous period for comparison (same length, immediately before)
    const prevStartDate = new Date(startDate.getTime() - days * 24 * 60 * 60 * 1000)
    const prevEndDate = new Date(startDate.getTime() - 1)

    // Monthly bounds for legacy queries
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

    //1. Waitlist Signups (from emails table - source = 'waitlist')
    const { count: waitlistSignupsThisMonth } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const { count: waitlistSignupsLastMonth } = await supabase
      .from('emails')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString())

    // 2. Booking Funnel: Inquiries → Quotes Sent → Bookings Confirmed
    // Inquiries this period
    const { count: inquiriesThisMonth } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Quotes sent (inquiries with status 'contacted' or 'converted')
    const { count: quotesSentThisMonth } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .in('status', ['contacted', 'converted'])
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Bookings confirmed this period
    const { count: bookingsConfirmedThisMonth } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // 3. Analytics Events (from analytics_events table)
    // Page views this period
    const { count: pageViewsThisMonth } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'page_view')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Waitlist signups from analytics_events (alternative tracking)
    const { count: waitlistSignupEventsThisMonth } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'waitlist_signup')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Booking started events
    const { count: bookingStartedThisMonth } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'booking_started')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Inquiry submitted events
    const { count: inquirySubmittedThisMonth } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'inquiry_submitted')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Booking confirmed events
    const { count: bookingConfirmedThisMonth } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'booking_confirmed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

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
    const numWeeks = Math.min(4, Math.max(1, Math.ceil(days / 7)))
    for (let i = numWeeks - 1; i >= 0; i--) {
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

    // 6. Period Comparison (current period vs previous period)
    const { count: inquiriesLastMonth } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString())

    const { count: bookingsLastMonth } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('created_at', prevStartDate.toISOString())
      .lte('created_at', prevEndDate.toISOString())

    // 7. Chef Performance (top5 chefs by confirmed bookings this period)
    const { data: topChefs } = await supabase
      .from('bookings')
      .select('chef_id, status')
      .eq('status', 'confirmed')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

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

    // 8. Acquisition Channels (from lead_sources linked to inquiries and emails)
    // Top UTM sources by inquiry count this period
    const { data: leadSourcesWithInquiries } = await supabase
      .from('lead_sources')
      .select('utm_source, utm_medium, utm_campaign, id')
      .not('utm_source', 'is', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    // Aggregate by utm_source
    const sourceInquiryCounts: Record<string, number> = {}
    const sourceWaitlistCounts: Record<string, number> = {}
    if (leadSourcesWithInquiries) {
      for (const row of leadSourcesWithInquiries) {
        const src = row.utm_source || '(direct)'
        sourceInquiryCounts[src] = (sourceInquiryCounts[src] || 0) + 1
      }
    }

    // Get waitlist signups with lead_source_id this period
    const { data: waitlistWithSource } = await supabase
      .from('emails')
      .select('lead_source_id, id')
      .not('lead_source_id', 'is', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    if (waitlistWithSource) {
      const leadSourceIds = waitlistWithSource.map((w: any) => w.lead_source_id).filter(Boolean)
      if (leadSourceIds.length > 0) {
        const { data: leadSourcesForWaitlist } = await supabase
          .from('lead_sources')
          .select('id, utm_source')
          .in('id', leadSourceIds)

        if (leadSourcesForWaitlist) {
          for (const ls of leadSourcesForWaitlist) {
            const src = ls.utm_source || '(direct)'
            sourceWaitlistCounts[src] = (sourceWaitlistCounts[src] || 0) + 1
          }
        }
      }
    }

    const topChannelsByInquiries = Object.entries(sourceInquiryCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }))

    const topChannelsByWaitlist = Object.entries(sourceWaitlistCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([source, count]) => ({ source, count }))

    // % of inquiries with tracked source
    const { count: inquiriesWithSource } = await supabase
      .from('inquiries')
      .select('*', { count: 'exact', head: true })
      .not('lead_source_id', 'is', null)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString())

    const trackedSourceRate = (inquiriesThisMonth ?? 0) > 0
      ? Math.round(((inquiriesWithSource ?? 0) / (inquiriesThisMonth ?? 0)) * 100 * 100) / 100
      : 0

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

      // Acquisition channels
      acquisition_channels: {
        top_channels_by_inquiries: topChannelsByInquiries,
        top_channels_by_waitlist: topChannelsByWaitlist,
        tracked_source_rate: `${trackedSourceRate}%`,
        inquiries_with_source: inquiriesWithSource || 0,
        total_inquiries: inquiriesThisMonth || 0,
      },
    })
  } catch (err) {
    console.error('[Analytics] Error fetching summary:', err)
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 })
  }
}
