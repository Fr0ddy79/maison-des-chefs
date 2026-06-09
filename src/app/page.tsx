import { Metadata } from 'next'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { HeroCTA } from '@/components/HeroCTA'
import { StatsBar } from '@/components/StatsBar'
import { WaitlistCapture } from '@/components/WaitlistCapture'
import { createClient } from '@/lib/supabase/client'

const experiences = [
  {
    title: 'Intimate Prix Fixe Dinner',
    description: 'A refined multi-course dining experience for 2-8 guests. Perfect for special occasions and romantic evenings.',
    icon: '🍷',
    price: 'From $250',
  },
  {
    title: 'Cocktail & Hors d\'oeuvres',
    description: 'Elegant passed appetizers and cocktails for gatherings of 10-20. Sophisticated social dining.',
    icon: '🥂',
    price: 'From $400',
  },
  {
    title: 'Cooking Class Experience',
    description: 'Learn alongside a professional chef in your own kitchen. Hands-on with a delicious finale.',
    icon: '👨‍🍳',
    price: 'From $200',
  },
  {
    title: 'Celebration & Events',
    description: 'Full-service catering for birthdays, anniversaries, and milestones. Memorable feasts for any size.',
    icon: '🎉',
    price: 'From $600',
  },
]

const testimonials = [
  {
    quote: "Chef Laurent transformed our anniversary dinner into something truly magical. The attention to detail, the flavors, the presentation — absolutely unforgettable.",
    author: "Isabelle & Marc D.",
    location: "Westmount",
  },
  {
    quote: "We've hosted multiple dinner parties through Maison des Chefs. Each time, our guests leave amazed. It's become our secret for impressive entertaining.",
    author: "Jean-Pierre R.",
    location: "Old Montreal",
  },
  {
    quote: "As a chef, this platform lets me connect with clients who truly appreciate culinary artistry. The bookings are consistent, the clients are wonderful.",
    author: "Sophie T.",
    location: "Chef",
  },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`w-4 h-4 ${star <= rating ? '' : 'opacity-30'}`}
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

async function getFeaturedChefs() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('chef_profiles')
    .select('id, display_name, location, cuisines, avg_rating, review_count, price_per_event, hero_image_url, is_verified')
    .eq('is_verified', true)
    .order('avg_rating', { ascending: false })
    .limit(3)
  
  if (error) {
    console.error('Error fetching chefs:', error)
    return []
  }
  return data || []
}

async function getWeekendChefs() {
  const supabase = createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const nextWeek = new Date(today)
  nextWeek.setDate(nextWeek.getDate() + 7)
  
  const { data, error } = await supabase
    .from('availability')
    .select(`
      id,
      available_date,
      start_time,
      end_time,
      is_booked,
      chef_profiles (
        id, display_name, location, cuisines, avg_rating, review_count,
        price_per_event, hero_image_url, is_verified
      )
    `)
    .gte('available_date', today.toISOString().split('T')[0])
    .lt('available_date', nextWeek.toISOString().split('T')[0])
    .eq('is_booked', false)
    .order('available_date', { ascending: true })
    .limit(10)
  
  if (error) {
    console.error('Error fetching weekend chefs:', error)
    return []
  }
  // Deduplicate chefs (one entry per chef) and attach first available slot
  const seen = new Set<string>()
  const chefs: Array<{
    chef: Record<string, unknown>
    slot: { date: string; time: string }
  }> = []
  for (const row of (data || [])) {
    const chef = row.chef_profiles as unknown as Record<string, unknown> | null
    if (chef && !seen.has(chef.id as string)) {
      seen.add(chef.id as string)
      chefs.push({
        chef,
        slot: { date: row.available_date, time: row.start_time },
      })
    }
  }
  return chefs.slice(0, 3)
}

export const metadata: Metadata = {
  title: 'Private Chefs for Hire in Montreal | Maison des Chefs',
  description: 'Book verified private chefs in Montreal for unforgettable at-home dining experiences. From intimate dinners to grand celebrations.',
  keywords: [
    'private chef',
    'montreal',
    'at-home dining',
    'private chef hire',
    'personal chef montreal',
    'private chef booking',
    'in-home chef',
    'private chef for hire',
    'chef service montreal',
    'fine dining at home',
  ],
  openGraph: {
    title: 'Private Chefs for Hire in Montreal | Maison des Chefs',
    description: 'Book verified private chefs in Montreal for unforgettable at-home dining experiences. From intimate dinners to grand celebrations.',
    type: 'website',
    images: [
      {
        url: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&h=600&fit=crop',
        width: 1200,
        height: 600,
        alt: 'Elegant dinner table setting with fine wine and cuisine',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Private Chefs for Hire in Montreal | Maison des Chefs',
    description: 'Book verified private chefs in Montreal for unforgettable at-home dining experiences. From intimate dinners to grand celebrations.',
    images: ['https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&h=600&fit=crop'],
  },
}

// Schema.org Organization JSON-LD
const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Maison des Chefs',
  url: 'https://maisondeschefs.com',
  logo: 'https://maisondeschefs.com/logo.png',
  sameAs: [
    'https://www.instagram.com/maisondeschefs',
    'https://www.facebook.com/maisondeschefs',
    'https://www.linkedin.com/company/maisondeschefs',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    email: 'hello@maisondeschefs.com',
    availableLanguage: ['English', 'French'],
  },
}

// LocalBusiness schema for "private chef Montreal" local searches
const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'Maison des Chefs',
  description: 'Montreal\'s premier marketplace for booking verified private chefs for unforgettable at-home dining experiences.',
  url: 'https://maisondeschefs.com',
  image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&h=600&fit=crop',
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Montreal',
    addressRegion: 'QC',
    addressCountry: 'CA',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: 45.5017,
    longitude: -73.5673,
  },
  openingHoursSpecification: {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    opens: '09:00',
    closes: '21:00',
  },
  priceRange: '$$',
  telephone: '+1-514-555-0123',
  email: 'hello@maisondeschefs.com',
}

// Service schema for the booking service
const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Private Chef Booking Service',
  description: 'Book verified private chefs in Montreal for intimate dinners, cocktail parties, cooking classes, and celebrations.',
  provider: {
    '@type': 'Organization',
    name: 'Maison des Chefs',
    url: 'https://maisondeschefs.com',
  },
  areaServed: {
    '@type': 'City',
    name: 'Montreal',
  },
  serviceType: 'Private Chef Booking',
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Private Chef Experiences',
    itemListElement: [
      { '@type': 'Offer', name: 'Intimate Prix Fixe Dinner', priceRange: '$250+' },
      { '@type': 'Offer', name: 'Cocktail & Hors d\'oeuvres', priceRange: '$400+' },
      { '@type': 'Offer', name: 'Cooking Class Experience', priceRange: '$200+' },
      { '@type': 'Offer', name: 'Celebration & Events', priceRange: '$600+' },
    ],
  },
}

// FAQPage schema for featured snippets
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How much does a private chef cost in Montreal?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Private chef experiences in Montreal typically range from $200 to $600+ per event, depending on the type of experience, guest count, and chef expertise. Prix-fixe dinners start around $250 for 2-8 guests, while cocktail parties begin at $400 for 10-20 guests.',
      },
    },
    {
      '@type': 'Question',
      name: 'How do I book a private chef?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Booking is simple: browse our verified chef profiles, select your preferred date and experience type, and submit a booking request. You\'ll receive confirmation within hours. No payment is required until the chef confirms your booking.',
      },
    },
    {
      '@type': 'Question',
      name: 'What types of experiences are available?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'We offer intimate prix-fixe dinners, cocktail & hors d\'oeuvres parties, cooking class experiences, and full-service celebration catering. Each chef specializes in different cuisines and styles.',
      },
    },
    {
      '@type': 'Question',
      name: 'Are your chefs verified?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Every chef on Maison des Chefs passes our 3-step verification process: identity verification, culinary experience vetting, and in-home evaluation. Verified chefs display a badge on their profile.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I request a specific cuisine?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Absolutely. Our chefs specialize in French, Italian, Japanese, Mediterranean, and many other cuisines. Filter chefs by cuisine type when browsing to find your perfect match.',
      },
    },
  ],
}

// AggregateRating schema for star ratings in search results
const aggregateRatingSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Maison des Chefs - Private Chefs for Hire in Montreal',
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.9',
    reviewCount: '247',
    bestRating: '5',
    worstRating: '1',
  },
}

export default async function HomePage() {
  const featuredChefs = await getFeaturedChefs()
  const weekendChefs = await getWeekendChefs()

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aggregateRatingSchema) }}
      />
      <div className="flex flex-col min-h-screen">
        <Navigation />

      {/* Hero Section */}
      <section className="relative" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl lg:text-7xl leading-tight" style={{ fontFamily: 'var(--font-serif)' }}>
              Private chef experiences
              <br />
              <span style={{ color: 'var(--color-mdc-accent)' }}>in your home</span>
            </h1>
            <p className="mt-6 text-lg max-w-xl leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Montreal's premier marketplace connecting you with verified private chefs 
              for unforgettable at-home dining. From intimate dinners to grand celebrations.
            </p>
            <HeroCTA />

            {/* Service-type quick links */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <a
                href="/book?service_type=prix-fixe"
                className="flex items-center gap-3 p-4 rounded-lg border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md bg-white"
                style={{ borderColor: 'var(--color-mdc-border)' }}
              >
                <span className="text-2xl">🍽️</span>
                <div>
                  <p className="font-medium text-sm" style={{ fontFamily: 'var(--font-serif)' }}>Prix Fixe Dinner</p>
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Intimate multi-course</p>
                </div>
              </a>
              <a
                href="/book?service_type=cocktail"
                className="flex items-center gap-3 p-4 rounded-lg border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md bg-white"
                style={{ borderColor: 'var(--color-mdc-border)' }}
              >
                <span className="text-2xl">🥂</span>
                <div>
                  <p className="font-medium text-sm" style={{ fontFamily: 'var(--font-serif)' }}>Cocktail Party</p>
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Elegant passed apps</p>
                </div>
              </a>
              <a
                href="/book?service_type=cooking-class"
                className="flex items-center gap-3 p-4 rounded-lg border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md bg-white"
                style={{ borderColor: 'var(--color-mdc-border)' }}
              >
                <span className="text-2xl">👨‍🍳</span>
                <div>
                  <p className="font-medium text-sm" style={{ fontFamily: 'var(--font-serif)' }}>Cooking Class</p>
                  <p className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Hands-on learning</p>
                </div>
              </a>
            </div>

            <div className="mt-6">
              <StatsBar />
            </div>
          </div>
        </div>
        
        {/* Hero Image */}
        <div className="max-w-6xl mx-auto px-6 pb-16">
          <div className="relative rounded-lg overflow-hidden shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=1200&h=600&fit=crop"
              alt="Elegant dinner table setting with fine wine and cuisine"
              className="w-full h-80 md:h-96 object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        </div>

        {/* Inline Waitlist Capture */}
        <div className="max-w-6xl mx-auto px-6 pb-20">
          <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'rgba(201, 168, 76, 0.08)' }}>
            <h3 className="text-2xl mb-2" style={{ fontFamily: 'var(--font-serif)' }}>Stay in the Loop</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Get early access updates and chef announcements
            </p>
            <WaitlistCapture />
            <p className="mt-4 text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Join our community of food lovers for exclusive updates
            </p>
          </div>
        </div>
      </section>

      {/* Available This Weekend */}
      {weekendChefs.length > 0 && (
        <section className="py-16 md:py-20" style={{ backgroundColor: 'rgba(201, 168, 76, 0.05)' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-8">
              <span className="text-2xl">📅</span>
              <h2 className="text-3xl md:text-4xl" style={{ fontFamily: 'var(--font-serif)' }}>Available This Weekend</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {weekendChefs.map(({ chef, slot }) => (
                <a
                  key={(chef.id as string) + (slot.date)}
                  href={`/book?chef_id=${chef.id}&date=${slot.date}&time=${slot.time}`}
                  className="rounded-lg p-5 bg-white border transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
                  style={{ borderColor: 'var(--color-mdc-border)' }}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <img
                      src={chef.hero_image_url as string}
                      alt={chef.display_name as string}
                      className="w-14 h-14 rounded-full object-cover"
                    />
                    <div>
                      <h3 className="font-semibold" style={{ fontFamily: 'var(--font-serif)' }}>{chef.display_name as string}</h3>
                      <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>{chef.location as string}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    <span>📅 {new Date(slot.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span>🕐 {slot.time}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>How It Works</h2>
            <p className="mt-4 max-w-2xl mx-auto" style={{ color: 'var(--color-mdc-text-muted)' }}>
              From discovery to dining, we've made booking a private chef effortless
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)' }}>
                <span className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-mdc-accent)' }}>1</span>
              </div>
              <h3 className="text-xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>Discover & Browse</h3>
              <p className="leading-relaxed text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Explore our curated selection of Montreal's finest private chefs. 
                Filter by cuisine, availability, and budget to find your perfect match.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)' }}>
                <span className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-mdc-accent)' }}>2</span>
              </div>
              <h3 className="text-xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>Book Your Experience</h3>
              <p className="leading-relaxed text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Select your preferred date, menu style, and guest count. 
                Submit your booking request and receive confirmation within hours.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 168, 76, 0.1)' }}>
                <span className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-mdc-accent)' }}>3</span>
              </div>
              <h3 className="text-xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>Enjoy & Savor</h3>
              <p className="leading-relaxed text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Your chef arrives with everything needed for an extraordinary meal. 
                Sit back, relax, and create lasting memories with your guests.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section - Why Verified Chefs */}
      <section className="py-20 md:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center mb-12">
            <h2 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>How We Vet Our Chefs</h2>
            <p className="mt-4 text-lg" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Every chef on Maison des Chefs passes our 3-step verification process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 168, 76, 0.15)' }}>
                <svg className="w-7 h-7" style={{ color: 'var(--color-mdc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>Identity Verified</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Government-issued ID confirmed and cross-checked against international watchlists
              </p>
            </div>

            <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 168, 76, 0.15)' }}>
                <svg className="w-7 h-7" style={{ color: 'var(--color-mdc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <h3 className="text-xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>Experience Vetted</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Culinary background, portfolio review, and reference checks from past employers and clients
              </p>
            </div>

            <div className="rounded-lg p-8 text-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
              <div className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(201, 168, 76, 0.15)' }}>
                <svg className="w-7 h-7" style={{ color: 'var(--color-mdc-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <h3 className="text-xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>In-Home Evaluation</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                In-person cooking assessment in select markets ensures quality before listing approval
              </p>
            </div>
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
              <span style={{ color: 'var(--color-mdc-accent)' }}>✓</span> All chefs display their verification status — no guesswork, just confidence
            </p>
          </div>
        </div>
      </section>

      {/* Featured Chefs */}
      <section className="py-20 md:py-28" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-12">
            <div>
              <h2 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>Featured Chefs</h2>
              <p className="mt-4" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Handpicked culinary artists verified for excellence
              </p>
            </div>
            <a href="/chefs" className="mt-4 md:mt-0 font-medium hover:underline" style={{ color: 'var(--color-mdc-accent)' }}>
              View all chefs →
            </a>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featuredChefs.map((chef) => (
              <div
                key={chef.id}
                className="rounded-lg p-6 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg bg-white border"
                style={{ borderColor: 'var(--color-mdc-border)' }}
              >
                <div className="relative mb-6">
                  <a href={`/chefs/${chef.id}`}>
                    <img
                      src={chef.hero_image_url}
                      alt={`Chef ${chef.display_name} - ${chef.cuisines?.join(', ')} private chef in ${chef.location}`}
                      className="w-24 h-24 rounded-full object-cover mx-auto hover:opacity-90 transition-opacity"
                    />
                  </a>
                  {chef.is_verified && (
                    <div className="absolute bottom-0 right-1/2 translate-x-8 translate-y-1">
                      <span className="text-white text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>
                        Verified
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <a href={`/chefs/${chef.id}`} className="hover:opacity-80 transition-opacity">
                    <h3 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>{chef.display_name}</h3>
                  </a>
                  <p className="mt-1 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>{chef.location}</p>
                  
                  <div className="flex justify-center gap-2 mt-3 flex-wrap">
                    {chef.cuisines && chef.cuisines.map((cuisine: string) => (
                      <span key={cuisine} className="text-xs px-3 py-1 rounded-full border" style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)', backgroundColor: 'var(--color-mdc-bg)' }}>{cuisine}</span>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-center gap-3 mt-4">
                    <StarRating rating={Math.round(chef.avg_rating)} />
                    <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      {chef.avg_rating} ({chef.review_count})
                    </span>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                    <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>From </span>
                    <span className="font-semibold">${chef.price_per_event}</span>
                    <span className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}> / event</span>
                  </div>

                  <a
                    href={`/book?chef_id=${chef.id}`}
                    className="mt-4 block w-full py-2.5 rounded font-medium text-center text-white transition-colors hover:opacity-90"
                    style={{ backgroundColor: 'var(--color-mdc-accent)' }}
                  >
                    Book Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience Types */}
      <section id="experiences" className="py-20 md:py-28 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>Curated Experiences</h2>
            <p className="mt-4 max-w-2xl mx-auto" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Every occasion deserves a tailored culinary experience
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {experiences.map((exp, index) => {
              // Map experience type to service_type filter for chef listing links
  const serviceTypeMap: Record<string, string> = {
    'Intimate Prix Fixe Dinner':    'prix-fixe',
    "Cocktail & Hors d'oeuvres":     'cocktail',
    'Cooking Class Experience':      'cooking-class',
    'Celebration & Events':          'celebration',
  }
  const serviceType = serviceTypeMap[exp.title] || ''
  const href = `/chefs${serviceType ? `?service_type=${encodeURIComponent(serviceType)}` : ''}`
              return (
                <a
                  key={index}
                  href={href}
                  className="rounded-lg p-6 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md bg-white border"
                  style={{ borderColor: 'var(--color-mdc-border)' }}
                >
                  <span className="text-4xl">{exp.icon}</span>
                  <h3 className="text-xl mt-4" style={{ fontFamily: 'var(--font-serif)' }}>{exp.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                    {exp.description}
                  </p>
                  <div className="mt-4 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--color-mdc-border)' }}>
                    <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>{exp.price}</span>
                    <span className="text-xs" style={{ color: 'var(--color-mdc-text-muted)' }}>Browse chefs →</span>
                  </div>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 md:py-28" style={{ backgroundColor: 'var(--color-mdc-text)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl text-white" style={{ fontFamily: 'var(--font-serif)' }}>What People Are Saying</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="rounded-lg p-8 bg-white/5">
                <svg className="w-8 h-8 mb-4" style={{ color: 'var(--color-mdc-accent)' }} fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="leading-relaxed" style={{ color: '#d1d5db' }}>{testimonial.quote}</p>
                <div className="mt-6">
                  <p className="font-medium text-white">{testimonial.author}</p>
                  <p className="text-sm" style={{ color: '#6b7280' }}>{testimonial.location}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-28" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl text-white" style={{ fontFamily: 'var(--font-serif)' }}>Ready to elevate your next gathering?</h2>
          <p className="mt-4 max-w-2xl mx-auto text-white/80">
            Join hundreds of Montrealers who've discovered the joy of private chef dining. 
            Your next unforgettable meal is just a few clicks away.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/chefs" className="px-8 py-3 rounded font-medium transition-colors hover:bg-gray-100" style={{ backgroundColor: 'white', color: 'var(--color-mdc-accent)' }}>
              Find Your Chef
            </a>
            <a href="/chef/apply" className="border border-white text-white px-8 py-3 rounded font-medium transition-colors hover:bg-white/10">
              Are You a Chef? Apply Now
            </a>
          </div>
        </div>
      </section>

      <Footer />
      </div>
    </>
  )
}