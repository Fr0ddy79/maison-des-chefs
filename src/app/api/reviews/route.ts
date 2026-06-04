import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/reviews - Create a review for a completed booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { booking_id, chef_id, rating, comment } = body

    // Validate required fields
    if (!booking_id || typeof booking_id !== 'string') {
      return NextResponse.json(
        { error: 'booking_id is required' },
        { status: 400 }
      )
    }

    if (!chef_id || typeof chef_id !== 'string') {
      return NextResponse.json(
        { error: 'chef_id is required' },
        { status: 400 }
      )
    }

    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'rating must be a number between 1 and 5' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user's profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Fetch the booking to validate ownership and status
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, diner_id, status, chef_id')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Validate: booking must be completed
    if (booking.status !== 'completed') {
      return NextResponse.json(
        { error: 'Only completed bookings can be reviewed' },
        { status: 400 }
      )
    }

    // Validate: user must be the diner on this booking
    if (booking.diner_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only review your own bookings' },
        { status: 403 }
      )
    }

    // Validate: chef_id must match the booking's chef
    if (booking.chef_id !== chef_id) {
      return NextResponse.json(
        { error: 'Chef ID does not match booking' },
        { status: 400 }
      )
    }

    // Check for duplicate review
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('booking_id', booking_id)
      .single()

    if (existingReview) {
      return NextResponse.json(
        { error: 'You have already reviewed this booking' },
        { status: 409 }
      )
    }

    // Create the review
    const { data: newReview, error: insertError } = await supabase
      .from('reviews')
      .insert({
        booking_id,
        chef_id,
        diner_id: user.id,
        rating,
        comment: comment || null,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating review:', insertError)
      return NextResponse.json(
        { error: 'Failed to create review. Please try again.' },
        { status: 500 }
      )
    }

    // Update chef_profiles.avg_rating and review_count
    // Calculate average rating for this chef
    const { data: allReviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('chef_id', chef_id)

    const reviewCount = allReviews?.length || 0
    const avgRating = allReviews && allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : 0

    await supabase
      .from('chef_profiles')
      .update({
        avg_rating: Math.round(avgRating * 10) / 10,
        review_count: reviewCount,
      })
      .eq('id', chef_id)

    return NextResponse.json(
      {
        message: 'Review created successfully',
        review: newReview,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Error creating review:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}