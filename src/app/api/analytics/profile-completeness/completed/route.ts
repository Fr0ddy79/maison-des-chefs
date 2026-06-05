import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/analytics/profile-completeness/completed
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { chef_id, completion_score, variant, days_to_complete } = body

    if (!chef_id || typeof chef_id !== 'string') {
      return NextResponse.json({ error: 'chef_id is required' }, { status: 400 })
    }

    if (completion_score === undefined || typeof completion_score !== 'number') {
      return NextResponse.json({ error: 'completion_score is required' }, { status: 400 })
    }

    if (!variant || !['social_proof', 'gamification', 'urgency'].includes(variant)) {
      return NextResponse.json({ error: 'variant must be one of: social_proof, gamification, urgency' }, { status: 400 })
    }

    const supabase = await createClient()

    // Store the event for experiment tracking
    console.log(`[Analytics] Profile completeness completed: chef=${chef_id} score=${completion_score} variant=${variant} days_to_complete=${days_to_complete}`)

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('Error tracking profile completeness completed:', err)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
