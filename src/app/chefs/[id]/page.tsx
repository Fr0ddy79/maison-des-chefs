'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { trackServicePageView } from '@/lib/analytics'

// Mock data - will be replaced with Supabase queries
const chefData = {
  id: '1',
  display_name: 'Chef Laurent Mercier',
  location: 'Montreal, QC',
  cuisines: ['French', 'Contemporary', 'Fine Dining', 'Mediterranean'],
  years_experience: 15,
  is_verified: true,
  avg_rating: 4.9,
  review_count: 47,
  price_per_hour: 85,
  price_per_event: 350,
  max_guests: 12,
  hero_image_url: 'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&h=800&fit=crop',
  bio: `Born in Lyon and trained at Le Cordon Bleu Paris, Laurent spent 12 years refining his craft in Michelin-starred kitchens across France before falling in love with Montreal's vibrant food scene.

His cooking is a celebration of classical French techniques married with Quebec's exceptional seasonal ingredients. Laurent believes that the best meals tell stories—of places, of people, of traditions passed down through generations.

"When I cook for a family in their home, I'm not just preparing food. I'm creating a memory they'll treasure forever. That's a responsibility I take very seriously."`,
}

const services = [
  {
    id: '1',
    title: 'Intimate Prix Fixe Dinner',
    description: 'A refined 4-course tasting menu for 2-6 guests. Perfect for anniversaries, proposals, or simply celebrating life\'s beautiful moments.',
    duration_hours: 3,
    price_per_person: 120,
    max_guests: 6,
  },
  {
    id: '2',
    title: 'Grand Dinner Party',
    description: 'An elaborate 5-course feast for 7-12 guests. Ideal for larger celebrations with multiple courses and wine pairings available.',
    duration_hours: 4,
    price_per_person: 95,
    max_guests: 12,
  },
  {
    id: '3',
    title: 'Cocktail & Passed Appetizers',
    description: 'Elegant hors d\'oeuvres for mingling events. 10-15 varieties of bite-sized delicacies for social gatherings of 10-20.',
    duration_hours: 2.5,
    price_per_person: 65,
    max_guests: 20,
  },
]

const reviews = [
  {
    id: '1',
    author: 'Isabelle D.',
    location: 'Westmount',
    rating: 5,
    date: 'October 2024',
    comment: 'Chef Laurent created an absolutely magical evening for our anniversary. Every course was a work of art, and his attention to our dietary restrictions was impeccable. Our guests were speechless.',
  },
  {
    id: '2',
    author: 'Marc R.',
    location: 'Downtown',
    rating: 5,
    date: 'September 2024',
    comment: 'We\'ve used Chef Laurent three times now, and each experience has been better than the last. His truffle risotto alone is worth the booking.',
  },
  {
    id: '3',
    author: 'Sophie L.',
    location: 'Old Montreal',
    rating: 5,
    date: 'August 2024',
    comment: 'Professional, punctual, and incredibly talented. Laurent transformed our backyard into a fine dining destination. The lamb was transcendent.',
  },
]

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={sizeClass}
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

export default function ChefDetailPage() {
  // Track service page views on mount
  useEffect(() => {
    services.forEach((service) => {
      trackServicePageView({
        service_id: service.id,
        chef_id: chefData.id,
        price_per_person: service.price_per_person,
        cuisine_type: chefData.cuisines[0] || null,
      })
    })
  }, [])

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <div className="flex-1" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        {/* Hero Banner */}
        <div className="relative h-64 md:h-80" style={{ backgroundColor: 'var(--color-mdc-text)' }}>
          <img
            src={chefData.hero_image_url}
            alt={chefData.display_name}
            className="w-full h-full object-cover"
            style={{ opacity: 0.6 }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        </div>

        <div className="max-w-6xl mx-auto px-6 -mt-32 relative z-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content */}
            <main className="flex-1">
              {/* Chef Header Card */}
              <div className="rounded-lg p-6 bg-white border shadow-sm mb-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <img
                    src={chefData.hero_image_url}
                    alt={chefData.display_name}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover mx-auto md:mx-0 border-4 border-white shadow-lg"
                    style={{ borderWidth: '4px', borderColor: 'white' }}
                  />
                  <div className="flex-1 text-center md:text-left">
                    <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
                      <h1 className="text-3xl" style={{ fontFamily: 'var(--font-serif)' }}>{chefData.display_name}</h1>
                      {chefData.is_verified && (
                        <span className="text-white text-xs px-3 py-1 rounded-full" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>Verified Chef</span>
                      )}
                    </div>
                    <p className="mt-1" style={{ color: 'var(--color-mdc-text-muted)' }}>{chefData.location}</p>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                      {chefData.cuisines.map((cuisine) => (
                        <span key={cuisine} className="text-sm px-3 py-1 rounded-full border" style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)', backgroundColor: 'var(--color-mdc-bg)' }}>{cuisine}</span>
                      ))}
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4 mt-6 justify-center md:justify-start">
                      <div className="flex items-center gap-2">
                        <StarRating rating={Math.round(chefData.avg_rating)} size="lg" />
                        <span className="font-semibold text-lg">{chefData.avg_rating}</span>
                        <span style={{ color: 'var(--color-mdc-text-muted)' }}>({chefData.review_count} reviews)</span>
                      </div>
                      <span className="hidden sm:block" style={{ color: 'var(--color-mdc-border)' }}>|</span>
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>{chefData.years_experience} years experience</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* About */}
              <div className="rounded-lg p-6 bg-white border shadow-sm mb-8">
                <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>About</h2>
                <div className="space-y-4">
                  {chefData.bio.split('\n\n').map((paragraph, i) => (
                    <p key={i} className="leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>

              {/* Services */}
              <div className="mb-8">
                <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Services & Pricing</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <div key={service.id} className="rounded-lg p-6 bg-white border shadow-sm">
                      <h3 className="text-lg" style={{ fontFamily: 'var(--font-serif)' }}>{service.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        {service.description}
                      </p>
                      <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                        <div className="flex justify-between text-sm">
                          <span style={{ color: 'var(--color-mdc-text-muted)' }}>Duration</span>
                          <span>{service.duration_hours} hours</span>
                        </div>
                        <div className="flex justify-between text-sm mt-2">
                          <span style={{ color: 'var(--color-mdc-text-muted)' }}>Max guests</span>
                          <span>{service.max_guests}</span>
                        </div>
                        <div className="flex justify-between font-semibold mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                          <span>Price per person</span>
                          <span style={{ color: 'var(--color-mdc-accent)' }}>${service.price_per_person}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews */}
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl" style={{ fontFamily: 'var(--font-serif)' }}>Reviews</h2>
                  <span style={{ color: 'var(--color-mdc-text-muted)' }}>{reviews.length} reviews</span>
                </div>
                <div className="space-y-6">
                  {reviews.map((review) => (
                    <div key={review.id} className="pb-6 border-b last:border-0 last:pb-0" style={{ borderColor: 'var(--color-mdc-border)' }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)' }}>
                          <span className="font-medium" style={{ color: 'var(--color-mdc-accent)' }}>
                            {review.author.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{review.author}</p>
                          <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>{review.location} • {review.date}</p>
                        </div>
                        <div className="ml-auto">
                          <StarRating rating={review.rating} />
                        </div>
                      </div>
                      <p className="mt-4 leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                        {review.comment}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </main>

            {/* Booking Sidebar */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="rounded-lg p-6 bg-white border shadow-sm sticky top-24">
                <h3 className="text-xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Book This Chef</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Select Service</label>
                    <select className="w-full px-4 py-3 rounded border bg-white" style={{ borderColor: 'var(--color-mdc-border)' }}>
                      {services.map((s) => (
                        <option key={s.id} value={s.id}>{s.title}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium block mb-1.5">Preferred Date</label>
                    <input type="date" className="w-full px-4 py-3 rounded border bg-white" style={{ borderColor: 'var(--color-mdc-border)' }} />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Guests</label>
                      <select className="w-full px-4 py-3 rounded border bg-white" style={{ borderColor: 'var(--color-mdc-border)' }}>
                        {[...Array(chefData.max_guests)].map((_, i) => (
                          <option key={i + 1} value={i + 1}>{i + 1} guest{i > 0 ? 's' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium block mb-1.5">Duration</label>
                      <select className="w-full px-4 py-3 rounded border bg-white" style={{ borderColor: 'var(--color-mdc-border)' }}>
                        <option value="2">2 hours</option>
                        <option value="3">3 hours</option>
                        <option value="4">4 hours</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                    <div className="flex justify-between text-sm mb-2">
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>Estimated total</span>
                      <span className="font-semibold">Contact for quote</span>
                    </div>
                  </div>

                  <Link href="/book" className="block text-center px-6 py-3 rounded font-medium text-white transition-colors" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>
                    Request Booking
                  </Link>

                  <p className="text-xs text-center" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    No payment required for booking request
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
