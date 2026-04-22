'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  guest_count: number
  total_price: number
  status: string
  services: { title: string } | null
  profiles: { full_name: string } | null
}

export default function ChefDashboard() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [chefProfile, setChefProfile] = useState<any>(null)
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState({ upcomingCount: 0, monthRevenue: 0, avgRating: 0 })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkChef() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name, email')
        .eq('id', authUser.id)
        .single()

      if (profile?.role !== 'chef') {
        router.push('/')
        return
      }

      setUser({ ...authUser, ...profile })

      // Fetch chef profile
      const { data: chef } = await supabase
        .from('chef_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setChefProfile(chef)

      // Fetch upcoming bookings for this chef
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time, guest_count, total_price, status,
          services:service_id (title),
          profiles:diner_id (full_name)
        `)
        .eq('chef_id', authUser.id)
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: true })

      // Fetch completed bookings for revenue
      const { data: completedBookings } = await supabase
        .from('bookings')
        .select('total_price, booking_date')
        .eq('chef_id', authUser.id)
        .eq('status', 'completed')

      const now = new Date()
      const thisMonth = completedBookings?.filter(b => {
        const d = new Date(b.booking_date)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      }) || []

      const monthRevenue = thisMonth.reduce((sum, b) => sum + (b.total_price || 0), 0)

      setUpcomingBookings((bookings as any[]) || [])
      setStats({
        upcomingCount: bookings?.length || 0,
        monthRevenue,
        avgRating: chef?.avg_rating || 0,
      })

      setLoading(false)
    }
    checkChef()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading chef dashboard...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--color-mdc-border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Maison des Chefs</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
              {user?.full_name || user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm px-4 py-2 rounded transition-colors hover:opacity-80"
              style={{ color: 'var(--color-mdc-text-muted)' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Chef Dashboard</h1>
          <p style={{ color: 'var(--color-mdc-text-muted)' }}>Welcome back, {user?.full_name || 'Chef'}</p>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-8">
            <div className="rounded-lg p-6 bg-white border shadow-sm">
              <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>Upcoming Bookings</p>
              <p className="text-3xl mt-2" style={{ fontFamily: 'var(--font-serif)' }}>{stats.upcomingCount}</p>
            </div>
            <div className="rounded-lg p-6 bg-white border shadow-sm">
              <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>This Month's Revenue</p>
              <p className="text-3xl mt-2" style={{ fontFamily: 'var(--font-serif)' }}>${stats.monthRevenue.toLocaleString()}</p>
            </div>
            <div className="rounded-lg p-6 bg-white border shadow-sm">
              <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>Average Rating</p>
              <p className="text-3xl mt-2" style={{ fontFamily: 'var(--font-serif)' }}>{stats.avgRating.toFixed(1)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Upcoming Bookings */}
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Upcoming Bookings</h2>
                {upcomingBookings.length === 0 ? (
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>No upcoming bookings.</p>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 rounded-lg"
                        style={{ backgroundColor: 'var(--color-mdc-bg)' }}
                      >
                        <div>
                          <p className="font-medium">{(booking.profiles as any)?.full_name || 'Client'}</p>
                          <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                            {(booking.services as any)?.title || 'Service'}
                          </p>
                          <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                            {booking.booking_date} at {booking.start_time} • {booking.guest_count} guests
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: booking.status === 'confirmed' ? '#dcfce7' : '#fef3c7',
                              color: booking.status === 'confirmed' ? '#15803d' : '#a16207',
                            }}
                          >
                            {booking.status}
                          </span>
                          <p className="mt-2 font-semibold">${booking.total_price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Profile Card */}
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl" style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)', color: 'var(--color-mdc-accent)' }}>
                    {(user?.full_name || 'C')[0]}
                  </div>
                  <div>
                    <p className="text-lg" style={{ fontFamily: 'var(--font-serif)' }}>{user?.full_name || 'Chef'}</p>
                    <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      {chefProfile?.is_verified ? 'Verified Chef' : 'Chef'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <a href="#" className="block w-full text-center px-4 py-2 rounded font-medium text-sm transition-colors border" style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}>
                    Edit Profile
                  </a>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <h3 className="font-medium mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <a href="#" className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    Update Availability
                  </a>
                  <a href="#" className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    Manage Services
                  </a>
                  <a href="/admin" className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    Admin Dashboard
                  </a>
                  <a href="#" className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    Account Settings
                  </a>
                </div>
              </div>

              {/* Help */}
              <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(201, 168, 76, 0.05)', borderColor: 'rgba(201, 168, 76, 0.2)' }}>
                <h3 className="font-medium mb-2">Need Help?</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-mdc-text-muted)' }}>
                  Our support team is here to assist you.
                </p>
                <a href="#" className="text-sm hover:underline" style={{ color: 'var(--color-mdc-accent)' }}>
                  Contact Support →
                </a>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
