import { createClient } from '@/lib/supabase/server'
import { randomUUID } from 'crypto'

/**
 * Generates a new unsubscribe token (UUID v4)
 */
export function generateUnsubscribeToken(): string {
  return randomUUID()
}

/**
 * Gets the unsubscribe URL for a given email address.
 * Returns null if no profile exists for that email.
 */
export async function getUnsubscribeUrl(email: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('unsubscribe_token')
    .eq('email', email.toLowerCase().trim())
    .single()

  if (!profile?.unsubscribe_token) {
    return null
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/unsubscribe/${profile.unsubscribe_token}`
}

/**
 * Ensures a profile has an unsubscribe_token, generating one if missing.
 * Returns the unsubscribe token.
 */
export async function ensureUnsubscribeToken(profileId: string): Promise<string | null> {
  const supabase = await createClient()

  // Check if profile already has a token
  const { data: profile } = await supabase
    .from('profiles')
    .select('unsubscribe_token')
    .eq('id', profileId)
    .single()

  if (!profile) {
    return null
  }

  if (profile.unsubscribe_token) {
    return profile.unsubscribe_token
  }

  // Generate and save new token
  const token = generateUnsubscribeToken()
  const { error } = await supabase
    .from('profiles')
    .update({ unsubscribe_token: token })
    .eq('id', profileId)

  if (error) {
    console.error('[Unsubscribe] Error saving token:', error)
    return null
  }

  return token
}

/**
 * Unsubscribe a user by email
 */
export async function unsubscribeByEmail(email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ email_unsubscribed: true })
    .eq('email', email.toLowerCase().trim())

  if (error) {
    console.error('[Unsubscribe] Error unsubscribing by email:', error)
    return { success: false, error: error.message }
  }

  return { success: true }
}