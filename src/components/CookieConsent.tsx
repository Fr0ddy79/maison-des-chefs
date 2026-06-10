'use client'

import { useState, useEffect } from 'react'
import { useCookieConsent, type ConsentCategory } from '@/lib/useCookieConsent'

interface ToggleState {
  essential: boolean
  analytics: boolean
  marketing: boolean
}

export function CookieConsent() {
  const {
    consent,
    showBanner,
    showCustomize,
    acceptAll,
    rejectAll,
    saveCustomConsent,
    openCustomize,
    closeCustomize,
  } = useCookieConsent()

  const [toggles, setToggles] = useState<ToggleState>({
    essential: true,
    analytics: false,
    marketing: false,
  })

  // Sync toggles with consent when customize opens
  useEffect(() => {
    if (showCustomize && consent) {
      setToggles({
        essential: consent.essential,
        analytics: consent.analytics,
        marketing: consent.marketing,
      })
    }
  }, [showCustomize, consent])

  if (!showBanner) return null

  const handleToggle = (category: ConsentCategory) => {
    if (category === 'essential') return // Essential can't be turned off
    setToggles(prev => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const handleSaveCustom = () => {
    saveCustomConsent({
      essential: toggles.essential,
      analytics: toggles.analytics,
      marketing: toggles.marketing,
    })
  }

  const categories = [
    {
      key: 'essential' as const,
      label: 'Essential',
      description: 'Required for the website to function. Cannot be disabled.',
      required: true,
    },
    {
      key: 'analytics' as const,
      label: 'Analytics',
      description: 'Help us understand how visitors interact with our website.',
      required: false,
    },
    {
      key: 'marketing' as const,
      label: 'Marketing',
      description: 'Used to deliver personalized advertisements.',
      required: false,
    },
  ]

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Banner */}
      <div
        className="relative w-full max-w-2xl mx-4 mb-4 bg-white rounded-lg shadow-2xl overflow-hidden"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {!showCustomize ? (
          /* Main Banner */
          <div className="p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
                  We value your privacy
                </h2>
                <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                  We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic. By clicking "Accept All", you consent to our use of cookies.
</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={rejectAll}
                className="px-5 py-2.5 text-sm font-medium rounded border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)' }}
              >
                Reject All
              </button>
              <button
                onClick={openCustomize}
                className="px-5 py-2.5 text-sm font-medium rounded border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text)' }}
              >
                Customize
              </button>
              <button
                onClick={acceptAll}
                className="px-5 py-2.5 text-sm font-medium rounded text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: 'var(--color-mdc-accent)' }}
              >
                Accept All
              </button>
            </div>

            <p className="mt-4 text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>
              You can change your preferences at any time in our{' '}
              <button className="underline hover:no-underline" style={{ color: 'var(--color-mdc-accent)' }}>
                cookie settings
              </button>
              .
            </p>
          </div>
        ) : (
          /* Customize Panel */
          <div className="p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                Cookie Preferences
              </h2>
              <button
                onClick={closeCustomize}
                className="p-2 rounded hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'var(--color-mdc-text-muted)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {categories.map(cat => (
                <div
                  key={cat.key}
                  className="flex items-start gap-4 p-4 rounded-lg border"
                  style={{ borderColor: 'var(--color-mdc-border)', backgroundColor: cat.required ? 'var(--color-mdc-bg)' : 'transparent' }}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        toggles[cat.key] ? 'border-transparent' : ''
                      }`}
                      style={{
                        borderColor: toggles[cat.key] ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)',
                        backgroundColor: toggles[cat.key] ? 'var(--color-mdc-accent)' : 'transparent',
                      }}
                    >
                      {toggles[cat.key] && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{cat.label}</span>
                      {cat.required && (
                        <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)' }}>
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      {cat.description}
                    </p>
                  </div>
                  {!cat.required && (
                    <button
                      onClick={() => handleToggle(cat.key)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        toggles[cat.key] ? '' : ''
                      }`}
                      style={{
                        backgroundColor: toggles[cat.key] ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)',
                      }}
                      aria-label={`Toggle ${cat.label}`}
                    >
                      <span
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform"
                        style={{
                          left: toggles[cat.key] ? '26px' : '4px',
                        }}
                      />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={rejectAll}
                className="px-5 py-2.5 text-sm font-medium rounded border transition-colors hover:bg-gray-50"
                style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)' }}
              >
                Reject All
              </button>
              <button
                onClick={handleSaveCustom}
                className="px-5 py-2.5 text-sm font-medium rounded text-white transition-colors hover:opacity-90"
                style={{ backgroundColor: 'var(--color-mdc-accent)' }}
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
