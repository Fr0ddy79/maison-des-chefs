import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/services/[id]/waitlist - Join waitlist for a service date
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params
    const body = await request.json()
    const { email, desired_date } = body

    // Validation
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

    if (!desired_date || typeof desired_date !== 'string') {
      return NextResponse.json(
        { error: 'Desired date is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify service exists
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, chef_id, title')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      return NextResponse.json(
        { error: 'Service not found' },
        { status: 404 }
      )
    }

    // Check for duplicate waitlist entry
    const { data: existingEntry } = await supabase
      .from('chef_date_waitlist')
      .select('id, email')
      .eq('service_id', serviceId)
      .eq('email', email.toLowerCase().trim())
      .eq('desired_date', desired_date)
      .single()

    if (existingEntry) {
      return NextResponse.json(
        { message: 'already_subscribed', email: existingEntry.email },
        { status: 200 }
      )
    }

    // Insert waitlist entry
    const { data, error } = await supabase
      .from('chef_date_waitlist')
      .insert({
        service_id: serviceId,
        chef_id: service.chef_id,
        email: email.toLowerCase().trim(),
        desired_date,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting waitlist entry:', error)
      return NextResponse.json(
        { error: 'Failed to join waitlist. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'success', entry: data },
      { status: 201 }
    )
  } catch (err) {
    console.error('Error processing waitlist request:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

// GET /api/services/[id]/waitlist - Get waitlist count for a service date
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: serviceId } = await params
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')

    if (!date) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get waitlist count for the given date
    const { count, error } = await supabase
      .from('chef_date_waitlist')
      .select('*', { count: 'exact', head: true })
      .eq('service_id', serviceId)
      .eq('desired_date', date)
      .is('notified_at', null)

    if (error) {
      console.error('Error fetching waitlist count:', error)
      return NextResponse.json(
        { error: 'Failed to fetch waitlist count' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { date, count: count || 0 },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error processing waitlist request:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}