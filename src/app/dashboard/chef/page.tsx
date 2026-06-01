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

interface AvailabilitySlot {
  id: string
  chef_id: string
  date: string
  start_time: string
  end_time: string
  is_booked: boolean
}

interface ProfileCompleteness {
  score: number
  elements: {
    photo: boolean
    bio: boolean
    service: boolean
    availability: boolean
    cuisine: boolean
  }
  isFirstLogin: boolean
}

export default function ChefDashboard() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [chefProfile, setChefProfile] = useState<any>(null)
  const [upcomingBookings, setUpcomingBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState({ upcomingCount: 0, monthRevenue: 0, avgRating: 0 })
  const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>([])
  const [showAddSlot, setShowAddSlot] = useState(false)
  const [newSlotDate, setNewSlotDate] = useState('')
  const [newSlotStart, setNewSlotStart] = useState('')
  const [newSlotEnd, setNewSlotEnd] = useState('')
  const [addingSlot, setAddingSlot] = useState(false)
  const [deletingSlot, setDeletingSlot] = useState<string | null>(null)
  const [profileCompleteness, setProfileCompleteness] = useState<ProfileCompleteness | null>(null)
  const [showSetupPrompt, setShowSetupPrompt] = useState(false)
  const [inquiries, setInquiries] = useState<any[]>([])
  const [loadingInquiries, setLoadingInquiries] = useState(false)
  const [processingInquiry, setProcessingInquiry] = useState<string | null>(null)
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
        .select('role, full_name, email, avatar_url')
        .eq('id', authUser.id)
        .single()

      if (profile?.role !== 'chef') {
        router.push('/')
        return
      }

      setUser({ ...authUser, ...profile })

      const { data: chef } = await supabase
        .from('chef_profiles')
        .select('*')
        .eq('id', authUser.id)
        .single()

      setChefProfile(chef)

      // Check for services
      const { data: services } = await supabase
        .from('services')
        .select('id')
        .eq('chef_id', authUser.id)
        .limit(1)

      // Check for availability slots
      const { data: slots } = await supabase
        .from('availability')
        .select('id')
        .eq('chef_id', authUser.id)
        .limit(1)

      // Calculate profile completeness
      const elements = {
        photo: !!(profile?.avatar_url),
        bio: !!(chef?.bio && chef.bio.length > 0),
        service: !!(services && services.length > 0),
        availability: !!(slots && slots.length > 0),
        cuisine: !!(chef?.cuisines && chef.cuisines.length > 0),
      }
      const score = Math.round(
        (Object.values(elements).filter(Boolean).length / 5) * 100
      )

      // Check if first login (no bookings, no availability)
      const { data: existingBookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('chef_id', authUser.id)
        .limit(1)

      const isFirstLogin = !existingBookings || existingBookings.length === 0

      setProfileCompleteness({ score, elements, isFirstLogin })
      setShowSetupPrompt(isFirstLogin && score < 100)

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

  async function fetchAvailabilitySlots() {
    if (!user?.id) return
    const { data } = await supabase
      .from('availability')
      .select('*')
      .eq('chef_id', user.id)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })
    setAvailabilitySlots((data as any[]) || [])
  }

  useEffect(() => {
    if (user?.id) {
      fetchAvailabilitySlots()
      fetchInquiries()
    }
  }, [user?.id])

  async function handleAddSlot(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id || !newSlotDate || !newSlotStart || !newSlotEnd) return
    setAddingSlot(true)

    const { error } = await supabase
      .from('availability')
      .insert({
        chef_id: user.id,
        date: newSlotDate,
        start_time: newSlotStart,
        end_time: newSlotEnd,
        is_booked: false,
      })

    if (!error) {
      setNewSlotDate('')
      setNewSlotStart('')
      setNewSlotEnd('')
      setShowAddSlot(false)
      await fetchAvailabilitySlots()
    }
    setAddingSlot(false)
  }

  async function handleDeleteSlot(slotId: string) {
    if (deletingSlot) return
    setDeletingSlot(slotId)
    await supabase.from('availability').delete().eq('id', slotId)
    await fetchAvailabilitySlots()
    setDeletingSlot(null)
  }

  async function fetchInquiries() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return
    setLoadingInquiries(true)
    const { data } = await supabase
      .from('inquiries')
      .select(`id, email, message, inquiry_date, status, created_at, service_id, services:service_id (title)`)
      .eq('chef_id', authUser.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setInquiries((data as any[]) || [])
    setLoadingInquiries(false)
  }

  async function handleInquiryAction(inquiryId: string, status: 'accepted' | 'rejected') {
    setProcessingInquiry(inquiryId)
    const res = await fetch('/api/inquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inquiryId, status }),
    })
    if (res.ok) {
      await fetchInquiries()
      await fetchAvailabilitySlots()
    }
    setProcessingInquiry(null)
  }

  function formatTime(time: string) {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
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

          {/* First-Time Setup Prompt */}
          {showSetupPrompt && (
            <div className="mt-6 rounded-lg p-6 border" style={{ 
              backgroundColor: 'rgba(201, 168, 76, 0.08)',
              borderColor: 'rgba(201, 168, 76, 0.3)'
            }}>
              <div className="flex items-start gap-4">
                <div className="text-3xl">👨‍🍳</div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                    Complete your chef profile to get booked
                  </h3>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    Chefs with complete profiles get <strong>3x more booking requests</strong>. 
                    Take a few minutes to add the essentials below.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!profileCompleteness?.elements.photo && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: 'var(--color-mdc-text-muted)' }}>
                        📷 Add profile photo
                      </span>
                    )}
                    {!profileCompleteness?.elements.bio && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: 'var(--color-mdc-text-muted)' }}>
                        ✍️ Write your bio
                      </span>
                    )}
                    {!profileCompleteness?.elements.cuisine && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: 'var(--color-mdc-text-muted)' }}>
                        🍽️ Add cuisine types
                      </span>
                    )}
                    {!profileCompleteness?.elements.service && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: 'var(--color-mdc-text-muted)' }}>
                        📋 Create a service
                      </span>
                    )}
                    {!profileCompleteness?.elements.availability && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: 'var(--color-mdc-text-muted)' }}>
                        📅 Set availability
                      </span>
                    )}
                  </div>
                  <button 
                    onClick={() => setShowSetupPrompt(false)}
                    className="mt-4 text-sm px-4 py-2 rounded font-medium transition-colors"
                    style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
                  >
                    I'll do this later
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Profile Completeness Indicator */}
          {profileCompleteness && (
            <div className="rounded-lg p-4 border" style={{ 
              backgroundColor: profileCompleteness.score === 100 
                ? 'rgba(22, 163, 74, 0.05)' 
                : 'rgba(201, 168, 76, 0.05)',
              borderColor: profileCompleteness.score === 100 
                ? 'rgba(22, 163, 74, 0.2)' 
                : 'rgba(201, 168, 76, 0.2)'
            }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Profile Completeness</span>
                <span className="text-sm font-semibold" style={{ 
                  color: profileCompleteness.score === 100 ? '#15803d' : 'var(--color-mdc-accent)'
                }}>
                  {profileCompleteness.score}%
                </span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
                <div 
                  className="h-2 rounded-full transition-all duration-500"
                  style={{ 
                    width: `${profileCompleteness.score}%`,
                    backgroundColor: profileCompleteness.score === 100 ? '#15803d' : 'var(--color-mdc-accent)'
                  }}
                />
              </div>
              {profileCompleteness.score < 100 && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1">
                    {profileCompleteness.elements.photo ? (
                      <span style={{ color: '#15803d' }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>○</span>
                    )}
                    <span style={{ color: profileCompleteness.elements.photo ? '#15803d' : 'var(--color-mdc-text-muted)' }}>Photo</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {profileCompleteness.elements.bio ? (
                      <span style={{ color: '#15803d' }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>○</span>
                    )}
                    <span style={{ color: profileCompleteness.elements.bio ? '#15803d' : 'var(--color-mdc-text-muted)' }}>Bio</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {profileCompleteness.elements.service ? (
                      <span style={{ color: '#15803d' }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>○</span>
                    )}
                    <span style={{ color: profileCompleteness.elements.service ? '#15803d' : 'var(--color-mdc-text-muted)' }}>Services</span>
                  </div>
                  <div className="flex items-center gap-1">
                    {profileCompleteness.elements.availability ? (
                      <span style={{ color: '#15803d' }}>✓</span>
                    ) : (
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>○</span>
                    )}
                    <span style={{ color: profileCompleteness.elements.availability ? '#15803d' : 'var(--color-mdc-text-muted)' }}>Availability</span>
                  </div>
                </div>
              )}
              {profileCompleteness.score === 100 && (
                <p className="mt-2 text-xs" style={{ color: '#15803d' }}>
                  ✓ Your profile is complete! Diners can now book with confidence.
                </p>
              )}
            </div>
          )}

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
                              backgroundColor: booking.status === 'confirmed' ? '#dcfce7' : '#15803d',
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

              {/* Availability Slots */}
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>Availability</h2>
                  <button
                    onClick={() => setShowAddSlot(!showAddSlot)}
                    className="text-sm px-4 py-2 rounded font-medium transition-colors"
                    style={{
                      backgroundColor: 'var(--color-mdc-accent)',
                      color: 'white',
                    }}
                  >
                    {showAddSlot ? 'Cancel' : '+ Add Slot'}
                  </button>
                </div>

                {showAddSlot && (
                  <form onSubmit={handleAddSlot} className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Date</label>
                        <input
                          type="date"
                          value={newSlotDate}
                          onChange={(e) => setNewSlotDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          required
                          className="w-full px-3 py-2 rounded border text-sm"
                          style={{ borderColor: 'var(--color-mdc-border)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Start Time</label>
                        <input
                          type="time"
                          value={newSlotStart}
                          onChange={(e) => setNewSlotStart(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded border text-sm"
                          style={{ borderColor: 'var(--color-mdc-border)' }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>End Time</label>
                        <input
                          type="time"
                          value={newSlotEnd}
                          onChange={(e) => setNewSlotEnd(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded border text-sm"
                          style={{ borderColor: 'var(--color-mdc-border)' }}
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={addingSlot}
                      className="mt-4 text-sm px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
                      style={{
                        backgroundColor: 'var(--color-mdc-accent)',
                        color: 'white',
                      }}
                    >
                      {addingSlot ? 'Adding...' : 'Add Availability'}
                    </button>
                  </form>
                )}

                {availabilitySlots.length === 0 ? (
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>
                    No availability slots set. Add your first slot above.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {availabilitySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className="flex items-center justify-between p-4 rounded-lg"
                        style={{ backgroundColor: 'var(--color-mdc-bg)' }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <p className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                              {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })}
                            </p>
                            <p className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-mdc-accent)' }}>
                              {new Date(slot.date + 'T00:00:00').getDate()}
                            </p>
                            <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                              {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                          <div>
                            <p className="font-medium">
                              {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                            </p>
                            <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                              {slot.is_booked ? (
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>Booked</span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>Available</span>
                              )}
                            </p>
                          </div>
                        </div>
                        {!slot.is_booked && (
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            disabled={deletingSlot === slot.id}
                            className="text-sm px-3 py-1 rounded transition-colors disabled:opacity-50 hover:opacity-70"
                            style={{ color: 'var(--color-mdc-error)' }}
                          >
                            {deletingSlot === slot.id ? 'Removing...' : 'Remove'}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Inquiries */}
            <div className="rounded-lg p-6 bg-white border shadow-sm">
              <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Booking Inquiries</h2>
              {loadingInquiries ? (
                <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading...</p>
              ) : inquiries.length === 0 ? (
                <p style={{ color: 'var(--color-mdc-text-muted)' }}>No pending inquiries.</p>
              ) : (
                <div className="space-y-4">
                  {inquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      className="p-4 rounded-lg"
                      style={{ backgroundColor: 'var(--color-mdc-bg)' }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{inquiry.email}</p>
                          <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                            {new Date(inquiry.inquiry_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </p>
                          <p className="text-sm mt-2" style={{ color: 'var(--color-mdc-text-muted)' }}>
                            {inquiry.message?.slice(0, 80)}{inquiry.message?.length > 80 ? '...' : ''}
                          </p>
                          {inquiry.services && (
                            <p className="text-xs mt-1" style={{ color: 'var(--color-mdc-accent)' }}>
                              {(inquiry.services as any)?.title}
                            </p>
                          )}
                        </div>
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs" style={{ backgroundColor: '#fef9c3', color: '#a16207' }}>
                          Pending
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => handleInquiryAction(inquiry.id, 'accepted')}
                          disabled={processingInquiry === inquiry.id}
                          className="text-xs px-3 py-1 rounded font-medium transition-colors disabled:opacity-50"
                          style={{ backgroundColor: '#15803d', color: 'white' }}
                        >
                          {processingInquiry === inquiry.id ? 'Processing...' : 'Accept'}
                        </button>
                        <button
                          onClick={() => handleInquiryAction(inquiry.id, 'rejected')}
                          disabled={processingInquiry === inquiry.id}
                          className="text-xs px-3 py-1 rounded font-medium transition-colors disabled:opacity-50"
                          style={{ backgroundColor: 'var(--color-mdc-error)', color: 'white' }}
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
