'use client'

import { useState } from 'react'
import Link from 'next/link'

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

const PRICE_RANGE_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'budget', label: 'Budget-friendly ($)' },
  { value: 'mid-range', label: 'Mid-range ($$)' },
  { value: 'premium', label: 'Premium ($$$)' },
  { value: 'luxury', label: 'Luxury ($$$$)' },
]

interface FormData {
  name: string
  email: string
  phone: string
  location: string
  cuisine_types: string[]
  years_experience: string
  price_range: string
  bio: string
  preferred_contact: 'email' | 'phone' | 'either'
}

interface FormErrors {
  name?: string
  email?: string
  location?: string
  cuisine_types?: string
  years_experience?: string
  bio?: string
  general?: string
}

export function ChefApplyForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    location: '',
    cuisine_types: [],
    years_experience: '',
    price_range: '',
    bio: '',
    preferred_contact: 'email',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [duplicateEmail, setDuplicateEmail] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim() || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    if (!formData.location.trim() || formData.location.trim().length < 2) {
      newErrors.location = 'Location is required (e.g., Montreal, QC)'
    }

    if (formData.cuisine_types.length === 0) {
      newErrors.cuisine_types = 'Please select at least one cuisine type'
    }

    if (!formData.years_experience) {
      newErrors.years_experience = 'Years of experience is required'
    } else {
      const years = parseInt(formData.years_experience, 10)
      if (isNaN(years) || years < 0) {
        newErrors.years_experience = 'Please enter a valid number'
      }
    }

    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = 'Bio must be 500 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setDuplicateEmail(false)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await fetch('/api/chefs/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || null,
          location: formData.location.trim(),
          cuisine_types: formData.cuisine_types,
          years_experience: parseInt(formData.years_experience, 10),
          price_range: formData.price_range || null,
          bio: formData.bio.trim() || null,
          preferred_contact: formData.preferred_contact,
        }),
      })

      const data = await response.json()

      if (response.status === 201) {
        setIsSuccess(true)
      } else if (response.status === 409) {
        setDuplicateEmail(true)
        setErrors({ email: 'An application with this email has already been submitted' })
      } else {
        setErrors({ general: data.error || 'Something went wrong. Please try again.' })
      }
    } catch {
      setErrors({ general: 'Network error. Please check your connection and try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCuisineToggle = (cuisine: string) => {
    setFormData(prev => ({
      ...prev,
      cuisine_types: prev.cuisine_types.includes(cuisine)
        ? prev.cuisine_types.filter(c => c !== cuisine)
        : [...prev.cuisine_types, cuisine],
    }))
  }

  if (isSuccess) {
    return (
      <div className="rounded-lg p-8 bg-white border shadow-sm text-center">
        <div
          className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(61, 122, 90, 0.1)' }}
        >
          <svg className="w-8 h-8" style={{ color: 'var(--color-mdc-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
          Application Submitted!
        </h2>
        <p className="mb-6" style={{ color: 'var(--color-mdc-text-muted)' }}>
          Thank you for applying to join Maison des Chefs. Our team will review your application and get back to you within 2-3 business days.
        </p>
        <p className="text-sm mb-8" style={{ color: 'var(--color-mdc-text-muted)' }}>
          In the meantime, feel free to explore our{' '}
          <Link href="/chefs" className="underline" style={{ color: 'var(--color-mdc-accent)' }}>
            featured chefs
          </Link>{' '}
          to see the caliber of culinary talent on our platform.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--color-mdc-accent)' }}
        >
          Return Home
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg p-8 bg-white border shadow-sm">
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.general && (
          <div className="p-4 rounded" style={{ backgroundColor: '#fef2f2', color: 'var(--color-mdc-error)' }}>
            {errors.general}
          </div>
        )}

        {duplicateEmail && (
          <div className="p-4 rounded" style={{ backgroundColor: '#fef2f2', color: 'var(--color-mdc-error)' }}>
            An application with this email has already been submitted. Please wait for our team to review your existing application.
          </div>
        )}

        {/* Name */}
        <div>
          <label htmlFor="name" className="text-sm font-medium block mb-1.5">
            Name <span style={{ color: 'var(--color-mdc-error)' }}>*</span>
          </label>
          <input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            className="w-full px-4 py-3 rounded border bg-white"
            style={{
              borderColor: errors.name ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)',
            }}
            placeholder="Your full name"
          />
          {errors.name && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-mdc-error)' }}>{errors.name}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="text-sm font-medium block mb-1.5">
            Email <span style={{ color: 'var(--color-mdc-error)' }}>*</span>
          </label>
          <input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            className="w-full px-4 py-3 rounded border bg-white"
            style={{
              borderColor: errors.email ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)',
            }}
            placeholder="you@example.com"
          />
          {errors.email && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-mdc-error)' }}>{errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label htmlFor="phone" className="text-sm font-medium block mb-1.5">
            Phone <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            className="w-full px-4 py-3 rounded border bg-white"
            style={{ borderColor: 'var(--color-mdc-border)' }}
            placeholder="(514) 555-0123"
          />
        </div>

        {/* Location */}
        <div>
          <label htmlFor="location" className="text-sm font-medium block mb-1.5">
            Location <span style={{ color: 'var(--color-mdc-error)' }}>*</span>
          </label>
          <input
            id="location"
            type="text"
            value={formData.location}
            onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            className="w-full px-4 py-3 rounded border bg-white"
            style={{
              borderColor: errors.location ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)',
            }}
            placeholder="e.g., Montreal, QC"
          />
          {errors.location && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-mdc-error)' }}>{errors.location}</p>
          )}
        </div>

        {/* Cuisine Types */}
        <div>
          <label className="text-sm font-medium block mb-1.5">
            Cuisine Types <span style={{ color: 'var(--color-mdc-error)' }}>*</span>
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {CUISINE_OPTIONS.map((cuisine) => (
              <button
                key={cuisine}
                type="button"
                onClick={() => handleCuisineToggle(cuisine)}
                className="px-3 py-2 text-sm rounded border transition-colors text-left"
                style={{
                  borderColor: formData.cuisine_types.includes(cuisine)
                    ? 'var(--color-mdc-accent)'
                    : 'var(--color-mdc-border)',
                  backgroundColor: formData.cuisine_types.includes(cuisine)
                    ? 'rgba(201, 168, 76, 0.08)'
                    : 'transparent',
                  color: formData.cuisine_types.includes(cuisine)
                    ? 'var(--color-mdc-accent)'
                    : 'var(--color-mdc-text)',
                }}
              >
                {cuisine}
              </button>
            ))}
          </div>
          {errors.cuisine_types && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-mdc-error)' }}>{errors.cuisine_types}</p>
          )}
        </div>

        {/* Years of Experience */}
        <div>
          <label htmlFor="years_experience" className="text-sm font-medium block mb-1.5">
            Years of Experience <span style={{ color: 'var(--color-mdc-error)' }}>*</span>
          </label>
          <select
            id="years_experience"
            value={formData.years_experience}
            onChange={(e) => setFormData(prev => ({ ...prev, years_experience: e.target.value }))}
            className="w-full px-4 py-3 rounded border bg-white"
            style={{
              borderColor: errors.years_experience ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)',
            }}
          >
            <option value="">Select years of experience</option>
            <option value="0">Less than 1 year</option>
            <option value="1">1 year</option>
            <option value="2">2 years</option>
            <option value="3">3 years</option>
            <option value="4">4 years</option>
            <option value="5">5 years</option>
            <option value="6">6 years</option>
            <option value="7">7 years</option>
            <option value="8">8 years</option>
            <option value="9">9 years</option>
            <option value="10">10+ years</option>
          </select>
          {errors.years_experience && (
            <p className="mt-1.5 text-sm" style={{ color: 'var(--color-mdc-error)' }}>{errors.years_experience}</p>
          )}
        </div>

        {/* Price Range */}
        <div>
          <label htmlFor="price_range" className="text-sm font-medium block mb-1.5">
            Price Point Range <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>(optional)</span>
          </label>
          <select
            id="price_range"
            value={formData.price_range}
            onChange={(e) => setFormData(prev => ({ ...prev, price_range: e.target.value }))}
            className="w-full px-4 py-3 rounded border bg-white"
            style={{ borderColor: 'var(--color-mdc-border)' }}
          >
            {PRICE_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="text-sm font-medium block mb-1.5">
            Bio / Description <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>(optional, max 500 chars)</span>
          </label>
          <textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
            rows={4}
            className="w-full px-4 py-3 rounded border bg-white resize-none"
            style={{
              borderColor: errors.bio ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)',
            }}
            placeholder="Tell us about your culinary background, specialties, and what makes your cooking unique..."
            maxLength={500}
          />
          <div className="mt-1.5 flex justify-between">
            {errors.bio ? (
              <p className="text-sm" style={{ color: 'var(--color-mdc-error)' }}>{errors.bio}</p>
            ) : (
              <span />
            )}
            <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
              {formData.bio.length}/500
            </span>
          </div>
        </div>

        {/* Preferred Contact */}
        <div>
          <label className="text-sm font-medium block mb-2">
            Preferred Contact Method <span style={{ color: 'var(--color-mdc-error)' }}>*</span>
          </label>
          <div className="flex gap-4">
            {(['email', 'phone', 'either'] as const).map((method) => (
              <label key={method} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="preferred_contact"
                  value={method}
                  checked={formData.preferred_contact === method}
                  onChange={() => setFormData(prev => ({ ...prev, preferred_contact: method }))}
                  className="w-4 h-4"
                  style={{ accentColor: 'var(--color-mdc-accent)' }}
                />
                <span className="text-sm capitalize">{method === 'either' ? 'No preference' : method}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 rounded font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-mdc-accent)' }}
        >
          {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
        </button>

        <p className="text-center text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
          By submitting this application, you agree to our{' '}
          <a href="#" className="underline">Terms of Service</a> and{' '}
          <a href="#" className="underline">Privacy Policy</a>.
        </p>
      </form>
    </div>
  )
}
