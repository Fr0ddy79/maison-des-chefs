'use client'

import { useState } from 'react'
import Link from 'next/link'

interface FormErrors {
  email?: string
  general?: string
}

export function SubscribeForm() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isAlreadySubscribed, setIsAlreadySubscribed] = useState(false)

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAlreadySubscribed(false)

    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)
    setErrors({})

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      })

      const data = await response.json()

      if (response.status === 201) {
        setIsSuccess(true)
      } else if (response.status === 200 && data.message === 'already_subscribed') {
        setIsAlreadySubscribed(true)
        setIsSuccess(true)
      } else {
        setErrors({ general: data.error || 'Something went wrong. Please try again.' })
      }
    } catch {
      setErrors({ general: 'Network error. Please check your connection and try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="rounded-lg p-8 bg-white border shadow-sm text-center">
        <div
          className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(61, 122, 90, 0.1)' }}
        >
          <svg 
            className="w-8 h-8" 
            style={{ color: 'var(--color-mdc-success)' }} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 13l4 4L19 7" 
            />
          </svg>
        </div>
        
        {isAlreadySubscribed ? (
          <>
            <h2 
              className="text-2xl mb-4" 
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              You&apos;re Already on the List!
            </h2>
            <p 
              className="mb-6" 
              style={{ color: 'var(--color-mdc-text-muted)' }}
            >
              Looks like <strong>{email}</strong> is already registered for early access. 
              We&apos;ll be in touch soon with exclusive updates.
            </p>
          </>
        ) : (
          <>
            <h2 
              className="text-2xl mb-4" 
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Welcome to the Waitlist!
            </h2>
            <p 
              className="mb-6" 
              style={{ color: 'var(--color-mdc-text-muted)' }}
            >
              You&apos;re now on the list for early access to Maison des Chefs. 
              We&apos;ll notify you at <strong>{email}</strong> as soon as we launch.
            </p>
          </>
        )}
        
        <p 
          className="text-sm mb-8" 
          style={{ color: 'var(--color-mdc-text-muted)' }}
        >
          In the meantime, explore our{' '}
          <Link 
            href="/chefs" 
            className="underline" 
            style={{ color: 'var(--color-mdc-accent)' }}
          >
            featured chefs
          </Link>{' '}
          to get a taste of what&apos;s to come.
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
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div 
            className="p-4 rounded" 
            style={{ backgroundColor: '#fef2f2', color: 'var(--color-mdc-error)' }}
          >
            {errors.general}
          </div>
        )}

        {/* Email */}
        <div>
          <label htmlFor="email" className="text-sm font-medium block mb-1.5">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3.5 rounded border bg-white text-lg"
            style={{
              borderColor: errors.email ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)',
            }}
            placeholder="you@example.com"
            disabled={isSubmitting}
          />
          {errors.email && (
            <p 
              className="mt-1.5 text-sm" 
              style={{ color: 'var(--color-mdc-error)' }}
            >
              {errors.email}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3.5 rounded font-medium text-white transition-colors text-lg disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-mdc-accent)' }}
          onMouseEnter={(e) => {
            if (!isSubmitting) {
              e.currentTarget.style.backgroundColor = 'var(--color-mdc-accent-dark)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-mdc-accent)'
          }}
        >
          {isSubmitting ? 'Joining Waitlist...' : 'Join the Waitlist'}
        </button>
      </form>

      <p 
        className="text-center text-sm mt-4" 
        style={{ color: 'var(--color-mdc-text-muted)' }}
      >
        By joining, you agree to receive updates about Maison des Chefs.{' '}
        <br />
        We respect your privacy and will never share your information.
      </p>
    </div>
  )
}
