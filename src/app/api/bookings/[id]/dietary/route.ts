import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: booking, error } = await supabase
      .from('bookings')
      .select('id, dietary_restrictions, allergies, allergy_severity, food_preferences, special_occasion')
      .eq('id', id)
      .single()

    if (error || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: booking.id,
      dietary_restrictions: booking.dietary_restrictions ? JSON.parse(booking.dietary_restrictions) : [],
      allergies: booking.allergies ? JSON.parse(booking.allergies) : [],
      allergy_severity: booking.allergy_severity ? JSON.parse(booking.allergy_severity) : {},
      food_preferences: booking.food_preferences || null,
      special_occasion: booking.special_occasion || null,
    })
  } catch (err) {
    console.error('Error fetching dietary info:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const {
      dietary_restrictions,
      allergies,
      allergy_severity,
      food_preferences,
      special_occasion,
    } = body

    // Validate inputs
    if (dietary_restrictions !== undefined && !Array.isArray(dietary_restrictions)) {
      return NextResponse.json(
        { error: 'dietary_restrictions must be an array' },
        { status: 400 }
      )
    }

    if (allergies !== undefined && !Array.isArray(allergies)) {
      return NextResponse.json(
        { error: 'allergies must be an array' },
        { status: 400 }
      )
    }

    if (allergy_severity !== undefined && typeof allergy_severity !== 'object') {
      return NextResponse.json(
        { error: 'allergy_severity must be an object' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if booking exists
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('id', id)
      .single()

    if (!existingBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Build update object
    const updateData: Record<string, string | null> = {}

    if (dietary_restrictions !== undefined) {
      updateData.dietary_restrictions = JSON.stringify(dietary_restrictions)
    }

    if (allergies !== undefined) {
      updateData.allergies = JSON.stringify(allergies)
    }

    if (allergy_severity !== undefined) {
      updateData.allergy_severity = JSON.stringify(allergy_severity)
    }

    if (food_preferences !== undefined) {
      updateData.food_preferences = food_preferences
    }

    if (special_occasion !== undefined) {
      updateData.special_occasion = special_occasion
    }

    // Update the booking
    const { data: updatedBooking, error } = await supabase
      .from('bookings')
      .update(updateData)
      .eq('id', id)
      .select('id, dietary_restrictions, allergies, allergy_severity, food_preferences, special_occasion')
      .single()

    if (error) {
      console.error('Error updating dietary info:', error)
      return NextResponse.json(
        { error: 'Failed to update dietary information' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      id: updatedBooking.id,
      dietary_restrictions: updatedBooking.dietary_restrictions ? JSON.parse(updatedBooking.dietary_restrictions) : [],
      allergies: updatedBooking.allergies ? JSON.parse(updatedBooking.allergies) : [],
      allergy_severity: updatedBooking.allergy_severity ? JSON.parse(updatedBooking.allergy_severity) : {},
      food_preferences: updatedBooking.food_preferences || null,
      special_occasion: updatedBooking.special_occasion || null,
    })
  } catch (err) {
    console.error('Error updating dietary info:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}