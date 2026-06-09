'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

type ApplicationStatus = 'under_review' | 'approved' | 'rejected' | null

interface StatusResult {
  found: boolean
  status: ApplicationStatus
  name?: string
  submittedAt?: string
  reviewedAt?: string
}

export function ChefStatusClient() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<StatusResult | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResult(null)

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch(`/api/chef/application/status?email=${encodeURIComponent(email.trim())}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check status')
      }

      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <main className="flex-1 py-12 md:py-20" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-xl mx-auto px-6">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Check Application Status
            </h1>
            <p className="mt-4 text-lg" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Enter the email address you used to submit your chef application.
            </p>
          </div>

          {/* Email Form */}
          <div className="rounded-lg p-8 bg-white border shadow-sm mb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-4 rounded" style={{ backgroundColor: '#fef2f2', color: 'var(--color-mdc-error)' }}>
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="text-sm font-medium block mb-1.5">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded border bg-white"
                  style={{ borderColor: error ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)' }}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-6 py-3 rounded font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-mdc-accent)' }}
              >
                {isLoading ? 'Checking...' : 'Check Status'}
              </button>
            </form>
          </div>

          {/* Results */}
          {result && (
            <div className="rounded-lg p-8 bg-white border shadow-sm">
              {!result.found ? (
                // Email not found
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(107, 114, 128, 0.1)' }}
                  >
                    <svg className="w-8 h-8" style={{ color: '#6b7280' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                    No Application Found
                  </h2>
                  <p className="mb-6" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    We could not find an application with that email address. Please check your email or{' '}
                    <Link href="/chef/apply" className="underline" style={{ color: 'var(--color-mdc-accent)' }}>
                      submit a new application
                    </Link>.
                  </p>
                </div>
              ) : result.status === 'approved' ? (
                // Approved
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
                  >
                    <svg className="w-8 h-8" style={{ color: '#22c55e' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                    Congratulations, {result.name}!
                  </h2>
                  <p className="mb-4" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    Your chef application has been <strong>approved</strong>! We are thrilled to welcome you to Maison des Chefs.
                  </p>
                  <p className="mb-6" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    To get started, you will need to create your chef profile and set up your services.
                  </p>
                  <Link
                    href="/login"
                    className="inline-block px-6 py-3 rounded font-medium text-white transition-colors"
                    style={{ backgroundColor: 'var(--color-mdc-accent)' }}
                  >
                    Create Your Chef Account
                  </Link>
                </div>
              ) : result.status === 'rejected' ? (
                // Rejected
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                  >
                    <svg className="w-8 h-8" style={{ color: '#ef4444' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                    Application Not Approved
                  </h2>
                  <p className="mb-4" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    Thank you for your interest in Maison des Chefs. After careful review, we are unable to approve your application at this time.
                  </p>
                  <p className="mb-6" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    This decision is not a reflection of your culinary skills. You are welcome to apply again in the future with additional experience or information.
                  </p>
                  <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    If you have questions, please contact our support team.
                  </p>
                </div>
              ) : (
                // Under review
                <div className="text-center">
                  <div
                    className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)' }}
                  >
                    <svg className="w-8 h-8" style={{ color: 'var(--color-mdc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
                    Application Under Review
                  </h2>
                  <p className="mb-4" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    Thank you for your patience, {result.name}. Your application is currently being reviewed by our team.
                  </p>
                  <p className="mb-2" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    <strong>Expected timeline:</strong> 2-3 business days
                  </p>
                  {result.submittedAt && (
                    <p className="mb-6 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      Submitted on: {formatDate(result.submittedAt)}
                    </p>
                  )}
                  <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    We will email you once the review is complete. In the meantime, feel free to{' '}
                    <Link href="/chefs" className="underline" style={{ color: 'var(--color-mdc-accent)' }}>
                      explore our chefs
                    </Link>{' '}
                    to see the caliber of culinary talent on our platform.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Help text */}
          <p className="text-center text-sm mt-8" style={{ color: 'var(--color-mdc-text-muted)' }}>
            Want to apply as a chef?{' '}
            <Link href="/chef/apply" className="underline" style={{ color: 'var(--color-mdc-accent)' }}>
              Submit your application
            </Link>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  )
}