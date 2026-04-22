'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function SignupForm() {
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get('role') === 'chef' ? 'chef' : 'diner'
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'diner' | 'chef'>(defaultRole)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    
    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
        },
      },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      // Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email,
          full_name: fullName,
          role,
        })

      if (profileError) {
        setError('Account created but profile setup failed. Please contact support.')
      } else {
        window.location.href = role === 'chef' ? '/dashboard' : '/chefs'
      }
    }
    setLoading(false)
  }

  return (
    <div className="rounded-lg p-8 bg-white border shadow-sm">
      <h1 className="text-2xl text-center mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Create Your Account</h1>

      {/* Role Selection */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          onClick={() => setRole('diner')}
          className="flex-1 py-3 px-4 rounded border text-center transition-colors"
          style={{
            borderColor: role === 'diner' ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)',
            backgroundColor: role === 'diner' ? 'rgba(201, 168, 76, 0.05)' : 'transparent',
            color: role === 'diner' ? 'var(--color-mdc-accent)' : 'var(--color-mdc-text-muted)',
          }}
        >
          <span className="block font-medium">I'm a Diner</span>
          <span className="text-xs mt-0.5 opacity-75">Looking for chefs</span>
        </button>
        <button
          type="button"
          onClick={() => setRole('chef')}
          className="flex-1 py-3 px-4 rounded border text-center transition-colors"
          style={{
            borderColor: role === 'chef' ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)',
            backgroundColor: role === 'chef' ? 'rgba(201, 168, 76, 0.05)' : 'transparent',
            color: role === 'chef' ? 'var(--color-mdc-accent)' : 'var(--color-mdc-text-muted)',
          }}
        >
          <span className="block font-medium">I'm a Chef</span>
          <span className="text-xs mt-0.5 opacity-75">Offering services</span>
        </button>
      </div>

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="text-sm font-medium block mb-1.5">
            Full Name
          </label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-3 rounded border bg-white placeholder-gray-400"
            style={{ borderColor: 'var(--color-mdc-border)' }}
            placeholder="Your name"
            required
          />
        </div>

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
            minLength={6}
            required
          />
          <p className="text-xs mt-1.5" style={{ color: 'var(--color-mdc-text-muted)' }}>
            Must be at least 6 characters
          </p>
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
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
        Already have an account?{' '}
        <Link href="/login" className="hover:underline" style={{ color: 'var(--color-mdc-accent)' }}>
          Sign in
        </Link>
      </p>

      <p className="mt-4 text-center text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>
        By creating an account, you agree to our{' '}
        <a href="#" className="underline">Terms of Service</a> and{' '}
        <a href="#" className="underline">Privacy Policy</a>.
      </p>
    </div>
  )
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <span className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>Maison des Chefs</span>
        </Link>

        <Suspense fallback={
          <div className="rounded-lg p-8 bg-white border shadow-sm">
            <p className="text-center" style={{ color: 'var(--color-mdc-text-muted)' }}>Loading...</p>
          </div>
        }>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  )
}
