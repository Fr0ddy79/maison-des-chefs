import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { variant, chef_id } = body

    if (!variant || !chef_id) {
      return NextResponse.json(
        { error: 'Missing required fields: variant, chef_id' },
        { status: 400 }
      )
    }

    const validVariants = ['personalized', 'generic']
    if (!validVariants.includes(variant)) {
      return NextResponse.json(
        { error: 'Invalid variant value' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await supabase.from('analytics_events').insert({
      event_name: 'chef_sticky_cta_click',
      event_data: { variant, chef_id },
    })

    if (error) {
      console.error('[Analytics] Error storing chef sticky CTA click:', error)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Analytics] Error in chef-sticky-cta-click route:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
