'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface ReviewFormProps {
  bookingId: string
  chefId: string
  chefName: string
  onReviewSubmitted: () => void
}

export function ReviewForm({ bookingId, chefId, chefName, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    if (rating === 0) {
      setError('Please select a rating before submitting.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          chef_id: chefId,
          rating,
          comment: comment.trim() || null,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          onReviewSubmitted()
        }, 1500)
      } else {
        setError(data.error || 'Failed to submit review. Please try again.')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    }

    setIsSubmitting(false)
  }

  if (success) {
    return (
      <div className="p-6 rounded-lg bg-green-50 border text-center" style={{ borderColor: '#16a34a' }}>
        <div className="text-4xl mb-3">✓</div>
        <p className="font-semibold text-green-700">Thank you for your review!</p>
        <p className="text-sm mt-1" style={{ color: '#15803d' }}>
          Your feedback helps other diners discover great chefs.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-lg bg-white border p-6">
      <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
        Rate your experience with {chefName}
      </h3>

      {/* Star Rating */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Your Rating</label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoverRating(star)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={`Rate ${star} stars`}
            >
              <svg
                className="w-8 h-8"
                style={{ 
                  color: star <= (hoverRating || rating) ? 'var(--color-mdc-accent)' : '#d1d5db'
                }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
        {rating > 0 && (
          <p className="text-sm mt-2" style={{ color: 'var(--color-mdc-text-muted)' }}>
            {rating === 1 && 'Poor'}
            {rating === 2 && 'Fair'}
            {rating === 3 && 'Good'}
            {rating === 4 && 'Very Good'}
            {rating === 5 && 'Excellent'}
          </p>
        )}
      </div>

      {/* Comment */}
      <div className="mb-6">
        <label htmlFor="comment" className="block text-sm font-medium mb-2">
          Share your experience <span className="font-normal" style={{ color: 'var(--color-mdc-text-muted)' }}>(optional)</span>
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell others about your dining experience with this chef..."
          rows={4}
          className="w-full px-4 py-3 rounded border resize-none"
          style={{ borderColor: 'var(--color-mdc-border)' }}
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border" style={{ borderColor: 'var(--color-mdc-error)' }}>
          <p className="text-sm" style={{ color: 'var(--color-mdc-error)' }}>{error}</p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onReviewSubmitted}
          className="px-4 py-2 rounded text-sm font-medium transition-colors border"
          style={{ borderColor: 'var(--color-mdc-border)', color: 'var(--color-mdc-text-muted)' }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || rating === 0}
          className="px-6 py-2 rounded font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-mdc-accent)' }}
        >
          {isSubmitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
    </form>
  )
}