import { resend, FROM_EMAIL } from './resend'

interface SendChefRejectionEmailParams {
  applicantEmail: string
  applicantName: string
}

export async function sendChefRejectionEmail({
  applicantEmail,
  applicantName,
}: SendChefRejectionEmailParams): Promise<{ success: boolean; error?: string }> {
  // Graceful degradation: if no API key, skip email but don't fail the operation
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set - skipping chef rejection email')
    return { success: true }
  }

  try {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Regarding Your Application</h1>
        <p>Dear ${applicantName},</p>
        <p>Thank you for your interest in joining <strong>Maison des Chefs</strong> and for taking the time to submit your application.</p>
        
        <p>After careful consideration, we regret to inform you that we are unable to move forward with your application at this time. This decision was not easy, as we receive many strong applications from talented chefs.</p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Please know that this decision is not a reflection of your skills or potential.</strong> We encourage you to apply again in the future as our needs evolve.</p>
        </div>
        
        <p>If you have any questions about this decision, feel free to reach out to us at <a href="mailto:support@maison-des-chefs.com">support@maison-des-chefs.com</a>.</p>
        
        <p>We wish you all the best in your culinary journey.</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
      </div>
    `

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: applicantEmail,
      subject: 'Update on Your Maison des Chefs Application',
      html,
    })

    if (error) {
      console.error('[Email] Failed to send chef rejection email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending chef rejection email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}