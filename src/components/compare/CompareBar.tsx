'use client'

import { useRouter } from 'next/navigation'

interface Chef {
  id: string
  display_name: string
  location: string | null
  cuisines: string[] | null
  avg_rating: number | null
  review_count: number | null
  price_per_event: number | null
  is_verified: boolean | null
  hero_image_url: string | null
}

interface CompareBarProps {
  selectedChefs: Chef[]
  onClear: () => void
  onRemove: (chefId: string) => void
}

export function CompareBar({ selectedChefs, onClear, onRemove }: CompareBarProps) {
  const router = useRouter()
  const count = selectedChefs.length

  if (count === 0) return null

  const handleCompare = () => {
    const chefIds = selectedChefs.map(c => c.id).join(',')
    router.push(`/compare?chefs=${chefIds}`)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg" style={{ borderColor: 'var(--color-mdc-border)' }}>
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>
            {count} chef{count !== 1 ? 's' : ''} selected
          </span>
          <div className="flex gap-2">
            {selectedChefs.map((chef) => (
              <div
                key={chef.id}
                className="relative group"
              >
                <img
                  src={chef.hero_image_url || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=80&h=80&fit=crop'}
                  alt={chef.display_name || 'Chef'}
                  className="w-10 h-10 rounded-full object-cover border-2 border-white"
                />
                <button
                  onClick={() => onRemove(chef.id)}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-gray-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label={`Remove ${chef.display_name}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClear}
            className="text-sm px-4 py-2 rounded hover:bg-gray-100 transition-colors"
            style={{ color: 'var(--color-mdc-text-muted)' }}
          >
            Clear all
          </button>
          <button
            onClick={handleCompare}
            disabled={count < 2}
            className="text-sm px-6 py-2 rounded font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: count >= 2 ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)' }}
          >
            Compare {count >= 2 ? `(${count})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}