import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CUISINE_OPTIONS = [
  'French',
  'Italian',
  'Japanese',
  'Mediterranean',
  'Mexican',
  'Asian Fusion',
  'Contemporary',
  'Southern',
  'Indian',
  'Thai',
  'Spanish',
  'Greek',
  'Middle Eastern',
  'American',
  'Other',
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      email,
      phone,
      location,
      cuisine_types,
      years_experience,
      price_range,
      bio,
      preferred_contact,
    } = body

    // Validation
    const errors: string[] = []

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      errors.push('Name is required (minimum 2 characters)')
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      errors.push('Valid email is required')
    }

    if (!location || typeof location !== 'string' || location.trim().length < 2) {
      errors.push('Location is required')
    }

    if (!cuisine_types || !Array.isArray(cuisine_types) || cuisine_types.length === 0) {
      errors.push('At least one cuisine type is required')
    }

    if (!years_experience || typeof years_experience !== 'number' || years_experience < 0) {
      errors.push('Years of experience is required (must be 0 or greater)')
    }

    if (bio && typeof bio === 'string' && bio.length > 500) {
      errors.push('Bio must be 500 characters or less')
    }

    if (preferred_contact && !['email', 'phone', 'either'].includes(preferred_contact)) {
      errors.push('Preferred contact must be email, phone, or either')
    }

    // Validate cuisine types are from the predefined list
    if (cuisine_types && Array.isArray(cuisine_types)) {
      const invalidCuisines = cuisine_types.filter(c => !CUISINE_OPTIONS.includes(c))
      if (invalidCuisines.length > 0) {
        errors.push(`Invalid cuisine types: ${invalidCuisines.join(', ')}`)
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: errors },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check for duplicate email
    const { data: existingApplication } = await supabase
      .from('chef_applications')
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (existingApplication) {
      return NextResponse.json(
        { error: 'An application with this email has already been submitted' },
        { status: 409 }
      )
    }

    // Insert the application
    const { data, error } = await supabase
      .from('chef_applications')
      .insert({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() || null,
        location: location.trim(),
        cuisine_types,
        years_experience,
        price_range: price_range?.trim() || null,
        bio: bio?.trim() || null,
        preferred_contact: preferred_contact || 'email',
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting chef application:', error)
      return NextResponse.json(
        { error: 'Failed to submit application. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Application submitted successfully', application: data },
      { status: 201 }
    )
  } catch (err) {
    console.error('Error processing chef application:', err)
    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}
