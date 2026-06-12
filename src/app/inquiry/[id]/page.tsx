'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { SocialShareButtons } from '@/components/SocialShareButtons'

interface InquiryDetail {
  id: string
  email: string
  message: string
  inquiry_date: string
  inquiry_time: string | null
  guest_count: number | null
  status: 'pending' | 'confirmed' | 'rejected'
  created_at: string
  chef_id: string
  service_id: string | null
  services: any
  chef_profiles: any
}

interface Booking {
  id: string
  chef_id: string
  diner_id: string
  inquiry_id: string | null
}

interface Message {
  id: string
  sender_type: 'chef' | 'diner'
  sender_id: string
  content: string
  created_at: string
}

function formatTime(time: string) {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function InquiryStatusPage() {
  const params = useParams()
  const id = params.id as string
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [booking, setBooking] = useState<Booking | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [messageInput, setMessageInput] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  // Build inquiry token for diner auth (base64 email:booking_id)
  function getInquiryToken(bookingId: string, email: string): string {
    return Buffer.from(`${email}:${bookingId}`).toString('base64')
  }

  async function fetchBooking() {
    if (!inquiry || inquiry.status !== 'confirmed') return

    // Look up booking by inquiry_id
    const { data } = await supabase
      .from('bookings')
      .select('id, chef_id, diner_id, inquiry_id')
      .eq('inquiry_id', id)
      .single()

    if (data) {
      setBooking(data)
    }
  }

  async function fetchMessages() {
    if (!booking) return

    setLoadingMessages(true)
    try {
      const token = getInquiryToken(booking.id, inquiry?.email || '')
      const res = await fetch(`/api/bookings/${booking.id}/messages`, {
        headers: { 'x-inquiry-token': token },
      })

      if (res.ok) {
        const data = await res.json()
        setMessages(data)
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err)
    }
    setLoadingMessages(false)
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!messageInput.trim() || !booking || sendingMessage) return

    setSendingMessage(true)
    try {
      const token = getInquiryToken(booking.id, inquiry?.email || '')
      const res = await fetch(`/api/bookings/${booking.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-inquiry-token': token,
        },
        body: JSON.stringify({ text: messageInput.trim() }),
      })

      if (res.ok) {
        setMessageInput('')
        await fetchMessages()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send message')
      }
    } catch (err) {
      alert('Failed to send message. Please try again.')
    }
    setSendingMessage(false)
  }

  useEffect(() => {
    async function fetchInquiry() {
      if (!id) return

      const { data, error } = await supabase
        .from('inquiries')
        .select(`
          id, email, message, inquiry_date, inquiry_time, guest_count, status, created_at, chef_id, service_id,
          services:service_id (title),
          chef_profiles:chef_id (full_name)
        `)
        .eq('id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setInquiry(data as InquiryDetail)
      setLoading(false)

      // Fetch booking if confirmed
      if ((data as InquiryDetail).status === 'confirmed') {
        const { data: bookingData } = await supabase
          .from('bookings')
          .select('id, chef_id, diner_id, inquiry_id')
          .eq('inquiry_id', id)
          .single()

        if (bookingData) {
          setBooking(bookingData as Booking)
        }
      }
    }

    fetchInquiry()
  }, [id])

  // Poll for messages every 30 seconds when booking is available
  useEffect(() => {
    if (!booking) return

    fetchMessages()
    const interval = setInterval(fetchMessages, 30000)
    return () => clearInterval(interval)
  }, [booking])

  // Scroll to bottom of messages when new ones arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading...</p>
      </div>
    )
  }

  if (notFound || !inquiry) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="text-center max-w-md mx-auto px-6">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Inquiry Not Found</h1>
          <p className="mb-6" style={{ color: 'var(--color-mdc-text-muted)' }}>
            We couldn't find an inquiry with that ID. It may have been removed or the link may be incorrect.
          </p>
          <Link href="/" className="inline-block px-6 py-2 rounded font-medium" style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}>
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const statusConfig = {
    pending: { bg: '#fef9c3', color: '#a16207', label: 'Pending' },
    confirmed: { bg: '#dcfce7', color: '#15803d', label: 'Confirmed' },
    rejected: { bg: '#fee2e2', color: '#dc2626', label: 'Rejected' },
  }

  const status = statusConfig[inquiry.status] || statusConfig.pending

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
          <h1 className="text-2xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Booking Status</h1>
          <p style={{ color: 'var(--color-mdc-text-muted)' }}>Track your reservation request</p>
        </div>

        {/* Status Card */}
        <div className="rounded-lg p-6 bg-white border shadow-sm mb-6">
          {/* Chef Name */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl" style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)', color: 'var(--color-mdc-accent)' }}>
              {(inquiry.chef_profiles?.full_name || 'C')[0]}
            </div>
            <h2 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Chef {inquiry.chef_profiles?.full_name || 'Unknown'}
            </h2>
            {inquiry.services && (
              <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-accent)' }}>
                {(inquiry.services as any)?.title}
              </p>
            )}
          </div>

          {/* Status Badge */}
          <div className="text-center mb-6">
            <span
              className="inline-block px-4 py-2 rounded-full text-sm font-medium"
              style={{ backgroundColor: status.bg, color: status.color }}
            >
              {status.label}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-4 border-t pt-6" style={{ borderColor: 'var(--color-mdc-border)' }}>
            {/* Date */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Requested Date</p>
                <p className="font-medium mt-1">
                  {new Date(inquiry.inquiry_date + 'T00:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <span style={{ color: 'var(--color-mdc-text-muted)' }}>📅</span>
              </div>
            </div>

            {/* Time */}
            {inquiry.inquiry_time && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Requested Time</p>
                  <p className="font-medium mt-1">{formatTime(inquiry.inquiry_time)}</p>
                </div>
                <div className="text-right">
                  <span style={{ color: 'var(--color-mdc-text-muted)' }}>🕐</span>
                </div>
              </div>
            )}

            {/* Guest Count */}
            {inquiry.guest_count && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Party Size</p>
                  <p className="font-medium mt-1">{inquiry.guest_count} guests</p>
                </div>
                <div className="text-right">
                  <span style={{ color: 'var(--color-mdc-text-muted)' }}>🍽️</span>
                </div>
              </div>
            )}

            {/* Submitted */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>Submitted</p>
                <p className="font-medium mt-1">
                  {new Date(inquiry.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
              </div>
              <div className="text-right">
                <span style={{ color: 'var(--color-mdc-text-muted)' }}>📨</span>
              </div>
            </div>
          </div>
        </div>

        {/* Social Share Buttons - shown when booking is confirmed */}
        {inquiry.status === 'confirmed' && (
          <div className="mt-6 rounded-lg p-6 bg-white border shadow-sm">
            <SocialShareButtons
              chefName={inquiry.chef_profiles?.full_name || 'Unknown'}
              chefId={inquiry.chef_id}
            />
          </div>
        )}

        {/* Message Thread - shown when booking is confirmed */}
        {inquiry.status === 'confirmed' && booking && (
          <div className="rounded-lg p-6 bg-white border shadow-sm mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg" style={{ fontFamily: 'var(--font-serif)' }}>Messages</h3>
              <span className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Chat directly with your chef
              </span>
            </div>

            {/* Messages */}
            <div
              className="border rounded-lg p-4 mb-4"
              style={{ borderColor: 'var(--color-mdc-border)', height: '320px', overflowY: 'auto' }}
            >
              {loadingMessages && messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <span className="text-3xl mb-2">💬</span>
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>
                    No messages yet. Say hello to your chef!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
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
                            {isChef ? 'Chef' : 'You'} · {formatMessageTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                placeholder="Type a message..."
                disabled={sendingMessage}
                className="flex-1 px-4 py-2 rounded-lg border text-sm"
                style={{ borderColor: 'var(--color-mdc-border)' }}
              />
              <button
                type="submit"
                disabled={sendingMessage || !messageInput.trim()}
                className="px-4 py-2 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
              >
                {sendingMessage ? '...' : 'Send'}
              </button>
            </form>
          </div>
        )}

        {/* Contact Chef - only show for non-confirmed inquiries */}
        {inquiry.status !== 'confirmed' && (
          <div className="text-center">
            <p className="text-sm mb-4" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Questions about your booking?
            </p>
            <a
              href={`mailto:?subject=Inquiry Status Check&body=Hi, I'm checking on my booking inquiry (ID: ${inquiry.id}). Please advise on the status.`}
              className="inline-block w-full px-6 py-3 rounded font-medium text-sm transition-colors border"
              style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)' }}
            >
              Contact Chef
            </a>
          </div>
        )}

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