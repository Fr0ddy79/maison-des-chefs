'use client'

import { useEffect, useState } from 'react'

type ToastPage = 'home' | 'browse'

const MESSAGES: Record<ToastPage, string[]> = {
  home: [
    '🥂 A dinner was just booked for this weekend',
    '👨‍🍳 3 new chefs joined Maison des Chefs this month',
    '⭐ Chef Antoine received a 5-star review yesterday',
    '🍽️ Someone booked a prix fixe dinner for 6 guests',
    '📅 A booking was confirmed for this Saturday',
    '🎉 Anniversary dinner booked — congratulations!',
  ],
  browse: [
    '⭐ Chef Sophie received a 5-star review',
    '🥂 A cocktail party was booked for next weekend',
    '👨‍🍳 Chef Marc is available this weekend',
    '🍽️ Someone booked a cooking class for 4 guests',
    '📅 2 slots opened up for this Friday',
  ],
}

const TOAST_DURATION_MS = 5000
const CYCLE_DELAY_MS = 800
const API_TIMEOUT_MS = 2000
const REFRESH_INTERVAL_MS = 60000

interface Activity {
  id: string
  chef_name: string
  city: string
  inquiry_date: string
  guest_count: number
  service_type: string
  created_at: string
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'tomorrow'
  if (diffDays === -1) return 'yesterday'
  if (diffDays > 1 && diffDays <= 7) return 'this weekend'
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildActivityMessages(activities: Activity[]): string[] {
  return activities.map((a) => {
    const dateLabel = formatDate(a.inquiry_date)
    if (a.guest_count >= 2) {
      return `🍽️ ${a.guest_count} guests booked ${a.chef_name} for ${dateLabel}`
    }
    return `👨‍🍳 ${a.chef_name} just received a new inquiry`
  })
}

interface SocialProofToastProps {
  page?: ToastPage
  /** Delay in ms before first toast appears */
  delayMs?: number
}

export function SocialProofToast({ page = 'home', delayMs = 4000 }: SocialProofToastProps) {
  const [visible, setVisible] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)
  const [fadingOut, setFadingOut] = useState(false)
  const [messages, setMessages] = useState<string[]>(MESSAGES[page])

  // Fetch real activity data on mount
  useEffect(() => {
    let controller: AbortController

    async function fetchActivity() {
      controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS)

      try {
        const res = await fetch('/api/social-proof/recent-activity', {
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!res.ok) return

        const json = await res.json()
        const activities: Activity[] = json.activities || []

        if (activities.length > 0) {
          const realMessages = buildActivityMessages(activities)
          setMessages(realMessages)
        }
      } catch {
        // Timeout or fetch error — keep static messages
      }
    }

    fetchActivity()

    // Refresh every 60 seconds
    const intervalId = setInterval(fetchActivity, REFRESH_INTERVAL_MS)

    return () => {
      clearTimeout(timeoutId as ReturnType<typeof setTimeout>)
      clearInterval(intervalId)
      controller?.abort()
    }
  }, [])

  useEffect(() => {
    // Only show once per session
    if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('mdc_toast_dismissed')) {
      return
    }

    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const showToast = () => {
      setVisible(true)
      console.log('[SocialProofToast] Toast visible on page:', page)
    }

    const timer = setTimeout(showToast, delayMs)
    return () => clearTimeout(timer)
  }, [page, delayMs])

  useEffect(() => {
    if (!visible || dismissed) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const cycleTimer = setTimeout(
      () => {
        setFadingOut(true)
        setTimeout(() => {
          setFadingOut(false)
          const nextIndex = currentIndex + 1
          if (nextIndex >= messages.length) {
            // Completed a full cycle — dismiss permanently
            setDismissed(true)
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('mdc_toast_dismissed', '1')
            }
          } else {
            setCurrentIndex(nextIndex)
          }
        }, 400)
      },
      prefersReducedMotion ? TOAST_DURATION_MS * 2 : TOAST_DURATION_MS,
    )

    return () => clearTimeout(cycleTimer)
  }, [visible, currentIndex, dismissed, messages.length])

  if (!visible || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 right-6 z-50 max-w-xs w-full ${fadingOut ? 'opacity-0 translate-y-1' : 'opacity-100 translate-y-0'} transition-all duration-300 ease-out`}
      style={{ pointerEvents: dismissed ? 'none' : 'auto' }}
    >
      <div
        className="relative bg-white rounded-lg shadow-lg border p-4 pr-10"
        style={{ borderLeft: '3px solid var(--color-mdc-accent)', borderColor: 'var(--color-mdc-border)' }}
      >
        {/* Close button */}
        <button
          onClick={() => {
            setDismissed(true)
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('mdc_toast_dismissed', '1')
            }
          }}
          className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
          aria-label="Dismiss notification"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text)' }}>
          {messages[currentIndex]}
        </p>
      </div>
    </div>
  )
}