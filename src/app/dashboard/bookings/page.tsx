'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ReviewForm } from '@/components/ReviewForm'

interface Booking {
  id: string
  chef_id: string
  booking_date: string
  start_time: string
  guest_count: number
  total_price: number
  status: string
  quote_amount: number | null
  quote_message: string | null
  quote_valid_until: string | null
  quote_status: string | null
  special_requests: string | null
  services: { title: string } | null
  chef_profiles: {
    display_name: string
    location: string
    cuisines: string[]
  } | null
}

export default function BookingStatusPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [processingBooking, setProcessingBooking] = useState<string | null>(null)
  const [showDeclineConfirm, setShowDeclineConfirm] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<{ bookingId: string; type: 'accepted' | 'declined'; message: string } | null>(null)
  const [showReviewForm, setShowReviewForm] = useState<string | null>(null)
  const [reviewStatuses, setReviewStatuses] = useState<Record<string, boolean>>({})
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function checkUser() {
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

      setUser({ ...authUser, ...profile })

      // Fetch bookings for this diner with chef info
      const { data: bookingsData } = await supabase
        .from('bookings')
        .select(`
          id, chef_id, booking_date, start_time, guest_count, total_price, status,
          quote_amount, quote_message, quote_valid_until, quote_status,
          special_requests,
          services:service_id (title),
          chef_profiles:chef_id (display_name, location, cuisines)
        `)
        .eq('diner_id', authUser.id)
        .order('created_at', { ascending: false })

      setBookings((bookingsData as any[]) || [])

      // Check which bookings have reviews
      if (bookingsData && bookingsData.length > 0) {
        const bookingIds = bookingsData.map((b: any) => b.id)
        const { data: reviews } = await supabase
          .from('reviews')
          .select('booking_id')
          .in('booking_id', bookingIds)
        
        const statuses: Record<string, boolean> = {}
        reviews?.forEach((r: any) => {
          statuses[r.booking_id] = true
        })
        setReviewStatuses(statuses)
      }

      setLoading(false)
    }
    checkUser()
  }, [])

  async function handleAcceptQuote(bookingId: string) {
    setProcessingBooking(bookingId)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/accept-quote`, {
        method: 'POST',
      })
      const data = await res.json()
      
      if (res.ok) {
        setActionResult({ bookingId, type: 'accepted', message: 'Quote accepted! Your booking is now confirmed.' })
        // Refresh bookings
        const { data: updated } = await supabase
          .from('bookings')
          .select(`
            id, chef_id, booking_date, start_time, guest_count, total_price, status,
            quote_amount, quote_message, quote_valid_until, quote_status,
            special_requests,
            services:service_id (title),
            chef_profiles:chef_id (display_name, location, cuisines)
          `)
          .eq('diner_id', user.id)
          .order('created_at', { ascending: false })
        setBookings((updated as any[]) || [])
      } else {
        alert(data.error || 'Failed to accept quote. Please try again.')
      }
    } catch (err) {
      alert('Something went wrong. Please try again.')
    }
    setProcessingBooking(null)
  }

  async function handleDeclineQuote(bookingId: string) {
    setProcessingBooking(bookingId)
    setShowDeclineConfirm(null)
    try {
      const res = await fetch(`/api/bookings/${bookingId}/decline-quote`, {
        method: 'POST',
      })
      const data = await res.json()
      
      if (res.ok) {
        setActionResult({ bookingId, type: 'declined', message: 'Quote declined. The time slot has been released.' })
        // Refresh bookings
        const { data: updated } = await supabase
          .from('bookings')
          .select(`
            id, chef_id, booking_date, start_time, guest_count, total_price, status,
            quote_amount, quote_message, quote_valid_until, quote_status,
            special_requests,
            services:service_id (title),
            chef_profiles:chef_id (display_name, location, cuisines)
          `)
          .eq('diner_id', user.id)
          .order('created_at', { ascending: false })
        setBookings((updated as any[]) || [])
      } else {
        alert(data.error || 'Failed to decline quote. Please try again.')
      }
    } catch (err) {
      alert('Something went wrong. Please try again.')
    }
    setProcessingBooking(null)
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00')
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  }

  function formatTime(time: string) {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const h = parseInt(hours)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const h12 = h % 12 || 12
    return `${h12}:${minutes} ${ampm}`
  }

  function isQuoteExpired(validUntil: string | null) {
    if (!validUntil) return false
    return new Date(validUntil) < new Date()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading your bookings...</p>
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
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/login')
              }}
              className="text-sm px-4 py-2 rounded transition-colors hover:opacity-80"
              style={{ color: 'var(--color-mdc-text-muted)' }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-4xl mx-auto px-6 py-12">
          <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Your Bookings</h1>
          <p style={{ color: 'var(--color-mdc-text-muted)' }}>Manage your private chef experiences</p>

          {/* Action Result Banner */}
          {actionResult && (
            <div className={`mt-6 rounded-lg p-4 flex items-center gap-3 ${
              actionResult.type === 'accepted' 
                ? 'border bg-green-50' 
                : 'border bg-amber-50'
            }`} style={{ 
              borderColor: actionResult.type === 'accepted' ? '#16a34a' : '#d97706',
              backgroundColor: actionResult.type === 'accepted' ? 'rgba(22, 163, 74, 0.05)' : 'rgba(217, 119, 6, 0.05)'
            }}>
              <span className="text-2xl">{actionResult.type === 'accepted' ? '✓' : '↩'}</span>
              <div>
                <p className="font-medium" style={{ color: actionResult.type === 'accepted' ? '#15803d' : '#b45309' }}>
                  {actionResult.message}
                </p>
              </div>
              <button 
                onClick={() => setActionResult(null)}
                className="ml-auto text-sm opacity-60 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          )}

          {/* Bookings List */}
          <div className="mt-8 space-y-6">
            {bookings.length === 0 ? (
              <div className="rounded-lg p-12 text-center bg-white border shadow-sm">
                <div className="text-4xl mb-4">🍽️</div>
                <h3 className="text-xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>No bookings yet</h3>
                <p style={{ color: 'var(--color-mdc-text-muted)' }}>Start exploring our private chefs and book your first experience.</p>
                <Link 
                  href="/chefs" 
                  className="inline-block mt-6 px-6 py-3 rounded font-medium text-white transition-colors"
                  style={{ backgroundColor: 'var(--color-mdc-accent)' }}
                >
                  Browse Chefs
                </Link>
              </div>
            ) : (
              bookings.map((booking) => (
                <div key={booking.id} className="rounded-lg bg-white border shadow-sm overflow-hidden">
                  {/* Booking Header */}
                  <div className="p-6 border-b" style={{ borderColor: 'var(--color-mdc-border)' }}>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-lg" style={{ fontFamily: 'var(--font-serif)' }}>
                          {booking.chef_profiles?.display_name || 'Chef'}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                          {(booking.services as any)?.title || 'Private Dining Experience'}
                        </p>
                      </div>
                      <StatusBadge status={booking.status} quoteStatus={booking.quote_status} />
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Date</p>
                      <p className="font-medium">{formatDate(booking.booking_date)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Time</p>
                      <p className="font-medium">{formatTime(booking.start_time)}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Guests</p>
                      <p className="font-medium">{booking.guest_count}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Total</p>
                      <p className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>${booking.total_price?.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Quote Section - Show when quote_status is pending */}
                  {booking.quote_status === 'pending' && (
                    <div 
                      className="p-6 border-t"
                      style={{ 
                        backgroundColor: 'rgba(201, 168, 76, 0.05)',
                        borderColor: 'rgba(201, 168, 76, 0.2)'
                      }}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                            Your Quote is Ready
                          </h4>
                          {booking.quote_amount && (
                            <p className="text-3xl font-bold mt-2" style={{ color: 'var(--color-mdc-accent)' }}>
                              ${booking.quote_amount.toLocaleString()}
                            </p>
                          )}
                          {booking.quote_message && (
                            <p className="mt-2 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                              "{booking.quote_message}"
                            </p>
                          )}
                          {booking.quote_valid_until && (
                            <p className="mt-2 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                              Valid until: {new Date(booking.quote_valid_until).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                            </p>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="mt-6 flex flex-col sm:flex-row gap-3">
                            <button
                              onClick={() => handleAcceptQuote(booking.id)}
                              disabled={processingBooking === booking.id}
                              className="px-6 py-3 rounded font-medium text-white transition-colors disabled:opacity-50"
                              style={{ backgroundColor: '#15803d' }}
                            >
                              {processingBooking === booking.id ? 'Processing...' : '✓ Accept Quote'}
                            </button>
                            <button
                              onClick={() => setShowDeclineConfirm(booking.id)}
                              disabled={processingBooking === booking.id}
                              className="px-6 py-3 rounded font-medium transition-colors border disabled:opacity-50"
                              style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)' }}
                            >
                              Decline
                            </button>
                          </div>

                          {/* Decline Confirmation Dialog */}
                          {showDeclineConfirm === booking.id && (
                            <div className="mt-4 p-4 rounded-lg border" style={{ backgroundColor: 'rgba(181, 74, 74, 0.05)', borderColor: 'rgba(181, 74, 74, 0.2)' }}>
                              <p className="font-medium text-sm" style={{ color: 'var(--color-mdc-error)' }}>
                                Are you sure you want to decline? This will release the time slot for others to book.
                              </p>
                              <div className="mt-3 flex gap-3">
                                <button
                                  onClick={() => handleDeclineQuote(booking.id)}
                                  disabled={processingBooking === booking.id}
                                  className="px-4 py-2 rounded text-sm font-medium text-white transition-colors disabled:opacity-50"
                                  style={{ backgroundColor: 'var(--color-mdc-error)' }}
                                >
                                  Yes, Decline
                                </button>
                                <button
                                  onClick={() => setShowDeclineConfirm(null)}
                                  className="px-4 py-2 rounded text-sm font-medium transition-colors border"
                                  style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)' }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Expired Quote Message */}
                  {booking.quote_status === 'expired' && (
                    <div 
                      className="p-6 border-t"
                      style={{ 
                        backgroundColor: 'rgba(181, 74, 74, 0.05)',
                        borderColor: 'rgba(181, 74, 74, 0.2)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">⏰</span>
                        <p className="font-medium" style={{ color: 'var(--color-mdc-error)' }}>
                          This quote has expired. Please contact the chef for a new quote.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Already Processed (Accepted/Declined) */}
                  {(booking.quote_status === 'accepted' || booking.quote_status === 'declined') && (
                    <div 
                      className="p-4 border-t"
                      style={{ 
                        backgroundColor: booking.quote_status === 'accepted' ? 'rgba(22, 163, 74, 0.03)' : 'rgba(181, 74, 74, 0.03)',
                        borderColor: booking.quote_status === 'accepted' ? 'rgba(22, 163, 74, 0.1)' : 'rgba(181, 74, 74, 0.1)'
                      }}
                    >
                      <p className="text-sm" style={{ 
                        color: booking.quote_status === 'accepted' ? '#15803d' : 'var(--color-mdc-text-muted)'
                      }}>
                        {booking.quote_status === 'accepted' 
                          ? '✓ Quote accepted. Your booking is confirmed!'
                          : 'Quote was declined.'}
                      </p>
                    </div>
                  )}

                  {/* Special Requests */}
                  {booking.special_requests && (
                    <div className="p-4 border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                      <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Special Requests</p>
                      <p className="text-sm">{booking.special_requests}</p>
                    </div>
                  )}

                  {/* Book Again Button - Show for completed bookings */}
                  {(booking.status === 'completed' || booking.status === 'confirmed') && (
                    <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-mdc-border)' }}>
                      <a
                        href={`/book?chef_id=${booking.chef_id}&date=${encodeURIComponent(booking.booking_date)}&time=${encodeURIComponent(booking.start_time)}&guests=${booking.guest_count}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-colors"
                        style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Book Again
                      </a>

                      {/* Leave a Review Button - Show only if no review exists */}
                      {booking.status === 'completed' && !reviewStatuses[booking.id] && (
                        <button
                          onClick={() => setShowReviewForm(booking.id)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded font-medium text-sm transition-colors border"
                          style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                          </svg>
                          Leave a Review
                        </button>
                      )}

                      {booking.status === 'completed' && reviewStatuses[booking.id] && (
                        <span className="text-sm" style={{ color: '#15803d' }}>
                          ✓ Reviewed
                        </span>
                      )}
                    </div>
                  )}

                  {/* Review Form */}
                  {showReviewForm === booking.id && (
                    <div className="p-4 border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                      <ReviewForm
                        bookingId={booking.id}
                        chefId={booking.chef_id}
                        chefName={booking.chef_profiles?.display_name || 'Chef'}
                        onReviewSubmitted={() => {
                          setShowReviewForm(null)
                          setReviewStatuses(prev => ({ ...prev, [booking.id]: true }))
                        }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, quoteStatus }: { status: string; quoteStatus: string | null }) {
  // If there's a quote_status, use that for display
  if (quoteStatus === 'pending') {
    return (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#fef9c3', color: '#a16207' }}>
        Quote Pending
      </span>
    )
  }
  
  if (quoteStatus === 'accepted') {
    return (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#dcfce7', color: '#15803d' }}>
        Confirmed
      </span>
    )
  }

  if (quoteStatus === 'expired') {
    return (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#fef2f2', color: '#b91c1c' }}>
        Quote Expired
      </span>
    )
  }

  if (quoteStatus === 'declined') {
    return (
      <span className="inline-block px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#f3f4f6', color: '#6b7280' }}>
        Declined
      </span>
    )
  }

  // Fall back to booking status
  const statusStyles: Record<string, { bg: string; color: string }> = {
    pending: { bg: '#fef9c3', color: '#a16207' },
    confirmed: { bg: '#dcfce7', color: '#15803d' },
    completed: { bg: '#dcfce7', color: '#15803d' },
    cancelled: { bg: '#fef2f2', color: '#b91c1c' },
  }

  const style = statusStyles[status] || { bg: '#f3f4f6', color: '#6b7280' }

  return (
    <span className="inline-block px-3 py-1 rounded-full text-xs font-medium capitalize" style={{ backgroundColor: style.bg, color: style.color }}>
      {status}
    </span>
  )
}