'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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

export default function ChefApplicationsPage() {
  const [applications, setApplications] = useState<ChefApplication[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [filter, setFilter] = useState<'pending' | 'all'>('pending')
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
      await fetchApplications()
    }
    checkAdmin()
  }, [filter])

  async function fetchApplications() {
    setLoading(true)
    const { data, error } = await supabase
      .from('chef_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      const allApps = data as ChefApplication[]
      if (filter === 'pending') {
        setApplications(allApps.filter(a => a.status === 'pending'))
        setPendingCount(allApps.filter(a => a.status === 'pending').length)
      } else {
        setApplications(allApps)
        setPendingCount(allApps.filter(a => a.status === 'pending').length)
      }
    }
    setLoading(false)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Chef Applications</h1>
            <p style={{ color: 'var(--color-mdc-text-muted)' }}>
              {pendingCount} pending {pendingCount === 1 ? 'application' : 'applications'} awaiting review
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'pending'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border'
              }`}
              style={{
                borderColor: filter === 'pending' ? undefined : 'var(--color-mdc-border)',
                color: filter === 'pending' ? undefined : 'var(--color-mdc-text-muted)',
              }}
            >
              Pending
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border'
              }`}
              style={{
                borderColor: filter === 'all' ? undefined : 'var(--color-mdc-border)',
                color: filter === 'all' ? undefined : 'var(--color-mdc-text-muted)',
              }}
            >
              All
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="rounded-lg p-12 bg-white border text-center">
            <p className="text-lg" style={{ color: 'var(--color-mdc-text-muted)' }}>
              {filter === 'pending'
                ? 'No pending applications. Check back later!'
                : 'No applications yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((application) => (
              <div
                key={application.id}
                className="rounded-lg p-6 bg-white border shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{application.name}</h3>
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor:
                            application.status === 'pending' ? '#fef3c7' :
                            application.status === 'approved' ? '#dcfce7' : '#fee2e2',
                          color:
                            application.status === 'pending' ? '#a16207' :
                            application.status === 'approved' ? '#15803d' : '#dc2626',
                        }}
                      >
                        {application.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Email</p>
                        <p className="font-medium">{application.email}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Location</p>
                        <p className="font-medium">{application.location}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Experience</p>
                        <p className="font-medium">{application.years_experience} years</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Cuisines</p>
                        <p className="font-medium">{application.cuisine_types?.join(', ') || 'N/A'}</p>
                      </div>
                    </div>
                    {application.bio && (
                      <p className="mt-3 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        {application.bio.length > 200 ? application.bio.substring(0, 200) + '...' : application.bio}
                      </p>
                    )}
                    <p className="mt-3 text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Submitted {formatDate(application.created_at)}
                    </p>
                  </div>
                  <div className="ml-6">
                    <Link
                      href={`/admin/chef-applications/${application.id}`}
                      className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      Review
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}