'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { trackBookingFormViewed, trackBookingFormSubmitted } from '@/lib/analytics'
import { useABVariant } from '@/lib/useABVariant'
import { createClient } from '@/lib/supabase/client'

const STANDARD_STEPS = ['Select Chef', 'Choose Date & Time', 'Guest Details', 'Confirm']
const SIMPLIFIED_STEPS = ['Select Chef & Schedule', 'Guest Details', 'Confirm']

type ChefProfile = {
  id: string
  display_name: string | null
  bio: string | null
  location: string | null
  cuisines: string[]
  years_experience: number | null
  is_verified: boolean
  avg_rating: number
  review_count: number
  price_per_hour: number | null
  price_per_event: number | null
  max_guests: number
  hero_image_url: string | null
}

export function BookPageContent() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    chefId: '',
    date: '',
    time: '',
    guestCount: 2,
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
  })
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'conflict' | 'error'>('idle')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [chefs, setChefs] = useState<ChefProfile[]>([])
  const [chefsLoading, setChefsLoading] = useState(true)
  const searchParams = useSearchParams()

  // URL param override for forced variant testing (?variant=simplified)
  const urlVariant = searchParams.get('variant') === 'simplified' ? 'simplified' : null

  // Use A/B variant hook for traffic splitting
  const formVariant = useABVariant(urlVariant)

  // Determine which steps to show based on variant
  const steps = formVariant === 'simplified' ? SIMPLIFIED_STEPS : STANDARD_STEPS

  // Fetch real chefs from Supabase
  useEffect(() => {
    async function fetchChefs() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('chef_profiles')
        .select('*')
        .eq('is_verified', true)
        .order('avg_rating', { ascending: false })

      if (error) {
        console.error('Error fetching chefs:', error)
        setChefsLoading(false)
        return
      }

      setChefs(data || [])
      setChefsLoading(false)

      // Pre-select chef if ?chef_id= URL param present
      const urlChefId = searchParams.get('chef_id')
      if (urlChefId && data?.some(c => c.id === urlChefId)) {
        setFormData(prev => ({ ...prev, chefId: urlChefId }))
      }
    }
    fetchChefs()
  }, [searchParams])

  // Track booking form viewed on mount (step 0)
  useEffect(() => {
    const chefId = searchParams.get('chef_id') || formData.chefId || 'unknown'
    trackBookingFormViewed({
      chef_id: chefId,
      service_id: 'unknown', // TODO: extract service_id if needed
      form_variant: formVariant,
      referrer: document.referrer,
    })
  }, [formVariant, searchParams, formData.chefId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitState === 'loading') return

    setSubmitState('loading')
    setSubmitError(null)

    const chefId = searchParams.get('chef_id') || formData.chefId || 'unknown'

    // Track analytics
    trackBookingFormSubmitted({
      chef_id: chefId,
      service_id: 'unknown', // TODO: extract service_id if needed
      form_variant: formVariant,
      lead_id: null, // TODO: set after lead creation
      guest_count: formData.guestCount,
      event_date: formData.date,
    })

    // Build inquiry payload — combine date and time into inquiry_date (YYYY-MM-DD)
    const inquiryPayload = {
      chef_id: formData.chefId,
      email: formData.email,
      message: formData.specialRequests || '',
      inquiry_date: formData.date, // YYYY-MM-DD from date picker
      guest_count: formData.guestCount,
      inquiry_time: formData.time, // HH:MM from time picker
    }

    try {
      const response = await fetch('/api/inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inquiryPayload),
      })

      if (response.ok) {
        setSubmitState('success')
      } else if (response.status === 409) {
        const data = await response.json()
        setSubmitState('conflict')
        setSubmitError(data.error || 'Chef is not available on the selected date.')
      } else {
        const data = await response.json()
        setSubmitState('error')
        setSubmitError(data.error || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      setSubmitState('error')
      setSubmitError('Network error. Please check your connection and try again.')
    }
  }

  // Standard variant uses 4 steps, simplified combines first 2
  const isSimplified = formVariant === 'simplified'
  const stepOffset = isSimplified && currentStep >= 1 ? 1 : 0

  // Step mapping for simplified variant
  // Simplified: 0 = Chef+Schedule, 1 = Guest Details, 2 = Confirm
  // Standard:   0 = Chef, 1 = Date/Time, 2 = Guest Details, 3 = Confirm
  const standardStep = isSimplified
    ? currentStep === 0 ? 0 : currentStep === 1 ? 1 : 2
    : currentStep

  // Helper to get chef display name from ID
  const getChefName = (chefId: string) => {
    const chef = chefs.find(c => c.id === chefId)
    return chef?.display_name || 'Unknown Chef'
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <div className="flex-1" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* Variant badge (for testing visibility) */}
          <div className="mb-4 text-xs uppercase tracking-wider" style={{ color: 'var(--color-mdc-text-muted)' }}>
            Form Variant: <span className="font-mono">{formVariant}</span>
          </div>

          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: index <= currentStep ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)',
                        color: index <= currentStep ? 'white' : 'var(--color-mdc-text-muted)',
                      }}
                    >
                      {index < currentStep ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className="text-xs mt-2"
                      style={{ color: index <= currentStep ? 'var(--color-mdc-text)' : 'var(--color-mdc-text-muted)' }}
                    >
                      {step}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className="w-16 h-0.5 mx-2 mt-[-20px]"
                      style={{ backgroundColor: index < currentStep ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="rounded-lg p-8 bg-white border shadow-sm">

            {/* STEP 0: Chef Selection (or Chef + Schedule for simplified) */}
            {currentStep === 0 && (
              <div>
                <h2 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>
                  {isSimplified ? 'Select Chef & Schedule' : 'Select Your Chef'}
                </h2>
                <p className="mb-6" style={{ color: 'var(--color-mdc-text-muted)' }}>
                  {isSimplified
                    ? 'Choose your chef and preferred date/time in one step.'
                    : 'Choose from our verified Montreal private chefs. Each has been vetted for quality and professionalism.'}
                </p>

                {/* Chef selection grid */}
                {chefsLoading ? (
                  <div className="text-center py-8" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    Loading chefs...
                  </div>
                ) : chefs.length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    No verified chefs available at this time.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                    {chefs.map((chef) => (
                      <button
                        key={chef.id}
                        onClick={() => setFormData({ ...formData, chefId: chef.id })}
                        className="p-4 rounded border text-left transition-colors"
                        style={{
                          borderColor: formData.chefId === chef.id ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)',
                          backgroundColor: formData.chefId === chef.id ? 'rgba(201, 168, 76, 0.05)' : 'transparent',
                        }}
                      >
                        <p className="font-medium">{chef.display_name || 'Chef'}</p>
                        <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>{chef.cuisines?.join(', ')}</p>
                        <p className="text-sm mt-2">From ${chef.price_per_event || '—'} / event</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Date/Time/Guests only shown on simplified step 0 */}
                {isSimplified && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Preferred Date</label>
                      <input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-4 py-3 rounded border bg-white"
                        style={{ borderColor: 'var(--color-mdc-border)' }}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Preferred Time</label>
                      <select
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full px-4 py-3 rounded border bg-white"
                        style={{ borderColor: 'var(--color-mdc-border)' }}
                      >
                        <option value="">Select a time</option>
                        <option value="17:00">5:00 PM</option>
                        <option value="17:30">5:30 PM</option>
                        <option value="18:00">6:00 PM</option>
                        <option value="18:30">6:30 PM</option>
                        <option value="19:00">7:00 PM</option>
                        <option value="19:30">7:30 PM</option>
                        <option value="20:00">8:00 PM</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Guests</label>
                      <select
                        value={formData.guestCount}
                        onChange={(e) => setFormData({ ...formData, guestCount: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded border bg-white"
                        style={{ borderColor: 'var(--color-mdc-border)' }}
                      >
                        {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => (
                          <option key={n} value={n}>{n} guests</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="mt-8">
                  <button
                    onClick={() => setCurrentStep(isSimplified ? 1 : 1)}
                    disabled={!formData.chefId || (isSimplified && (!formData.date || !formData.time))}
                    className="px-6 py-3 rounded font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-mdc-accent)' }}
                  >
                    {isSimplified ? 'Continue to Guest Details' : 'Continue'}
                  </button>
                  {!isSimplified && (
                    <span className="ml-4 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Step {currentStep + 1} of {steps.length}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* STEP 1: Date & Time (standard only) or Guest Details (simplified) */}
            {currentStep === 1 && !isSimplified && (
              <div>
                <h2 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Choose Date & Time</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Preferred Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 rounded border bg-white"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Preferred Time</label>
                    <select
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-3 rounded border bg-white"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    >
                      <option value="">Select a time</option>
                      <option value="17:00">5:00 PM</option>
                      <option value="17:30">5:30 PM</option>
                      <option value="18:00">6:00 PM</option>
                      <option value="18:30">6:30 PM</option>
                      <option value="19:00">7:00 PM</option>
                      <option value="19:30">7:30 PM</option>
                      <option value="20:00">8:00 PM</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="text-sm font-medium block mb-1.5">Number of Guests</label>
                  <select
                    value={formData.guestCount}
                    onChange={(e) => setFormData({ ...formData, guestCount: Number(e.target.value) })}
                    className="w-full max-w-[200px] px-4 py-3 rounded border bg-white"
                    style={{ borderColor: 'var(--color-mdc-border)' }}
                  >
                    {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => (
                      <option key={n} value={n}>{n} guests</option>
                    ))}
                  </select>
                </div>
                <div className="mt-8 flex gap-4">
                  <button onClick={() => setCurrentStep(0)} className="px-6 py-3 rounded font-medium transition-colors border" style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}>Back</button>
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!formData.date || !formData.time}
                    className="px-6 py-3 rounded font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-mdc-accent)' }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* STEP 1 (simplified) / STEP 2 (standard): Guest Details */}
            {((!isSimplified && currentStep === 2) || (isSimplified && currentStep === 1)) && (
              <div>
                <h2 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Your Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded border bg-white"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded border bg-white"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded border bg-white"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                      placeholder="(514) 555-0123"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Special Requests (optional)</label>
                    <textarea
                      value={formData.specialRequests}
                      onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                      className="w-full min-h-[100px] px-4 py-3 rounded border bg-white resize-none"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                      placeholder="Dietary restrictions, allergies, celebration notes..."
                    />
                  </div>
                </div>
                <div className="mt-8 flex gap-4">
                  <button onClick={() => setCurrentStep(isSimplified ? 0 : 1)} className="px-6 py-3 rounded font-medium transition-colors border" style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}>Back</button>
                  <button
                    onClick={() => setCurrentStep(isSimplified ? 2 : 3)}
                    disabled={!formData.name || !formData.email || !formData.phone}
                    className="px-6 py-3 rounded font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-mdc-accent)' }}
                  >
                    Review Booking
                  </button>
                </div>
              </div>
            )}

            {/* Confirm step - shared with offset logic */}
            {(isSimplified ? currentStep === 2 : currentStep === 3) && (
              <div>
                <h2 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Confirm Your Booking</h2>
                <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>Chef</span>
                      <span className="font-medium">
                        {getChefName(formData.chefId)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>Date</span>
                      <span className="font-medium">{formData.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>Time</span>
                      <span className="font-medium">{formData.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>Guests</span>
                      <span className="font-medium">{formData.guestCount}</span>
                    </div>
                    <div className="border-t pt-4 flex justify-between" style={{ borderColor: 'var(--color-mdc-border)' }}>
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>Contact</span>
                      <span className="font-medium">{formData.name} ({formData.email})</span>
                    </div>
                    {formData.specialRequests && (
                      <div className="border-t pt-4" style={{ borderColor: 'var(--color-mdc-border)' }}>
                        <span style={{ color: 'var(--color-mdc-text-muted)' }}>Special Requests</span>
                        <p className="mt-1 text-sm">{formData.specialRequests}</p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-6 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                  This is a booking request. The chef will confirm availability within 24-48 hours.
                  No payment is required at this stage.
                </p>
                <div className="mt-8 flex gap-4">
                  <button onClick={() => setCurrentStep(isSimplified ? 1 : 2)} className="px-6 py-3 rounded font-medium transition-colors border" style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}>Back</button>
                  <button
                    onClick={handleSubmit}
                    disabled={submitState === 'loading'}
                    className="px-6 py-3 rounded font-medium text-white transition-colors disabled:opacity-60"
                    style={{ backgroundColor: submitState === 'loading' ? 'var(--color-mdc-text-muted)' : 'var(--color-mdc-accent)' }}
                  >
                    {submitState === 'loading' ? 'Submitting...' : 'Submit Booking Request'}
                  </button>
                </div>

                {/* Success state */}
                {submitState === 'success' && (
                  <div className="mt-6">
                    {/* Confirmation header */}
                    <div className="text-center p-6 rounded-lg border-2" style={{ borderColor: 'var(--color-mdc-accent)', backgroundColor: 'rgba(201, 168, 76, 0.05)' }}>
                      <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <h3 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>Booking Request Sent!</h3>
                      <p className="mt-2 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        Confirmation sent to <strong>{formData.email}</strong>
                      </p>
                    </div>

                    {/* What happens next */}
                    <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <svg className="w-5 h-5" style={{ color: 'var(--color-mdc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        What Happens Next
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}>1</span>
                          <div>
                            <p className="font-medium">Chef reviews your request</p>
                            <p style={{ color: 'var(--color-mdc-text-muted)' }}>Usually within 24 hours</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}>2</span>
                          <div>
                            <p className="font-medium">You'll receive a confirmation email</p>
                            <p style={{ color: 'var(--color-mdc-text-muted)' }}>With all the details and next steps</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-3">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}>3</span>
                          <div>
                            <p className="font-medium">Your chef will coordinate the menu</p>
                            <p style={{ color: 'var(--color-mdc-text-muted)' }}>They may reach out for dietary preferences</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Booking Summary Card */}
                    <div className="mt-4 p-4 rounded-lg border" style={{ borderColor: 'var(--color-mdc-border)' }}>
                      <h4 className="font-medium mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>Booking Summary</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p style={{ color: 'var(--color-mdc-text-muted)' }}>Chef</p>
                          <p className="font-medium">{getChefName(formData.chefId)}</p>
                        </div>
                        <div>
                          <p style={{ color: 'var(--color-mdc-text-muted)' }}>Date</p>
                          <p className="font-medium">{formData.date}</p>
                        </div>
                        <div>
                          <p style={{ color: 'var(--color-mdc-text-muted)' }}>Time</p>
                          <p className="font-medium">{formData.time}</p>
                        </div>
                        <div>
                          <p style={{ color: 'var(--color-mdc-text-muted)' }}>Guests</p>
                          <p className="font-medium">{formData.guestCount}</p>
                        </div>
                      </div>
                    </div>

                    {/* Trust signals */}
                    <div className="mt-4 flex flex-wrap gap-4 text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Verified chefs
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        No payment now
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Email confirmation sent
                      </div>
                    </div>

                    {/* Next steps */}
                    <div className="mt-6 flex flex-wrap gap-3">
                      <a
                        href="/chefs"
                        className="px-5 py-2.5 rounded font-medium text-sm transition-colors hover:opacity-90"
                        style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
                      >
                        Browse More Chefs
                      </a>
                      <a
                        href="/dashboard/bookings"
                        className="px-5 py-2.5 rounded font-medium text-sm border transition-colors hover:bg-gray-50"
                        style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text)' }}
                      >
                        View My Bookings
                      </a>
                    </div>
                  </div>
                )}

                {/* Conflict / error state */}
                {(submitState === 'conflict' || submitState === 'error') && (
                  <div className="mt-6 p-4 rounded-lg border" style={{ borderColor: '#dc2626', backgroundColor: '#fef2f2' }}>
                    <p className="font-medium" style={{ color: '#dc2626' }}>✗ {submitState === 'conflict' ? 'Availability conflict' : 'Submission failed'}</p>
                    <p className="mt-2 text-sm" style={{ color: '#7f1d1d' }}>{submitError}</p>
                    {submitState === 'conflict' && (
                      <button
                        onClick={() => { setSubmitState('idle'); setCurrentStep(isSimplified ? 0 : 1) }}
                        className="mt-3 text-sm underline"
                        style={{ color: '#dc2626' }}
                      >
                        Choose a different date or time
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}