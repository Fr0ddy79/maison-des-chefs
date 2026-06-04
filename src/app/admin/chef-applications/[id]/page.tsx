'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

interface ChefApplication {
  id: string
  name: string
  email: string
  phone: string | null
  location: string
  cuisine_types: string[]
  years_experience: number
  price_range: string | null
  bio: string | null
  preferred_contact: string
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

export default function ChefApplicationReviewPage() {
  const [application, setApplication] = useState<ChefApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()

  const applicationId = params.id as string

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
      await fetchApplication()
    }
    checkAdmin()
  }, [applicationId])

  async function fetchApplication() {
    setLoading(true)
    const { data, error: fetchError } = await supabase
      .from('chef_applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (fetchError || !data) {
      setError('Application not found')
    } else {
      setApplication(data as ChefApplication)
    }
    setLoading(false)
  }

  async function handleAction(action: 'approve' | 'reject') {
    if (!application) return
    setProcessing(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const res = await fetch(`/api/admin/chef-applications/${applicationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      const result = await res.json()

      if (!res.ok) {
        setError(result.error || `Failed to ${action} application`)
      } else {
        setSuccessMessage(
          action === 'approve'
            ? `Application approved! Chef account created for ${application.name}.`
            : `Application rejected. Rejection email sent to ${application.name}.`
        )
        // Refresh application data
        await fetchApplication()
      }
    } catch (err) {
      setError('An unexpected error occurred')
    }

    setProcessing(false)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading application...</p>
      </div>
    )
  }

  if (error && !application) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link href="/admin/chef-applications" className="text-blue-600 hover:underline">
            ← Back to Applications
          </Link>
        </div>
      </div>
    )
  }

  if (!application) return null

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
              href="/admin/chef-applications"
              className="text-sm px-4 py-2 rounded transition-colors hover:opacity-80"
              style={{ color: 'var(--color-mdc-text-muted)' }}
            >
              ← Back to Applications
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-6">
          <span
            className="inline-block px-3 py-1 rounded-full text-sm font-medium mb-3"
            style={{
              backgroundColor:
                application.status === 'pending' ? '#fef3c7' :
                application.status === 'approved' ? '#dcfce7' : '#fee2e2',
              color:
                application.status === 'pending' ? '#a16207' :
                application.status === 'approved' ? '#15803d' : '#dc2626',
            }}
          >
            {application.status.toUpperCase()}
          </span>
          <h1 className="text-3xl" style={{ fontFamily: 'var(--font-serif)' }}>{application.name}</h1>
          <p style={{ color: 'var(--color-mdc-text-muted)' }}>
            Applied {formatDate(application.created_at)}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200">
            <p className="text-green-700">{successMessage}</p>
          </div>
        )}

        {application.status !== 'pending' && (
          <div className="mb-6 p-4 rounded-lg bg-gray-50 border border-gray-200">
            <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
              {application.status === 'approved'
                ? `This application was approved on ${application.reviewed_at ? formatDate(application.reviewed_at) : 'N/A'}.`
                : `This application was rejected on ${application.reviewed_at ? formatDate(application.reviewed_at) : 'N/A'}.`}
            </p>
          </div>
        )}

        <div className="rounded-lg p-6 bg-white border shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Application Details</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Email</p>
                <p className="font-medium">{application.email}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Phone</p>
                <p className="font-medium">{application.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Location</p>
                <p className="font-medium">{application.location}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Years of Experience</p>
                <p className="font-medium">{application.years_experience} years</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Price Range</p>
                <p className="font-medium">{application.price_range || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Preferred Contact</p>
                <p className="font-medium">{application.preferred_contact}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Cuisine Types</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {application.cuisine_types?.map((cuisine) => (
                  <span
                    key={cuisine}
                    className="inline-block px-2 py-1 rounded text-xs font-medium"
                    style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)', color: 'var(--color-mdc-accent)' }}
                  >
                    {cuisine}
                  </span>
                ))}
              </div>
            </div>

            {application.bio && (
              <div>
                <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>Bio</p>
                <p className="text-sm whitespace-pre-wrap">{application.bio}</p>
              </div>
            )}
          </div>
        </div>

        {application.status === 'pending' && (
          <div className="flex gap-4">
            <button
              onClick={() => handleAction('approve')}
              disabled={processing}
              className="flex-1 px-6 py-3 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : '✓ Approve Application'}
            </button>
            <button
              onClick={() => handleAction('reject')}
              disabled={processing}
              className="flex-1 px-6 py-3 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : '✗ Reject Application'}
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link
            href="/admin/chef-applications"
            className="text-sm"
            style={{ color: 'var(--color-mdc-text-muted)' }}
          >
            ← Back to all applications
          </Link>
        </div>
      </main>
    </div>
  )
}