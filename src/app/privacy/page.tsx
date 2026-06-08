'use client'

import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <main className="flex-1 py-12 md:py-20" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-3xl mx-auto px-6">
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Privacy Policy
            </h1>
            <p className="mt-3 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Last updated: June 2026
            </p>
          </div>

          <div className="space-y-10">

            {/* Introduction */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>Introduction</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Maison des Chefs (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform, located at{' '}
                <a href="https://maison-des-chefs.com" style={{ color: 'var(--color-mdc-accent)' }}>maison-des-chefs.com</a>. Please read this policy carefully. If you do not agree with its terms, please do not use our platform.
              </p>
            </section>

            {/* Data We Collect */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>1. Information We Collect</h2>

              <h3 className="text-lg mb-3 mt-6" style={{ fontFamily: 'var(--font-serif)' }}>1.1 Information You Provide Directly</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                <li><strong>Account Information:</strong> When you create an account, we collect your name, email address, password, and role (diner or chef).</li>
                <li><strong>Chef Profile Information:</strong> Chefs may provide additional information including biography, cuisine specialties, service offerings, pricing, dietary accommodations, and photos.</li>
                <li><strong>Booking Information:</strong> When you submit an inquiry or booking request, we collect the information you provide including event date, guest count, message, and contact details.</li>
                <li><strong>Communication Data:</strong> When you contact us, we may collect the content of your message and contact information.</li>
              </ul>

              <h3 className="text-lg mb-3 mt-6" style={{ fontFamily: 'var(--font-serif)' }}>1.2 Information Collected Automatically</h3>
              <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                <li><strong>Usage Data:</strong> We collect information about how you interact with our platform, including pages visited, features used, and referring URLs.</li>
                <li><strong>Device Information:</strong> We may collect your IP address, browser type, operating system, and device identifiers.</li>
                <li><strong>Cookies:</strong> We use cookies and similar tracking technologies to understand how you use our platform and to remember your preferences. See our Cookie section below for details.</li>
              </ul>
            </section>

            {/* How We Use Your Data */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>2. How We Use Your Information</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                <li>To create and manage your account</li>
                <li>To facilitate booking inquiries and communicate with chefs and diners</li>
                <li>To send transactional emails (booking confirmations, inquiry notifications, password resets)</li>
                <li>To respond to your support requests</li>
                <li>To improve and personalize our platform</li>
                <li>To detect and prevent fraudulent or abusive activity</li>
                <li>To comply with our legal obligations</li>
              </ul>
            </section>

            {/* Data Sharing */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>3. How We Share Your Information</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                <li><strong>With Chefs:</strong> When you submit a booking inquiry, your name and message are shared with the chef you are inquiring with. We do not share your email address with chefs without your explicit consent.</li>
                <li><strong>Service Providers:</strong> We share information with trusted third-party service providers who assist us in operating our platform, including our cloud hosting provider (Vercel), database (Supabase), email service (Resend), and payment processor (Stripe). These providers are contractually bound to protect your information.</li>
                <li><strong>Legal Compliance:</strong> We may disclose your information if required by law, court order, or government request, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction. We will notify you via email of any such change.</li>
              </ul>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>4. Data Retention</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                We retain your personal information for as long as your account is active or as needed to provide you services. We also retain information as necessary to comply with our legal obligations, resolve disputes, and enforce our agreements.
              </p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                When you delete your account, we will delete or anonymize your personal information within 30 days, except where retention is required by law (for example, tax records retention requirements of typically 7 years in Canada).
              </p>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>5. Cookies and Tracking</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                We use cookies and similar technologies to operate our platform. Cookies are small text files stored on your device.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                <li><strong>Essential Cookies:</strong> Required for the platform to function. They enable core features like account login and booking submissions.</li>
                <li><strong>Analytics Cookies:</strong> Help us understand how visitors use our platform so we can improve it. We use plausible.co for privacy-friendly analytics.</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences for future visits.</li>
              </ul>
              <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                You can control cookies through your browser settings. Disabling essential cookies may impair your ability to use the platform.
              </p>
            </section>

            {/* Data Security */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>6. Data Security</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes encryption in transit (HTTPS), access controls, and regular security reviews.
              </p>
              <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                While we strive to protect your information, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security, but we are committed to maintaining appropriate safeguards.
              </p>
            </section>

            {/* User Rights */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>7. Your Rights</h2>
              <p className="text-sm leading-relaxed mb-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Depending on your location, you may have the following rights regarding your personal information:
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                <li><strong>Access:</strong> Request a copy of the personal information we hold about you.</li>
                <li><strong>Correction:</strong> Request that we correct inaccurate or incomplete information.</li>
                <li><strong>Deletion:</strong> Request that we delete your personal information, subject to legal retention requirements.</li>
                <li><strong>Objection:</strong> Object to certain processing of your information, such as direct marketing.</li>
                <li><strong>Data Portability:</strong> Request a machine-readable copy of your data.</li>
              </ul>
              <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                To exercise any of these rights, contact us at <a href="mailto:support@maison-des-chefs.com" style={{ color: 'var(--color-mdc-accent)' }}>support@maison-des-chefs.com</a>. We will respond to your request within 30 days.
              </p>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>8. Children&apos;s Privacy</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Our platform is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If you believe we have inadvertently collected information from a child, please contact us immediately and we will delete it.
              </p>
            </section>

            {/* Third-Party Links */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>9. Third-Party Links</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                Our platform may contain links to third-party websites, services, or applications not operated by us. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any personal information.
              </p>
            </section>

            {/* Changes to Policy */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>10. Changes to This Policy</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                We may update this Privacy Policy from time to time. We will post any changes on this page and update the &quot;Last updated&quot; date at the top. For significant changes, we will provide a more prominent notice, such as an email notification.
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-2xl mb-4" style={{ fontFamily: 'var(--font-serif)' }}>11. Contact Us</h2>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--color-mdc-text-muted)' }}>
                If you have questions, concerns, or requests regarding this Privacy Policy, please contact us at:
              </p>
              <p className="text-sm leading-relaxed mt-3" style={{ color: 'var(--color-mdc-text-muted)' }}>
                <strong>Maison des Chefs</strong><br />
                Email: <a href="mailto:support@maison-des-chefs.com" style={{ color: 'var(--color-mdc-accent)' }}>support@maison-des-chefs.com</a>
              </p>
            </section>

          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}