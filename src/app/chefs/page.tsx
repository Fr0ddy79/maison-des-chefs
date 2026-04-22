'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { createClient } from '@/lib/supabase/client'

type Chef = {
  id: string
  display_name: string
  location: string
  cuisines: string[]
  avg_rating: number
  review_count: number
  price_per_event: number
  max_guests: number
  is_verified: boolean
  hero_image_url: string
  bio: string
}

const cuisineOptions = ['French', 'Italian', 'Japanese', 'Mediterranean', 'Seafood', 'Vegetarian', 'Asian Fusion']

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className="w-4 h-4"
          style={{ color: star <= rating ? 'var(--color-mdc-accent)' : '#d1d5db' }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  )
}

export default function ChefsPage() {
  const [chefs, setChefs] = useState<Chef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'rating' | 'price_low' | 'price_high'>('rating')

  useEffect(() => {
    async function fetchChefs() {
      const supabase = createClient()
      const { data, error: supabaseError } = await supabase
        .from('chef_profiles')
        .select('id, display_name, location, cuisines, avg_rating, review_count, price_per_event, max_guests, is_verified, hero_image_url, bio')
        .order('avg_rating', { ascending: false })

      if (supabaseError) {
        console.error('Error fetching chefs:', supabaseError)
        setError('Failed to load chefs. Please try again later.')
        setLoading(false)
        return
      }

      setChefs(data || [])
      setLoading(false)
    }

    fetchChefs()
  }, [])

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine)
        ? prev.filter(c => c !== cuisine)
        : [...prev, cuisine]
    )
  }

  const filteredChefs = chefs
    .filter(chef =>
      selectedCuisines.length === 0 ||
      selectedCuisines.some(c => chef.cuisines.includes(c))
    )
    .sort((a, b) => {
      if (sortBy === 'rating') return b.avg_rating - a.avg_rating
      if (sortBy === 'price_low') return a.price_per_event - b.price_per_event
      return b.price_per_event - a.price_per_event
    })

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <div className="flex-1" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>Our Chefs</h1>
            <p className="mt-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Discover Montreal's finest private chefs for your next dining experience
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Filters Sidebar */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="rounded-lg p-6 bg-white border shadow-sm sticky top-24" style={{ borderColor: 'var(--color-mdc-border)' }}>
                <h3 className="font-medium mb-4">Cuisine Type</h3>
                <div className="space-y-2">
                  {cuisineOptions.map((cuisine) => (
                    <label key={cuisine} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCuisines.includes(cuisine)}
                        onChange={() => toggleCuisine(cuisine)}
                        className="w-4 h-4 rounded"
                        style={{ accentColor: 'var(--color-mdc-accent)' }}
                      />
                      <span className="text-sm">{cuisine}</span>
                    </label>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <h3 className="font-medium mb-4">Sort By</h3>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                    className="w-full px-4 py-3 rounded border bg-white"
                    style={{ borderColor: 'var(--color-mdc-border)' }}
                  >
                    <option value="rating">Highest Rated</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="price_high">Price: High to Low</option>
                  </select>
                </div>

                {selectedCuisines.length > 0 && (
                  <button
                    onClick={() => setSelectedCuisines([])}
                    className="mt-6 text-sm hover:underline"
                    style={{ color: 'var(--color-mdc-accent)' }}
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            </aside>

            {/* Chef Grid */}
            <main className="flex-1">
              {loading ? (
                <div className="rounded-lg p-6 bg-white border shadow-sm text-center py-16">
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading chefs...</p>
                </div>
              ) : error ? (
                <div className="rounded-lg p-6 bg-white border shadow-sm text-center py-16">
                  <p style={{ color: 'var(--color-mdc-accent)' }}>{error}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="mt-4 hover:underline"
                    style={{ color: 'var(--color-mdc-accent)' }}
                  >
                    Try again
                  </button>
                </div>
              ) : filteredChefs.length === 0 ? (
                <div className="rounded-lg p-6 bg-white border shadow-sm text-center py-16">
                  <p style={{ color: 'var(--color-mdc-text-muted)' }}>No chefs match your criteria.</p>
                  <button
                    onClick={() => setSelectedCuisines([])}
                    className="mt-4 hover:underline"
                    style={{ color: 'var(--color-mdc-accent)' }}
                  >
                    Clear filters
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    {filteredChefs.length} chef{filteredChefs.length !== 1 ? 's' : ''} found
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredChefs.map((chef) => (
                      <Link
                        key={chef.id}
                        href={`/chefs/${chef.id}`}
                        className="rounded-lg p-6 bg-white border flex gap-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                        style={{ borderColor: 'var(--color-mdc-border)' }}
                      >
                        <img
                          src={chef.hero_image_url}
                          alt={chef.display_name}
                          className="w-24 h-24 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-lg truncate" style={{ fontFamily: 'var(--font-serif)' }}>{chef.display_name}</h3>
                            {chef.is_verified && (
                              <span className="text-white text-xs flex-shrink-0 px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>Verified</span>
                            )}
                          </div>
                          <p className="mt-0.5 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>{chef.location}</p>
                          
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {chef.cuisines.slice(0, 3).map((cuisine) => (
                              <span key={cuisine} className="text-xs px-3 py-1 rounded-full border" style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)', backgroundColor: 'var(--color-mdc-bg)' }}>{cuisine}</span>
                            ))}
                          </div>

                          <div className="flex items-center justify-between mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                            <div className="flex items-center gap-2">
                              <StarRating rating={Math.round(chef.avg_rating)} />
                              <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                                {chef.avg_rating} ({chef.review_count})
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-semibold">${chef.price_per_event}</span>
                              <span className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}> / event</span>
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
