'use client'

import { useState } from 'react'
import { Navigation } from '@/components/Navigation'
import { Footer } from '@/components/Footer'

const steps = ['Select Chef', 'Choose Date & Time', 'Guest Details', 'Confirm']

export default function BookPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    chefId: '',
    date: '',
    time: '',
    guestCount: 2,
    name: '',
    email: '',
    phone: '',
    specialRequests: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Submit to Supabase
    alert('Booking request submitted! (Demo mode)')
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navigation />

      <div className="flex-1" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
        <div className="max-w-3xl mx-auto px-6 py-12">
          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors"
                      style={{
                        backgroundColor: index <= currentStep ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)',
                        color: index <= currentStep ? 'white' : 'var(--color-mdc-text-muted)',
                      }}
                    >
                      {index < currentStep ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span 
                      className="text-xs mt-2"
                      style={{ color: index <= currentStep ? 'var(--color-mdc-text)' : 'var(--color-mdc-text-muted)' }}
                    >
                      {step}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div 
                      className="w-16 h-0.5 mx-2 mt-[-20px]" 
                      style={{ backgroundColor: index < currentStep ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)' }} 
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div className="rounded-lg p-8 bg-white border shadow-sm">
            {currentStep === 0 && (
              <div>
                <h2 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Select Your Chef</h2>
                <p className="mb-6" style={{ color: 'var(--color-mdc-text-muted)' }}>
                  Choose from our verified Montreal private chefs. Each has been vetted for quality and professionalism.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { id: '1', name: 'Chef Laurent Mercier', cuisine: 'French', price: 350 },
                    { id: '2', name: 'Chef Sophie Tremblay', cuisine: 'Seafood', price: 400 },
                    { id: '3', name: 'Chef Marco Pelletier', cuisine: 'Italian', price: 300 },
                  ].map((chef) => (
                    <button
                      key={chef.id}
                      onClick={() => {
                        setFormData({ ...formData, chefId: chef.id })
                        setCurrentStep(1)
                      }}
                      className="p-4 rounded border text-left transition-colors"
                      style={{
                        borderColor: formData.chefId === chef.id ? 'var(--color-mdc-accent)' : 'var(--color-mdc-border)',
                        backgroundColor: formData.chefId === chef.id ? 'rgba(201, 168, 76, 0.05)' : 'transparent',
                      }}
                    >
                      <p className="font-medium">{chef.name}</p>
                      <p className="text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>{chef.cuisine}</p>
                      <p className="text-sm mt-2">From ${chef.price} / event</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div>
                <h2 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Choose Date & Time</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Preferred Date</label>
                    <input
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-3 rounded border bg-white"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Preferred Time</label>
                    <select
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="w-full px-4 py-3 rounded border bg-white"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                    >
                      <option value="">Select a time</option>
                      <option value="17:00">5:00 PM</option>
                      <option value="17:30">5:30 PM</option>
                      <option value="18:00">6:00 PM</option>
                      <option value="18:30">6:30 PM</option>
                      <option value="19:00">7:00 PM</option>
                      <option value="19:30">7:30 PM</option>
                      <option value="20:00">8:00 PM</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6">
                  <label className="text-sm font-medium block mb-1.5">Number of Guests</label>
                  <select
                    value={formData.guestCount}
                    onChange={(e) => setFormData({ ...formData, guestCount: Number(e.target.value) })}
                    className="w-full max-w-[200px] px-4 py-3 rounded border bg-white"
                    style={{ borderColor: 'var(--color-mdc-border)' }}
                  >
                    {[2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => (
                      <option key={n} value={n}>{n} guests</option>
                    ))}
                  </select>
                </div>
                <div className="mt-8 flex gap-4">
                  <button onClick={() => setCurrentStep(0)} className="px-6 py-3 rounded font-medium transition-colors border" style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}>Back</button>
                  <button
                    onClick={() => setCurrentStep(2)}
                    disabled={!formData.date || !formData.time}
                    className="px-6 py-3 rounded font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-mdc-accent)' }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div>
                <h2 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Your Details</h2>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-3 rounded border bg-white"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded border bg-white"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                      placeholder="you@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded border bg-white"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                      placeholder="(514) 555-0123"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5">Special Requests (optional)</label>
                    <textarea
                      value={formData.specialRequests}
                      onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                      className="w-full min-h-[100px] px-4 py-3 rounded border bg-white resize-none"
                      style={{ borderColor: 'var(--color-mdc-border)' }}
                      placeholder="Dietary restrictions, allergies, celebration notes..."
                    />
                  </div>
                </div>
                <div className="mt-8 flex gap-4">
                  <button onClick={() => setCurrentStep(1)} className="px-6 py-3 rounded font-medium transition-colors border" style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}>Back</button>
                  <button
                    onClick={() => setCurrentStep(3)}
                    disabled={!formData.name || !formData.email || !formData.phone}
                    className="px-6 py-3 rounded font-medium text-white transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--color-mdc-accent)' }}
                  >
                    Review Booking
                  </button>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl mb-6" style={{ fontFamily: 'var(--font-serif)' }}>Confirm Your Booking</h2>
                <div className="rounded-lg p-6" style={{ backgroundColor: 'var(--color-mdc-bg)' }}>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>Chef</span>
                      <span className="font-medium">
                        {formData.chefId === '1' ? 'Chef Laurent Mercier' : formData.chefId === '2' ? 'Chef Sophie Tremblay' : 'Chef Marco Pelletier'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>Date</span>
                      <span className="font-medium">{formData.date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>Time</span>
                      <span className="font-medium">{formData.time}</span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>Guests</span>
                      <span className="font-medium">{formData.guestCount}</span>
                    </div>
                    <div className="border-t pt-4 flex justify-between" style={{ borderColor: 'var(--color-mdc-border)' }}>
                      <span style={{ color: 'var(--color-mdc-text-muted)' }}>Contact</span>
                      <span className="font-medium">{formData.name} ({formData.email})</span>
                    </div>
                    {formData.specialRequests && (
                      <div className="border-t pt-4" style={{ borderColor: 'var(--color-mdc-border)' }}>
                        <span style={{ color: 'var(--color-mdc-text-muted)' }}>Special Requests</span>
                        <p className="mt-1 text-sm">{formData.specialRequests}</p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="mt-6 text-sm" style={{ color: 'var(--color-mdc-text-muted)' }}>
                  This is a booking request. The chef will confirm availability within 24-48 hours. 
                  No payment is required at this stage.
                </p>
                <div className="mt-8 flex gap-4">
                  <button onClick={() => setCurrentStep(2)} className="px-6 py-3 rounded font-medium transition-colors border" style={{ borderColor: 'var(--color-mdc-accent)', color: 'var(--color-mdc-accent)' }}>Back</button>
                  <button onClick={handleSubmit} className="px-6 py-3 rounded font-medium text-white transition-colors" style={{ backgroundColor: 'var(--color-mdc-accent)' }}>
                    Submit Booking Request
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
