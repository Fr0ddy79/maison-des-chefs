import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
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
    .order('avg_rating', { ascending: false })
    .limit(6)
  
  if (error) {
    console.error('Error fetching chefs:', error)
    return []
  }
  return data || []
}

export default async function HomePage() {
  const featuredChefs = await getFeaturedChefs()

  return (
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
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <a href="/chefs" className="px-6 py-3 rounded font-medium text-center text-white transition-colors" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>
                Find Your Chef
              </a>
              <a href="/chef/apply" className="px-6 py-3 rounded font-medium text-center transition-colors border" style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}>
                Are You a Chef? Apply
              </a>
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
      </section>

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
              <a
                key={chef.id}
                href={`/chefs/${chef.id}`}
                className="rounded-lg p-6 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-lg bg-white border"
                style={{ borderColor: 'var(--color-mdc-border)' }}
              >
                <div className="relative mb-6">
                  <img
                    src={chef.hero_image_url}
                    alt={chef.display_name}
                    className="w-24 h-24 rounded-full object-cover mx-auto"
                  />
                  {chef.is_verified && (
                    <div className="absolute bottom-0 right-1/2 translate-x-8 translate-y-1">
                      <span className="text-white text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>
                        Verified
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="text-center">
                  <h3 className="text-xl" style={{ fontFamily: 'var(--font-serif)' }}>{chef.display_name}</h3>
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
                </div>
              </a>
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
            {experiences.map((exp, index) => (
              <div key={index} className="rounded-lg p-6 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md bg-white border" style={{ borderColor: 'var(--color-mdc-border)' }}>
                <span className="text-4xl">{exp.icon}</span>
                <h3 className="text-xl mt-4" style={{ fontFamily: 'var(--font-serif)' }}>{exp.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                  {exp.description}
                </p>
                <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--color-mdc-border)' }}>
                  <span className="font-semibold" style={{ color: 'var(--color-mdc-accent)' }}>{exp.price}</span>
                </div>
              </div>
            ))}
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
            <a href="/signup" className="border border-white text-white px-8 py-3 rounded font-medium transition-colors hover:bg-white/10">
              Create Account
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}