'use client'

import { Suspense } from 'react'
import { BookPageContent } from './BookPageContent'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

function BookPageFallback() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <p style={{ color: 'var(--color-mdc-text-muted)' }}>Loading...</p>
      </div>
      <Footer />
    </div>
  )
}

export default function BookPage() {
  return (
    <Suspense fallback={<BookPageFallback />}>
      <BookPageContent />
    </Suspense>
  )
}
