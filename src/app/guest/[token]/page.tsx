'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

interface ChefInfo {
  id: string
  display_name: string | null
  profile_image: string | null
  location: string | null
}

interface BookingDetails {
  id: string
  booking_token: string
  booking_date: string
  start_time: string | null
  end_time: string | null
  guest_count: number | null
  total_price: number | null
  status: string
  special_requests: string | null
  quote_amount: number | null
  quote_message: string | null
  quote_valid_until: string | null
  quote_status: string | null
  created_at: string
  chef: ChefInfo | null
}

function formatTime(time: string | null): string {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function GuestBookingPage() {
  const params = useParams()
  const token = params.token as string
  const [booking, setBooking] = useState<BookingDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBooking() {
      if (!token) return

      try {
        const res = await fetch(`/api/bookings/token/${token}`)
        
        if (res.status === 404) {
          setNotFound(true)
          setLoading(false)
          return
        }

        if (!res.ok) {
          setError('Failed to load booking details')
          setLoading(false)
          return
        }

        const data = await res.json()
        setBooking(data.booking)
      } catch (err) {
        console.error('Error fetching booking:', err)
        setError('Failed to load booking details')
      }
      setLoading(false)
    }

    fetchBooking()
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderColor: 'var(--color-mdc-accent)', borderTopColor: 'transparent' }} />
          <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (notFound || error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Booking Not Found</h1>
          <p className="mb-6" style={{ color: 'var(--color-mdc-text-muted)' }}>
            {notFound
              ? "We couldn't find a booking with that link. The link may have expired or been invalidated."
              : error}
          </p>
          <Link href="/" className="inline-block px-6 py-2 rounded font-medium" style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}>
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  if (!booking) return null

  const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: '#fef9c3', color: '#a16207', label: 'Pending' },
    payment_pending: { bg: '#dbeafe', color: '#1d4ed8', label: 'Payment Required' },
    confirmed: { bg: '#dcfce7', color: '#15803d', label: 'Confirmed' },
    completed: { bg: '#dbeafe', color: '#1d4ed8', label: 'Completed' },
    cancelled: { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' },
  }

  const status = statusConfig[booking.status] || { bg: '#f3f4f6', color: '#6b7280', label: booking.status }

  const quoteStatusConfig: Record<string, { bg: string; color: string; label: string }> = {
    pending: { bg: '#fef9c3', color: '#a16207', label: 'Quote Pending' },
    accepted: { bg: '#dcfce7', color: '#15803d', label: 'Quote Accepted' },
    declined: { bg: '#fee2e2', color: '#dc2626', label: 'Quote Declined' },
    expired: { bg: '#f3f4f6', color: '#6b7280', label: 'Quote Expired' },
  }

  const quoteStatus = booking.quote_status ? quoteStatusConfig[booking.quote_status] : null

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
      {/* Header */}
      <header className="bg-white border-b" style={{ borderColor: 'var(--color-mdc-border)' }}>
        <div className="max-w-xl mx-auto px-6 h-16 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Maison des Chefs</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Your Booking</h1>
          <p style={{ color: 'var(--color-mdc-text-muted)' }}>Track your reservation</p>
        </div>

        {/* Booking Card */}
        <div className="rounded-lg p-6 bg-white border shadow-sm mb-6">
          {/* Chef Name & Status */}
          <div className="text-center mb-6">
            <div
              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl overflow-hidden"
              style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)' }}
            >
              {booking.chef?.profile_image ? (
                <img
                  src={booking.chef.profile_image}
                  alt={booking.chef.display_name || 'Chef'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span style={{ color: 'var(--color-mdc-accent)' }}>
                  {(booking.chef?.display_name || 'C')[0]}
                </span>
              )}
            </div>
            <h2 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Chef {booking.chef?.display_name || 'Unknown'}
            </h2>
            {booking.chef?.location && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                {booking.chef.location}
              </p>
            )}
          </div>

          {/* Status Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            <span
              className="px-4 py-2 rounded-full text-sm font-medium"
              style={{ backgroundColor: status.bg, color: status.color }}
            >
              {status.label}
            </span>
            {quoteStatus && (
              <span
                className="px-4 py-2 rounded-full text-sm font-medium"
                style={{ backgroundColor: quoteStatus.bg, color: quoteStatus.color }}
              >
                {quoteStatus.label}
              </span>
            )}
          </div>

          {/* Booking Details */}
          <div className="space-y-4 border-t pt-6" style={{ borderColor: 'var(--color-mdc-border)' }}>
            {/* Date */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Date</p>
                <p className="font-medium mt-1">{formatDate(booking.booking_date)}</p>
              </div>
              <div className="text-right text-2xl">
                <span style={{ color: 'var(--color-mdc-text-muted)' }}>📅</span>
              </div>
            </div>

            {/* Time */}
            {booking.start_time && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Time</p>
                  <p className="font-medium mt-1">
                    {formatTime(booking.start_time)}
                    {booking.end_time && ` - ${formatTime(booking.end_time)}`}
                  </p>
                </div>
                <div className="text-right text-2xl">
                  <span style={{ color: 'var(--color-mdc-text-muted)' }}>🕐</span>
                </div>
              </div>
            )}

            {/* Guest Count */}
            {booking.guest_count && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Party Size</p>
                  <p className="font-medium mt-1">{booking.guest_count} guests</p>
                </div>
                <div className="text-right text-2xl">
                  <span style={{ color: 'var(--color-mdc-text-muted)' }}>🍽️</span>
                </div>
              </div>
            )}

            {/* Quote Amount */}
            {booking.quote_amount !== null && booking.quote_amount > 0 && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Quote Amount</p>
                  <p className="font-medium mt-1">${booking.quote_amount.toFixed(2)}</p>
                </div>
                <div className="text-right text-2xl">
                  <span style={{ color: 'var(--color-mdc-text-muted)' }}>💰</span>
                </div>
              </div>
            )}

            {/* Quote Message */}
            {booking.quote_message && (
              <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--color-mdc-border)' }}>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mdc-text-muted)' }}>Quote Message</p>
                <p className="text-sm">{booking.quote_message}</p>
                {booking.quote_valid_until && (
                  <p className="text-xs mt-2" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    Valid until: {new Date(booking.quote_valid_until).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
            )}

            {/* Payment Required Section - Show for payment_pending status */}
            {booking.status === 'payment_pending' && booking.quote_status === 'accepted' && (
              <div 
                className="border-t pt-4 mt-4 rounded-lg p-4"
                style={{ 
                  backgroundColor: 'rgba(59, 130, 246, 0.05)',
                  borderColor: 'rgba(59, 130, 246, 0.2)'
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: '#3b82f6', color: 'white' }}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium" style={{ color: '#1d4ed8' }}>
                      Payment Required
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Your booking is awaiting payment. Please complete the payment to confirm your reservation.
                    </p>
                    {booking.quote_amount && (
                      <p className="text-lg font-semibold mt-2" style={{ color: 'var(--color-mdc-accent)' }}>
                        Amount: ${booking.quote_amount.toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Special Requests */}
            {booking.special_requests && (
              <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--color-mdc-border)' }}>
                <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--color-mdc-text-muted)' }}>Special Requests</p>
                <p className="text-sm">{booking.special_requests}</p>
              </div>
            )}

            {/* Booking Reference */}
            <div className="border-t pt-4 mt-4" style={{ borderColor: 'var(--color-mdc-border)' }}>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Booking Reference</p>
              <p className="text-xs font-mono" style={{ color: 'var(--color-mdc-text-muted)' }}>{booking.id}</p>
            </div>
          </div>
        </div>

        {/* Create Account CTA */}
        <div
          className="rounded-lg p-6 border text-center"
          style={{ borderColor: 'var(--color-mdc-border)', backgroundColor: 'rgba(201, 168, 76, 0.04)' }}
        >
          <h3 className="text-lg mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Create an account to manage this booking</h3>
          <p className="text-sm mb-4" style={{ color: 'var(--color-mdc-text-muted)' }}>
            Sign up to message your chef, view your booking history, and get exclusive offers.
          </p>
          <Link
            href="/signup"
            className="inline-block px-6 py-3 rounded font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
          >
            Create Account
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center">
          <Link href="/" className="text-sm hover:underline" style={{ color: 'var(--color-mdc-accent)' }}>
            ← Back to Maison des Chefs
          </Link>
        </div>
      </main>
    </div>
  )
}