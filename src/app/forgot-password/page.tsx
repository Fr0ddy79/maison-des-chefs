'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (authError) {
      setError(authError.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Maison des Chefs</span>
        </Link>

        <div className="rounded-lg p-8 bg-white border shadow-sm">
          <h1 className="text-2xl text-center mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Reset Password</h1>
          <p className="text-center mb-6 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
            Enter your email and we'll send you a password reset link.
          </p>

          {success ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)' }}>
                <svg className="w-6 h-6" style={{ color: 'var(--color-mdc-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-medium text-lg\">Check your email</p>
              <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                We sent a password reset link to <strong>{email}</strong>. It expires in 1 hour.
              </p>
              <Link
                href="/login"
                className="inline-block mt-4 text-sm hover:underline"
                style={{ color: 'var(--color-mdc-accent)' }}
              >
                Back to sign in
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium block mb-1.5">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded border bg-white placeholder-gray-400"
                  style={{ borderColor: 'var(--color-mdc-border)' }}
                  placeholder="you@example.com"
                  required
                />
              </div>

              {error && (
                <p className="text-sm px-4 py-3 rounded" style={{ backgroundColor: '#fef2f2', color: 'var(--color-mdc-error)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-3 rounded font-medium text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-mdc-accent)' }}
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {!success && (
            <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Remember your password?{' '}
              <Link href="/login" className="hover:underline" style={{ color: 'var(--color-mdc-accent)' }}>
                Sign in
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}