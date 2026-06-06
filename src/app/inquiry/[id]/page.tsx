'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'
import Link from 'next/link'

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

function formatTime(time: string) {
  if (!time) return ''
  const [hours, minutes] = time.split(':')
  const h = parseInt(hours)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${minutes} ${ampm}`
}

export default function InquiryStatusPage() {
  const params = useParams()
  const id = params.id as string
  const [inquiry, setInquiry] = useState<InquiryDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const supabase = createClient()

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
    }

    fetchInquiry()
  }, [id])

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

        {/* Contact Chef */}
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