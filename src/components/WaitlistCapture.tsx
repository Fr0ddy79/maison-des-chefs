'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { captureUTMFromURL } from '@/lib/utm'

interface FormErrors {
  email?: string
  general?: string
}

export function WaitlistCapture() {
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [isAlreadySubscribed, setIsAlreadySubscribed] = useState(false)


  // Capture UTM params on first visit (mount)
  useEffect(() => {
    captureUTMFromURL()
  }, [])

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
      // Get stored UTM params to pass with subscription
      const utmParams = captureUTMFromURL()

      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          ...utmParams,
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
      <div className="text-center py-4">
        <div
          className="w-10 h-10 mx-auto mb-3 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'rgba(61, 122, 90, 0.1)' }}
        >
          <svg
            className="w-5 h-5"
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
        <p className="text-sm font-medium" style={{ color: 'var(--color-mdc-text)' }}>
          {isAlreadySubscribed ? "You're already on the list!" : "You're on the list!"}
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
          {isAlreadySubscribed ? 'We\'ll be in touch with exclusive updates.' : 'We\'ll notify you when we launch.'}
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      {errors.general && (
        <div
          className="mb-3 p-3 rounded text-sm"
          style={{ backgroundColor: '#fef2f2', color: 'var(--color-mdc-error)' }}
        >
          {errors.general}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded border bg-white text-sm"
          style={{
            borderColor: errors.email ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)',
          }}
          placeholder="your@email.com"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded font-medium text-white text-sm transition-colors whitespace-nowrap disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-mdc-accent)' }}
        >
          {isSubmitting ? '...' : 'Notify Me'}
        </button>
      </div>
      {errors.email && (
        <p
          className="mt-1.5 text-xs text-left"
          style={{ color: 'var(--color-mdc-error)' }}
        >
          {errors.email}
        </p>
      )}
    </form>
  )
}