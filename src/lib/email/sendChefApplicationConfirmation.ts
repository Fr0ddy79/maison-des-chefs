import { sendEmailOrLog } from './resend'

interface SendChefApplicationConfirmationParams {
  applicantName: string
  applicantEmail: string
}

export async function sendChefApplicationConfirmationEmail({
  applicantName,
  applicantEmail,
}: SendChefApplicationConfirmationParams): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendEmailOrLog({
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
      fallbackLog: `[Email] Chef application confirmation to ${applicantEmail}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending chef application confirmation email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}