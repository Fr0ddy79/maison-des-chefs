import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWaitlistConfirmationEmail } from '@/lib/email/sendWaitlistConfirmationEmail'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, landing_page } = body

    // Validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check for duplicate email
    const { data: existingEmail } = await supabase
      .from('emails')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingEmail) {
      return NextResponse.json(
        { message: 'already_subscribed', email: existingEmail.email },
        { status: 200 }
      )
    }

    // Create lead source record for UTM tracking (first-touch attribution)
    let leadSourceId: string | null = null
    const hasUtmData = utm_source || utm_medium || utm_campaign || utm_content || utm_term || referrer || landing_page
    if (hasUtmData) {
      const leadSourceInsert: Record<string, unknown> = {}
      if (utm_source) leadSourceInsert.utm_source = utm_source
      if (utm_medium) leadSourceInsert.utm_medium = utm_medium
      if (utm_campaign) leadSourceInsert.utm_campaign = utm_campaign
      if (utm_content) leadSourceInsert.utm_content = utm_content
      if (utm_term) leadSourceInsert.utm_term = utm_term
      if (referrer) leadSourceInsert.referrer = referrer
      if (landing_page) leadSourceInsert.landing_page = landing_page

      const { data: leadSource } = await supabase
        .from('lead_sources')
        .insert(leadSourceInsert)
        .select('id')
        .single()

      leadSourceId = leadSource?.id || null
    }

    // Insert the email with lead_source_id
    const { data, error } = await supabase
      .from('emails')
      .insert({
        email: email.toLowerCase().trim(),
        ...(leadSourceId ? { lead_source_id: leadSourceId } : {}),
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting email:', error)
      return NextResponse.json(
        { error: 'Failed to join waitlist. Please try again.' },
        { status: 500 }
      )
    }

    // Send confirmation email (non-blocking — failures logged but don't fail subscription)
    sendWaitlistConfirmationEmail({ email: data.email }).catch((err) => {
      console.error('[Subscribe] Failed to send confirmation email:', err)
    })

    return NextResponse.json(
      { message: 'success', email: data.email },
      { status: 201 }
    )
  } catch (err) {
    console.error('Error processing email subscription:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
