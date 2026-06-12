import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface InquiryRow {
  id: string
  created_at: string
  inquiry_date: string
  guest_count: number | null
  services: { title: string; service_type: string } | null
  chef_profiles: { id: string; display_name: string; location: string } | null
}

// GET /api/social-proof/recent-activity
// Returns recent inquiry/booking activity for social proof toast display
export async function GET() {
  try {
    const supabase = await createClient()

    // Fetch last 7 days of inquiries, joined with chef profiles
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data, error } = await supabase
      .from('inquiries')
      .select(`
        id,
        created_at,
        inquiry_date,
        guest_count,
        services:service_id (
          title,
          service_type
        ),
        chef_profiles:chef_id (
          id,
          display_name,
          location
        )
      `)
      .gte('created_at', sevenDaysAgo.toISOString())
      .not('chef_id', 'is', null)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[SocialProof] Error fetching recent activity:', error)
      return NextResponse.json({ activities: [] }, { status: 200 })
    }

    // Supabase returns joined relations as arrays — cast through unknown first
    const typedData = (data || []) as unknown as InquiryRow[]
    if (typedData.length === 0) {
      return NextResponse.json({ activities: [] }, { status: 200 })
    }

    // Deduplicate by chef (only one activity per chef)
    const seen = new Set<string>()
    const activities = []

    for (const inquiry of typedData) {
      const chefArr = Array.isArray(inquiry.chef_profiles) ? inquiry.chef_profiles : [inquiry.chef_profiles].filter(Boolean)
      const chef = chefArr[0]
      if (!chef?.id || seen.has(chef.id)) continue
      seen.add(chef.id)

      const serviceArr = Array.isArray(inquiry.services) ? inquiry.services : [inquiry.services].filter(Boolean)
      const service = serviceArr[0]
      const serviceType = service?.service_type || 'private chef experience'
      const guestCount = inquiry.guest_count || 2

      activities.push({
        id: inquiry.id,
        chef_name: chef.display_name || 'Chef',
        city: chef.location || 'Montreal',
        inquiry_date: inquiry.inquiry_date,
        guest_count: guestCount,
        service_type: serviceType,
        created_at: inquiry.created_at,
      })

      // Take latest 5 unique chefs
      if (activities.length >= 5) break
    }

    return NextResponse.json({ activities }, { status: 200 })
  } catch (err) {
    console.error('[SocialProof] Unexpected error:', err)
    return NextResponse.json({ activities: [] }, { status: 200 })
  }
}