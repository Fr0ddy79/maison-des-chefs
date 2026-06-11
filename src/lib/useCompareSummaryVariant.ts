'use client'

import { useState, useEffect } from 'react'

const VARIANT_COOKIE = 'ab_compare_summary_variant'
const VARIANTS = ['control', 'summary_cta'] as const
type Variant = (typeof VARIANTS)[number]

export function getInitialCompareSummaryVariant(): Variant | null {
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

function setCompareSummaryVariantCookie(variant: Variant): void {
  const expires = new Date()
  expires.setDate(expires.getDate() + 30)
  document.cookie = `${VARIANT_COOKIE}=${variant};expires=${expires.toUTCString()};path=/;SameSite=Lax`
}

/**
 * Hook for compare page A/B test variant assignment.
 * - Uses existing cookie if present (consistency)
 * - Otherwise randomly assigns 50/50 and stores in cookie
 * - Accepts URL param override (?compare_summary_variant=summary_cta) for forced testing
 */
export function useCompareSummaryVariant(urlParamOverride: Variant | null): Variant {
  const [variant, setVariant] = useState<Variant>(() => {
    if (urlParamOverride) return urlParamOverride
    return getInitialCompareSummaryVariant() ?? 'control'
  })

  useEffect(() => {
    if (urlParamOverride) {
      setVariant(urlParamOverride)
      return
    }

    const existing = getInitialCompareSummaryVariant()
    if (existing) {
      setVariant(existing)
      return
    }

    const assigned: Variant = Math.random() < 0.5 ? 'control' : 'summary_cta'
    setCompareSummaryVariantCookie(assigned)
    setVariant(assigned)
  }, [urlParamOverride])

  return variant
}