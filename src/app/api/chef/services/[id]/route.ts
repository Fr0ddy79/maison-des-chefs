import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// PATCH /api/chef/services/[id] — Update a service
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const {
      title,
      description,
      cuisine_type,
      duration_hours,
      price_per_person,
      max_guests,
      is_active,
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

    // Verify service exists and belongs to this chef
    const { data: existing } = await supabase
      .from('services')
      .select('id, chef_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    if (existing.chef_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Validation
    const errors: string[] = []

    if (title !== undefined) {
      if (typeof title !== 'string' || title.trim().length < 2) {
        errors.push('Title must be at least 2 characters')
      }
      if (title.trim().length > 100) {
        errors.push('Title must be 100 characters or less')
      }
    }

    if (description !== undefined && description !== null) {
      if (typeof description !== 'string') {
        errors.push('Description must be a string')
      }
      if (description.length > 1000) {
        errors.push('Description must be 1000 characters or less')
      }
    }

    if (cuisine_type !== undefined && cuisine_type !== null) {
      if (typeof cuisine_type !== 'string') {
        errors.push('Cuisine type must be a string')
      }
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

    if (is_active !== undefined && typeof is_active !== 'boolean') {
      errors.push('is_active must be a boolean')
    }

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 })
    }

    // Build update payload
    const updates: Record<string, any> = {}
    if (title !== undefined) updates.title = title.trim()
    if (description !== undefined) updates.description = description?.trim() || null
    if (cuisine_type !== undefined) updates.cuisine_type = cuisine_type?.trim() || null
    if (duration_hours !== undefined) updates.duration_hours = duration_hours
    if (price_per_person !== undefined) updates.price_per_person = price_per_person
    if (max_guests !== undefined) updates.max_guests = max_guests
    if (is_active !== undefined) updates.is_active = is_active

    const { data: service, error: updateError } = await supabase
      .from('services')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating service:', updateError)
      return NextResponse.json({ error: 'Failed to update service' }, { status: 500 })
    }

    return NextResponse.json({ service }, { status: 200 })
  } catch (err) {
    console.error('Unexpected error in PATCH /api/chef/services/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/chef/services/[id] — Soft delete a service (set is_active=false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // Verify service exists and belongs to this chef
    const { data: existing } = await supabase
      .from('services')
      .select('id, chef_id')
      .eq('id', id)
      .single()

    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 })
    }

    if (existing.chef_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Soft delete: set is_active = false
    const { error: deleteError } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id)

    if (deleteError) {
      console.error('Error soft-deleting service:', deleteError)
      return NextResponse.json({ error: 'Failed to delete service' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Service deactivated successfully' }, { status: 200 })
  } catch (err) {
    console.error('Unexpected error in DELETE /api/chef/services/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
