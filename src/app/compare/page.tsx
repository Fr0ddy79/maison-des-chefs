'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { CompareSummaryCTA } from '@/components/compare/CompareSummaryCTA'
import { createClient } from '@/lib/supabase/client'
import { useCompareSummaryVariant } from '@/lib/useCompareSummaryVariant'

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
  bio: string | null
  years_experience: number | null
  max_guests: number | null
}

interface Service {
  id: string
  title: string
  description: string | null
  cuisine_type: string | null
  duration_hours: number | null
  price_per_person: number | null
  max_guests: number | null
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className="w-5 h-5"
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

function ComparePageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [chefs, setChefs] = useState<Chef[]>([])
  const [servicesMap, setServicesMap] = useState<Record<string, Service[]>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChefs() {
      const chefIds = searchParams.get('chefs')
      if (!chefIds) {
        router.push('/chefs')
        return
      }

      const ids = chefIds.split(',').filter(Boolean)
      if (ids.length < 2) {
        router.push('/chefs')
        return
      }

      const supabase = createClient()
      const { data, error } = await supabase
        .from('chef_profiles')
        .select('id, display_name, location, cuisines, avg_rating, review_count, price_per_event, is_verified, hero_image_url, bio, years_experience, max_guests')
        .in('id', ids)

      if (error || !data || data.length === 0) {
        router.push('/chefs')
        return
      }

      // Sort by the order of ids provided
      const sortedChefs = ids.map(id => data.find((c: Chef) => c.id === id)).filter(Boolean) as Chef[]
      setChefs(sortedChefs)

      // Fetch services for each chef
      const services: Record<string, Service[]> = {}
      for (const chef of sortedChefs) {
        const { data: serviceData } = await supabase
          .from('services')
          .select('id, title, description, cuisine_type, duration_hours, price_per_person, max_guests')
          .eq('chef_id', chef.id)
          .eq('is_active', true)
        
        services[chef.id] = serviceData || []
      }
      setServicesMap(services)
      setLoading(false)
    }

    fetchChefs()
  }, [searchParams, router])

  const summaryVariant = useCompareSummaryVariant(searchParams.get('compare_summary_variant') as 'control' | 'summary_cta' | null)

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
          <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading comparison...</p>
        </div>
        <Footer />
      </div>
    )
  }

  if (chefs.length < 2) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
          <div className="text-center">
            <h1 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Select at least 2 chefs to compare</h1>
            <Link href="/chefs" className="underline" style={{ color: 'var(--color-mdc-accent)' }}>Back to chefs</Link>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <div className="flex-1" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl" style={{ fontFamily: 'var(--font-serif)' }}>Compare Chefs</h1>
            <p className="mt-2" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Side-by-side comparison of {chefs.length} chefs
            </p>
          </div>

          {/* Summary CTA block — shown only for summary_cta variant */}
          {summaryVariant === 'summary_cta' && chefs.length >= 2 && (
            <CompareSummaryCTA chefs={chefs} />
          )}

          {/* Comparison Grid */}
          <div className="overflow-x-auto">
            <table className="w-full bg-white rounded-lg border shadow-sm" style={{ borderColor: 'var(--color-mdc-border)' }}>
              <thead>
                <tr>
                  <th className="text-left p-4 font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Attributes</th>
                  {chefs.map((chef) => (
                    <th key={chef.id} className="p-4 text-center min-w-[200px]">
                      <Link href={`/chefs/${chef.id}`} className="block hover:opacity-80 transition-opacity">
                        <img
                          src={chef.hero_image_url || 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=200&h=200&fit=crop'}
                          alt={chef.display_name || 'Chef'}
                          className="w-20 h-20 rounded-full object-cover mx-auto border-4"
                          style={{ borderColor: 'var(--color-mdc-border)' }}
                        />
                        <h3 className="mt-3 text-lg" style={{ fontFamily: 'var(--font-serif)' }}>{chef.display_name}</h3>
                        {chef.is_verified && (
                          <span className="inline-block mt-1 text-xs text-white px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>Verified</span>
                        )}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {/* Location */}
                <tr className="border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <td className="p-4 font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Location</td>
                  {chefs.map((chef) => (
                    <td key={chef.id} className="p-4 text-center">{chef.location || 'N/A'}</td>
                  ))}
                </tr>
                {/* Rating */}
                <tr className="border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <td className="p-4 font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Rating</td>
                  {chefs.map((chef) => (
                    <td key={chef.id} className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <StarRating rating={Math.round(chef.avg_rating || 0)} />
                        <span className="font-semibold">{chef.avg_rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>({chef.review_count || 0})</span>
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Cuisines */}
                <tr className="border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <td className="p-4 font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Cuisines</td>
                  {chefs.map((chef) => (
                    <td key={chef.id} className="p-4 text-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {chef.cuisines?.map((cuisine) => (
                          <span key={cuisine} className="text-xs px-2 py-1 rounded-full border" style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)', backgroundColor: 'var(--color-mdc-bg)' }}>
                            {cuisine}
                          </span>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
                {/* Price */}
                <tr className="border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <td className="p-4 font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Starting Price</td>
                  {chefs.map((chef) => (
                    <td key={chef.id} className="p-4 text-center">
                      <span className="font-semibold text-lg">${chef.price_per_event || 'Contact'}</span>
                      <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}> / event</span>
                    </td>
                  ))}
                </tr>
                {/* Experience */}
                <tr className="border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <td className="p-4 font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Experience</td>
                  {chefs.map((chef) => (
                    <td key={chef.id} className="p-4 text-center">
                      {chef.years_experience || 0} years
                    </td>
                  ))}
                </tr>
                {/* Max Guests */}
                <tr className="border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <td className="p-4 font-medium" style={{ color: 'var(--color-mdc-text-muted)' }}>Max Guests</td>
                  {chefs.map((chef) => (
                    <td key={chef.id} className="p-4 text-center">
                      {chef.max_guests || 'N/A'}
                    </td>
                  ))}
                </tr>
                {/* Bio */}
                <tr className="border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <td className="p-4 font-medium align-top" style={{ color: 'var(--color-mdc-text-muted)' }}>About</td>
                  {chefs.map((chef) => (
                    <td key={chef.id} className="p-4 text-center">
                      <p className="text-sm line-clamp-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        {chef.bio || 'No bio available.'}
                      </p>
                    </td>
                  ))}
                </tr>
                {/* Services */}
                <tr className="border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <td className="p-4 font-medium align-top" style={{ color: 'var(--color-mdc-text-muted)' }}>Services</td>
                  {chefs.map((chef) => {
                    const chefServices = servicesMap[chef.id] || []
                    return (
                      <td key={chef.id} className="p-4 text-center">
                        {chefServices.length > 0 ? (
                          <div className="space-y-2">
                            {chefServices.map((service) => (
                              <div key={service.id} className="text-sm p-2 rounded" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
                                <p className="font-medium">{service.title}</p>
                                {service.price_per_person && (
                                  <p style={{ color: 'var(--color-mdc-accent)' }}>${service.price_per_person}/person</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--color-mdc-text-muted)' }}>No services listed</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
                {/* Action */}
                <tr className="border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <td className="p-4"></td>
                  {chefs.map((chef) => (
                    <td key={chef.id} className="p-4 text-center">
                      <Link
                        href={`/book?chef_id=${chef.id}`}
                        className="inline-block px-6 py-2 rounded font-medium text-white transition-colors"
                        style={{ backgroundColor: 'var(--color-mdc-accent)' }}
                      >
                        Book Now
                      </Link>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Back Link */}
          <div className="mt-8">
            <Link href="/chefs" className="hover:underline" style={{ color: 'var(--color-mdc-accent)' }}>
              ← Back to all chefs
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}

function ComparePageLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading comparison...</p>
      </div>
      <Footer />
    </div>
  )
}

export default function ComparePage() {
  return (
    <Suspense fallback={<ComparePageLoading />}>
      <ComparePageContent />
    </Suspense>
  )
}