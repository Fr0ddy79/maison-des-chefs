'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const COOKIE_NAME = 'ab_chef_sticky_cta_variant'

type Variant = 'personalized' | 'generic'

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

interface ChefProfileStickyCTAProps {
  chefId: string
  chefName: string
  bookingUrl: string
}

export function ChefProfileStickyCTA({ chefId, chefName, bookingUrl }: ChefProfileStickyCTAProps) {
  const [variant, setVariant] = useState<Variant>('personalized')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // URL param override for testing
    const urlParams = new URLSearchParams(window.location.search)
    const urlOverride = urlParams.get('chef_sticky_cta_variant') as Variant | null
    if (urlOverride && (urlOverride === 'personalized' || urlOverride === 'generic')) {
      setVariant(urlOverride)
      return
    }

    // Cookie or random assignment
    const existing = getCookie(COOKIE_NAME)
    if (existing === 'personalized' || existing === 'generic') {
      setVariant(existing)
    } else {
      const assigned: Variant = Math.random() < 0.5 ? 'personalized' : 'generic'
      setCookie(COOKIE_NAME, assigned)
      setVariant(assigned)
    }
  }, [])

  // Show after scrolling 300px
  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Track click
  const handleClick = async () => {
    try {
      await fetch('/api/analytics/chef-sticky-cta-click', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variant, chef_id: chefId }),
      })
    } catch (e) {
      console.error('[Analytics] Error tracking chef sticky CTA click:', e)
    }
  }

  const ctaText = variant === 'personalized'
    ? `Book ${chefName} Now`
    : 'Check Availability'

  const showDebug = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('debug')

  return (
    <>
      <div
        className={`
          fixed bottom-0 left-0 right-0 z-40
          transition-transform duration-200
          lg:hidden
          ${visible ? 'translate-y-0' : 'translate-y-full'}
        `}
        style={{
          backgroundColor: 'var(--color-mdc-accent)',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.12)',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{ctaText}</p>
            <p className="text-white/70 text-xs">No payment required today</p>
          </div>
          <Link
            href={bookingUrl}
            onClick={handleClick}
            className="flex-shrink-0 px-5 py-2.5 rounded font-medium text-sm text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
          >
            {variant === 'personalized' ? 'Book Now →' : 'Check Availability →'}
          </Link>
        </div>
      </div>

      {showDebug && (
        <div className="fixed bottom-16 left-4 z-50 text-xs p-2 bg-gray-800 text-white rounded lg:hidden">
          Chef Sticky CTA: <strong>{variant}</strong>
        </div>
      )}
    </>
  )
}
