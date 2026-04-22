import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'
import { ChefApplyForm } from './ChefApplyForm'

export default function ChefApplyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <main className="flex-1 py-12 md:py-20" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Apply as a Chef
            </h1>
            <p className="mt-4 text-lg" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Join our community of exceptional private chefs and connect with discerning diners in Montreal.
            </p>
          </div>

          <ChefApplyForm />
        </div>
      </main>

      <Footer />
    </div>
  )
}
