'use client'

import { useState, useEffect } from 'react'

const VARIANT_COOKIE = 'ab_booking_variant'
const VARIANTS = ['standard', 'simplified'] as const
type Variant = (typeof VARIANTS)[number]

/**
 * Gets the initial variant from a cookie (server-side or initial render).
 * Returns null if no cookie exists yet.
 */
export function getInitialVariant(): Variant | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=')
    if (name === VARIANT_COOKIE && VARIANTS.includes(value as Variant)) {
      return value as Variant
    }
  }
  return null
}

/**
 * Sets the variant cookie with a 30-day expiry.
 */
export function setVariantCookie(variant: Variant): void {
  const expires = new Date()
  expires.setDate(expires.getDate() + 30)
  document.cookie = `${VARIANT_COOKIE}=${variant};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

/**
 * Hook for A/B test variant assignment.
 * - Uses existing cookie if present (consistency)
 * - Otherwise randomly assigns 50/50 and stores in cookie
 * - Accepts an override from URL param (?variant=simplified) for forced testing
 */
export function useABVariant(urlParamOverride: Variant | null): Variant {
  const [variant, setVariant] = useState<Variant>(() => {
    // Check URL param first (for forced variant testing)
    if (urlParamOverride) return urlParamOverride
    // Fall back to cookie
    return getInitialVariant() ?? 'standard'
  })
  const [isAssigned, setIsAssigned] = useState(false)

  useEffect(() => {
    // If URL has override, use it but don't persist (for testing)
    if (urlParamOverride) {
      setVariant(urlParamOverride)
      setIsAssigned(true)
      return
    }

    // Check if we already have an assignment
    const existing = getInitialVariant()
    if (existing) {
      setVariant(existing)
      setIsAssigned(true)
      return
    }

    // Assign new variant randomly (50/50)
    const assigned: Variant = Math.random() < 0.5 ? 'standard' : 'simplified'
    setVariantCookie(assigned)
    setVariant(assigned)
    setIsAssigned(true)
  }, [urlParamOverride])

  return variant
}
