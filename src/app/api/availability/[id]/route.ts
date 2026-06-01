import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// DELETE /api/availability/[id] - Delete an availability slot
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Slot ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify the requesting user is the chef or an admin
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch the slot to verify ownership
    const { data: slot } = await supabase
      .from('availability')
      .select('chef_id, is_booked')
      .eq('id', id)
      .single()

    if (!slot) {
      return NextResponse.json(
        { error: 'Availability slot not found' },
        { status: 404 }
      )
    }

    // Can't delete a booked slot
    if (slot.is_booked) {
      return NextResponse.json(
        { error: 'Cannot delete a booked slot. Please contact support.' },
        { status: 400 }
      )
    }

    // Verify this chef_id matches the authenticated user or user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authUser.id)
      .single()

    if (slot.chef_id !== authUser.id && profile?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized to delete this availability slot' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('availability')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting availability slot:', error)
      return NextResponse.json(
        { error: 'Failed to delete availability slot' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Availability slot deleted successfully' },
      { status: 200 }
    )
  } catch (err) {
    console.error('Error deleting availability slot:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}
