import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { ChefProfileHeroSkeleton, ServiceCardSkeleton, ReviewSkeleton } from '@/components/Skeleton'

export default function ChefProfileLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <div className="flex-1" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        {/* Hero Banner Skeleton */}
        <div className="relative h-64 md:h-80 animate-pulse" style={{ backgroundColor: '#e5e5e5' }} />

        <div className="max-w-6xl mx-auto px-6 -mt-32 relative z-10">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Main Content */}
            <main className="flex-1">
              {/* Chef Header Card Skeleton */}
              <div className="rounded-lg p-6 bg-white border shadow-sm mb-8">
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full animate-pulse mx-auto md:mx-0" style={{ backgroundColor: '#e5e5e5' }} />
                  <div className="flex-1 space-y-4 text-center md:text-left">
                    <div className="space-y-2">
                      <div className="h-8 w-48 animate-pulse mx-auto md:mx-0 rounded" style={{ backgroundColor: '#e5e5e5' }} />
                      <div className="h-4 w-32 animate-pulse mx-auto md:mx-0 rounded" style={{ backgroundColor: '#e5e5e5' }} />
                    </div>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                      <div className="h-7 w-20 animate-pulse rounded-full" style={{ backgroundColor: '#e5e5e5' }} />
                      <div className="h-7 w-20 animate-pulse rounded-full" style={{ backgroundColor: '#e5e5e5' }} />
                      <div className="h-7 w-20 animate-pulse rounded-full" style={{ backgroundColor: '#e5e5e5' }} />
                    </div>
                    <div className="flex items-center justify-center md:justify-start gap-4">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="w-5 h-5 animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                        ))}
                      </div>
                      <div className="h-4 w-24 animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* About Skeleton */}
              <div className="rounded-lg p-6 bg-white border shadow-sm mb-8">
                <div className="h-6 w-24 animate-pulse rounded mb-4" style={{ backgroundColor: '#e5e5e5' }} />
                <div className="space-y-2">
                  <div className="h-4 w-full animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                  <div className="h-4 w-full animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                  <div className="h-4 w-3/4 animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                </div>
              </div>

              {/* Services Skeleton */}
              <div className="mb-8">
                <div className="h-6 w-40 animate-pulse rounded mb-4" style={{ backgroundColor: '#e5e5e5' }} />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ServiceCardSkeleton />
                  <ServiceCardSkeleton />
                  <ServiceCardSkeleton />
                </div>
              </div>

              {/* Reviews Skeleton */}
              <div className="rounded-lg p-6 bg-white border shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="h-6 w-24 animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                  <div className="h-4 w-20 animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                </div>
                <div className="space-y-6">
                  <ReviewSkeleton />
                  <ReviewSkeleton />
                  <ReviewSkeleton />
                </div>
              </div>
            </main>

            {/* Booking Sidebar Skeleton */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="rounded-lg p-6 bg-white border shadow-sm sticky top-24 space-y-4">
                <div className="h-6 w-32 animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                    <div className="h-10 w-full animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-24 animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                    <div className="h-10 w-full animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="h-4 w-16 animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                      <div className="h-10 w-full animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-16 animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                      <div className="h-10 w-full animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                    </div>
                  </div>
                  <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--color-mdc-border)' }}>
                    <div className="h-4 w-full animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                    <div className="h-4 w-2/3 animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
                  </div>
                  <div className="h-11 w-full animate-pulse rounded" style={{ backgroundColor: '#e5e5e5' }} />
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
