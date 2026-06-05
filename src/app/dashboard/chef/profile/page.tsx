'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface ChefProfile {
  id: string
  display_name: string
  bio: string
  location: string
  cuisines: string[]
  years_experience: number
  price_per_hour: number
  price_per_event: number
  max_guests: number
  hero_image_url: string
  profile_image_url: string
}

const CUISINE_OPTIONS = [
  'French', 'Italian', 'Japanese', 'Mexican', 'Indian', 'Chinese',
  'Thai', 'Mediterranean', 'American', 'Spanish', 'Greek', 'Korean',
  'Vietnamese', 'Middle Eastern', 'Peruvian', 'Brazilian', 'Other'
]

export default function ChefProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const router = useRouter()
      const supabase = createClient() as any

  const [form, setForm] = useState<Partial<ChefProfile>>({
    display_name: '',
    bio: '',
    location: '',
    cuisines: [],
    years_experience: 0,
    price_per_hour: 0,
    price_per_event: 0,
    max_guests: 8,
    hero_image_url: '',
    profile_image_url: '',
  })

  useEffect(() => {
    async function loadProfile() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .select('role, full_name, email, avatar_url')
        .from('profiles')
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

      if (chef) {
        setForm({
          display_name: chef.display_name || '',
          bio: chef.bio || '',
          location: chef.location || '',
          cuisines: chef.cuisines || [],
          years_experience: chef.years_experience || 0,
          price_per_hour: chef.price_per_hour || 0,
          price_per_event: chef.price_per_event || 0,
          max_guests: chef.max_guests || 8,
          hero_image_url: chef.hero_image_url || '',
          profile_image_url: chef.profile_image_url || '',
        })
      }

      setLoading(false)
    }
    loadProfile()
  }, [])

  function handleCuisineToggle(cuisine: string) {
    setForm(prev => ({
      ...prev,
      cuisines: prev.cuisines?.includes(cuisine)
        ? prev.cuisines.filter(c => c !== cuisine)
        : [...(prev.cuisines || []), cuisine]
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user?.id || saving) return

    setSaving(true)
    setToast(null)

    const { error } = await supabase
      .from('chef_profiles')
      .update({
        display_name: form.display_name,
        bio: form.bio,
        location: form.location,
        cuisines: form.cuisines,
        years_experience: form.years_experience,
        price_per_hour: form.price_per_hour,
        price_per_event: form.price_per_event,
        max_guests: form.max_guests,
        hero_image_url: form.hero_image_url,
        profile_image_url: form.profile_image_url,
      })
      .eq('id', user.id)

    if (error) {
      setToast({ type: 'error', message: 'Failed to save profile. Please try again.' })
    } else {
      setToast({ type: 'success', message: 'Profile updated successfully!' })
      setTimeout(() => setToast(null), 3000)
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading profile...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--color-mdc-border)' }}>
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard/chef" className="flex items-center gap-2">
            <span style={{ color: 'var(--color-mdc-text-muted)' }}>← Back</span>
          </Link>
          <span className="font-serif text-lg font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Edit Profile</span>
          <div className="w-16" />
        </div>
      </header>

      <div className="flex-1" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-3xl mx-auto px-6 py-8">
          {/* Toast */}
          {toast && (
            <div
              className="mb-6 px-4 py-3 rounded-lg text-sm font-medium"
              style={{
                backgroundColor: toast.type === 'success' ? '#dcfce7' : '#fee2e2',
                color: toast.type === 'success' ? '#15803d' : '#dc2626',
              }}
            >
              {toast.message}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Profile Image URL */}
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <h2 className="text-lg mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Profile Photos</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Profile Image URL
                    </label>
                    <input
                      type="url"
                      value={form.profile_image_url || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, profile_image_url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    />
                    {form.profile_image_url && (
                      <div className="mt-2">
                        <img
                          src={form.profile_image_url}
                          alt="Profile preview"
                          className="w-20 h-20 rounded-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Hero Image URL
                    </label>
                    <input
                      type="url"
                      value={form.hero_image_url || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, hero_image_url: e.target.value }))}
                      placeholder="https://..."
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    />
                    {form.hero_image_url && (
                      <div className="mt-2">
                        <img
                          src={form.hero_image_url}
                          alt="Hero preview"
                          className="w-full h-32 rounded-lg object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Basic Info */}
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <h2 className="text-lg mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Basic Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Display Name *
                    </label>
                    <input
                      type="text"
                      value={form.display_name || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, display_name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Location
                    </label>
                    <input
                      type="text"
                      value={form.location || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="e.g. New York, NY"
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Bio
                    </label>
                    <textarea
                      value={form.bio || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Tell diners about yourself, your culinary background, and what makes your cooking unique..."
                      rows={5}
                      className="w-full px-3 py-2 rounded border text-sm resize-none"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Cuisine Types */}
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <h2 className="text-lg mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Cuisine Types</h2>
                <div className="flex flex-wrap gap-2">
                  {CUISINE_OPTIONS.map((cuisine) => (
                    <button
                      key={cuisine}
                      type="button"
                      onClick={() => handleCuisineToggle(cuisine)}
                      className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: form.cuisines?.includes(cuisine)
                          ? 'var(--color-mdc-accent)'
                          : 'var(--color-mdc-bg)',
                        color: form.cuisines?.includes(cuisine)
                          ? 'white'
                          : 'var(--color-mdc-text-muted)',
                        border: `1px solid ${form.cuisines?.includes(cuisine)
                          ? 'var(--color-mdc-accent)'
                          : 'var(--color-mdc-border)'}`,
                      }}
                    >
                      {cuisine}
                    </button>
                  ))}
                </div>
              </div>

              {/* Experience & Pricing */}
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <h2 className="text-lg mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Experience & Pricing</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      value={form.years_experience || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, years_experience: parseInt(e.target.value) || 0 }))}
                      min="0"
                      max="50"
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Max Guests
                    </label>
                    <input
                      type="number"
                      value={form.max_guests || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, max_guests: parseInt(e.target.value) || 8 }))}
                      min="1"
                      max="100"
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Price Per Hour ($)
                    </label>
                    <input
                      type="number"
                      value={form.price_per_hour || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, price_per_hour: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Price Per Event ($)
                    </label>
                    <input
                      type="number"
                      value={form.price_per_event || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, price_per_event: parseFloat(e.target.value) || 0 }))}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="w-full px-3 py-2 rounded border text-sm"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded font-medium text-sm transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href="/dashboard/chef"
                className="px-6 py-2.5 rounded font-medium text-sm transition-colors border"
                style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)' }}
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}