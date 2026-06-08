import { sendEmailOrLog } from './resend'

interface SendChefApprovalEmailParams {
  applicantEmail: string
  applicantName: string
  chefId: string
}

export async function sendChefApprovalEmail({
  applicantEmail,
  applicantName,
  chefId,
}: SendChefApprovalEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const profileSetupUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/chef`

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">🎉 Congratulations, ${applicantName}!</h1>
        <p>Great news — your application to join <strong>Maison des Chefs</strong> has been approved!</p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Your Chef ID:</strong> ${chefId}</p>
          <p>You can now log in to your chef dashboard and complete your profile setup.</p>
        </div>
        
        <p><strong>Next steps:</strong></p>
        <ol style="padding-left: 20px;">
          <li>Log in to your chef dashboard</li>
          <li>Complete your profile (bio, photos, services)</li>
          <li>Set your availability</li>
          <li>Start receiving booking requests!</li>
        </ol>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${profileSetupUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">Complete Your Profile</a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
      </div>
    `

    const result = await sendEmailOrLog({
      to: applicantEmail,
      subject: "You've Been Accepted — Welcome to Maison des Chefs!",
      html,
      fallbackLog: `[Email] Chef approval email to ${applicantEmail} for chef ${chefId}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending chef approval email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}