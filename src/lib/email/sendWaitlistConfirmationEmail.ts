import { sendEmailOrLog } from './resend'

export async function sendWaitlistConfirmationEmail({
  email,
}: {
  email: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendEmailOrLog({
      to: email,
      subject: "You're on the list — Maison des Chefs",
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">Thanks for Joining!</h1>
          <p>Hi there,</p>
          <p>You've successfully joined the <strong>Maison des Chefs</strong> waitlist. We're thrilled to have you with us.</p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>What happens next?</strong></p>
            <p>You'll be among the first to know when we launch. We're working hard to bring you an extraordinary culinary experience — private chefs, bespoke menus, and unforgettable dining moments.</p>
          </div>
          
          <p>In the meantime, follow us on social media for a taste of what's to come.</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
        </div>
      `,
      fallbackLog: `[Email] Waitlist confirmation to ${email}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending waitlist confirmation email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}