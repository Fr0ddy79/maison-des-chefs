import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Look up the application by email
    const { data: application, error } = await supabase
      .from('chef_applications')
      .select('id, name, email, status, created_at, reviewed_at')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (error || !application) {
      // Don't reveal whether an email exists or not for security
      return NextResponse.json(
        { found: false, status: null },
        { status: 200 }
      )
    }

    // Map database status to display status
    // DB: 'pending' | 'approved' | 'rejected'
    // Display: 'under_review' | 'approved' | 'rejected'
    let displayStatus: 'under_review' | 'approved' | 'rejected'
    switch (application.status) {
      case 'approved':
        displayStatus = 'approved'
        break
      case 'rejected':
        displayStatus = 'rejected'
        break
      case 'pending':
      default:
        displayStatus = 'under_review'
        break
    }

    return NextResponse.json({
      found: true,
      status: displayStatus,
      name: application.name,
      submittedAt: application.created_at,
      reviewedAt: application.reviewed_at,
    })
  } catch (err) {
    console.error('Error checking chef application status:', err)
    return NextResponse.json(
      { error: 'Failed to check application status' },
      { status: 500 }
    )
  }
}