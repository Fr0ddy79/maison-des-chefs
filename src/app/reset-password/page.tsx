'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [validatingToken, setValidatingToken] = useState(true)
  const [tokenError, setTokenError] = useState('')

  // Supabase sends the token in the URL hash fragment
  // When the page loads from the magic link, we need to exchange the code for a session
  useEffect(() => {
    const handleInitialAuth = async () => {
      const supabase = createClient()
      const hash = window.location.hash

      if (hash.includes('access_token') || hash.includes('token=')) {
        // The auth callback was processed by Supabase SSR — session should be set
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !session) {
          setTokenError('Invalid or expired reset link. Please request a new one.')
        }
      } else {
        // No token in URL — check if we have a session from a previous redirect
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setTokenError('Invalid or expired reset link. Please request a new one.')
        }
      }
      setValidatingToken(false)
    }

    handleInitialAuth()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess(true)
    }
    setLoading(false)
  }

  if (validatingToken) {
    return (
      <div className="text-center py-8">
        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Validating your reset link...</p>
      </div>
    )
  }

  if (tokenError) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
          <svg className="w-6 h-6" style={{ color: 'var(--color-mdc-error)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="font-medium text-lg">Reset Link Invalid</p>
        <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
          {tokenError}
        </p>
        <Link
          href="/forgot-password"
          className="inline-block mt-4 text-sm px-4 py-2 rounded font-medium text-white transition-colors"
          style={{ backgroundColor: 'var(--color-mdc-accent)' }}
        >
          Request New Link
        </Link>
      </div>
    )
  }

  return (
    <>
      {success ? (
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)' }}>
            <svg className="w-6 h-6" style={{ color: 'var(--color-mdc-accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="font-medium text-lg">Password Updated</p>
          <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
            Your password has been changed successfully.
          </p>
          <Link
            href="/login"
            className="inline-block mt-4 text-sm px-4 py-2 rounded font-medium text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: 'var(--color-mdc-accent)' }}
          >
            Sign In
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-center mb-4" style={{ color: 'var(--color-mdc-text-muted)' }}>
            Enter your new password below.
          </p>

          <div>
            <label htmlFor="password" className="text-sm font-medium block mb-1.5">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded border bg-white placeholder-gray-400"
              style={{ borderColor: 'var(--color-mdc-border)' }}
              placeholder="••••••••"
              minLength={6}
              required
            />
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Must be at least 6 characters
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium block mb-1.5">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded border bg-white placeholder-gray-400"
              style={{ borderColor: 'var(--color-mdc-border)' }}
              placeholder="••••••••"
              minLength={6}
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
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Maison des Chefs</span>
        </Link>

        <div className="rounded-lg p-8 bg-white border shadow-sm">
          <h1 className="text-2xl text-center mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Set New Password</h1>

          <Suspense fallback={
            <div className="text-center py-8">
              <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading...</p>
            </div>
          }>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}