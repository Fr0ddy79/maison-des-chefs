import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/chef/services — List chef's own services
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify chef role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'chef') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: services, error } = await supabase
      .from('services')
      .select('*')
      .eq('chef_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching chef services:', error)
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }

    return NextResponse.json({ services: services || [] }, { status: 200 })
  } catch (err) {
    console.error('Unexpected error in GET /api/chef/services:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/chef/services — Create a new service
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      cuisine_type,
      duration_hours,
      price_per_person,
      max_guests,
    } = body

    const supabase = await createClient()

    // Check auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify chef role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'chef') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validation
    const errors: string[] = []

    if (!title || typeof title !== 'string' || title.trim().length < 2) {
      errors.push('Title is required (minimum 2 characters)')
    }

    if (title && title.trim().length > 100) {
      errors.push('Title must be 100 characters or less')
    }

    if (description && typeof description === 'string' && description.length > 1000) {
      errors.push('Description must be 1000 characters or less')
    }

    if (cuisine_type && typeof cuisine_type !== 'string') {
      errors.push('Cuisine type must be a string')
    }

    if (duration_hours !== undefined && duration_hours !== null) {
      if (typeof duration_hours !== 'number' || duration_hours <= 0 || duration_hours > 24) {
        errors.push('Duration must be a number between 0.5 and 24 hours')
      }
    }

    if (price_per_person !== undefined && price_per_person !== null) {
      if (typeof price_per_person !== 'number' || price_per_person < 0) {
        errors.push('Price per person must be a positive number')
      }
    }

    if (max_guests !== undefined && max_guests !== null) {
      if (!Number.isInteger(max_guests) || max_guests < 1 || max_guests > 100) {
        errors.push('Max guests must be an integer between 1 and 100')
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })
    }

    // Verify chef profile exists
    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 })
    }

    const { data: service, error: insertError } = await supabase
      .from('services')
      .insert({
        chef_id: user.id,
        title: title.trim(),
        description: description?.trim() || null,
        cuisine_type: cuisine_type?.trim() || null,
        duration_hours: duration_hours ?? null,
        price_per_person: price_per_person ?? null,
        max_guests: max_guests ?? 8,
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting service:', insertError)
      return NextResponse.json({ error: 'Failed to create service' }, { status: 500 })
    }

    return NextResponse.json({ service }, { status: 201 })
  } catch (err) {
    console.error('Unexpected error in POST /api/chef/services:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
