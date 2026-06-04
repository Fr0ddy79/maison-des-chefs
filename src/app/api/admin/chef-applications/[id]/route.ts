import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { sendChefApprovalEmail } from '@/lib/email/sendChefApprovalEmail'
import { sendChefRejectionEmail } from '@/lib/email/sendChefRejectionEmail'

// PATCH /api/admin/chef-applications/[id] - Approve or reject a chef application
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    const body = await request.json()
    const { action } = body

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    // Fetch the application
    const { data: application, error: fetchError } = await supabase
      .from('chef_applications')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    if (application.status !== 'pending') {
      return NextResponse.json(
        { error: `Application has already been ${application.status}` },
        { status: 409 }
      )
    }

    if (action === 'approve') {
      // Step 1: Create auth user via invite (this creates the user in auth.users)
      // If user already exists, inviteUserByEmail will return the existing user
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        application.email,
        {
          data: {
            full_name: application.name,
            role: 'chef',
          },
        }
      )

      if (inviteError) {
        console.error('Error inviting user:', inviteError)
        // Check if user already exists (email already registered)
        if (inviteError.message?.includes('already been registered') || inviteError.status === 422) {
          // Try to get existing user by email
          const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = existingAuthUser?.users.find(u => u.email === application.email)
          
          if (existingUser) {
            // User exists in auth - use their ID
            const authUserId = existingUser.id

            // Check if profile already exists for this auth user
            const { data: existingProfile } = await supabase
              .from('profiles')
              .select('id, role')
              .eq('id', authUserId)
              .single()

            if (existingProfile) {
              return NextResponse.json(
                { error: 'A chef account with this email already exists' },
                { status: 409 }
              )
            }

            // Create profile and chef_profiles for existing auth user
            const { data: newProfile, error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: authUserId,
                email: application.email,
                full_name: application.name,
                role: 'chef',
              })
              .select()
              .single()

            if (profileError) {
              console.error('Error creating chef profile:', profileError)
              return NextResponse.json(
                { error: 'Failed to create chef account' },
                { status: 500 }
              )
            }

            // Create chef_profiles entry
            const { error: chefProfileError } = await supabase
              .from('chef_profiles')
              .insert({
                id: authUserId,
                display_name: application.name,
                bio: application.bio,
                location: application.location,
                cuisines: application.cuisine_types || [],
                years_experience: application.years_experience,
                max_guests: 10,
              })

            if (chefProfileError) {
              console.error('Error creating chef profile entry:', chefProfileError)
            }

            // Update application status
            await supabase
              .from('chef_applications')
              .update({
                status: 'approved',
                reviewed_at: new Date().toISOString(),
                reviewed_by: user.id,
              })
              .eq('id', id)

            // Send approval email (non-blocking)
            sendChefApprovalEmail({
              applicantEmail: application.email,
              applicantName: application.name,
              chefId: authUserId,
            }).catch(err => {
              console.error('[Email] Failed to send chef approval email:', err)
            })

            return NextResponse.json({
              message: 'Application approved successfully',
              chefId: authUserId,
              profile: newProfile,
            })
          }
        }
        
        return NextResponse.json(
          { error: 'Failed to create chef account. Could not create auth user.' },
          { status: 500 }
        )
      }

      // Successfully invited/created auth user - use the returned ID
      const authUserId = inviteData?.user?.id

      if (!authUserId) {
        console.error('No auth user ID returned from invite')
        return NextResponse.json(
          { error: 'Failed to get auth user ID from invite' },
          { status: 500 }
        )
      }

      // Step 2: Create profile using the auth user's UUID
      const { data: newProfile, error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUserId, // Use auth UUID, not application ID
          email: application.email,
          full_name: application.name,
          role: 'chef',
        })
        .select()
        .single()

      if (profileError) {
        console.error('Error creating chef profile:', profileError)
        if (profileError.code === '23505') {
          return NextResponse.json(
            { error: 'A chef account with this email already exists' },
            { status: 409 }
          )
        }
        return NextResponse.json(
          { error: 'Failed to create chef account' },
          { status: 500 }
        )
      }

      // Step 3: Create chef_profiles entry using auth UUID
      const { error: chefProfileError } = await supabase
        .from('chef_profiles')
        .insert({
          id: authUserId, // Use auth UUID, not application ID
          display_name: application.name,
          bio: application.bio,
          location: application.location,
          cuisines: application.cuisine_types || [],
          years_experience: application.years_experience,
          max_guests: 10,
        })

      if (chefProfileError) {
        console.error('Error creating chef profile entry:', chefProfileError)
        // Don't fail the whole operation - profile was created successfully
      }

      // Step 4: Update application status
      const { error: updateError } = await supabase
        .from('chef_applications')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating application status:', updateError)
        return NextResponse.json(
          { error: 'Failed to update application status' },
          { status: 500 }
        )
      }

      // Step 5: Send approval email (non-blocking)
      sendChefApprovalEmail({
        applicantEmail: application.email,
        applicantName: application.name,
        chefId: authUserId,
      }).catch(err => {
        console.error('[Email] Failed to send chef approval email:', err)
      })

      return NextResponse.json({
        message: 'Application approved successfully',
        chefId: authUserId,
        profile: newProfile,
      })
    } else {
      // Reject action
      // Update application status
      const { error: updateError } = await supabase
        .from('chef_applications')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        })
        .eq('id', id)

      if (updateError) {
        console.error('Error updating application status:', updateError)
        return NextResponse.json(
          { error: 'Failed to update application status' },
          { status: 500 }
        )
      }

      // Send rejection email (non-blocking)
      sendChefRejectionEmail({
        applicantEmail: application.email,
        applicantName: application.name,
      }).catch(err => {
        console.error('[Email] Failed to send chef rejection email:', err)
      })

      return NextResponse.json({
        message: 'Application rejected',
        applicationId: id,
      })
    }
  } catch (err) {
    console.error('Error in PATCH /api/admin/chef-applications/[id]:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}