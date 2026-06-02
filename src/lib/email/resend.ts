import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'Maison des Chefs <noreply@maison-des-chefs.com>'

export { resend, FROM_EMAIL }

interface SendInquiryConfirmationParams {
  chefId: string
  dinerEmail: string
  inquiryDate: string
  inquiryId: string
}

interface SendQuoteConfirmationParams {
  bookingId: string
  chefId: string
  dinerId: string
  action: 'accepted' | 'declined'
}

interface SendBookingConfirmedEmailParams {
  bookingId: string
  chefId: string
  dinerEmail: string
  dinerName: string
  bookingDate: string
  guestCount: number | null
  serviceTitle: string | null
  quoteAmount?: number | null
}

export async function sendBookingConfirmedEmail({
  bookingId,
  chefId,
  dinerEmail,
  dinerName,
  bookingDate,
  guestCount,
  serviceTitle,
  quoteAmount,
}: SendBookingConfirmedEmailParams): Promise<{ success: boolean; error?: string }> {
  // Graceful degradation: if no API key, skip email but don't fail the booking
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set - skipping booking confirmed email')
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


    const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const guestText = guestCount ? `${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}` : ''
    const serviceText = serviceTitle ? serviceTitle : 'dining experience'

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Booking Confirmed!</h1>
        <p>Dear ${dinerName},</p>
        <p>Great news! <strong>${chefName}</strong> has confirmed your booking.</p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Chef:</strong> ${chefName}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          ${guestText ? `<p><strong>Party Size:</strong> ${guestText}</p>` : ''}
          <p><strong>Service:</strong> ${serviceText}</p>
          ${quoteAmount ? `<p><strong>Quote Amount:</strong> $${quoteAmount}</p>` : ''}
          <p><strong>Reference ID:</strong> ${bookingId}</p>
        </div>
        
        <p>We look forward to seeing you! If you have any questions, feel free to reply to this email.</p>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
      </div>
    `

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject: `Booking Confirmed — ${chefName}`,
      html,
    })

    if (error) {
      console.error('[Email] Failed to send booking confirmed email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending booking confirmed email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

export async function sendQuoteConfirmationEmail({
  bookingId,
  chefId,
  dinerId,
  action,
}: SendQuoteConfirmationParams): Promise<{ success: boolean; error?: string }> {
  // Graceful degradation: if no API key, skip email but don't fail the operation
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set - skipping quote confirmation email')
    return { success: true }
  }

  try {
    const supabase = await createClient()

    // Fetch booking and chef details
    const { data: booking } = await supabase
      .from('bookings')
      .select('booking_date, quote_amount, chef_id')
      .eq('id', bookingId)
      .single()

    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('display_name')
      .eq('id', chefId)
      .single()

    const { data: dinerProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', dinerId)
      .single()

    const chefName = chefProfile?.display_name || 'Your chef'
    const dinerEmail = dinerProfile?.email
    const dinerName = dinerProfile?.full_name || 'Customer'

    if (!dinerEmail) {
      return { success: false, error: 'Diner email not found' }
    }

    const formattedDate = booking
      ? new Date(booking.booking_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'your date'

    const subject =
      action === 'accepted'
        ? `Quote Accepted — ${chefName}`
        : `Quote Declined — ${chefName}`

    const acceptedHtml = `
      <p>Great news! Your booking with <strong>${chefName}</strong> on <strong>${formattedDate}</strong> has been confirmed.</p>
      ${booking?.quote_amount ? `<p><strong>Quote Amount:</strong> $${booking.quote_amount}</p>` : ''}
      <p>A confirmation email will follow shortly. We look forward to seeing you!</p>
    `

    const declinedHtml = `
      <p>You have declined the quote from <strong>${chefName}</strong> for your booking on <strong>${formattedDate}</strong>.</p>
      <p>The chef has been notified and the time slot has been freed for other diners.</p>
    `

    const bodyHtml = action === 'accepted' ? acceptedHtml : declinedHtml

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">
          ${action === 'accepted' ? 'Quote Accepted!' : 'Quote Declined'}
        </h1>
        <p>Dear ${dinerName},</p>
        ${bodyHtml}
        <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
      </div>
    `

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: dinerEmail,
      subject,
      html,
    })

    if (error) {
      console.error('[Email] Failed to send quote confirmation email:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending quote confirmation email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

interface SendNewInquiryNotificationParams {
  chefId: string
  dinerEmail: string
  message: string
  inquiryDate: string
  inquiryTime: string | null
  inquiryId: string
}

export async function sendNewInquiryNotificationToChef({
  chefId,
  dinerEmail,
  message,
  inquiryDate,
  inquiryTime,
  inquiryId,
}: SendNewInquiryNotificationParams): Promise<{ success: boolean; error?: string }> {
  // Graceful degradation: if no API key, skip email but don't fail the inquiry
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set - skipping new inquiry notification to chef')
    return { success: true }
  }

  try {
    // Fetch chef's display name and email
    const supabase = await createClient()
    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('display_name')
      .eq('id', chefId)
      .single()

    const { data: chefAccount } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', chefId)
      .single()

    if (!chefAccount?.email) {
      console.error('[Email] Chef email not found for chef_id:', chefId)
      return { success: false, error: 'Chef email not found' }
    }

    const chefName = chefProfile?.display_name || 'Your chef'
    const formattedDate = new Date(inquiryDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const timeText = inquiryTime ? `at ${inquiryTime}` : ''
    const messagePreview = message.length > 100 ? message.substring(0, 100) + '...' : message

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: chefAccount.email,
      subject: `New Booking Inquiry — ${formattedDate}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">New Booking Inquiry!</h1>
          <p>Hi <strong>${chefName}</strong>,</p>
          <p>You have received a new booking inquiry. A diner wants to book your services.</p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>Date Requested:</strong> ${formattedDate}${timeText ? ` ${timeText}` : ''}</p>
            <p><strong>Diner's Email:</strong> ${dinerEmail}</p>
            <p><strong>Message:</strong></p>
            <p style="font-style: italic; color: #555;">"${messagePreview}"</p>
          </div>
          
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/chef/inquiries" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View & Respond to Inquiry</a></p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— Maison des Chefs</p>
        </div>
      `,
    })

    if (error) {
      console.error('[Email] Failed to send new inquiry notification to chef:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending new inquiry notification to chef:', err)
    return { success: false, error: 'Unexpected error' }
  }
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