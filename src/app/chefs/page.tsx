'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { CompareBar } from '@/components/compare/CompareBar'
import { createClient } from '@/lib/supabase/client'

type Service = {
  id?: string
  title: string
  cuisine_type?: string
}

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
  services?: Service[]
}

type ChefAvailability = Record<string, { total: number; available: number }>

const cuisineOptions = ['French', 'Italian', 'Japanese', 'Mediterranean', 'Seafood', 'Vegetarian', 'Asian Fusion']

type ServiceBadgeType = 'prix_fixe' | 'cocktail' | 'cooking_class' | 'celebration'

const SERVICE_BADGE_CONFIG: Record<ServiceBadgeType, { bg: string; text: string; label: string }> = {
  prix_fixe: { bg: '#C9A84C20', text: '#A68A3A', label: 'Prix Fixe' },
  cocktail: { bg: '#7C3AED20', text: '#6D28D9', label: 'Cocktail' },
  cooking_class: { bg: '#0D948820', text: '#0F766E', label: 'Cooking Class' },
  celebration: { bg: '#2563EB20', text: '#1D4ED8', label: 'Celebration' },
}

function mapServiceToBadgeType(title: string): ServiceBadgeType | null {
  const lower = title.toLowerCase()
  if (lower.includes('prix fixe') || lower.includes('dinner') || lower.includes('menu')) return 'prix_fixe'
  if (lower.includes('cocktail') || lower.includes('canap') || lower.includes('hors d') || lower.includes('appetizer')) return 'cocktail'
  if (lower.includes('cooking class') || lower.includes('class') || lower.includes('workshop')) return 'cooking_class'
  if (lower.includes('celebration') || lower.includes('event') || lower.includes('catering') || lower.includes('party')) return 'celebration'
  return null
}

function ServiceTypeBadge({ type }: { type: ServiceBadgeType }) {
  const { bg, text, label } = SERVICE_BADGE_CONFIG[type]
  return (
    <span
      className="text-xs px-3 py-1 rounded-full font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  )
}

function getServiceBadges(services: Service[]): { badges: ServiceBadgeType[]; extraCount: number } {
  const badgeTypes = services
    .map(s => mapServiceToBadgeType(s.title))
    .filter((t): t is ServiceBadgeType => t !== null)
  // Deduplicate
  const unique = Array.from(new Set(badgeTypes))
  return {
    badges: unique.slice(0, 2),
    extraCount: Math.max(0, unique.length - 2),
  }
}

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

type BadgeType = 'available' | 'fully_booked' | 'inquire'

function AvailabilityBadge({ status }: { status: BadgeType }) {
  const styles: Record<BadgeType, { bg: string; text: string; label: string }> = {
    available: { bg: '#22c55e1a', text: '#16a34a', label: 'Available' },
    fully_booked: { bg: '#6b72801a', text: '#4b5563', label: 'Fully Booked' },
    inquire: { bg: '#eab3081a', text: '#a16207', label: 'Inquire for Dates' },
  }
  const { bg, text, label } = styles[status]
  return (
    <span
      className="text-xs px-3 py-1 rounded-full font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {label}
    </span>
  )
}

export default function ChefsPage() {
  const [chefs, setChefs] = useState<Chef[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'rating' | 'price_low' | 'price_high'>('rating')

  // Support URL params: ?cuisine=French,Italian (landing page links) and ?service_type=prix-fixe (experience section links)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const cuisineParam = params.get('cuisine')
    const serviceTypeParam = params.get('service_type')
    if (cuisineParam) {
      const cuisines = cuisineParam.split(',').map(c => c.trim()).filter(Boolean)
      setSelectedCuisines(cuisines)
    }
    if (serviceTypeParam) {
      // Map service_type to service title keywords for client-side filtering
      // Each service_type maps to keywords that appear in the chef's service titles
      const serviceTypeKeywords: Record<string, string[]> = {
        'prix-fixe':    ['dinner', 'prix fixe', 'menu', 'intimate'],
        'cocktail':     ['cocktail', 'canap', 'hors d', 'appetizer', 'reception'],
        'cooking-class': ['cooking class', 'class', 'workshop', 'learn'],
        'celebration':  ['celebration', 'event', 'catering', 'party', 'anniversary'],
      }
      const keywords = serviceTypeKeywords[serviceTypeParam]
      if (keywords) {
        // Store keywords for use in filteredChefs
        setServiceTypeKeywords(keywords)
      }
    }
  }, [])
  const [compareList, setCompareList] = useState<Chef[]>([])
  const [availability, setAvailability] = useState<ChefAvailability>({})
  const [serviceTypeKeywords, setServiceTypeKeywords] = useState<string[]>([])

  useEffect(() => {
    async function fetchChefs() {
      const supabase = createClient()
      const { data, error: supabaseError } = await supabase
        .from('chef_profiles')
        .select('id, display_name, location, cuisines, avg_rating, review_count, price_per_event, max_guests, is_verified, hero_image_url, bio, services(title, cuisine_type)')
        .order('avg_rating', { ascending: false })

      if (supabaseError) {
        console.error('Error fetching chefs:', supabaseError)
        setError('Failed to load chefs. Please try again later.')
        setLoading(false)
        return
      }

      setChefs(data || [])
      setLoading(false)

      // Batch-fetch availability for all chefs
      if (data && data.length > 0) {
        const chefIds = data.map(c => c.id).join(',')
        try {
          const res = await fetch(`/api/availability?chef_ids=${encodeURIComponent(chefIds)}`)
          if (res.ok) {
            const json = await res.json()
            setAvailability(json.availability || {})
          }
        } catch (e) {
          console.error('Failed to fetch availability:', e)
        }
      }
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
    .filter(chef => {
      // Cuisine filter
      const matchesCuisine = selectedCuisines.length === 0 ||
        selectedCuisines.some(c => chef.cuisines.includes(c))
      // Service type filter: match if any service title contains one of the keywords
      const matchesServiceType = serviceTypeKeywords.length === 0 ||
        (chef.services && chef.services.some(s =>
          serviceTypeKeywords.some(kw =>
            s.title.toLowerCase().includes(kw.toLowerCase())
          )
        ))
      return matchesCuisine && matchesServiceType
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.avg_rating - a.avg_rating
      if (sortBy === 'price_low') return a.price_per_event - b.price_per_event
      return b.price_per_event - a.price_per_event
    })

  const toggleCompare = (chef: Chef) => {
    setCompareList(prev => {
      const isSelected = prev.some(c => c.id === chef.id)
      if (isSelected) {
        return prev.filter(c => c.id !== chef.id)
      }
      if (prev.length >= 4) {
        alert('You can compare up to 4 chefs at a time')
        return prev
      }
      return [...prev, chef]
    })
  }

  const handleRemoveFromCompare = (chefId: string) => {
    setCompareList(prev => prev.filter(c => c.id !== chefId))
  }

  const handleClearCompare = () => {
    setCompareList([])
  }

  function getBadgeStatus(chefId: string): BadgeType {
    const slot = availability[chefId]
    if (!slot || slot.total === 0) return 'inquire'
    if (slot.available > 0) return 'available'
    return 'fully_booked'
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <div className="flex-1 pb-24" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>Our Chefs</h1>
            <p className="mt-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Discover Montreal's finest private chefs for your next dining experience
            </p>
          </div>

          {/* CTA Banner - Above the Fold */}
          <div className="mb-10 rounded-xl p-8 md:p-10 border shadow-sm" style={{ backgroundColor: 'var(--color-mdc-accent)', borderColor: 'var(--color-mdc-accent)' }}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-2xl md:text-3xl text-white" style={{ fontFamily: 'var(--font-serif)' }}>
                  Ready for an Exclusive Dining Experience?
                </h2>
                <p className="mt-2 text-white/80 text-lg">
                  Book a private chef for your next celebration, intimate dinner, or special occasion.
                </p>
                <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    No payment required today
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Background-verified chefs
                  </span>
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Free cancellation up to 48h
                  </span>
                </div>
              </div>
              <div className="flex-shrink-0 flex flex-col sm:flex-row gap-3">
                <Link
                  href="/book"
                  className="px-6 py-3 rounded font-medium text-center text-white transition-colors hover:opacity-90 shadow-md"
                  style={{ backgroundColor: '#fff', color: 'var(--color-mdc-accent)' }}
                >
                  Book a Chef
                </Link>
                <Link
                  href="/subscribe"
                  className="px-6 py-3 rounded font-medium text-center transition-colors border text-white hover:bg-white/10"
                  style={{ borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  Join Waitlist
                </Link>
              </div>
            </div>
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
                    {filteredChefs.map((chef) => {
                      const isCompared = compareList.some(c => c.id === chef.id)
                      const badgeStatus = getBadgeStatus(chef.id)
                      return (
                        <div
                          key={chef.id}
                          className="relative rounded-lg p-6 bg-white border flex gap-5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                          style={{ borderColor: isCompared ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)', borderWidth: isCompared ? '2px' : '1px' }}
                        >
                          {/* Compare Checkbox */}
                          <div className="absolute top-4 right-4">
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleCompare(chef)
                              }}
                              className={`w-6 h-6 rounded flex items-center justify-center text-sm transition-colors ${
                                isCompared ? 'text-white' : 'border-2'
                              }`}
                              style={{
                                backgroundColor: isCompared ? 'var(--color-mdc-accent)' : 'transparent',
                                borderColor: isCompared ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)',
                              }}
                            >
                              {isCompared && (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                          </div>

                          <Link
                            href={`/chefs/${chef.id}`}
                            className="flex gap-5 flex-1 min-w-0"
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
                                <AvailabilityBadge status={badgeStatus} />
                                {chef.services && chef.services.length > 0 && (() => {
                                  const { badges, extraCount } = getServiceBadges(chef.services)
                                  return (
                                    <>
                                      {badges.map((badge) => (
                                        <ServiceTypeBadge key={badge} type={badge} />
                                      ))}
                                      {extraCount > 0 && (
                                        <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ backgroundColor: 'var(--color-mdc-bg)', color: 'var(--color-mdc-text-muted)', border: '1px solid var(--color-mdc-border)' }}>
                                          +{extraCount} more
                                        </span>
                                      )}
                                    </>
                                  )
                                })()}
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
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </main>
          </div>
        </div>
      </div>

      <CompareBar
        selectedChefs={compareList}
        onClear={handleClearCompare}
        onRemove={handleRemoveFromCompare}
      />

      <Footer />
    </div>
  )
}
