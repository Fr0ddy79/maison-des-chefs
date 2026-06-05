'use client'

import { useState, useEffect } from 'react'

const VARIANT_COOKIE = 'ab_profile_completion_variant'
const VARIANTS = ['social_proof', 'gamification', 'urgency'] as const
type Variant = (typeof VARIANTS)[number]

/**
 * Gets the initial variant from a cookie (server-side or initial render).
 * Returns null if no cookie exists yet.
 */
export function getInitialProfileCompletionVariant(): Variant | null {
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
export function setProfileCompletionVariantCookie(variant: Variant): void {
  const expires = new Date()
  expires.setDate(expires.getDate() + 30)
  document.cookie = `${VARIANT_COOKIE}=${variant};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

/**
 * Hook for A/B test variant assignment for profile completion incentives.
 * - Uses existing cookie if present (consistency)
 * - Otherwise randomly assigns 33/33/33 and stores in cookie
 * - Accepts an override from URL param (?profile_completion_variant=...) for forced testing
 */
export function useProfileCompletionVariant(urlParamOverride: Variant | null): Variant {
  const [variant, setVariant] = useState<Variant>(() => {
    if (urlParamOverride) return urlParamOverride
    return getInitialProfileCompletionVariant() ?? 'social_proof'
  })
  const [isAssigned, setIsAssigned] = useState(false)

  useEffect(() => {
    if (urlParamOverride) {
      setVariant(urlParamOverride)
      setIsAssigned(true)
      return
    }

    const existing = getInitialProfileCompletionVariant()
    if (existing) {
      setVariant(existing)
      setIsAssigned(true)
      return
    }

    // Assign new variant randomly (33/33/33)
    const rand = Math.random()
    const assigned: Variant = rand < 0.333 ? 'social_proof' : rand < 0.666 ? 'gamification' : 'urgency'
    setProfileCompletionVariantCookie(assigned)
    setVariant(assigned)
    setIsAssigned(true)
  }, [urlParamOverride])

  return variant
}
