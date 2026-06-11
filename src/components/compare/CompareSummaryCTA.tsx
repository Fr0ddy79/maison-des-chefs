'use client'

import { useEffect } from 'react'
import Link from 'next/link'

interface ChefSummary {
  id: string
  display_name: string | null
  hero_image_url: string | null
  avg_rating: number | null
  review_count: number | null
  price_per_event: number | null
  cuisines: string[] | null
}

interface CompareSummaryCTAProps {
  chefs: ChefSummary[]
}

function determineTopChef(chefs: ChefSummary[]): ChefSummary {
  return chefs.reduce((top, chef) => {
    const topScore = (top.avg_rating || 0) * 100 + Math.min(top.review_count || 0, 100)
    const chefScore = (chef.avg_rating || 0) * 100 + Math.min(chef.review_count || 0, 100)
    return chefScore > topScore ? chef : top
  })
}

function StarRatingSmall({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className="w-3 h-3"
          style={{ color: star <= Math.round(rating) ? 'var(--color-mdc-accent)' : '#d1d5db' }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export function CompareSummaryCTA({ chefs }: CompareSummaryCTAProps) {
  const topChef = determineTopChef(chefs)

  useEffect(() => {
    // Fire view event
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'compare_summary_view',
        properties: { variant: 'summary_cta' },
      }),
    }).catch(() => {
      // Non-blocking analytics
    })
  }, [])

  function handlePrimaryClick() {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'compare_summary_cta_click',
        properties: {
          variant: 'summary_cta',
          chef_id: topChef.id,
          chef_name: topChef.display_name,
        },
      }),
    }).catch(() => {
      // Non-blocking analytics
    })
  }

  function handleChefPillClick(chefId: string) {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_name: 'compare_summary_chef_click',
        properties: {
          variant: 'summary_cta',
          chef_id: chefId,
        },
      }),
    }).catch(() => {
      // Non-blocking analytics
    })
  }

  return (
    <div
      className="rounded-lg p-6 mb-6 border shadow-sm"
      style={{
        backgroundColor: 'var(--color-mdc-accent)',
        borderColor: 'var(--color-mdc-accent)',
      }}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left: Summary text */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-white/80 text-sm">
              Comparing {chefs.length} chef{chefs.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-lg" style={{ fontFamily: 'var(--font-serif)' }}>
                Top pick:
              </span>
              <img
                src={topChef.hero_image_url || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&h=200&fit=crop'}
                alt={topChef.display_name || 'Chef'}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/30"
              />
              <span className="text-white font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>
                {topChef.display_name || 'Chef'}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <StarRatingSmall rating={Math.round(topChef.avg_rating || 0)} />
              <span className="text-white/80 text-sm">{topChef.avg_rating?.toFixed(1) || '0.0'}</span>
            </div>
            {topChef.price_per_event && (
              <span className="text-white/80 text-sm">
                · From ${topChef.price_per_event}/event
              </span>
            )}
          </div>
        </div>

        {/* Right: Primary CTA */}
        <div className="flex-shrink-0">
          <Link
            href={`/book?chef_id=${topChef.id}`}
            onClick={handlePrimaryClick}
            className="inline-flex items-center gap-2 px-6 py-3 rounded font-medium text-center shadow-md transition-colors hover:opacity-90"
            style={{ backgroundColor: '#fff', color: 'var(--color-mdc-accent)' }}
          >
            Book {topChef.display_name || 'Chef'} →
          </Link>
        </div>
      </div>

      {/* Chef pills — quick navigation to each chef */}
      <div className="mt-4 flex flex-wrap gap-2">
        {chefs.map((chef) => {
          const isTop = chef.id === topChef.id
          return (
            <Link
              key={chef.id}
              href={`/chefs/${chef.id}`}
              onClick={() => handleChefPillClick(chef.id)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-opacity hover:opacity-80"
              style={{
                backgroundColor: isTop ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)',
                border: isTop ? '1.5px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.2)',
              }}
            >
              <img
                src={chef.hero_image_url || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=40&h=40&fit=crop'}
                alt={chef.display_name || 'Chef'}
                className="w-5 h-5 rounded-full object-cover"
              />
              <span className="text-white">
                {chef.display_name || 'Chef'}
                {isTop && <span className="ml-1 text-white/70">★</span>}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}