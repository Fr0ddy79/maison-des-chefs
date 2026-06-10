'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProfileCompletionVariant } from '@/lib/useProfileCompletionVariant'
import { trackProfileCompletenessViewed, trackProfileCompletenessCompleted } from '@/lib/analytics'

interface Booking {
  id: string
  booking_date: string
  start_time: string
  guest_count: number
  total_price: number
  status: string
  special_requests: string | null
  dietary_restrictions: string | null
  allergies: string | null
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
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null)
  const [showInquiryModal, setShowInquiryModal] = useState(false)
  const [showAvailabilityPrompt, setShowAvailabilityPrompt] = useState(false)
  const [pendingInquiryAction, setPendingInquiryAction] = useState<{ inquiryId: string; status: 'accepted' | 'rejected' } | null>(null)
  const [analytics, setAnalytics] = useState<{
    monthlyBookings: number
    inquiryToBookingRate: string
    avgResponseHours: number
    pendingRevenue: number
    pendingBookings: number
    trend: string
  } | null>(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [awaitingQuotesBookings, setAwaitingQuotesBookings] = useState<Booking[]>([])
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [selectedQuoteBooking, setSelectedQuoteBooking] = useState<any>(null)
  const [quoteAmount, setQuoteAmount] = useState('')
  const [quoteMessage, setQuoteMessage] = useState('')
  const [quoteValidDays, setQuoteValidDays] = useState(7)
  const [sendingQuote, setSendingQuote] = useState(false)
  const [quoteSuccess, setQuoteSuccess] = useState<string | null>(null)
  const [quotePerformance, setQuotePerformance] = useState<{
    metrics: { quotesSent: number; pendingResponse: number; accepted: number; declined: number; expired: number; conversionRate: number }
    bookings: any[]
  } | null>(null)
  const [loadingQuotePerformance, setLoadingQuotePerformance] = useState(false)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [messageThreads, setMessageThreads] = useState<Record<string, any[]>>({})
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [selectedThreadBooking, setSelectedThreadBooking] = useState<any>(null)
  const [selectedThreadMessages, setSelectedThreadMessages] = useState<any[]>([])
  const [loadingThreadMessages, setLoadingThreadMessages] = useState(false)
  const [messageReplyInput, setMessageReplyInput] = useState('')
  const [sendingReply, setSendingReply] = useState(false)
  const [loadingMessageThreads, setLoadingMessageThreads] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // A/B test variant for profile completion incentives
  const completionVariant = useProfileCompletionVariant(null)

  // Track profile completeness viewed on mount
  useEffect(() => {
    if (user?.id && profileCompleteness) {
      trackProfileCompletenessViewed({
        chef_id: user.id,
        completion_score: profileCompleteness.score,
        variant: completionVariant,
      })
    }
  }, [user?.id, profileCompleteness, completionVariant])


  // Track profile completeness completed when score reaches 100
  useEffect(() => {
    if (user?.id && profileCompleteness && profileCompleteness.score === 100) {
      // Calculate days since first login (approximation using localStorage)
      const createdAt = localStorage.getItem('chef_created_at')
      const daysToComplete = createdAt 
        ? Math.floor((Date.now() - parseInt(createdAt, 10)) / (1000 * 60 * 60 * 24))
        : null
      trackProfileCompletenessCompleted({
        chef_id: user.id,
        completion_score: 100,
        variant: completionVariant,
        days_to_complete: daysToComplete,
      })
    }
  }, [user?.id, profileCompleteness, completionVariant])

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

      // Store chef creation timestamp for analytics
      if (isFirstLogin) {
        try {
          localStorage.setItem('chef_created_at', Date.now().toString())
        } catch (e) {
          // Ignore localStorage errors
        }
      }

      setProfileCompleteness({ score, elements, isFirstLogin })
      // Show persistent banner until profile is >80% complete
      setShowSetupPrompt(score < 80)

      // Fetch analytics
      setLoadingAnalytics(true)
      try {
        const res = await fetch('/api/analytics/bookings-summary')
        if (res.ok) {
          const data = await res.json()
          setAnalytics(data)
        }
      } catch (e) {
        console.error('Failed to load analytics', e)
      }
      setLoadingAnalytics(false)

      // Fetch quote performance analytics
      setLoadingQuotePerformance(true)
      try {
        const quoteRes = await fetch('/api/analytics/quote-performance')
        if (quoteRes.ok) {
          const quoteData = await quoteRes.json()
          setQuotePerformance(quoteData)
        }
      } catch (e) {
        console.error('Failed to load quote performance', e)
      }
      setLoadingQuotePerformance(false)

      // Also fetch upcoming bookings for the list
      const { data: upcomingData } = await supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time, guest_count, total_price, status, quote_status,
          special_requests, dietary_restrictions, allergies,
          services:service_id (title),
          profiles:diner_id (full_name)
        `)
        .eq('chef_id', authUser.id)
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: true })


      setUpcomingBookings((upcomingData as any[]) || [])


      // Fetch bookings awaiting quotes (pending, no quote sent yet)
      const { data: awaitingQuotesData } = await supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time, guest_count, total_price, status, quote_status,
          special_requests, dietary_restrictions, allergies,
          services:service_id (title),
          profiles:diner_id (full_name)
        `)
        .eq('chef_id', authUser.id)
        .eq('status', 'pending')
        .is('quote_status', null)
        .order('booking_date', { ascending: true })

      setAwaitingQuotesBookings((awaitingQuotesData as any[]) || [])
      setStats(prev => ({
        ...prev,
        upcomingCount: upcomingData?.length || 0,
        avgRating: chef?.avg_rating || 0,
      }))

      setLoading(false)
    }
    checkChef()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function fetchMessageThreads() {
    if (!user?.id) return
    setLoadingMessageThreads(true)
    
    // Get confirmed/pending bookings for this chef
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select('id, diner_id, booking_date, start_time, status, profiles:diner_id(full_name)')
      .eq('chef_id', user.id)
      .in('status', ['confirmed', 'pending'])
      .order('booking_date', { ascending: false })
      .limit(10)

    if (!bookingsData || bookingsData.length === 0) {
      setLoadingMessageThreads(false)
      return
    }

    // Fetch last message for each booking
    const threads: Record<string, any[]> = {}
    let unreadTotal = 0

    for (const booking of bookingsData) {
      try {
        const res = await fetch(`/api/bookings/${booking.id}/messages`)
        if (res.ok) {
          const messages = await res.json()
          threads[booking.id] = messages
          
          // Calculate unread: diner messages in last 24h that are newer than chef's last message
          const dinerMessages = messages.filter((m: any) => m.sender_type === 'diner')
          const chefMessages = messages.filter((m: any) => m.sender_type === 'chef')
          const lastChefMsg = chefMessages[chefMessages.length - 1]
          const recentDinerMsgs = dinerMessages.filter((m: any) => {
            const msgAge = Date.now() - new Date(m.created_at).getTime()
            return msgAge < 24 * 60 * 60 * 1000 // last 24 hours
          })
          // Count as unread if there's a recent diner msg after chef's last msg (or no chef msgs)
          if (recentDinerMsgs.length > 0) {
            const lastDinerMsg = recentDinerMsgs[recentDinerMsgs.length - 1]
            if (!lastChefMsg || new Date(lastDinerMsg.created_at) > new Date(lastChefMsg.created_at)) {
              unreadTotal += recentDinerMsgs.length
            }
          }
        }
      } catch (e) {
        // Ignore individual failures
      }
    }

    setMessageThreads(threads)
    setUnreadMessageCount(unreadTotal)
    setLoadingMessageThreads(false)
  }

  async function openMessageModal(booking: any) {
    setSelectedThreadBooking(booking)
    setShowMessageModal(true)
    setLoadingThreadMessages(true)
    setMessageReplyInput('')
    
    try {
      const res = await fetch(`/api/bookings/${booking.id}/messages`)
      if (res.ok) {
        setSelectedThreadMessages(await res.json())
      }
    } catch (e) {
      setSelectedThreadMessages([])
    }
    setLoadingThreadMessages(false)
  }

  async function sendMessageReply(e: React.FormEvent) {
    e.preventDefault()
    if (!messageReplyInput.trim() || !selectedThreadBooking || sendingReply) return

    setSendingReply(true)
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: selectedThreadBooking.id,
          content: messageReplyInput.trim(),
          sender_type: 'chef',
        }),
      })

      if (res.ok) {
        setMessageReplyInput('')
        // Refresh thread
        const threadRes = await fetch(`/api/bookings/${selectedThreadBooking.id}/messages`)
        if (threadRes.ok) {
          setSelectedThreadMessages(await threadRes.json())
        }
        // Refresh all threads
        await fetchMessageThreads()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send reply')
      }
    } catch (err) {
      alert('Failed to send reply. Please try again.')
    }
    setSendingReply(false)
  }

  function openQuoteModal(booking: any) {
    setSelectedQuoteBooking(booking)
    setQuoteAmount(booking.total_price?.toString() || '')
    setQuoteMessage('')
    setQuoteValidDays(7)
    setShowQuoteModal(true)
    setQuoteSuccess(null)
  }

  function closeQuoteModal() {
    setShowQuoteModal(false)
    setSelectedQuoteBooking(null)
    setQuoteAmount('')
    setQuoteMessage('')
    setQuoteValidDays(7)
    setQuoteSuccess(null)
  }

  async function handleSendQuote(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedQuoteBooking || sendingQuote) return

    const amount = parseFloat(quoteAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setSendingQuote(true)
    try {
      const res = await fetch(`/api/bookings/${selectedQuoteBooking.id}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote_amount: amount,
          quote_message: quoteMessage.trim() || null,
          quote_valid_days: quoteValidDays,
        }),
      })
      const data = await res.json()

      if (res.ok) {
        setQuoteSuccess('Quote sent successfully!')
        // Refresh awaiting quotes list and upcoming bookings
        const { data: updatedUpcomingData } = await supabase
          .from('bookings')
          .select(`
            id, booking_date, start_time, guest_count, total_price, status, quote_status,
            special_requests, dietary_restrictions, allergies,
            services:service_id (title),
            profiles:diner_id (full_name)
          `)
          .eq('chef_id', user.id)
          .in('status', ['pending', 'confirmed'])
          .order('booking_date', { ascending: true })
        setUpcomingBookings((updatedUpcomingData as any[]) || [])


        const { data: updatedAwaitingData } = await supabase
          .from('bookings')
          .select(`
            id, booking_date, start_time, guest_count, total_price, status, quote_status,
            special_requests, dietary_restrictions, allergies,
            services:service_id (title),
            profiles:diner_id (full_name)
          `)
          .eq('chef_id', user.id)
          .eq('status', 'pending')
          .is('quote_status', null)
          .order('booking_date', { ascending: true })
        setAwaitingQuotesBookings((updatedAwaitingData as any[]) || [])

        setTimeout(() => {
          closeQuoteModal()
        }, 1500)
      } else {
        alert(data.error || 'Failed to send quote')
      }
    } catch (err) {
      alert('Something went wrong. Please try again.')
    }
    setSendingQuote(false)
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
      fetchMessageThreads()
    }
  }, [user?.id])

  // Poll for new messages every 30 seconds
  useEffect(() => {
    if (!user?.id) return
    const interval = setInterval(fetchMessageThreads, 30000)
    return () => clearInterval(interval)
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
      .select(`id, email, message, inquiry_date, inquiry_time, status, created_at, service_id, guest_count, services:service_id (title)`)
      .eq('chef_id', authUser.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    setInquiries((data as any[]) || [])
    setLoadingInquiries(false)
  }

  async function handleInquiryAction(inquiryId: string, status: 'accepted' | 'rejected') {
    // If accepting and no availability slots exist, prompt to add availability first
    if (status === 'accepted' && availabilitySlots.length === 0) {
      setPendingInquiryAction({ inquiryId, status })
      setShowAvailabilityPrompt(true)
      setShowInquiryModal(false)
      return
    }

    setProcessingInquiry(inquiryId)
    const res = await fetch('/api/inquiries', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inquiryId, status }),
    })
    if (res.ok) {
      await fetchInquiries()
      await fetchAvailabilitySlots()
      // Refresh upcoming bookings since accepted inquiry creates a booking
      const { data: updatedUpcomingData } = await supabase
        .from('bookings')
        .select(`
          id, booking_date, start_time, guest_count, total_price, status, quote_status,
          special_requests, dietary_restrictions, allergies,
          services:service_id (title),
          profiles:diner_id (full_name)
        `)
        .eq('chef_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .order('booking_date', { ascending: true })
      setUpcomingBookings((updatedUpcomingData as any[]) || [])
    }
    setProcessingInquiry(null)
    setShowInquiryModal(false)
  }

  async function handleAddAvailabilityFromPrompt(e: React.FormEvent) {
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
      await fetchAvailabilitySlots()
      // Now proceed with the pending inquiry action
      if (pendingInquiryAction) {
        await handleInquiryAction(pendingInquiryAction.inquiryId, pendingInquiryAction.status)
        setPendingInquiryAction(null)
      }
    }
    setAddingSlot(false)
    setShowAvailabilityPrompt(false)
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
            {unreadMessageCount > 0 && (
              <button
                onClick={() => {}}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)', color: 'var(--color-mdc-accent)' }}
                title="Unread messages"
              >
                <span>💬</span>
                <span>{unreadMessageCount}</span>
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-xs font-bold text-white" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>
                  {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                </span>
              </button>
            )}
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

          {/* First-Time Setup Prompt - A/B tested variants */}
          {showSetupPrompt && (
            <div className="mt-6 rounded-lg p-6 border" style={{ 
              backgroundColor: 'rgba(201, 168, 76, 0.08)',
              borderColor: 'rgba(201, 168, 76, 0.3)'
            }}>
              <div className="flex items-start gap-4">
                <div className="text-3xl">
                  {completionVariant === 'gamification' ? '🏆' : completionVariant === 'urgency' ? '⚡' : '👨‍🍳'}
                </div>
                <div className="flex-1">
                  {completionVariant === 'social_proof' && (
                    <>
                      <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                        Complete your chef profile to get booked
                      </h3>
                      <p className="mt-1 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        Chefs with complete profiles get <strong>3x more booking requests</strong>. 
                        Take a few minutes to add the essentials below.
                      </p>
                    </>
                  )}
                  {completionVariant === 'gamification' && (
                    <>
                      <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                        Level up your chef profile!
                      </h3>
                      <p className="mt-1 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        Complete each section to unlock badges and stand out to diners. 
                        <strong>5/5 badges</strong> = Featured Chef status.
                      </p>
                    </>
                  )}
                  {completionVariant === 'urgency' && (
                    <>
                      <h3 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                        Add availability to start receiving bookings
                      </h3>
                      <p className="mt-1 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        Diners can only book when you have slots available. <strong>Add your first availability slot now</strong> 
                        to appear in search results and receive booking requests.
                      </p>
                    </>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!profileCompleteness?.elements.photo && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: 'var(--color-mdc-text-muted)' }}>
                        {completionVariant === 'gamification' ? '🥇 ' : '📷 '}
                        Add profile photo
                      </span>
                    )}
                    {!profileCompleteness?.elements.bio && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: 'var(--color-mdc-text-muted)' }}>
                        {completionVariant === 'gamification' ? '🥈 ' : '✍️ '}
                        Write your bio
                      </span>
                    )}
                    {!profileCompleteness?.elements.cuisine && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: 'var(--color-mdc-text-muted)' }}>
                        {completionVariant === 'gamification' ? '🥉 ' : '🍽️ '}
                        Add cuisine types
                      </span>
                    )}
                    {!profileCompleteness?.elements.service && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: 'var(--color-mdc-text-muted)' }}>
                        {completionVariant === 'gamification' ? '📋 ' : '📋 '}
                        Create a service
                      </span>
                    )}
                    {!profileCompleteness?.elements.availability && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs" style={{ backgroundColor: 'white', color: 'var(--color-mdc-text-muted)' }}>
                        {completionVariant === 'gamification' ? '⏰ ' : '📅 '}
                        Set availability
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

          {/* Analytics KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="rounded-lg p-4 bg-white border shadow-sm">
              <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>This Month</p>
              {loadingAnalytics ? (
                <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>...</p>
              ) : (
                <>
                  <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{analytics?.monthlyBookings || 0}</p>
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Bookings</p>
                  {analytics?.trend && analytics.trend !== 'flat' && (
                    <span className={`inline-block mt-1 text-xs ${analytics.trend === 'up' ? 'text-green-600' : 'text-red-500'}`}>
                      {analytics.trend === 'up' ? '↑' : '↓'} vs last month
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="rounded-lg p-4 bg-white border shadow-sm">
              <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Conversion</p>
              {loadingAnalytics ? (
                <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>...</p>
              ) : (
                <>
                  <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{analytics?.inquiryToBookingRate || '0%'}</p>
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Inquiry→Booking</p>
                </>
              )}
            </div>
            <div className="rounded-lg p-4 bg-white border shadow-sm">
              <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Avg Response</p>
              {loadingAnalytics ? (
                <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>...</p>
              ) : (
                <>
                  <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{analytics?.avgResponseHours || 0}h</p>
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Response Time</p>
                </>
              )}
            </div>
            <div className="rounded-lg p-4 bg-white border shadow-sm">
              <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Pending</p>
              {loadingAnalytics ? (
                <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>...</p>
              ) : (
                <>
                  <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>${(analytics?.pendingRevenue || 0).toLocaleString()}</p>
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>{analytics?.pendingBookings || 0} bookings</p>
                </>
              )}
            </div>
          </div>

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

          {/* Quote Performance Section */}
          {quotePerformance && (
            <div className="mt-8">
              <h2 className="text-xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Quote Performance</h2>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="rounded-lg p-4 bg-white border shadow-sm">
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Quotes Sent</p>
                  <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{quotePerformance.metrics.quotesSent}</p>
                </div>
                <div className="rounded-lg p-4 bg-white border shadow-sm">
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Pending</p>
                  <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{quotePerformance.metrics.pendingResponse}</p>
                </div>
                <div className="rounded-lg p-4 bg-white border shadow-sm">
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Accepted</p>
                  <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)', color: '#15803d' }}>{quotePerformance.metrics.accepted}</p>
                </div>
                <div className="rounded-lg p-4 bg-white border shadow-sm">
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Declined</p>
                  <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-mdc-error)' }}>{quotePerformance.metrics.declined}</p>
                </div>
                <div className="rounded-lg p-4 bg-white border shadow-sm">
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Conversion</p>
                  <p className="text-2xl mt-1" style={{ fontFamily: 'var(--font-serif)' }}>{quotePerformance.metrics.conversionRate}%</p>
                </div>
              </div>

              {/* Quote List */}
              {quotePerformance.bookings.length > 0 && (
                <div className="mt-6 rounded-lg p-6 bg-white border shadow-sm">
                  <h3 className="text-lg mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Quote History</h3>
                  <div className="space-y-3">
                    {quotePerformance.bookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="flex items-center justify-between p-4 rounded-lg"
                        style={{ backgroundColor: 'var(--color-mdc-bg)' }}
                      >
                        <div>
                          <p className="font-medium">{booking.diner_name}</p>
                          <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                            {booking.service_title} • {booking.booking_date} at {booking.start_time}
                          </p>
                        </div>
                        <div className="text-right">
                          <span
                            className="inline-block px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: booking.quote_status === 'accepted' ? '#dcfce7' :
                                booking.quote_status === 'declined' ? '#fee2e2' :
                                booking.quote_status === 'expired' ? '#fef3c7' : '#dbeafe',
                              color: booking.quote_status === 'accepted' ? '#15803d' :
                                booking.quote_status === 'declined' ? '#dc2626' :
                                booking.quote_status === 'expired' ? '#d97706' : '#2563eb',
                            }}
                          >
                            {booking.quote_status}
                          </span>
                          <p className="mt-2 font-semibold">${booking.quote_amount}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

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
                    {upcomingBookings.map((booking) => {
                      const dietaryRestrictions = booking.dietary_restrictions ? JSON.parse(booking.dietary_restrictions) : []
                      const allergies = booking.allergies ? JSON.parse(booking.allergies) : []
                      const hasDietaryInfo = dietaryRestrictions.length > 0 || allergies.length > 0
                      return (
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
                            {hasDietaryInfo && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {allergies.map((allergy: string) => (
                                  <span
                                    key={allergy}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}
                                  >
                                    ⚠️ {allergy}
                                  </span>
                                ))}
                                {dietaryRestrictions.map((diet: string) => (
                                  <span
                                    key={diet}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
                                  >
                                    {diet}
                                  </span>
                                ))}
                              </div>
                            )}
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
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Awaiting Quotes - Bookings that need a quote sent */}
              {awaitingQuotesBookings.length > 0 && (
                <div className="rounded-lg p-6 bg-white border shadow-sm" style={{ borderColor: 'rgba(201, 168, 76, 0.3)', backgroundColor: 'rgba(201, 168, 76, 0.02)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>Awaiting Your Quote</h2>
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}>
                        {awaitingQuotesBookings.length}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm mb-4" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    These accepted bookings are waiting for you to send a quote.
                  </p>
                  <div className="space-y-4">
                    {awaitingQuotesBookings.map((booking) => {
                      const dietaryRestrictions = booking.dietary_restrictions ? JSON.parse(booking.dietary_restrictions) : []
                      const allergies = booking.allergies ? JSON.parse(booking.allergies) : []
                      const hasDietaryInfo = dietaryRestrictions.length > 0 || allergies.length > 0
                      return (
                        <div
                          key={booking.id}
                          className="flex items-center justify-between p-4 rounded-lg"
                          style={{ backgroundColor: 'white', border: '1px solid rgba(201, 168, 76, 0.2)' }}
                        >
                          <div>
                            <p className="font-medium">{(booking.profiles as any)?.full_name || 'Client'}</p>
                            <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                              {(booking.services as any)?.title || 'Service'}
                            </p>
                            <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                              {booking.booking_date} at {booking.start_time} • {booking.guest_count} guests
                            </p>
                            {hasDietaryInfo && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {allergies.map((allergy: string) => (
                                  <span
                                    key={allergy}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}
                                  >
                                    ⚠️ {allergy}
                                  </span>
                                ))}
                                {dietaryRestrictions.map((diet: string) => (
                                  <span
                                    key={diet}
                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                                    style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
                                  >
                                    {diet}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>Est. Price</p>
                              <p className="font-semibold">${booking.total_price}</p>
                            </div>
                            <button
                              onClick={() => openQuoteModal(booking)}
                              className="px-4 py-2 rounded font-medium text-sm transition-colors"
                              style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
                            >
                              Send Quote
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>Booking Inquiries</h2>
                  {inquiries.length > 0 && (
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}>
                      {inquiries.length}
                    </span>
                  )}
                </div>
              </div>
              {loadingInquiries ? (
                <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading...</p>
              ) : inquiries.length === 0 ? (
                <p style={{ color: 'var(--color-mdc-text-muted)' }}>No pending inquiries.</p>
              ) : (
                <div className="space-y-4">
                  {inquiries.map((inquiry) => (
                    <div
                      key={inquiry.id}
                      className="p-4 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: 'var(--color-mdc-bg)' }}
                      onClick={() => { setSelectedInquiry(inquiry); setShowInquiryModal(true) }}
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
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inquiry Detail Modal */}
            {showInquiryModal && selectedInquiry && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowInquiryModal(false)}>
                <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>Inquiry Details</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        Received {new Date(selectedInquiry.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <button onClick={() => setShowInquiryModal(false)} className="text-2xl" style={{ color: 'var(--color-mdc-text-muted)' }}>×</button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Diner Email</p>
                      <p className="font-medium">{selectedInquiry.email}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Requested Date</p>
                      <p className="font-medium">
                        {new Date(selectedInquiry.inquiry_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    {selectedInquiry.guest_count && (
                      <div>
                        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Party Size</p>
                        <p className="font-medium">{selectedInquiry.guest_count} guests</p>
                      </div>
                    )}
                    {selectedInquiry.inquiry_time && (
                      <div>
                        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Requested Time</p>
                        <p className="font-medium">{formatTime(selectedInquiry.inquiry_time)}</p>
                      </div>
                    )}
                    {selectedInquiry.services && (
                      <div>
                        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Service</p>
                        <p className="font-medium" style={{ color: 'var(--color-mdc-accent)' }}>{(selectedInquiry.services as any)?.title}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Message</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>{selectedInquiry.message}</p>
                    </div>
                    {(selectedInquiry.dietary_preferences?.length > 0 || selectedInquiry.nut_allergy) && (
                      <div>
                        <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Dietary Requirements</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {selectedInquiry.nut_allergy && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
                              ⚠️ Nut Allergy — chef must confirm
                            </span>
                          )}
                          {(selectedInquiry.dietary_preferences || []).map((diet: string) => (
                            <span
                              key={diet}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                              style={{ backgroundColor: '#dcfce7', color: '#15803d' }}
                            >
                              {diet.charAt(0).toUpperCase() + diet.slice(1).replace('-', '/')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button
                      onClick={() => handleInquiryAction(selectedInquiry.id, 'accepted')}
                      disabled={processingInquiry === selectedInquiry.id}
                      className="flex-1 text-sm px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#15803d', color: 'white' }}
                    >
                      {processingInquiry === selectedInquiry.id ? 'Processing...' : 'Accept Inquiry'}
                    </button>
                    <button
                      onClick={() => handleInquiryAction(selectedInquiry.id, 'rejected')}
                      disabled={processingInquiry === selectedInquiry.id}
                      className="flex-1 text-sm px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-mdc-error)', color: 'white' }}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Availability Prompt Modal - shown before accepting first inquiry if no slots exist */}
            {showAvailabilityPrompt && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => { setShowAvailabilityPrompt(false); setPendingInquiryAction(null) }}>
                <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>Add Availability to Accept</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        You need at least one availability slot to accept booking requests.
                      </p>
                    </div>
                    <button onClick={() => { setShowAvailabilityPrompt(false); setPendingInquiryAction(null) }} className="text-2xl" style={{ color: 'var(--color-mdc-text-muted)' }}>×</button>
                  </div>
                  <form onSubmit={handleAddAvailabilityFromPrompt} className="space-y-4">
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
                    <div className="mt-6 flex gap-3">
                      <button
                        type="submit"
                        disabled={addingSlot}
                        className="flex-1 text-sm px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
                        style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
                      >
                        {addingSlot ? 'Adding...' : 'Add Slot & Accept Inquiry'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAvailabilityPrompt(false); setPendingInquiryAction(null) }}
                        className="flex-1 text-sm px-4 py-2 rounded font-medium transition-colors border"
                        style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)' }}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Send Quote Modal */}
            {showQuoteModal && selectedQuoteBooking && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeQuoteModal}>
                <div className="bg-white rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>Send Quote</h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        {new Date(selectedQuoteBooking.booking_date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <button onClick={closeQuoteModal} className="text-2xl" style={{ color: 'var(--color-mdc-text-muted)' }}>×</button>
                  </div>

                  {quoteSuccess ? (
                    <div className="py-8 text-center">
                      <div className="text-4xl mb-3">✓</div>
                      <p className="font-medium" style={{ color: '#15803d' }}>{quoteSuccess}</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSendQuote}>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Quote Amount *</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-mdc-text-muted)' }}>$</span>
                            <input
                              type="number"
                              value={quoteAmount}
                              onChange={(e) => setQuoteAmount(e.target.value)}
                              placeholder="0.00"
                              min="0"
                              step="0.01"
                              required
                              className="w-full pl-7 pr-3 py-2 rounded border text-sm"
                              style={{ borderColor: 'var(--color-mdc-border)' }}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Message (optional)</label>
                          <textarea
                            value={quoteMessage}
                            onChange={(e) => setQuoteMessage(e.target.value)}
                            placeholder="Add a personal note to your quote..."
                            rows={3}
                            className="w-full px-3 py-2 rounded border text-sm resize-none"
                            style={{ borderColor: 'var(--color-mdc-border)' }}
                          />
                        </div>

                        <div>
                          <label className="block text-sm mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Valid For</label>
                          <select
                            value={quoteValidDays}
                            onChange={(e) => setQuoteValidDays(parseInt(e.target.value))}
                            className="w-full px-3 py-2 rounded border text-sm"
                            style={{ borderColor: 'var(--color-mdc-border)' }}
                          >
                            <option value={3}>3 days</option>
                            <option value={7}>7 days</option>
                            <option value={14}>14 days</option>
                            <option value={30}>30 days</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-6 flex gap-3">
                        <button
                          type="submit"
                          disabled={sendingQuote}
                          className="flex-1 text-sm px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
                          style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
                        >
                          {sendingQuote ? 'Sending...' : 'Send Quote'}
                        </button>
                        <button
                          type="button"
                          onClick={closeQuoteModal}
                          className="flex-1 text-sm px-4 py-2 rounded font-medium transition-colors border"
                          style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* Message Thread Modal */}
            {showMessageModal && selectedThreadBooking && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={() => setShowMessageModal(false)}>
                <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>
                        {(selectedThreadBooking.profiles as any)?.full_name || 'Client'}
                      </h3>
                      <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        {selectedThreadBooking.booking_date} at {selectedThreadBooking.start_time}
                      </p>
                    </div>
                    <button onClick={() => setShowMessageModal(false)} className="text-2xl" style={{ color: 'var(--color-mdc-text-muted)' }}>×</button>
                  </div>

                  {/* Messages */}
                  <div
                    className="flex-1 border rounded-lg p-4 mb-4 overflow-y-auto"
                    style={{ borderColor: 'var(--color-mdc-border)', minHeight: '240px' }}
                  >
                    {loadingThreadMessages ? (
                      <div className="flex items-center justify-center h-full">
                        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading...</p>
                      </div>
                    ) : selectedThreadMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <span className="text-3xl mb-2">💬</span>
                        <p style={{ color: 'var(--color-mdc-text-muted)' }}>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedThreadMessages.map((msg: any) => {
                          const isChef = msg.sender_type === 'chef'
                          return (
                            <div
                              key={msg.id}
                              className={`flex ${isChef ? 'justify-start' : 'justify-end'}`}
                            >
                              <div
                                className="max-w-[80%] rounded-lg px-4 py-2"
                                style={{
                                  backgroundColor: isChef ? 'var(--color-mdc-bg)' : 'rgba(201, 168, 76, 0.15)',
                                  border: isChef ? '1px solid var(--color-mdc-border)' : 'none',
                                }}
                              >
                                <p className="text-sm break-words">{msg.content}</p>
                                <p className="text-xs mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                                  {isChef ? 'You' : (selectedThreadBooking.profiles as any)?.full_name || 'Diner'} · {new Date(msg.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Reply Input */}
                  <form onSubmit={sendMessageReply} className="flex gap-2">
                    <input
                      type="text"
                      value={messageReplyInput}
                      onChange={(e) => setMessageReplyInput(e.target.value)}
                      placeholder="Type a reply..."
                      disabled={sendingReply}
                      className="flex-1 px-4 py-2 rounded-lg border text-sm"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    />
                    <button
                      type="submit"
                      disabled={sendingReply || !messageReplyInput.trim()}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                      style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
                    >
                      {sendingReply ? '...' : 'Send'}
                    </button>
                  </form>
                </div>
              </div>
            )}

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
                  <a href="/dashboard/chef/profile" className="block w-full text-center px-4 py-2 rounded font-medium text-sm transition-colors border" style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}>
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
                  <a href="/dashboard/chef/services" className="block w-full text-left px-4 py-2 text-sm transition-colors hover:bg-gray-50" style={{ color: 'var(--color-mdc-text-muted)' }}>
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

              {/* Messages */}
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">Messages</h3>
                    {unreadMessageCount > 0 && (
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>
                        {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                      </span>
                    )}
                  </div>
                </div>
                {loadingMessageThreads ? (
                  <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>Loading...</p>
                ) : (
                  <div className="space-y-2">
                    {Object.keys(messageThreads).length === 0 ? (
                      <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>No conversations yet.</p>
                    ) : (
                      Object.entries(messageThreads)
                        .sort(([, a], [, b]) => {
                          const aTime = (a as any[]).length > 0 ? new Date((a as any[])[(a as any[]).length - 1].created_at).getTime() : 0
                          const bTime = (b as any[]).length > 0 ? new Date((b as any[])[(b as any[]).length - 1].created_at).getTime() : 0
                          return bTime - aTime
                        })
                        .slice(0, 5)
                        .map(([bookingId, messages]) => {
                          const msgs = messages as any[]
                          if (msgs.length === 0) return null
                          const lastMsg = msgs[msgs.length - 1]
                          const booking = (upcomingBookings as any[]).find(b => b.id === bookingId) || { id: bookingId, booking_date: '', start_time: '', profiles: { full_name: 'Client' } }
                          const dinerName = (booking.profiles as any)?.full_name || 'Client'
                          const isUnread = (() => {
                            const dinerMsgs = msgs.filter((m: any) => m.sender_type === 'diner')
                            const chefMsgs = msgs.filter((m: any) => m.sender_type === 'chef')
                            const lastChefMsg = chefMsgs[chefMsgs.length - 1]
                            const recentDinerMsgs = dinerMsgs.filter((m: any) => {
                              const msgAge = Date.now() - new Date(m.created_at).getTime()
                              return msgAge < 24 * 60 * 60 * 1000
                            })
                            if (recentDinerMsgs.length > 0) {
                              const lastDinerMsg = recentDinerMsgs[recentDinerMsgs.length - 1]
                              return !lastChefMsg || new Date(lastDinerMsg.created_at) > new Date(lastChefMsg.created_at)
                            }
                            return false
                          })()
                          return (
                            <button
                              key={bookingId}
                              onClick={() => {
                                const bk = upcomingBookings.find(b => b.id === bookingId) || { id: bookingId, booking_date: '', start_time: '', profiles: { full_name: dinerName } }
                                openMessageModal(bk)
                              }}
                              className="w-full text-left p-3 rounded-lg transition-colors hover:bg-gray-50"
                              style={{ backgroundColor: isUnread ? 'rgba(201, 168, 76, 0.08)' : 'var(--color-mdc-bg)' }}
                            >
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-sm truncate">{dinerName}</p>
                                {isUnread && (
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-mdc-accent)' }} />
                                )}
                              </div>
                              <p className="text-xs truncate mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                                {lastMsg.sender_type === 'chef' ? 'You: ' : ''}{lastMsg.content.slice(0, 40)}{lastMsg.content.length > 40 ? '...' : ''}
                              </p>
                            </button>
                          )
                        })
                    )}
                  </div>
                )}
              </div>

              {/* Help */}
              <div className="rounded-lg p-6 border" style={{ backgroundColor: 'rgba(201, 168, 76, 0.05)', borderColor: 'rgba(201, 168, 76, 0.2)' }}>
                <h3 className="font-medium mb-2">Need Help?</h3>
                <p className="text-sm mb-4" style={{ color: 'var(--color-mdc-text-muted)' }}>
                  Our support team is here to assist you.
                </p>
                <a href="/contact" className="text-sm hover:underline" style={{ color: 'var(--color-mdc-accent)' }}>
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
