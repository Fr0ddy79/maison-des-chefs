import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/reviews/[id]/response - Chef responds to a review
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params
    const body = await request.json()
    const { chef_response } = body

    // Validate required fields
    if (chef_response === undefined || chef_response === null) {
      return NextResponse.json(
        { error: 'chef_response is required' },
        { status: 400 }
      )
    }

    // Validate chef_response length (500 char limit)
    if (typeof chef_response === 'string' && chef_response.length > 500) {
      return NextResponse.json(
        { error: 'chef_response must be 500 characters or less' },
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

    // Fetch the review to validate ownership
    const { data: review, error: reviewError } = await supabase
      .from('reviews')
      .select('id, chef_id, chef_response, chef_response_at, created_at')
      .eq('id', reviewId)
      .single()

    if (reviewError || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    // Validate: user must be the chef on this review
    if (review.chef_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only respond to your own reviews' },
        { status: 403 }
      )
    }

    // Check 30-day editing window
    // Allow response if: no existing response OR existing response is within 30 days
    const createdAt = new Date(review.created_at)
    const now = new Date()
    const daysSinceCreated = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))

    if (review.chef_response && daysSinceCreated > 30) {
      return NextResponse.json(
        { error: 'You can only edit your response within 30 days of the review' },
        { status: 403 }
      )
    }

    // If there's an existing response and we're trying to edit outside the window
    // (but we already checked above, so this is a fallback)
    if (review.chef_response_at) {
      const responseAt = new Date(review.chef_response_at)
      const daysSinceResponse = Math.floor((now.getTime() - responseAt.getTime()) / (1000 * 60 * 60 * 24))
      // Allow editing within 30 days of the response
      if (daysSinceResponse > 30 && chef_response !== review.chef_response) {
        return NextResponse.json(
          { error: 'You can only edit your response within 30 days of your last response' },
          { status: 403 }
        )
      }
    }

    // Update the review with chef response
    const { data: updatedReview, error: updateError } = await supabase
      .from('reviews')
      .update({
        chef_response: chef_response || null,
        chef_response_at: new Date().toISOString(),
      })
      .eq('id', reviewId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating review response:', updateError)
      return NextResponse.json(
        { error: 'Failed to update response. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Response updated successfully',
        review: updatedReview,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error updating review response:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

// GET /api/reviews/[id]/response - Get chef response for a review
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reviewId } = await params
    const supabase = await createClient()

    const { data: review, error } = await supabase
      .from('reviews')
      .select('id, chef_response, chef_response_at')
      .eq('id', reviewId)
      .single()

    if (error || !review) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        chef_response: review.chef_response,
        chef_response_at: review.chef_response_at,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error fetching review response:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}