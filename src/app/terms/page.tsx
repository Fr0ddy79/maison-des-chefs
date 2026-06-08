'use client'

import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <main className="flex-1 py-12 md:py-20" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Terms of Service
            </h1>
            <p className="mt-3 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Last updated: June 2026
            </p>
          </div>

          <div className="space-y-10">

            {/* Account Responsibilities */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>1. Account Responsibilities</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                When you create an account with Maison des Chefs, you are responsible for maintaining the confidentiality of your login credentials. You agree to notify us immediately at <a href="mailto:support@maison-des-chefs.com" style={{ color: 'var(--color-mdc-accent)' }}>support@maison-des-chefs.com</a> if you become aware of any unauthorized use of your account.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                You are solely responsible for all activity that occurs under your account. We reserve the right to suspend or terminate accounts that violate these terms or are used for fraudulent activity.
              </p>
            </section>

            {/* Service Description */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>2. Service Description</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Maison des Chefs operates a marketplace that connects diners with private chefs. We facilitate the discovery, inquiry, and booking process between chefs and diners, but we are not a party to the actual service agreement between them.
              </p>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                The chefs using our platform are independent professionals. They set their own pricing, menus, and service terms. Maison des Chefs does not employ or directly control any chefs listed on the platform.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                When you book a private chef through our platform, you are entering into a direct agreement with that chef. Any disputes arising from the chef&apos;s service should be resolved directly with the chef.
              </p>
            </section>

            {/* Payment Terms */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>3. Payment Terms</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Chefs set and manage their own pricing on the platform. All payment arrangements, including deposits, full payment, and refunds, are agreed upon directly between the diner and the chef.
              </p>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Maison des Chefs may facilitate payment processing through third-party services (such as Stripe). When payment processing is enabled, applicable fees will be clearly disclosed before you complete the transaction.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                You authorize any charges incurred in connection with your bookings. If a dispute arises regarding a payment, you agree to work with the chef and any payment processor to resolve the matter.
              </p>
            </section>

            {/* Cancellation Policy */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>4. Cancellation Policy</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Cancellation terms are set by individual chefs and will be communicated at the time of booking confirmation. We encourage diners to discuss cancellation policies with chefs before confirming a reservation.
              </p>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                If a chef cancels a confirmed booking, please contact us at <a href="mailto:support@maison-des-chefs.com" style={{ color: 'var(--color-mdc-accent)' }}>support@maison-des-chefs.com</a> and we will assist in finding an alternative chef or processing a refund if payment was made through our platform.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Maison des Chefs reserves the right to remove chefs who demonstrate a pattern of cancellations without valid reason.
              </p>
            </section>

            {/* Liability Disclaimers */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>5. Liability Disclaimers</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Maison des Chefs acts as an intermediary and does not guarantee the quality, safety, or legality of any chef&apos;s services. All bookings are made at the diner&apos;s own risk.
              </p>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                To the fullest extent permitted by law, Maison des Chefs disclaims all warranties, express or implied, including warranties of merchantability and fitness for a particular purpose.
              </p>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                In no event shall Maison des Chefs be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the platform or services booked through it.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Our total liability for any claim arising from your use of this platform shall not exceed the amount you paid to Maison des Chefs in the twelve months preceding the claim.
              </p>
            </section>

            {/* Chef Responsibilities */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>6. Chef Responsibilities</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Chefs using Maison des Chefs must ensure they hold all required licenses, certifications, and permits necessary to operate as a private chef in their jurisdiction.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Chefs are solely responsible for the food safety and quality of the services they provide. Maison des Chefs does not inspect or verify individual chefs beyond the application review process.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Chefs agree to communicate clearly and professionally with diners, and to honor confirmed booking commitments unless prevented by genuine emergency.
              </p>
            </section>

            {/* Platform Changes */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>7. Platform Changes</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                We reserve the right to modify, suspend, or discontinue any part of the platform at any time with or without notice. We will make reasonable efforts to provide advance notice of significant changes.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                We may update these Terms of Service from time to time. Continued use of the platform after any changes constitutes your acceptance of the revised terms.
              </p>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>8. Governing Law</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                These Terms of Service are governed by the laws of the Province of Quebec and the federal laws of Canada applicable therein. Any disputes shall be resolved in the courts of Quebec, Canada.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>9. Contact</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                For questions about these Terms of Service, contact us at{' '}
                <a href="mailto:support@maison-des-chefs.com" style={{ color: 'var(--color-mdc-accent)' }}>support@maison-des-chefs.com</a>.
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}