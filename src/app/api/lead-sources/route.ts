import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/lead-sources - Create a lead source record for UTM tracking
// Called internally when a lead is captured with UTM params
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      lead_id = null,
      utm_source = null,
      utm_medium = null,
      utm_campaign = null,
      utm_content = null,
      utm_term = null,
      referrer = null,
      landing_page = null,
    } = body

    const supabase = await createClient()

    // Build the lead source record — only include non-null fields
    const leadSourceInsert: Record<string, unknown> = {}

    if (lead_id && typeof lead_id === 'string') {
      leadSourceInsert.lead_id = lead_id
    }
    if (utm_source && typeof utm_source === 'string') {
      leadSourceInsert.utm_source = utm_source
    }
    if (utm_medium && typeof utm_medium === 'string') {
      leadSourceInsert.utm_medium = utm_medium
    }
    if (utm_campaign && typeof utm_campaign === 'string') {
      leadSourceInsert.utm_campaign = utm_campaign
    }
    if (utm_content && typeof utm_content === 'string') {
      leadSourceInsert.utm_content = utm_content
    }
    if (utm_term && typeof utm_term === 'string') {
      leadSourceInsert.utm_term = utm_term
    }
    if (referrer && typeof referrer === 'string') {
      leadSourceInsert.referrer = referrer
    }
    if (landing_page && typeof landing_page === 'string') {
      leadSourceInsert.landing_page = landing_page
    }

    // If no UTM data and no referrer, don't create a record
    if (Object.keys(leadSourceInsert).length === 0) {
      return NextResponse.json(
        { message: 'No UTM data to store', lead_source: null },
        { status: 200 }
      )
    }

    const { data: newLeadSource, error } = await supabase
      .from('lead_sources')
      .insert(leadSourceInsert)
      .select('id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, landing_page, created_at')
      .single()

    if (error) {
      console.error('[LeadSources] Error creating lead source:', error)
      return NextResponse.json(
        { error: 'Failed to create lead source' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Lead source created',
        lead_source: newLeadSource,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[LeadSources] Error processing request:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

// GET /api/lead-sources - List lead sources (admin only)
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100', 10)
    const utm_source = searchParams.get('utm_source')

    let query = supabase
      .from('lead_sources')
      .select('id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, referrer, landing_page, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (utm_source) {
      query = query.eq('utm_source', utm_source)
    }

    const { data: leadSources, error } = await query

    if (error) {
      console.error('[LeadSources] Error fetching lead sources:', error)
      return NextResponse.json({ error: 'Failed to fetch lead sources' }, { status: 500 })
    }

    return NextResponse.json({ lead_sources: leadSources || [] }, { status: 200 })
  } catch (err) {
    console.error('[LeadSources] Error fetching lead sources:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
