'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface AnalyticsData {
  waitlist_signups_this_month: number
  waitlist_signups_last_month: number
  waitlist_signup_events: number
  inquiries_this_month: number
  quotes_sent_this_month: number
  bookings_confirmed_this_month: number
  page_views_this_month: number
  booking_started_this_month: number
  inquiry_submitted_this_month: number
  booking_confirmed_events: number
  waitlist_conversion_rate: string
  inquiry_to_quote_rate: string
  quote_to_booking_rate: string
  inquiries_last_month: number
  bookings_last_month: number
  weekly_trends: { week: string; page_views: number; waitlist_signups: number; inquiries: number }[]
  top_chefs: { chef_id: string; display_name: string | null; booking_count: number }[]
  acquisition_channels: {
    top_channels_by_inquiries: { source: string; count: number }[]
    top_channels_by_waitlist: { source: string; count: number }[]
    tracked_source_rate: string
    inquiries_with_source: number
    total_inquiries: number
  }
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkAdmin() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', authUser.id)
        .single()

      if (profile?.role !== 'admin') {
        router.push('/')
        return
      }

      await fetchAnalytics()
    }
    checkAdmin()
  }, [])

  async function fetchAnalytics() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/analytics/summary?range=${dateRange}`)
      if (!response.ok) {
        throw new Error('Failed to fetch analytics')
      }
      const data = await response.json()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function formatNumber(num: number): string {
    return num.toLocaleString()
  }

  function formatWeek(weekStr: string): string {
    const date = new Date(weekStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  function getChange(current: number, previous: number): { value: number; positive: boolean } | null {
    if (previous === 0) return null
    const change = ((current - previous) / previous) * 100
    return { value: Math.abs(change), positive: change >= 0 }
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--color-mdc-border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-2">
              <span className="font-serif text-xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Maison des Chefs</span>
            </Link>
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)', color: 'var(--color-mdc-accent)' }}>
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-sm px-4 py-2 rounded transition-colors hover:opacity-80"
              style={{ color: 'var(--color-mdc-text-muted)' }}
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Analytics Dashboard</h1>
          <p style={{ color: 'var(--color-mdc-text-muted)' }}>
            Funnel metrics and conversion tracking
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Date Range:</span>
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-mdc-border)' }}>
            {(['7d', '30d', '90d'] as const).map((range) => (
              <button
                key={range}
                onClick={() => {
                  setDateRange(range)
                  setAnalytics(null)
                  setLoading(true)
                  fetch(`/api/analytics/summary?range=${range}`)
                    .then((res) => res.json())
                    .then((data) => {
                      setAnalytics(data)
                      setLoading(false)
                    })
                    .catch(() => setLoading(false))
                }}
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  backgroundColor: dateRange === range ? 'var(--color-mdc-accent)' : 'white',
                  color: dateRange === range ? 'white' : 'var(--color-mdc-text-muted)',
                  borderRight: range !== '90d' ? '1px solid var(--color-mdc-border)' : 'none',
                }}
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading analytics...</p>
          </div>
        ) : error ? (
          <div className="rounded-lg p-12 bg-white border text-center">
            <p className="text-lg text-red-600">{error}</p>
            <button
              onClick={fetchAnalytics}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : analytics ? (
          <>
            {/* Waitlist Conversion Card */}
            <div className="rounded-lg p-6 bg-white border shadow-sm mb-6">
              <h2 className="text-lg font-semibold mb-4">Waitlist Conversion</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 rounded-lg bg-gray-50">
                  <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-mdc-accent)' }}>
                    {formatNumber(analytics.page_views_this_month)}
                  </p>
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>Page Views (This Month)</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-50">
                  <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-mdc-accent)' }}>
                    {formatNumber(analytics.waitlist_signups_this_month)}
                  </p>
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>Waitlist Signups</p>
                </div>
                <div className="text-center p-4 rounded-lg bg-gray-50">
                  <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-mdc-accent)' }}>
                    {analytics.waitlist_conversion_rate}
                  </p>
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>Conversion Rate</p>
                </div>
              </div>
            </div>

            {/* Booking Funnel Card */}
            <div className="rounded-lg p-6 bg-white border shadow-sm mb-6">
              <h2 className="text-lg font-semibold mb-4">Booking Funnel</h2>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center p-4 rounded-lg bg-blue-50">
                  <p className="text-3xl font-bold mb-1" style={{ color: '#2563eb' }}>
                    {formatNumber(analytics.inquiries_this_month)}
                  </p>
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>Inquiries</p>
                  {getChange(analytics.inquiries_this_month, analytics.inquiries_last_month) && (
                    <p className={`text-xs mt-1 ${getChange(analytics.inquiries_this_month, analytics.inquiries_last_month)!.positive ? 'text-green-600' : 'text-red-600'}`}>
                      {getChange(analytics.inquiries_this_month, analytics.inquiries_last_month)!.positive ? '↑' : '↓'} {getChange(analytics.inquiries_this_month, analytics.inquiries_last_month)!.value.toFixed(1)}% vs last month
                    </p>
                  )}
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-50">
                  <p className="text-3xl font-bold mb-1" style={{ color: '#9333ea' }}>
                    {formatNumber(analytics.quotes_sent_this_month)}
                  </p>
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>Quotes Sent</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    {analytics.inquiry_to_quote_rate} from inquiries
                  </p>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-50">
                  <p className="text-3xl font-bold mb-1" style={{ color: '#16a34a' }}>
                    {formatNumber(analytics.bookings_confirmed_this_month)}
                  </p>
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>Bookings Confirmed</p>
                  {getChange(analytics.bookings_confirmed_this_month, analytics.bookings_last_month) && (
                    <p className={`text-xs mt-1 ${getChange(analytics.bookings_confirmed_this_month, analytics.bookings_last_month)!.positive ? 'text-green-600' : 'text-red-600'}`}>
                      {getChange(analytics.bookings_confirmed_this_month, analytics.bookings_last_month)!.positive ? '↑' : '↓'} {getChange(analytics.bookings_confirmed_this_month, analytics.bookings_last_month)!.value.toFixed(1)}% vs last month
                    </p>
                  )}
                </div>
                <div className="text-center p-4 rounded-lg bg-amber-50">
                  <p className="text-3xl font-bold mb-1" style={{ color: '#d97706' }}>
                    {analytics.quote_to_booking_rate}
                  </p>
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>Quote-to-Booking Rate</p>
                </div>
              </div>
            </div>

            {/* Weekly Trends Card */}
            <div className="rounded-lg p-6 bg-white border shadow-sm mb-6">
              <h2 className="text-lg font-semibold mb-4">Weekly Trends</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-mdc-border)' }}>
                      <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Week</th>
                      <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Page Views</th>
                      <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Waitlist Signups</th>
                      <th className="text-right py-3 px-4 font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Inquiries</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.weekly_trends.map((week, index) => (
                      <tr key={index} style={{ borderBottom: index < analytics.weekly_trends.length - 1 ? '1px solid var(--color-mdc-border)' : 'none' }}>
                        <td className="py-3 px-4">{formatWeek(week.week)}</td>
                        <td className="text-right py-3 px-4 font-medium">{formatNumber(week.page_views)}</td>
                        <td className="text-right py-3 px-4 font-medium">{formatNumber(week.waitlist_signups)}</td>
                        <td className="text-right py-3 px-4 font-medium">{formatNumber(week.inquiries)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top Chefs Card */}
            {analytics.top_chefs.length > 0 && (
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Top Chefs This Month</h2>
                <div className="space-y-3">
                  {analytics.top_chefs.map((chef, index) => (
                    <div key={chef.chef_id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold" style={{ color: 'var(--color-mdc-text-muted)' }}>#{index + 1}</span>
                        <span className="font-medium">{chef.display_name || 'Unknown Chef'}</span>
                      </div>
                      <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
                        {chef.booking_count} {chef.booking_count === 1 ? 'booking' : 'bookings'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Acquisition Channels Card */}
            {analytics.acquisition_channels && (
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Acquisition Channels</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div className="text-center p-4 rounded-lg bg-blue-50">
                    <p className="text-3xl font-bold mb-1" style={{ color: '#2563eb' }}>
                      {analytics.acquisition_channels.tracked_source_rate}
                    </p>
                    <p style={{ color: 'var(--color-mdc-text-muted)' }}>Inquiries with Tracked Source</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      {analytics.acquisition_channels.inquiries_with_source} of {analytics.acquisition_channels.total_inquiries}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Top Channels by Inquiries */}
                  <div>
                    <h3 className="font-medium mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>Top Channels by Inquiries</h3>
                    {analytics.acquisition_channels.top_channels_by_inquiries.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.acquisition_channels.top_channels_by_inquiries.map((channel, index) => (
                          <div key={channel.source} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold" style={{ color: 'var(--color-mdc-text-muted)' }}>#{index + 1}</span>
                              <span className="font-medium text-sm">{channel.source || '(direct)'}</span>
                            </div>
                            <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
                              {channel.count} {channel.count === 1 ? 'inquiry' : 'inquiries'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>No UTM data captured yet. Add UTM parameters to URLs to start tracking acquisition channels.</p>
                    )}
                  </div>

                  {/* Top Channels by Waitlist */}
                  <div>
                    <h3 className="font-medium mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>Top Channels by Waitlist Signups</h3>
                    {analytics.acquisition_channels.top_channels_by_waitlist.length > 0 ? (
                      <div className="space-y-2">
                        {analytics.acquisition_channels.top_channels_by_waitlist.map((channel, index) => (
                          <div key={channel.source} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold" style={{ color: 'var(--color-mdc-text-muted)' }}>#{index + 1}</span>
                              <span className="font-medium text-sm">{channel.source || '(direct)'}</span>
                            </div>
                            <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
                              {channel.count} {channel.count === 1 ? 'signup' : 'signups'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>No waitlist UTM data captured yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : null}
      </main>
    </div>
  )
}