import { createClient } from '@/lib/supabase/client'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = createClient()

  // Count verified chefs with complete profiles
  const { count: chefCount, error: chefError } = await supabase
    .from('chef_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('is_verified', true)

  if (chefError) {
    console.error('Error fetching chef count:', chefError)
  }

  // Count completed bookings
  const { count: bookingCount, error: bookingError } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'completed')

  if (bookingError) {
    console.error('Error fetching booking count:', bookingError)
  }

  // Count email waitlist signups
  const { count: waitlistCount, error: waitlistError } = await supabase
    .from('emails')
    .select('*', { count: 'exact', head: true })

  if (waitlistError) {
    console.error('Error fetching waitlist count:', waitlistError)
  }

  return NextResponse.json({
    chefs_available: chefCount || 0,
    dinners_booked: bookingCount || 0,
    waitlist_count: waitlistCount || 0,
  })
}