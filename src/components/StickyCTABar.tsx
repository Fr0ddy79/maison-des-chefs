'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const STICKY_CTA_COOKIE = 'ab_sticky_cta_variant'
const VARIANTS = ['control', 'urgency'] as const
type Variant = (typeof VARIANTS)[number]

function getInitialStickyCTAVariant(): Variant | null {
  if (typeof document === 'undefined') return null
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === STICKY_CTA_COOKIE && VARIANTS.includes(value as Variant)) {
      return value as Variant
    }
  }
  return null
}

function setStickyCTACookie(variant: Variant): void {
  const expires = new Date()
  expires.setDate(expires.getDate() + 30)
  document.cookie = `${STICKY_CTA_COOKIE}=${variant};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

async function trackStickyCTAClick(variant: Variant): Promise<void> {
  try {
    await fetch('/api/analytics/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: 'sticky_cta_click',
        variant,
        page: 'chefs',
      }),
    })
  } catch (e) {
    console.error('[Analytics] Error tracking sticky CTA click:', e)
  }
}

export function StickyCTABar() {
  const [isVisible, setIsVisible] = useState(false)
  const [variant, setVariant] = useState<Variant>('control')

  useEffect(() => {
    // Assign variant on mount
    const existing = getInitialStickyCTAVariant()
    if (existing) {
      setVariant(existing)
    } else {
      const assigned: Variant = Math.random() < 0.5 ? 'control' : 'urgency'
      setStickyCTACookie(assigned)
      setVariant(assigned)
    }

    // Show after 400px scroll
    const handleScroll = () => {
      setIsVisible(window.scrollY > 400)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (!isVisible) return null

  const controlCopy = {
    headline: 'Ready to find your perfect chef?',
    cta: 'Browse & Book',
  }

  const urgencyCopy = {
    headline: 'Weekend slots are filling fast — book now to secure your date',
    cta: 'Check Availability',
  }

  const copy = variant === 'urgency' ? urgencyCopy : controlCopy

  const handleClick = () => {
    trackStickyCTAClick(variant)
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 shadow-lg"
      style={{
        backgroundColor: 'var(--color-mdc-accent)',
        borderTop: '1px solid rgba(201, 168, 76, 0.3)',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <p
          className="text-white font-medium text-sm md:text-base flex-1"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {copy.headline}
        </p>
        <Link
          href="/book"
          onClick={handleClick}
          className="flex-shrink-0 px-6 py-2.5 rounded font-medium text-center text-white transition-colors hover:opacity-90 shadow-md text-sm md:text-base"
          style={{ backgroundColor: '#fff', color: 'var(--color-mdc-accent)' }}
        >
          {copy.cta} →
        </Link>
      </div>
      {/* Debug badge — remove in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-1 left-1/2 -translate-x-1/2 text-white/40 text-xs pointer-events-none">
          sticky CTA: {variant}
        </div>
      )}
    </div>
  )
}