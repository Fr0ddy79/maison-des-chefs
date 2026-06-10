'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ProfileCompleteness {
  score: number
  elements: {
    photo: boolean
    bio: boolean
    service: boolean
    availability: boolean
    cuisine: boolean
  }
}

interface ChefProfile {
  id: string
  display_name: string
  bio: string | null
  location: string | null
  cuisines: string[] | null
  created_at: string
  profiles: {
    full_name: string
    email: string
    avatar_url: string | null
    created_at?: string
  } | null
}

export default function AdminChefsPage() {
  const [chefs, setChefs] = useState<Array<ChefProfile & { completeness: ProfileCompleteness }>>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'incomplete'>('all')
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
      await fetchChefs()
    }
    checkAdmin()
  }, [filter])

  async function fetchChefs() {
    setLoading(true)
    
    // Fetch all approved chefs with their profiles
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, role')
      .eq('role', 'chef')

    const { data: chefProfilesData } = await supabase
      .from('chef_profiles')
      .select('*')

    // Fetch service count per chef
    const { data: servicesData } = await supabase
      .from('services')
      .select('chef_id')

    // Fetch availability count per chef
    const { data: availabilityData } = await supabase
      .from('availability')
      .select('chef_id')

    if (!profilesData || !chefProfilesData) {
      setLoading(false)
      return
    }

    // Calculate completeness for each chef
    const chefsWithCompleteness = profilesData.map(profile => {
      const chefProfile = chefProfilesData.find(cp => cp.id === profile.id)
      const chefServices = servicesData?.filter(s => s.chef_id === profile.id) || []
      const chefAvailability = availabilityData?.filter(a => a.chef_id === profile.id) || []

      const elements = {
        photo: !!(profile.avatar_url),
        bio: !!(chefProfile?.bio && chefProfile.bio.length > 0),
        service: chefServices.length > 0,
        availability: chefAvailability.length > 0,
        cuisine: !!(chefProfile?.cuisines && chefProfile.cuisines.length > 0),
      }
      const score = Math.round(
        (Object.values(elements).filter(Boolean).length / 5) * 100
      )

      const createdAt = chefProfile?.created_at || new Date().toISOString()

      return {
        id: profile.id,
        display_name: chefProfile?.display_name || profile.full_name || 'Unknown Chef',
        bio: chefProfile?.bio || null,
        location: chefProfile?.location || null,
        cuisines: chefProfile?.cuisines || null,
        created_at: createdAt,
        profiles: profile,
        completeness: { score, elements },
      }
    })

    setChefs(chefsWithCompleteness as any)
    setLoading(false)
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const filteredChefs = filter === 'incomplete'
    ? chefs.filter(c => c.completeness.score < 80)
    : chefs

  const incompleteCount = chefs.filter(c => c.completeness.score < 80).length

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
            <h1 className="text-3xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Chefs</h1>
            <p style={{ color: 'var(--color-mdc-text-muted)' }}>
              {chefs.length} approved {chefs.length === 1 ? 'chef' : 'chefs'} • {incompleteCount} with incomplete profiles
            </p>
          </div>
          <div className="flex items-center gap-3">
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
              All Chefs
            </button>
            <button
              onClick={() => setFilter('incomplete')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'incomplete'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border'
              }`}
              style={{
                borderColor: filter === 'incomplete' ? undefined : 'var(--color-mdc-border)',
                color: filter === 'incomplete' ? undefined : 'var(--color-mdc-text-muted)',
              }}
            >
              Incomplete Only {incompleteCount > 0 && `(${incompleteCount})`}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading chefs...</p>
          </div>
        ) : filteredChefs.length === 0 ? (
          <div className="rounded-lg p-12 bg-white border text-center">
            <p className="text-lg" style={{ color: 'var(--color-mdc-text-muted)' }}>
              {filter === 'incomplete'
                ? 'All chefs have complete profiles! ✓'
                : 'No chefs yet.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredChefs.map((chef) => (
              <div
                key={chef.id}
                className="rounded-lg p-6 bg-white border shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{chef.display_name}</h3>
                      <span
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: chef.completeness.score === 100 ? '#dcfce7' :
                            chef.completeness.score >= 80 ? '#dbeafe' : '#fef3c7',
                          color: chef.completeness.score === 100 ? '#15803d' :
                            chef.completeness.score >= 80 ? '#1d4ed8' : '#a16207',
                        }}
                      >
                        {chef.completeness.score}% complete
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Email</p>
                        <p className="font-medium">{chef.profiles?.email}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Location</p>
                        <p className="font-medium">{chef.location || 'Not set'}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Cuisines</p>
                        <p className="font-medium">{chef.cuisines?.join(', ') || 'None'}</p>
                      </div>
                      <div>
                        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Joined</p>
                        <p className="font-medium">{formatDate(chef.created_at)}</p>
                      </div>
                    </div>

                    {/* Profile Elements Status */}
                    <div className="mt-4 flex flex-wrap gap-3">
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${chef.completeness.elements.photo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {chef.completeness.elements.photo ? '✓' : '✗'} Photo
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${chef.completeness.elements.bio ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {chef.completeness.elements.bio ? '✓' : '✗'} Bio
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${chef.completeness.elements.cuisine ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {chef.completeness.elements.cuisine ? '✓' : '✗'} Cuisine
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${chef.completeness.elements.service ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {chef.completeness.elements.service ? '✓' : '✗'} Service
                      </div>
                      <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${chef.completeness.elements.availability ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                        {chef.completeness.elements.availability ? '✓' : '✗'} Availability
                      </div>
                    </div>
                  </div>
                  <div className="ml-6 text-right">
                    {/* Completion Progress Bar */}
                    <div className="w-24 h-2 rounded-full mb-2" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${chef.completeness.score}%`,
                          backgroundColor: chef.completeness.score === 100 ? '#15803d' :
                            chef.completeness.score >= 80 ? '#2563eb' : 'var(--color-mdc-accent)',
                        }}
                      />
                    </div>
                    <Link
                      href={`/dashboard/chef`}
                      className="inline-block px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                      View Dashboard
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