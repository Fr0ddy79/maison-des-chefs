import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'Maison des Chefs <noreply@maison-des-chefs.com>'

interface SendInquiryConfirmationParams {
  chefId: string
  dinerEmail: string
  inquiryDate: string
  inquiryId: string
}

export async function sendInquiryConfirmationEmail({
  chefId,
  dinerEmail,
  inquiryDate,
  inquiryId,
}: SendInquiryConfirmationParams): Promise<{ success: boolean; error?: string }> {
  // Graceful degradation: if no API key, skip email but don't fail the inquiry
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set - skipping confirmation email')
    return { success: true }
  }

  try {
    // Fetch chef's display name
    const supabase = await createClient()
    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('display_name')
      .eq('id', chefId)
      .single()

    const chefName = chefProfile?.display_name || 'Your chef'

    const formattedDate = new Date(inquiryDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: `Booking Inquiry Received — ${chefName}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">Booking Inquiry Received</h1>
          <p>Thank you for your interest! We've received your booking inquiry and it has been forwarded to the chef.</p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>Chef:</strong> ${chefName}</p>
            <p><strong>Requested Date:</strong> ${formattedDate}</p>
            <p><strong>Your Email:</strong> ${dinerEmail}</p>
            <p><strong>Reference ID:</strong> ${inquiryId}</p>
          </div>
          
          <p><strong>What happens next?</strong></p>
          <p>The chef will review your inquiry and confirm availability within <strong>24-48 hours</strong>. You'll receive an email update once they respond.</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
        </div>
      `,
    })

    if (error) {
      console.error('[Email] Failed to send confirmation email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending confirmation email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}