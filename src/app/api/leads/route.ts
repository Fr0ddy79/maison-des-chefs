import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/leads - Create or get a lead by email
// Used to capture guest emails early in the booking funnel
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, source = 'booking_form' } = body

    // Validate required fields
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: 'Please enter a valid email address' },
        { status: 400 }
      )
    }

    // Validate source
    const validSources = ['booking_form', 'waitlist', 'contact', 'other']
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: `source must be one of: ${validSources.join(', ')}` },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Try to find existing lead by email
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id, email, source, created_at')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingLead) {
      // Lead already exists - return it (idempotent)
      return NextResponse.json(
        {
          message: 'Lead already exists',
          lead: {
            id: existingLead.id,
            email: existingLead.email,
            source: existingLead.source,
            created_at: existingLead.created_at,
          },
          isNew: false,
        },
        { status: 200 }
      )
    }

    // Create new lead
    const { data: newLead, error } = await supabase
      .from('leads')
      .insert({
        email: email.toLowerCase().trim(),
        source,
      })
      .select('id, email, source, created_at')
      .single()

    if (error) {
      // Handle unique constraint violation (race condition - lead created by another request)
      if (error.code === '23505') {
        // Re-fetch the lead that was created
        const { data: retryLead } = await supabase
          .from('leads')
          .select('id, email, source, created_at')
          .eq('email', email.toLowerCase().trim())
          .single()

        if (retryLead) {
          return NextResponse.json(
            {
              message: 'Lead already exists',
              lead: {
                id: retryLead.id,
                email: retryLead.email,
                source: retryLead.source,
                created_at: retryLead.created_at,
              },
              isNew: false,
            },
            { status: 200 }
          )
        }
      }

      console.error('[Leads] Error creating lead:', error)
      return NextResponse.json(
        { error: 'Failed to create lead' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Lead created successfully',
        lead: {
          id: newLead.id,
          email: newLead.email,
          source: newLead.source,
          created_at: newLead.created_at,
        },
        isNew: true,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[Leads] Error processing lead:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

// GET /api/leads - List leads (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source')
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    let query = supabase
      .from('leads')
      .select('id, email, source, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (source) {
      query = query.eq('source', source)
    }

    const { data: leads, error } = await query

    if (error) {
      console.error('[Leads] Error fetching leads:', error)
      return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }

    return NextResponse.json({ leads: leads || [] }, { status: 200 })
  } catch (err) {
    console.error('[Leads] Error fetching leads:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}