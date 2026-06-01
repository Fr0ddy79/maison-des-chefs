'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const COOKIE_NAME = 'ab_hero_cta_variant'

type Variant = 'find_your_chef' | 'browse_available'

const CTA_TEXT: Record<Variant, { primary: string; secondary: string }> = {
  find_your_chef: { primary: 'Find Your Chef', secondary: 'Are You a Chef? Apply' },
  browse_available: { primary: 'Browse Available Chefs', secondary: 'Are You a Chef? Apply' },
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=')
    if (key === name) return value
  }
  return null
}

function setCookie(name: string, value: string, days: number = 30): void {
  const expires = new Date()
  expires.setDate(expires.getDate() + days)
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

async function trackClick(variant: Variant, ctaType: 'primary' | 'secondary'): Promise<void> {
  try {
    await fetch('/api/analytics/hero-cta-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variant, cta_type: ctaType }),
    })
  } catch (e) {
    console.error('[Analytics] Error tracking hero CTA click:', e)
  }
}

export function HeroCTA() {
  const [variant, setVariant] = useState<Variant>('find_your_chef')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Check URL param for forced testing (doesn't persist)
    const urlParams = new URLSearchParams(window.location.search)
    const urlOverride = urlParams.get('hero_cta_variant') as Variant | null

    if (urlOverride && (urlOverride === 'find_your_chef' || urlOverride === 'browse_available')) {
      setVariant(urlOverride)
      setReady(true)
      return
    }

    // Check existing cookie
    const existing = getCookie(COOKIE_NAME)
    if (existing === 'find_your_chef' || existing === 'browse_available') {
      setVariant(existing)
    } else {
      // Assign randomly if no cookie
      const assigned: Variant = Math.random() < 0.5 ? 'find_your_chef' : 'browse_available'
      setVariant(assigned)
      setCookie(COOKIE_NAME, assigned)
    }
    setReady(true)
  }, [])

  const handlePrimaryClick = () => trackClick(variant, 'primary')
  const handleSecondaryClick = () => trackClick(variant, 'secondary')

  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')
  const text = CTA_TEXT[variant]

  return (
    <>
      <div className="mt-10 flex flex-col sm:flex-row gap-4">
        <Link
          href="/chefs"
          className="px-6 py-3 rounded font-medium text-center text-white transition-colors hover:opacity-90"
          style={{ backgroundColor: 'var(--color-mdc-accent)' }}
          onClick={handlePrimaryClick}
        >
          {text.primary}
        </Link>
        <Link
          href="/chef/apply"
          className="px-6 py-3 rounded font-medium text-center transition-colors border"
          style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}
          onClick={handleSecondaryClick}
        >
          {text.secondary}
        </Link>
      </div>

      {showDebug && ready && (
        <div className="mt-4 text-xs p-2 bg-gray-100 rounded">
          Hero CTA: <strong>{variant}</strong> | Text: &quot;{text.primary}&quot;
        </div>
      )}
    </>
  )
}