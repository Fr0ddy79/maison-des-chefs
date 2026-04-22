'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Stats {
  totalUsers: number
  totalChefs: number
  totalDiners: number
  totalBookings: number
  totalRevenue: number
  pendingApplications: number
}

interface Booking {
  id: string
  booking_date: string
  start_time: string
  guest_count: number
  total_price: number
  status: string
  chef_id: string
  diner_id: string
  services: { title: string } | null
  chef_profiles: { display_name: string } | null
  profiles: { full_name: string; email: string } | null
}

interface Chef {
  id: string
  display_name: string
  bio: string
  location: string
  avg_rating: number
  review_count: number
  is_verified: boolean
  created_at: string
  cuisines: string[]
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalChefs: 0,
    totalDiners: 0,
    totalBookings: 0,
    totalRevenue: 0,
    pendingApplications: 0,
  })
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [chefs, setChefs] = useState<Chef[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
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

      setUser(authUser)
      await fetchData()
    }
    checkAdmin()
  }, [])

  async function fetchData() {
    setLoading(true)

    // Fetch profiles count by role
    const { count: totalUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })

    const { count: totalChefs } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'chef')

    const { count: totalDiners } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'diner')

    // Fetch bookings
    const { count: totalBookings } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })

    const { data: bookingsData } = await supabase
      .from('bookings')
      .select(`
        id, booking_date, start_time, guest_count, total_price, status,
        services:service_id (title),
        chef_profiles:chef_id (display_name),
        profiles:diner_id (full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    // Calculate revenue from completed bookings
    const { data: revenueData } = await supabase
      .from('bookings')
      .select('total_price')
      .eq('status', 'completed')

    const totalRevenue = revenueData?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0

    // Fetch chefs
    const { data: chefsData } = await supabase
      .from('chef_profiles')
      .select('*')
      .order('created_at', { ascending: false })

    setStats({
      totalUsers: totalUsers || 0,
      totalChefs: totalChefs || 0,
      totalDiners: totalDiners || 0,
      totalBookings: totalBookings || 0,
      totalRevenue,
      pendingApplications: 0,
    })
    setRecentBookings((bookingsData as any[]) || [])
    setChefs((chefsData as any[]) || [])
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading admin dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
      {/* Admin Header */}
      <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--color-mdc-border)' }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-serif text-xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Maison des Chefs</span>
            </Link>
            <span className="px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)', color: 'var(--color-mdc-accent)' }}>
              Admin
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
              {user?.email}
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

      <main className="max-w-7xl mx-auto px-6 py-12">
        <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Overview of Maison des Chefs platform</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-8">
          <div className="rounded-lg p-5 bg-white border shadow-sm">
            <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Total Users</p>
            <p className="text-3xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{stats.totalUsers}</p>
          </div>
          <div className="rounded-lg p-5 bg-white border shadow-sm">
            <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Chefs</p>
            <p className="text-3xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{stats.totalChefs}</p>
          </div>
          <div className="rounded-lg p-5 bg-white border shadow-sm">
            <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Diners</p>
            <p className="text-3xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{stats.totalDiners}</p>
          </div>
          <div className="rounded-lg p-5 bg-white border shadow-sm">
            <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Bookings</p>
            <p className="text-3xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{stats.totalBookings}</p>
          </div>
          <div className="rounded-lg p-5 bg-white border shadow-sm">
            <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Revenue</p>
            <p className="text-3xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>${stats.totalRevenue.toLocaleString()}</p>
          </div>
          <div className="rounded-lg p-5 bg-white border shadow-sm">
            <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Applications</p>
            <p className="text-3xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{stats.pendingApplications}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Recent Bookings */}
          <div className="rounded-lg p-6 bg-white border shadow-sm">
            <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Recent Bookings</h2>
            {recentBookings.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>No bookings yet.</p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--color-mdc-bg)' }}
                  >
                    <div>
                      <p className="font-medium text-sm">
                        {(booking.profiles as any)?.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        {(booking.services as any)?.title || 'Service'} • {(booking.chef_profiles as any)?.display_name || 'Chef'}
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        {booking.booking_date} • {booking.guest_count} guests
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: booking.status === 'completed' ? '#dcfce7' : booking.status === 'confirmed' ? '#dbeafe' : booking.status === 'cancelled' ? '#fee2e2' : '#fef3c7',
                          color: booking.status === 'completed' ? '#15803d' : booking.status === 'confirmed' ? '#1d4ed8' : booking.status === 'cancelled' ? '#dc2626' : '#a16207',
                        }}
                      >
                        {booking.status}
                      </span>
                      <p className="text-sm font-semibold mt-1">${booking.total_price}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chefs */}
          <div className="rounded-lg p-6 bg-white border shadow-sm">
            <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Chefs</h2>
            {chefs.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>No chefs registered.</p>
            ) : (
              <div className="space-y-3">
                {chefs.map((chef) => (
                  <div
                    key={chef.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: 'var(--color-mdc-bg)' }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{chef.display_name}</p>
                        {chef.is_verified && (
                          <svg className="w-4 h-4" style={{ color: 'var(--color-mdc-accent)' }} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        {chef.location || 'Montreal'} • {chef.cuisines?.join(', ') || 'Various cuisines'}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <svg className="w-4 h-4" style={{ color: 'var(--color-mdc-accent)' }} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm font-medium">{chef.avg_rating || 0}</span>
                        <span className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>({chef.review_count})</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/chefs"
            className="rounded-lg p-5 bg-white border shadow-sm text-center transition-colors hover:shadow-md"
          >
            <p className="font-medium">Browse Chefs</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>View all registered chefs</p>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg p-5 bg-white border shadow-sm text-center transition-colors hover:shadow-md"
          >
            <p className="font-medium">Chef Dashboard</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Switch to chef view</p>
          </Link>
          <a
            href="#"
            className="rounded-lg p-5 bg-white border shadow-sm text-center transition-colors hover:shadow-md"
          >
            <p className="font-medium">Platform Settings</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Manage platform configuration</p>
          </a>
        </div>
      </main>
    </div>
  )
}
