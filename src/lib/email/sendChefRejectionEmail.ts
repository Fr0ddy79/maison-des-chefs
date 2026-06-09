import { sendEmailOrLog, getResendApiKeyStatus } from './resend'

interface SendChefRejectionEmailParams {
  applicantEmail: string
  applicantName: string
  rejectionReason?: string
}

export async function sendChefRejectionEmail({
  applicantEmail,
  applicantName,
  rejectionReason,
}: SendChefRejectionEmailParams): Promise<{ success: boolean; error?: string }> {
  const keyStatus = getResendApiKeyStatus()

  try {
    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Regarding Your Application</h1>
        <p>Dear ${applicantName},</p>
        <p>Thank you for your interest in joining <strong>Maison des Chefs</strong> and for taking the time to submit your application.</p>
        
        <p>After careful consideration, we regret to inform you that we are unable to move forward with your application at this time. This decision was not easy, as we receive many strong applications from talented chefs.</p>
        
        ${rejectionReason ? `
        <div style="background: #fef3c7; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <p style="margin: 0 0 8px 0;"><strong>Reason provided:</strong></p>
          <p style="margin: 0; font-style: italic;">"${rejectionReason}"</p>
        </div>
        ` : `
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Please know that this decision is not a reflection of your skills or potential.</strong> We encourage you to apply again in the future as our needs evolve.</p>
        </div>
        `}
        
        <p>If you have any questions about this decision, feel free to reach out to us at <a href="mailto:support@maison-des-chefs.com">support@maison-des-chefs.com</a>.</p>
        
        <p>We wish you all the best in your culinary journey.</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
      </div>
    `

    const result = await sendEmailOrLog({
      to: applicantEmail,
      subject: 'Update on Your Maison des Chefs Application',
      html,
      fallbackLog: `[Email] Chef rejection email to ${applicantEmail}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending chef rejection email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}