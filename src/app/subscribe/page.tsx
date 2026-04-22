import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { SubscribeForm } from './SubscribeForm'

export default function SubscribePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <main className="flex-1 py-16 md:py-24" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-xl mx-auto px-6">
          <div className="text-center mb-8">
            <span 
              className="inline-block px-4 py-1.5 rounded-full text-sm font-medium mb-6"
              style={{ 
                backgroundColor: 'rgba(201, 168, 76, 0.12)', 
                color: 'var(--color-mdc-accent)' 
              }}
            >
              Coming Soon
            </span>
            <h1 
              className="text-4xl md:text-5xl mb-4"
              style={{ fontFamily: 'var(--font-serif)' }}
            >
              Be the First to Experience<br />
              <span style={{ color: 'var(--color-mdc-accent)' }}>Maison des Chefs</span>
            </h1>
            <p 
              className="text-lg md:text-xl leading-relaxed"
              style={{ color: 'var(--color-mdc-text-muted)' }}
            >
              Join our exclusive waitlist for early access to Montreal&apos;s most exceptional private chefs. 
              Reserve your next unforgettable dining experience before we open our doors.
            </p>
          </div>

          <SubscribeForm />

          <div className="mt-8 text-center">
            <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Join <span className="font-medium" style={{ color: 'var(--color-mdc-text)' }}>500+ food lovers</span> already on the waitlist
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
