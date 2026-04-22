'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      window.location.href = '/dashboard'
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
          <h1 className="text-2xl text-center mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Welcome Back</h1>

          <form onSubmit={handleLogin} className="space-y-4">
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

            <div>
              <label htmlFor="password" className="text-sm font-medium block mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded border bg-white placeholder-gray-400"
                style={{ borderColor: 'var(--color-mdc-border)' }}
                placeholder="••••••••"
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
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
            Don't have an account?{' '}
            <Link href="/signup" className="hover:underline" style={{ color: 'var(--color-mdc-accent)' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
