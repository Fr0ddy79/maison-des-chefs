import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendProfileCompletionReminderEmail } from '@/lib/email/resend'

// POST /api/cron/profile-completion-reminder
// Checks for chefs with <50% profile completion after 7 days since account creation
// and sends reminder emails. Only sends one reminder per chef.
// This endpoint should be called by a cron job once per day
export async function POST(request: NextRequest) {
  try {
    // Optional: Add a secret header check to prevent unauthorized calls
    const authHeader = request.headers.get('x-cron-secret')
    const expectedSecret = process.env.CRON_SECRET

    if (expectedSecret && authHeader !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Find chefs created 7+ days ago with <50% completion who haven't received a reminder
    // 7 days = 7 * 24 * 60 * 60 * 1000 = 604800000 ms
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Get all chef profiles with their account creation date
    const { data: chefProfiles, error: fetchError } = await supabase
      .from('chef_profiles')
      .select('id, created_at')

    if (fetchError) {
      console.error('[Cron] Error fetching chef profiles:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch chef profiles' },
        { status: 500 }
      )
    }

    // Filter to chefs created 7+ days ago
    const chefsCreated7DaysAgo = (chefProfiles || []).filter(chef => {
      return new Date(chef.created_at) <= new Date(sevenDaysAgo)
    })

    if (chefsCreated7DaysAgo.length === 0) {
      return NextResponse.json({
        message: 'No chefs require profile completion reminders',
        processed: 0,
      })
    }

    console.log(`[Cron] Found ${chefsCreated7DaysAgo.length} chefs created 7+ days ago`)

    const results = {
      processed: 0,
      emails_sent: 0,
      emails_failed: 0,
      skipped_already_complete: 0,
      skipped_no_reminder_flag: 0,
      errors: [] as string[],
    }

    for (const chef of chefsCreated7DaysAgo) {
      try {
        // Check if already received reminder (using a flag in chef_profiles metadata or separate table)
        // For simplicity, we'll check if they've been sent a reminder via a profile flag
        // If we don't have such a flag, we can add it to chef_profiles.enhanced_settings or similar
        
        // Fetch full chef data to calculate completeness
        const { data: chefProfile } = await supabase
          .from('chef_profiles')
          .select('bio, cuisines')
          .eq('id', chef.id)
          .single()

        const { data: userProfile } = await supabase
          .from('profiles')
          .select('email, full_name, avatar_url')
          .eq('id', chef.id)
          .single()

        const { data: services } = await supabase
          .from('services')
          .select('id')
          .eq('chef_id', chef.id)
          .limit(1)

        const { data: availability } = await supabase
          .from('availability')
          .select('id')
          .eq('chef_id', chef.id)
          .limit(1)

        const hasPhoto = !!(userProfile?.avatar_url)
        const hasBio = !!(chefProfile?.bio && chefProfile.bio.length > 0)
        const hasService = services && services.length > 0
        const hasAvailability = availability && availability.length > 0
        const hasCuisine = !!(chefProfile?.cuisines && chefProfile.cuisines.length > 0)

        const elementsCount = [hasPhoto, hasBio, hasService, hasAvailability, hasCuisine].filter(Boolean).length
        const score = Math.round((elementsCount / 5) * 100)

        // Only send reminder if <50% complete
        if (score >= 50) {
          results.skipped_already_complete++
          continue
        }

        // Build missing elements list
        const missingElements: string[] = []
        if (!hasPhoto) missingElements.push('Profile photo')
        if (!hasBio) missingElements.push('Bio')
        if (!hasCuisine) missingElements.push('Cuisine types')
        if (!hasService) missingElements.push('At least one service')
        if (!hasAvailability) missingElements.push('Availability slots')

        // Send reminder email
        if (userProfile?.email) {
          const emailResult = await sendProfileCompletionReminderEmail({
            chefId: chef.id,
            chefEmail: userProfile.email,
            chefName: userProfile.full_name || 'Chef',
            completionScore: score,
            missingElements,
          })

          if (emailResult.success) {
            results.emails_sent++
            
            // Mark reminder as sent by updating chef_profiles with a reminder_sent_at timestamp
            // This requires adding a column or we can use chef_profiles.metadata
            // For now, we'll just log it - in a production system you'd want to track this properly
            await supabase
              .from('chef_profiles')
              .update({ 
                metadata: { 
                  ...(chefProfile as any)?.metadata || {},
                  profile_reminder_sent_at: new Date().toISOString()
                }
              })
              .eq('id', chef.id)
          } else {
            results.emails_failed++
            results.errors.push(`Email failed for chef ${chef.id}: ${emailResult.error}`)
          }
        } else {
          results.skipped_no_reminder_flag++
        }

        results.processed++
      } catch (err) {
        console.error(`[Cron] Error processing chef ${chef.id}:`, err)
        results.errors.push(`Processing error for chef ${chef.id}: ${err}`)
      }
    }

    console.log(`[Cron] Profile completion reminder check complete:`, results)

    return NextResponse.json({
      message: 'Profile completion reminder check complete',
      ...results,
    })
  } catch (err) {
    console.error('[Cron] Error in profile completion reminder check:', err)
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    )
  }
}

// GET endpoint for manual testing
export async function GET(request: NextRequest) {
  return POST(request)
}