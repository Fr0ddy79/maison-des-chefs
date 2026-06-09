import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/unsubscribe/[token] - Marks a user's email as unsubscribed
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid unsubscribe token' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Find the profile with this unsubscribe token
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, email_unsubscribed')
      .eq('unsubscribe_token', token)
      .single()

    if (fetchError || !profile) {
      return NextResponse.json(
        { error: 'Invalid or expired unsubscribe token' },
        { status: 404 }
      )
    }

    // Already unsubscribed - return success without updating
    if (profile.email_unsubscribed) {
      return NextResponse.json(
        {
          success: true,
          message: 'You have already unsubscribed from marketing emails',
          email: profile.email,
        },
        { status: 200 }
      )
    }

    // Mark the profile as unsubscribed
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ email_unsubscribed: true })
      .eq('unsubscribe_token', token)

    if (updateError) {
      console.error('[Unsubscribe] Error updating profile:', updateError)
      return NextResponse.json(
        { error: 'Failed to process unsubscribe request' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'You have been successfully unsubscribed from marketing emails',
        email: profile.email,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('[Unsubscribe] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}