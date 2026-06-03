import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/availability?chef_ids=uuid1,uuid2 - Batch get availability slot counts per chef
// GET /api/availability?chef_id=xxx - Get availability slots for a single chef (legacy)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const chefIdsParam = searchParams.get('chef_ids')
    const chefId = searchParams.get('chef_id')

    const supabase = await createClient()

    // Batch mode: chef_ids=uuid1,uuid2 returns per-chef slot counts
    if (chefIdsParam) {
      const chefIds = chefIdsParam.split(',').map(id => id.trim()).filter(Boolean)
      if (chefIds.length === 0) {
        return NextResponse.json(
          { error: 'chef_ids must contain at least one ID' },
          { status: 400 }
        )
      }

      const { data: slots, error } = await supabase
        .from('availability')
        .select('chef_id')
        .in('chef_id', chefIds)

      if (error) {
        console.error('Error fetching batch availability:', error)
        return NextResponse.json(
          { error: 'Failed to fetch availability' },
          { status: 500 }
        )
      }

      // Count total slots and available (unbooked) slots per chef
      const slotCounts: Record<string, { total: number; available: number }> = {}
      for (const id of chefIds) {
        slotCounts[id] = { total: 0, available: 0 }
      }
      for (const slot of slots || []) {
        if (slot.chef_id && slotCounts[slot.chef_id]) {
          slotCounts[slot.chef_id].total++
        }
      }

      const { data: availableSlots, error: availError } = await supabase
        .from('availability')
        .select('chef_id')
        .in('chef_id', chefIds)
        .eq('is_booked', false)

      if (availError) {
        console.error('Error fetching available slots:', availError)
        return NextResponse.json(
          { error: 'Failed to fetch availability' },
          { status: 500 }
        )
      }

      const availableSet = new Set((availableSlots || []).map(s => s.chef_id))
      for (const id of chefIds) {
        slotCounts[id].available = availableSet.has(id) ? 1 : 0
      }

      return NextResponse.json(
        { availability: slotCounts },
        { status: 200 }
      )
    }

    // Legacy single-chef mode
    if (!chefId) {
      return NextResponse.json(
        { error: 'chef_id or chef_ids is required' },
        { status: 400 }
      )
    }

    const { data: slots, error } = await supabase
      .from('availability')
      .select('*')
      .eq('chef_id', chefId)
      .order('date', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) {
      console.error('Error fetching availability:', error)
      return NextResponse.json(
        { error: 'Failed to fetch availability' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { slots: slots || [] },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error fetching availability:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

// POST /api/availability - Create a new availability slot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chef_id, date, start_time, end_time } = body

    if (!chef_id || typeof chef_id !== 'string') {
      return NextResponse.json(
        { error: 'chef_id is required' },
        { status: 400 }
      )
    }

    if (!date || typeof date !== 'string') {
      return NextResponse.json(
        { error: 'date is required (YYYY-MM-DD format)' },
        { status: 400 }
      )
    }

    const dateObj = new Date(date)
    if (isNaN(dateObj.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD.' },
        { status: 400 }
      )
    }

    if (!start_time || typeof start_time !== 'string') {
      return NextResponse.json(
        { error: 'start_time is required' },
        { status: 400 }
      )
    }

    if (!end_time || typeof end_time !== 'string') {
      return NextResponse.json(
        { error: 'end_time is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (authUser.id !== chef_id && profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized to add availability for this chef' },
        { status: 403 }
      )
    }

    const { data: slot, error } = await supabase
      .from('availability')
      .insert({
        chef_id,
        date,
        start_time,
        end_time,
        is_booked: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating availability slot:', error)
      return NextResponse.json(
        { error: 'Failed to create availability slot. This time slot may already exist.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: 'Availability slot created successfully',
        slot,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('Error creating availability slot:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}
