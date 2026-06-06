'use client'

import { useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

const SUBJECTS = [
  { value: 'general', label: 'General' },
  { value: 'booking_issue', label: 'Booking Issue' },
  { value: 'chef_partnership', label: 'Chef Partnership' },
  { value: 'other', label: 'Other' },
]

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [serverError, setServerError] = useState('')

  function validate() {
    const newErrors: Record<string, string> = {}
    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = 'Please enter a valid email address'
    }
    if (!form.subject) newErrors.subject = 'Please select a subject'
    if (!form.message.trim()) {
      newErrors.message = 'Message is required'
    } else if (form.message.trim().length > 2000) {
      newErrors.message = 'Message must be 2000 characters or fewer'
    }
    return newErrors
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationErrors = validate()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    setServerError('')
    setSubmitting(true)

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
      } else {
        setServerError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setServerError('Something went wrong. Please try again.')
    }
    setSubmitting(false)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  if (success) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-1 flex items-center justify-center py-20 px-6" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
          <div className="max-w-md w-full text-center">
            <div className="text-5xl mb-6">✉️</div>
            <h1 className="text-3xl mb-3" style={{ fontFamily: 'var(--font-serif)' }}>Message Sent!</h1>
            <p className="text-lg mb-8" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Thank you for reaching out. We'll get back to you within 24–48 hours.
            </p>
            <button
              onClick={() => { setSuccess(false); setForm({ name: '', email: '', subject: '', message: '' }) }}
              className="px-6 py-3 rounded font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
            >
              Send Another Message
            </button>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <main className="flex-1 py-12 md:py-20" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-2xl mx-auto px-6">
          <div className="text-center mb-10">
            <h1 className="text-4xl md:text-5xl" style={{ fontFamily: 'var(--font-serif)' }}>
              Contact Us
            </h1>
            <p className="mt-4 text-lg" style={{ color: 'var(--color-mdc-text-muted)' }}>
              Have a question or need help? We're here for you.
            </p>
          </div>

          <div className="rounded-xl p-8 bg-white border shadow-sm">
<form onSubmit={handleSubmit} noValidate>
              <div className="space-y-5">
                {/* Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-mdc-text)' }}>
                    Name <span style={{ color: 'var(--color-mdc-error)' }}>*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="w-full px-4 py-3 rounded-lg border text-sm"
                    style={{ borderColor: errors.name ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)' }}
                  />
                  {errors.name && (
                    <p className="mt-1.5 text-sm" style={{ color: 'var(--color-mdc-error)' }}>{errors.name}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-mdc-text)' }}>
                    Email <span style={{ color: 'var(--color-mdc-error)' }}>*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-lg border text-sm"
                    style={{ borderColor: errors.email ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)' }}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-sm" style={{ color: 'var(--color-mdc-error)' }}>{errors.email}</p>
                  )}
                </div>

                {/* Subject */}
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-mdc-text)' }}>
                    Subject <span style={{ color: 'var(--color-mdc-error)' }}>*</span>
                  </label>
                  <select
                    id="subject"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-lg border text-sm"
                    style={{ borderColor: errors.subject ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)' }}
                  >
                    <option value="">Select a subject</option>
                    {SUBJECTS.map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {errors.subject && (
                    <p className="mt-1.5 text-sm" style={{ color: 'var(--color-mdc-error)' }}>{errors.subject}</p>
                  )}
                </div>

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-mdc-text)' }}>
                    Message <span style={{ color: 'var(--color-mdc-error)' }}>*</span>
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    placeholder="How can we help you?"
                    rows={6}
                    className="w-full px-4 py-3 rounded-lg border text-sm resize-none"
                    style={{ borderColor: errors.message ? 'var(--color-mdc-error)' : 'var(--color-mdc-border)' }}
                  />
                  <div className="flex justify-between mt-1.5">
                    {errors.message ? (
                      <p className="text-sm" style={{ color: 'var(--color-mdc-error)' }}>{errors.message}</p>
                    ) : <span />}
                    <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                      {form.message.length}/2000
                    </p>
                  </div>
                </div>
              </div>

              {serverError && (
                <div className="mt-5 p-4 rounded-lg" style={{ backgroundColor: 'rgba(220, 38, 38, 0.08)', border: '1px solid rgba(220, 38, 38, 0.2)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-mdc-error)' }}>{serverError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-6 w-full py-3 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-mdc-accent)', color: 'white' }}
              >
                {submitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
