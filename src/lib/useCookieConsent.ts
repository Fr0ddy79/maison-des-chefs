'use client'

import { useState, useEffect, useCallback } from 'react'

export type ConsentCategory = 'essential' | 'analytics' | 'marketing'

export interface CookieConsent {
  essential: boolean
  analytics: boolean
  marketing: boolean
  timestamp: number
}

const CONSENT_STORAGE_KEY = 'mdc_cookie_consent'

const DEFAULT_CONSENT: CookieConsent = {
  essential: true,
  analytics: false,
  marketing: false,
  timestamp: 0,
}

/**
 * Get initial consent from localStorage
 */
export function getInitialConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null

  try {
    const stored = localStorage.getItem(CONSENT_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored) as CookieConsent
      // Validate structure
      if (
        typeof parsed.essential === 'boolean' &&
        typeof parsed.analytics === 'boolean' &&
        typeof parsed.marketing === 'boolean' &&
        typeof parsed.timestamp === 'number'
      ) {
        return parsed
      }
    }
  } catch {
    // Invalid stored data
  }
  return null
}

/**
 * Save consent to localStorage
 */
export function saveConsent(consent: CookieConsent): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consent))
}

/**
 * Clear consent from localStorage (for testing/reset)
 */
export function clearConsent(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CONSENT_STORAGE_KEY)
}

/**
 * Hook for cookie consent management
 */
export function useCookieConsent() {
  const [consent, setConsent] = useState<CookieConsent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)

  useEffect(() => {
    const stored = getInitialConsent()
    setConsent(stored)
    if (!stored) {
      setShowBanner(true)
    }
  }, [])

  const acceptAll = useCallback(() => {
    const newConsent: CookieConsent = {
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: Date.now(),
    }
    saveConsent(newConsent)
    setConsent(newConsent)
    setShowBanner(false)
  }, [])

  const rejectAll = useCallback(() => {
    const newConsent: CookieConsent = {
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: Date.now(),
    }
    saveConsent(newConsent)
    setConsent(newConsent)
    setShowBanner(false)
  }, [])

  const saveCustomConsent = useCallback((cats: Omit<CookieConsent, 'timestamp'>) => {
    const newConsent: CookieConsent = {
      ...cats,
      timestamp: Date.now(),
    }
    saveConsent(newConsent)
    setConsent(newConsent)
    setShowBanner(false)
  }, [])

  const openCustomize = useCallback(() => {
    setShowCustomize(true)
  }, [])

  const closeCustomize = useCallback(() => {
    setShowCustomize(false)
  }, [])

  return {
    consent,
    showBanner,
    showCustomize,
    acceptAll,
    rejectAll,
    saveCustomConsent,
    openCustomize,
    closeCustomize,
  }
}
