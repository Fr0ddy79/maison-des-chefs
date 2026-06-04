'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Service {
  id: string
  chef_id: string
  title: string
  description: string | null
  cuisine_type: string | null
  duration_hours: number | null
  price_per_person: number | null
  max_guests: number
  is_active: boolean
  created_at: string
}

interface ServiceForm {
  title: string
  description: string
  cuisine_type: string
  duration_hours: string
  price_per_person: string
  max_guests: string
}

const CUISINE_OPTIONS = [
  'French',
  'Italian',
  'Japanese',
  'Mediterranean',
  'Mexican',
  'Asian Fusion',
  'Contemporary',
  'Southern',
  'Indian',
  'Thai',
  'Spanish',
  'Greek',
  'Middle Eastern',
  'American',
  'Other',
]

const EMPTY_FORM: ServiceForm = {
  title: '',
  description: '',
  cuisine_type: '',
  duration_hours: '',
  price_per_person: '',
  max_guests: '8',
}

export default function ChefServicesPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [services, setServices] = useState<Service[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [form, setForm] = useState<ServiceForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
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
      await fetchServices()
      setLoading(false)
    }
    checkChef()
  }, [])

  async function fetchServices() {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const res = await fetch('/api/chef/services')
    if (res.ok) {
      const data = await res.json()
      setServices(data.services || [])
    }
  }

  function openAddForm() {
    setEditingService(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEditForm(service: Service) {
    setEditingService(service)
    setForm({
      title: service.title || '',
      description: service.description || '',
      cuisine_type: service.cuisine_type || '',
      duration_hours: service.duration_hours?.toString() || '',
      price_per_person: service.price_per_person?.toString() || '',
      max_guests: service.max_guests?.toString() || '8',
    })
    setFormError(null)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditingService(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (saving) return
    setFormError(null)

    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      cuisine_type: form.cuisine_type || null,
      duration_hours: form.duration_hours ? parseFloat(form.duration_hours) : null,
      price_per_person: form.price_per_person ? parseFloat(form.price_per_person) : null,
      max_guests: form.max_guests ? parseInt(form.max_guests) : 8,
    }

    setSaving(true)

    try {
      const url = editingService
        ? `/api/chef/services/${editingService.id}`
        : '/api/chef/services'
      const method = editingService ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setFormError(data.error || (data.details ? data.details.join(', ') : 'Failed to save service'))
        return
      }

      await fetchServices()
      closeForm()
    } catch {
      setFormError('Something went wrong. Please try again.')
    }
    setSaving(false)
  }

  async function handleDelete(serviceId: string) {
    if (!confirm('Deactivate this service? Diners will no longer see it, but existing bookings are unaffected.')) return
    setDeletingId(serviceId)

    try {
      const res = await fetch(`/api/chef/services/${serviceId}`, { method: 'DELETE' })
      if (res.ok) {
        await fetchServices()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to deactivate service')
      }
    } catch {
      alert('Something went wrong.')
    }
    setDeletingId(null)
  }

  async function handleToggleActive(service: Service) {
    setTogglingId(service.id)
    try {
      const res = await fetch(`/api/chef/services/${service.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !service.is_active }),
      })
      if (res.ok) {
        await fetchServices()
      }
    } catch {
      alert('Failed to update service status')
    }
    setTogglingId(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b" style={{ borderColor: 'var(--color-mdc-border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard/chef" className="flex items-center gap-2">
            <span className="font-serif text-xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Maison des Chefs</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard/chef" className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
              ← Back to Dashboard
            </Link>
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
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl" style={{ fontFamily: 'var(--font-serif)' }}>My Services</h1>
              <p className="mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Create and manage the dining experiences you offer.
              </p>
            </div>
            <button
              onClick={openAddForm}
              className="px-5 py-2.5 rounded font-medium text-sm transition-colors"
              style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
            >
              + Add Service
            </button>
          </div>

          {/* Service List */}
          {services.length === 0 ? (
            <div className="rounded-lg p-12 text-center bg-white border shadow-sm">
              <div className="text-5xl mb-4">🍽️</div>
              <h3 className="text-xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>No services yet</h3>
              <p className="mb-6" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Create your first service to start receiving booking requests from diners.
              </p>
              <button
                onClick={openAddForm}
                className="px-5 py-2.5 rounded font-medium text-sm transition-colors"
                style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
              >
                Create Your First Service
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="rounded-lg p-6 bg-white border shadow-sm"
                  style={{
                    borderColor: service.is_active
                      ? 'var(--color-mdc-border)'
                      : 'rgba(181, 74, 74, 0.3)',
                    opacity: service.is_active ? 1 : 0.7,
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>
                          {service.title}
                        </h3>
                        <span
                          className="inline-block px-3 py-0.5 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: service.is_active ? '#dcfce7' : '#fee2e2',
                            color: service.is_active ? '#15803d' : 'var(--color-mdc-error)',
                          }}
                        >
                          {service.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      {service.description && (
                        <p className="text-sm mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                          {service.description}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        {service.cuisine_type && (
                          <span className="flex items-center gap-1">
                            <span>🍽️</span> {service.cuisine_type}
                          </span>
                        )}
                        {service.duration_hours && (
                          <span className="flex items-center gap-1">
                            <span>⏱️</span> {service.duration_hours}h
                          </span>
                        )}
                        {service.price_per_person !== null && (
                          <span className="flex items-center gap-1">
                            <span>💰</span> ${service.price_per_person}/person
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <span>👥</span> Up to {service.max_guests} guests
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggleActive(service)}
                        disabled={togglingId === service.id}
                        className="text-sm px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                        style={{
                          backgroundColor: service.is_active ? 'rgba(181, 74, 74, 0.08)' : 'rgba(61, 122, 90, 0.08)',
                          color: service.is_active ? 'var(--color-mdc-error)' : '#15803d',
                        }}
                      >
                        {togglingId === service.id ? '...' : service.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => openEditForm(service)}
                        className="text-sm px-3 py-1.5 rounded transition-colors border"
                        style={{
                          borderColor: 'var(--color-mdc-border)',
                          color: 'var(--color-mdc-text-muted)',
                        }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        disabled={deletingId === service.id}
                        className="text-sm px-3 py-1.5 rounded transition-colors disabled:opacity-50"
                        style={{ color: 'var(--color-mdc-error)' }}
                      >
                        {deletingId === service.id ? '...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Service Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={closeForm}>
          <div className="bg-white rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl" style={{ fontFamily: 'var(--font-serif)' }}>
                  {editingService ? 'Edit Service' : 'Add New Service'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                  {editingService ? 'Update your service details below.' : 'Create a new dining experience for diners.'}
                </p>
              </div>
              <button onClick={closeForm} className="text-2xl" style={{ color: 'var(--color-mdc-text-muted)' }}>×</button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded text-sm" style={{ backgroundColor: 'rgba(181, 74, 74, 0.08)', color: 'var(--color-mdc-error)' }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text)' }}>
                  Service Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g., French Mediterranean Dinner Party"
                  required
                  minLength={2}
                  maxLength={100}
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{ borderColor: 'var(--color-mdc-border)' }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text)' }}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the dining experience, menu highlights, what's included..."
                  rows={4}
                  maxLength={1000}
                  className="w-full px-3 py-2 rounded border text-sm resize-none"
                  style={{ borderColor: 'var(--color-mdc-border)' }}
                />
              </div>

              {/* Cuisine Type */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text)' }}>
                  Cuisine Type
                </label>
                <select
                  value={form.cuisine_type}
                  onChange={(e) => setForm({ ...form, cuisine_type: e.target.value })}
                  className="w-full px-3 py-2 rounded border text-sm"
                  style={{ borderColor: 'var(--color-mdc-border)' }}
                >
                  <option value="">Select cuisine type</option>
                  {CUISINE_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Duration + Max Guests */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text)' }}>
                    Duration (hours)
                  </label>
                  <input
                    type="number"
                    value={form.duration_hours}
                    onChange={(e) => setForm({ ...form, duration_hours: e.target.value })}
                    placeholder="e.g., 2.5"
                    min="0.5"
                    max="24"
                    step="0.5"
                    className="w-full px-3 py-2 rounded border text-sm"
                    style={{ borderColor: 'var(--color-mdc-border)' }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text)' }}>
                    Max Guests
                  </label>
                  <input
                    type="number"
                    value={form.max_guests}
                    onChange={(e) => setForm({ ...form, max_guests: e.target.value })}
                    placeholder="8"
                    min="1"
                    max="100"
                    className="w-full px-3 py-2 rounded border text-sm"
                    style={{ borderColor: 'var(--color-mdc-border)' }}
                  />
                </div>
              </div>

              {/* Price Per Person */}
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-mdc-text)' }}>
                  Price Per Person ($)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-mdc-text-muted)' }}>$</span>
                  <input
                    type="number"
                    value={form.price_per_person}
                    onChange={(e) => setForm({ ...form, price_per_person: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full pl-7 pr-3 py-2 rounded border text-sm"
                    style={{ borderColor: 'var(--color-mdc-border)' }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 text-sm px-4 py-2 rounded font-medium transition-colors disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
                >
                  {saving ? 'Saving...' : editingService ? 'Save Changes' : 'Create Service'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
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
    </div>
  )
}
