import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/support - Submit a support inquiry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, subject, message } = body

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return NextResponse.json(
        { error: 'Subject is required' },
        { status: 400 }
      )
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (message.trim().length > 2000) {
      return NextResponse.json(
        { error: 'Message must be 2000 characters or fewer' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: newInquiry, error } = await supabase
      .from('support_inquiries')
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        subject: subject.trim(),
        message: message.trim(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating support inquiry:', error)
      return NextResponse.json(
        { error: 'Failed to submit your message. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Message sent successfully',
        inquiry: {
          id: newInquiry.id,
          name: newInquiry.name,
          email: newInquiry.email,
          subject: newInquiry.subject,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Error in support route:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
