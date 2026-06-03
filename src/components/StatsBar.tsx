'use client'

import { useState, useEffect } from 'react'

type Stats = {
  chefs_available: number
  dinners_booked: number
}

export function StatsBar() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/stats')
        if (res.ok) {
          const data = await res.json()
          // Only show if we have at least 1 chef available
          if (data.chefs_available > 0) {
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
    <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
      <div className="flex items-center gap-2">
        <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
          {stats.chefs_available}
        </span>
        <span>
          Verified Chef{stats.chefs_available !== 1 ? 's' : ''} Available
        </span>
      </div>
      {stats.dinners_booked > 0 && (
        <div className="hidden sm:flex items-center gap-2">
          <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>
            {stats.dinners_booked}
          </span>
          <span>
            Dinner{stats.dinners_booked !== 1 ? 's' : ''} Booked
          </span>
        </div>
      )}
    </div>
  )
}