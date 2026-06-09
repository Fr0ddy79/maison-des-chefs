'use client'

import { useState, useEffect } from 'react'

type Stats = {
  chefs_available: number
  dinners_booked: number
  waitlist_count: number
  avg_platform_rating: number
  total_reviews: number
}

export function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const data = await res.json()
          // Show stats if we have any data
          if (data.chefs_available > 0 || data.dinners_booked > 0 || data.total_reviews > 0) {
            setStats(data)
          }
        }
      } catch {
        // Non-critical — silently fail
      }
    }
    fetchStats()
  }, [])

  if (!stats) return null

  return (
    <div className="flex items-center gap-6 text-sm flex-wrap" style={{ color: 'var(--color-mdc-text-muted)' }}>
      {stats.chefs_available > 0 && (
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
            {stats.chefs_available}
          </span>
          <span>
            Verified Chef{stats.chefs_available !== 1 ? 's' : ''} Available
          </span>
        </div>
      )}
      {stats.dinners_booked > 0 && (
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
            {stats.dinners_booked}
          </span>
          <span>
            Dinner{stats.dinners_booked !== 1 ? 's' : ''} Booked
          </span>
        </div>
      )}
      {stats.avg_platform_rating > 0 && (
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
            {stats.avg_platform_rating}
          </span>
          <span>Avg Rating</span>
        </div>
      )}
      {stats.total_reviews > 0 && (
        <div className="flex items-center gap-2">
          <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
            {stats.total_reviews}
          </span>
          <span>Review{stats.total_reviews !== 1 ? 's' : ''}</span>
        </div>
      )}
      {stats.waitlist_count > 0 && (
        <div className="hidden md:flex items-center gap-2">
          <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
            {stats.waitlist_count}+
          </span>
          <span>
            Food Lover{stats.waitlist_count !== 1 ? 's' : ''} Waiting
          </span>
        </div>
      )}
    </div>
  )
}