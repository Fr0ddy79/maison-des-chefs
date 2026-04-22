import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

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

    // Insert the email
    const { data, error } = await supabase
      .from('emails')
      .insert({
        email: email.toLowerCase().trim(),
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
