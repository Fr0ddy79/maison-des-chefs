import Link from 'next/link'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

export default function NotFound() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <main className="flex-1 flex items-center justify-center px-6 py-24" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-lg text-center">
          {/* 404 Display */}
          <div className="mb-8">
            <span
              className="text-9xl font-semibold tracking-tight select-none"
              style={{ fontFamily: 'var(--font-serif)', color: 'var(--color-mdc-border)' }}
 aria-hidden="true"
            >
              404
            </span>
          </div>

          {/* Message */}
          <h1
            className="text-4xl md:text-5xl mb-4"
            style={{ fontFamily: 'var(--font-serif)' }}
          >
            Page not found
          </h1>
          <p
            className="text-lg mb-10"
            style={{ color: 'var(--color-mdc-text-muted)' }}
          >
            Looks like this page has left the kitchen.
<br />
            Let's get you back on track.
          </p>

          {/* Navigation Links */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="px-6 py-3 rounded font-medium transition-colors hover:opacity-90"
              style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
            >
              Back to Home
            </Link>
            <Link
              href="/chefs"
              className="px-6 py-3 rounded font-medium border transition-colors hover:opacity-90"
              style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text)' }}
            >
              Browse Chefs
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 rounded font-medium border transition-colors hover:opacity-90"
              style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text)' }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
