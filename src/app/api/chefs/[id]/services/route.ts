import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/chefs/[id]/services — Get chef's active services (public)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Chef ID is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify chef exists and is verified
    const { data: chefProfile, error: chefError } = await supabase
      .from('chef_profiles')
      .select('id, display_name')
      .eq('id', id)
      .eq('is_verified', true)
      .single()

    if (chefError || !chefProfile) {
      return NextResponse.json({ error: 'Chef not found' }, { status: 404 })
    }

    // Fetch chef's active services
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('id, title, description, price_per_person, max_guests, is_active')
      .eq('chef_id', id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (servicesError) {
      console.error('Error fetching chef services:', servicesError)
      return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 })
    }

    return NextResponse.json({ services: services || [] }, { status: 200 })
  } catch (err) {
    console.error('Unexpected error in GET /api/chefs/[id]/services:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}