import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/admin/chef-applications - Get all chef applications (admin only)
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const limit = parseInt(searchParams.get('limit') || '50', 10)

    const query = supabase
      .from('chef_applications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    // Filter by status if not 'all'
    if (status !== 'all') {
      query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching chef applications:', error)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    // Get count of pending applications
    const { count: pendingCount } = await supabase
      .from('chef_applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending')

    return NextResponse.json({
      applications: data || [],
      pendingCount: pendingCount || 0,
    })
  } catch (err) {
    console.error('Error in GET /api/admin/chef-applications:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}