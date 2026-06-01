'use client'

import { useState, useEffect } from 'react'

const HERO_CTA_COOKIE = 'ab_hero_cta_variant'
const VARIANTS = ['find_your_chef', 'browse_available'] as const
type Variant = (typeof VARIANTS)[number]

/**
 * Gets the initial hero CTA variant from a cookie.
 */
export function getInitialHeroCTAVariant(): Variant | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === HERO_CTA_COOKIE && VARIANTS.includes(value as Variant)) {
      return value as Variant
    }
  }
  return null
}

/**
 * Sets the hero CTA variant cookie with a 30-day expiry.
 */
export function setHeroCTAVariantCookie(variant: Variant): void {
  const expires = new Date()
  expires.setDate(expires.getDate() + 30)
  document.cookie = `${HERO_CTA_COOKIE}=${variant};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

/**
 * Hook for Hero CTA A/B test variant assignment.
 * - Uses existing cookie if present (consistency)
 * - Otherwise randomly assigns 50/50 and stores in cookie
 * - Accepts an override from URL param (?hero_cta_variant=...) for forced testing
 */
export function useHeroCTAVariant(urlParamOverride: Variant | null): Variant {
  const [variant, setVariant] = useState<Variant>('find_your_chef')
  const [isAssigned, setIsAssigned] = useState(false)

  useEffect(() => {
    // If URL has override, use it but don't persist (for testing)
    if (urlParamOverride && VARIANTS.includes(urlParamOverride)) {
      setVariant(urlParamOverride)
      setIsAssigned(true)
      return
    }

    // Check if we already have an assignment
    const existing = getInitialHeroCTAVariant()
    if (existing) {
      setVariant(existing)
      setIsAssigned(true)
      return
    }

    // Assign new variant randomly (50/50)
    const assigned: Variant = Math.random() < 0.5 ? 'find_your_chef' : 'browse_available'
    setHeroCTAVariantCookie(assigned)
    setVariant(assigned)
    setIsAssigned(true)
  }, [urlParamOverride])

  return variant
}

/**
 * Returns the CTA copy text for a given variant
 */
export function getHeroCTAText(variant: Variant): { primary: string; secondary: string } {
  switch (variant) {
    case 'browse_available':
      return {
        primary: 'Browse Available Chefs',
        secondary: 'Are You a Chef? Apply',
      }
    case 'find_your_chef':
    default:
      return {
        primary: 'Find Your Chef',
        secondary: 'Are You a Chef? Apply',
      }
  }
}

/**
 * Track hero CTA click event
 */
export async function trackHeroCTAClick(
  variant: Variant,
  ctaType: 'primary' | 'secondary'
): Promise<void> {
  try {
    await fetch('/api/analytics/hero-cta-click', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        variant,
        cta_type: ctaType,
        timestamp: new Date().toISOString(),
      }),
    })
  } catch (error) {
    console.error('[Analytics] Error tracking hero CTA click:', error)
  }
}