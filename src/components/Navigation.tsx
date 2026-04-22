'use client'

import Link from 'next/link'

export function Navigation() {
  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b" style={{ borderColor: 'var(--color-mdc-border)' }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-serif text-xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>Maison des Chefs</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8">
          <Link href="/chefs" className="text-sm transition-colors hover:opacity-80" style={{ color: 'var(--color-mdc-text-muted)' }}>
            Browse Chefs
          </Link>
          <Link href="/#how-it-works" className="text-sm transition-colors hover:opacity-80" style={{ color: 'var(--color-mdc-text-muted)' }}>
            How It Works
          </Link>
          <Link href="/#experiences" className="text-sm transition-colors hover:opacity-80" style={{ color: 'var(--color-mdc-text-muted)' }}>
            Experiences
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link 
            href="/login" 
            className="text-sm px-4 py-2 transition-colors hover:opacity-80"
            style={{ color: 'var(--color-mdc-text-muted)' }}
          >
            Sign In
          </Link>
          <Link 
            href="/signup" 
            className="text-sm px-6 py-3 rounded font-medium transition-colors"
            style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  )
}
