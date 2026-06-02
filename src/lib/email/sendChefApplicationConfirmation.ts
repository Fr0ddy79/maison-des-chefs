import { resend, FROM_EMAIL } from './resend'

interface SendChefApplicationConfirmationParams {
  applicantName: string
  applicantEmail: string
}

export async function sendChefApplicationConfirmationEmail({
  applicantName,
  applicantEmail,
}: SendChefApplicationConfirmationParams): Promise<{ success: boolean; error?: string }> {
  // Graceful degradation: if no API key, skip email but don't fail the application
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set - skipping chef application confirmation email')
    return { success: true }
  }

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: applicantEmail,
      subject: "We've received your application — Maison des Chefs",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">Application Received!</h1>
          <p>Dear ${applicantName},</p>
          <p>Thank you for applying to join <strong>Maison des Chefs</strong>. We've received your application and our team is excited to review it.</p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>What happens next?</strong></p>
            <p>Our team reviews all applications within <strong>48 hours</strong>. You'll receive an email update once we've made a decision.</p>
          </div>
          
          <p>If you have any questions in the meantime, feel free to reply to this email.</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
        </div>
      `,
    })

    if (error) {
      console.error('[Email] Failed to send chef application confirmation email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending chef application confirmation email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}