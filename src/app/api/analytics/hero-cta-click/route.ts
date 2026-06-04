import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { variant, cta_type } = body

    if (!variant || !cta_type) {
      return NextResponse.json(
        { error: 'Missing required fields: variant, cta_type' },
        { status: 400 }
      )
    }

    const validVariants = ['find_your_chef', 'book_private_chef', 'exclusive_dining']
    const validCTATypes = ['primary', 'secondary']

    if (!validVariants.includes(variant)) {
      return NextResponse.json(
        { error: 'Invalid variant value' },
        { status: 400 }
      )
    }

    if (!validCTATypes.includes(cta_type)) {
      return NextResponse.json(
        { error: 'Invalid cta_type value' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Store in hero_cta_clicks table
    const { error } = await supabase.from('hero_cta_clicks').insert({
      variant,
      cta_type,
    })

    if (error) {
      console.error('[Analytics] Error storing hero CTA click:', error)
      // Don't fail the request - analytics should be non-blocking
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Analytics] Error in hero-cta-click route:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}