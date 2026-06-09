// UTM capture utility for acquisition channel tracking
// Captures UTM parameters from URL on first visit and stores in localStorage
// for later association with leads, inquiries, and bookings.

export interface UTMParams {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  referrer: string | null
  landing_page: string | null
}

const UTM_STORAGE_KEY = 'mdc_utm_params'

/**
 * Extract UTM parameters from the current URL.
 * Only captures on first visit (if no UTM data exists in localStorage).
 */
export function captureUTMFromURL(): UTMParams {
  if (typeof document === 'undefined') {
    return emptyUTM()
  }

  const params = new URLSearchParams(window.location.search)
  const utm_source = params.get('utm_source')
  const utm_medium = params.get('utm_medium')
  const utm_campaign = params.get('utm_campaign')
  const utm_content = params.get('utm_content')
  const utm_term = params.get('utm_term')

  // Capture referrer header for non-UTM traffic
  const referrer = document.referrer || null

  // Capture the landing page (current URL path)
  const landing_page = window.location.pathname || null

  const utmParams: UTMParams = {
    utm_source: utm_source ? utm_source.substring(0, 255) : null,
    utm_medium: utm_medium ? utm_medium.substring(0, 255) : null,
    utm_campaign: utm_campaign ? utm_campaign.substring(0, 255) : null,
    utm_content: utm_content ? utm_content.substring(0, 255) : null,
    utm_term: utm_term ? utm_term.substring(0, 255) : null,
    referrer: referrer ? referrer.substring(0, 500) : null,
    landing_page: landing_page ? landing_page.substring(0, 255) : null,
  }

  // Store in localStorage for persistence across the session
  try {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(utmParams))
  } catch {
    // Ignore localStorage errors (private browsing, storage full, etc.)
  }

  return utmParams
}

/**
 * Get stored UTM parameters from localStorage.
 * Falls back to capturing from URL if no stored data exists.
 */
export function getStoredUTM(): UTMParams {
  if (typeof document === 'undefined') {
    return emptyUTM()
  }

  try {
    const stored = localStorage.getItem(UTM_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as UTMParams
    }
  } catch {
    // Ignore JSON parse errors
  }

  // No stored data — capture from URL
  return captureUTMFromURL()
}

/**
 * Clear stored UTM parameters.
 * Call this after a conversion event if you want to reset tracking.
 */
export function clearStoredUTM(): void {
  if (typeof document === 'undefined') return
  try {
    localStorage.removeItem(UTM_STORAGE_KEY)
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Check if any UTM data has been captured (either from URL or stored).
 */
export function hasUTMData(): boolean {
  const utm = getStoredUTM()
  return !!(
    utm.utm_source ||
    utm.utm_medium ||
    utm.utm_campaign ||
    utm.utm_content ||
    utm.utm_term ||
    utm.referrer
  )
}

function emptyUTM(): UTMParams {
  return {
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    utm_content: null,
    utm_term: null,
    referrer: null,
    landing_page: null,
  }
}
