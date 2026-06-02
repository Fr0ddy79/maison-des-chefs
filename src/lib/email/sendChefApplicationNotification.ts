import { resend, FROM_EMAIL } from './resend'

interface ChefApplicationData {
  name: string
  email: string
  phone: string | null
  location: string
  cuisine_types: string[]
  years_experience: number
  price_range: string | null
  bio: string | null
  preferred_contact: string
}

interface SendChefApplicationNotificationParams {
  application: ChefApplicationData
}

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'info@maison-des-chefs.com'

export async function sendChefApplicationNotificationEmail({
  application,
}: SendChefApplicationNotificationParams): Promise<{ success: boolean; error?: string }> {
  // Graceful degradation: if no API key, skip email but don't fail the application
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set - skipping chef application notification email')
    return { success: true }
  }

  try {
    const cuisineList = application.cuisine_types.join(', ')
    const formattedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `New Chef Application — ${application.name}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">New Chef Application</h1>
          <p>A new chef application was submitted on <strong>${formattedDate}</strong>.</p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>Name:</strong> ${application.name}</p>
            <p><strong>Email:</strong> ${application.email}</p>
            <p><strong>Phone:</strong> ${application.phone || 'Not provided'}</p>
            <p><strong>Location:</strong> ${application.location}</p>
            <p><strong>Cuisine Types:</strong> ${cuisineList}</p>
            <p><strong>Years of Experience:</strong> ${application.years_experience}</p>
            ${application.price_range ? `<p><strong>Price Range:</strong> ${application.price_range}</p>` : ''}
            ${application.bio ? `<p><strong>Bio:</strong> ${application.bio}</p>` : ''}
            <p><strong>Preferred Contact:</strong> ${application.preferred_contact}</p>
          </div>
          
          <p>Log in to the admin dashboard to review and process this application.</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— Maison des Chefs Platform</p>
        </div>
      `,
    })

    if (error) {
      console.error('[Email] Failed to send chef application notification email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending chef application notification email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}