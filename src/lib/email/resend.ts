import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = 'Maison des Chefs <noreply@maison-des-chefs.com>'

const PLACEHOLDER_KEYS = ['your_resend_api_key_here', 're_placeholder', 'placeholder']

export function isPlaceholderApiKey(key: string | undefined): boolean {
  if (!key) return true
  const lower = key.toLowerCase()
  return PLACEHOLDER_KEYS.some(p => lower === p || lower.includes(p))
}

export interface ApiKeyStatus {
  isConfigured: boolean
  isPlaceholder: boolean
  status: 'valid' | 'placeholder' | 'missing'
  message: string
}

export function getResendApiKeyStatus(): ApiKeyStatus {
  const key = process.env.RESEND_API_KEY
  
  if (!key) {
    return {
      isConfigured: false,
      isPlaceholder: false,
      status: 'missing',
      message: 'RESEND_API_KEY is not set'
    }
  }
  
  if (isPlaceholderApiKey(key)) {
    return {
      isConfigured: true,
      isPlaceholder: true,
      status: 'placeholder',
      message: 'RESEND_API_KEY is set to a placeholder value — emails will be logged to console'
    }
  }
  
  return {
    isConfigured: true,
    isPlaceholder: false,
    status: 'valid',
    message: 'RESEND_API_KEY is properly configured'
  }
}

// Helper to send email or log to console based on key status
export async function sendEmailOrLog(opts: {
  to: string
  subject: string
  html: string
  fallbackLog: string
}): Promise<{ success: boolean; error?: string; logged?: boolean }> {
  const keyStatus = getResendApiKeyStatus()
  
  if (!keyStatus.isConfigured) {
    console.warn('[Email] RESEND_API_KEY not set — skipping email')
    return { success: true }
  }
  
  if (keyStatus.isPlaceholder) {
    console.log('[Email] ===== EMAIL FALLBACK (placeholder key) =====')
    console.log(`[Email] To: ${opts.to}`)
    console.log(`[Email] Subject: ${opts.subject}`)
    console.log(`[Email] Body:\n${opts.html}`)
    console.log('[Email] ===========================================')
    return { success: true, logged: true }
  }
  
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  })
  
  if (error) {
    console.error('[Email] Failed to send:', error)
    return { success: false, error: error.message }
  }
  
  return { success: true }
}

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

    const result = await sendEmailOrLog({
      to: dinerEmail,
      subject: `Booking Confirmed — ${chefName}`,
      html,
      fallbackLog: `[Email] Booking confirmed email to ${dinerEmail} for booking ${bookingId}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
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

    const result = await sendEmailOrLog({
      to: dinerEmail,
      subject,
      html,
      fallbackLog: `[Email] Quote ${action} email to ${dinerEmail} for booking ${bookingId}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
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
  serviceType: string | null
}

export async function sendNewInquiryNotificationToChef({
  chefId,
  dinerEmail,
  message,
  inquiryDate,
  inquiryTime,
  inquiryId,
  serviceType,
}: SendNewInquiryNotificationParams): Promise<{ success: boolean; error?: string }> {
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
    const serviceText = serviceType ? `<p><strong>Service:</strong> ${serviceType}</p>` : ''

    const result = await sendEmailOrLog({
      to: chefAccount.email,
      subject: `New Booking Inquiry — ${formattedDate}`,
      html: `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">New Booking Inquiry!</h1>
          <p>Hi <strong>${chefName}</strong>,</p>
          <p>You have received a new booking inquiry. A diner wants to book your services.</p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>Date Requested:</strong> ${formattedDate}${timeText ? ` ${timeText}` : ''}</p>
            ${serviceText}
            <p><strong>Diner's Email:</strong> ${dinerEmail}</p>
            <p><strong>Message:</strong></p>
            <p style="font-style: italic; color: #555;">"${messagePreview}"</p>
          </div>
          
          <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/chef" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">View & Respond to Inquiry</a></p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— Maison des Chefs</p>
        </div>
      `,
      fallbackLog: `[Email] New inquiry notification to chef ${chefAccount.email} for inquiry ${inquiryId}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
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

    const result = await sendEmailOrLog({
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
      fallbackLog: `[Email] Inquiry confirmation to ${dinerEmail} for inquiry ${inquiryId}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending confirmation email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}
interface SendQuoteNotificationParams {
  bookingId: string
  chefId: string
  dinerId: string
  quoteAmount: number
  quoteMessage: string | null
  quoteValidUntil: string
}

interface SendQuoteExpiredEmailParams {
  bookingId: string
  chefId: string
  dinerId: string
  quoteAmount: number
  quoteMessage: string | null
  quoteValidUntil: string
}

export async function sendQuoteExpiredEmail({
  bookingId,
  chefId,
  dinerId,
  quoteAmount,
  quoteMessage,
  quoteValidUntil,
}: SendQuoteExpiredEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Fetch booking, chef, and diner details
    const { data: booking } = await supabase
      .from('bookings')
      .select('booking_date, start_time, guest_count')
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
    const dinerName = dinerProfile?.full_name || 'Dear guest'

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

    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/booking/${bookingId}`

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Quote Expired — What Happened?</h1>
        <p>Dear ${dinerName},</p>
        <p>We wanted to let you know that the quote from <strong>${chefName}</strong> for your dining experience on <strong>${formattedDate}</strong> has expired.</p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Chef:</strong> ${chefName}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          ${booking?.guest_count ? `<p><strong>Party Size:</strong> ${booking.guest_count} guests</p>` : ''}
          <p><strong>Quote Amount:</strong> $${quoteAmount}</p>
          ${quoteMessage ? `<p><strong>Chef's Message:</strong></p><p style="font-style: italic; color: #555;">"${quoteMessage}"</p>` : ''}
        </div>
        
        <p><strong>Don't worry!</strong> If you're still interested in this experience, you can:</p>
        <ul style="line-height: 1.8;">
          <li>Reply to this email and we'll help connect you with ${chefName}</li>
          <li>Browse other chefs who may be available on your preferred date</li>
        </ul>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/chefs/${chefId}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 8px;">Contact ${chefName}</a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
      </div>
    `

    const result = await sendEmailOrLog({
      to: dinerEmail,
      subject: `Quote Expired — ${chefName} on ${formattedDate}`,
      html,
      fallbackLog: `[Email] Quote expired email to ${dinerEmail} for booking ${bookingId}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending quote expired email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

export async function sendQuoteNotificationEmail({
  bookingId,
  chefId,
  dinerId,
  quoteAmount,
  quoteMessage,
  quoteValidUntil,
}: SendQuoteNotificationParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Fetch booking, chef, and diner details
    const { data: booking } = await supabase
      .from('bookings')
      .select('booking_date, start_time, guest_count')
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
    const dinerName = dinerProfile?.full_name || 'Dear guest'

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

    const validUntilDate = new Date(quoteValidUntil).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/booking/${bookingId}`

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">You've Received a Quote!</h1>
        <p>Dear ${dinerName},</p>
        <p><strong>${chefName}</strong> has sent you a quote for your upcoming dining experience.</p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Chef:</strong> ${chefName}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          ${booking?.guest_count ? `<p><strong>Party Size:</strong> ${booking.guest_count} guests</p>` : ''}
          <p><strong>Quote Amount:</strong> $${quoteAmount}</p>
          ${quoteMessage ? `<p><strong>Message from Chef:</strong></p><p style="font-style: italic; color: #555;">"${quoteMessage}"</p>` : ''}
          <p style="color: #888; font-size: 13px; margin-top: 12px;">⏰ This quote is valid until <strong>${validUntilDate}</strong></p>
        </div>
        
        <p>Please review the quote and let the chef know if you'd like to proceed.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${bookingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 8px;">Accept Quote</a>
          <a href="${bookingUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 8px;">Decline</a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
      </div>
    `

    const result = await sendEmailOrLog({
      to: dinerEmail,
      subject: `Quote from ${chefName} — Review Now`,
      html,
      fallbackLog: `[Email] Quote notification to ${dinerEmail} for booking ${bookingId}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending quote notification email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

interface SendAbandonedBookingFollowUpParams {
  abandonedBookingId: string
  email: string
  chefId: string
  chefName: string
  serviceType: string | null
  guestCount: number | null
}

export async function sendAbandonedBookingFollowUpEmail({
  abandonedBookingId,
  email,
  chefId,
  chefName,
  serviceType,
  guestCount,
}: SendAbandonedBookingFollowUpParams): Promise<{ success: boolean; error?: string }> {
  try {
    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/book?chef_id=${chefId}`
    const guestText = guestCount ? `${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}` : ''
    const serviceText = serviceType || 'dining experience'

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Complete Your Booking</h1>
        <p>Hi there,</p>
        <p>We noticed you were interested in booking <strong>${chefName}</strong> but didn't complete your reservation.</p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Chef:</strong> ${chefName}</p>
          ${serviceType ? `<p><strong>Service:</strong> ${serviceType}</p>` : ''}
          ${guestText ? `<p><strong>Party Size:</strong> ${guestText}</p>` : ''}
        </div>
        
        <p>Your requested experience is still available! Complete your booking today and secure your date.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${bookingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">Complete Your Booking</a>
        </div>
        
        <p style="color: #666; font-size: 14px;">If you have any questions, reply to this email and we'll be happy to help.</p>
        <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
      </div>
    `

    const result = await sendEmailOrLog({
      to: email,
      subject: `Complete Your Booking — ${chefName}`,
      html,
      fallbackLog: `[Email] Abandoned booking follow-up to ${email} for chef ${chefId}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending abandoned booking follow-up email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

interface SendBookingCancellationParams {
  bookingId: string
  chefId: string
  dinerId: string
  action: 'cancelled'
}

interface SendBookingReminderParams {
  bookingId: string
  chefId: string
  dinerId: string
  bookingDate: string
  startTime: string | null
  guestCount: number | null
}

// Send reminder email to diner 48h before confirmed booking
export async function sendBookingReminderEmailToDiner({
  bookingId,
  chefId,
  dinerId,
  bookingDate,
  startTime,
  guestCount,
}: SendBookingReminderParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Fetch chef and diner details
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
    const dinerName = dinerProfile?.full_name || 'Dear guest'

    if (!dinerEmail) {
      return { success: false, error: 'Diner email not found' }
    }

    const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const timeText = startTime ? `at ${startTime}` : ''
    const guestText = guestCount ? `${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}` : ''
    const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/bookings`

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Your Dining Experience is Coming Up!</h1>
        <p>Dear ${dinerName},</p>
        <p>This is a friendly reminder that your booking with <strong>${chefName}</strong> is in <strong>2 days</strong>.</p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Chef:</strong> ${chefName}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          ${timeText ? `<p><strong>Time:</strong> ${timeText}</p>` : ''}
          ${guestText ? `<p><strong>Party Size:</strong> ${guestText}</p>` : ''}
          <p><strong>Reference ID:</strong> ${bookingId}</p>
        </div>
        
        <p>Make sure you're prepared! If you have any questions or need to make changes, please reply to this email.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${bookingUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Your Bookings</a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
      </div>
    `

    const result = await sendEmailOrLog({
      to: dinerEmail,
      subject: `Reminder: Your Booking with ${chefName} is in 2 Days`,
      html,
      fallbackLog: `[Email] Booking reminder to diner ${dinerEmail} for booking ${bookingId}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending booking reminder to diner:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

// Send reminder email to chef 48h before confirmed booking
export async function sendBookingReminderEmailToChef({
  bookingId,
  chefId,
  dinerId,
  bookingDate,
  startTime,
  guestCount,
}: SendBookingReminderParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Fetch chef and diner details
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

    const { data: dinerProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', dinerId)
      .single()

    const chefName = chefProfile?.display_name || 'Your chef'
    const chefEmail = chefAccount?.email
    const dinerName = dinerProfile?.full_name || 'your guest'

    if (!chefEmail) {
      return { success: false, error: 'Chef email not found' }
    }

    const formattedDate = new Date(bookingDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    const timeText = startTime ? `at ${startTime}` : ''
    const guestText = guestCount ? `${guestCount} ${guestCount === 1 ? 'guest' : 'guests'}` : ''
    const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/chef`

    const html = `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #1a1a1a;">Upcoming Booking Reminder</h1>
        <p>Hi <strong>${chefName}</strong>,</p>
        <p>This is a friendly reminder that you have a booking in <strong>2 days</strong> with <strong>${dinerName}</strong>.</p>
        
        <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p><strong>Guest:</strong> ${dinerName}</p>
          <p><strong>Date:</strong> ${formattedDate}</p>
          ${timeText ? `<p><strong>Time:</strong> ${timeText}</p>` : ''}
          ${guestText ? `<p><strong>Party Size:</strong> ${guestText}</p>` : ''}
          <p><strong>Reference ID:</strong> ${bookingId}</p>
        </div>
        
        <p>Please make sure you're prepared for this booking. If you need to make any changes, you can manage your bookings from your dashboard.</p>
        
        <div style="margin: 30px 0; text-align: center;">
          <a href="${dashboardUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600;">View Your Dashboard</a>
        </div>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
      </div>
    `

    const result = await sendEmailOrLog({
      to: chefEmail,
      subject: `Reminder: Booking with ${dinerName} in 2 Days`,
      html,
      fallbackLog: `[Email] Booking reminder to chef ${chefEmail} for booking ${bookingId}`,
    })

    if (!result.success) {
      return { success: false, error: result.error }
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending booking reminder to chef:', err)
    return { success: false, error: 'Unexpected error' }
  }
}

// Send cancellation email to both diner and chef
// action is always 'cancelled' for now
export async function sendBookingCancellationEmail({
  bookingId,
  chefId,
  dinerId,
  action,
}: SendBookingCancellationParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    // Fetch booking, chef, and diner details
    const { data: booking } = await supabase
      .from('bookings')
      .select('booking_date, start_time, guest_count, total_price, special_requests')
      .eq('id', bookingId)
      .single()

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

    const { data: dinerProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', dinerId)
      .single()

    const chefName = chefProfile?.display_name || 'Your chef'
    const chefEmail = chefAccount?.email
    const dinerEmail = dinerProfile?.email
    const dinerName = dinerProfile?.full_name || 'Dear guest'

    const formattedDate = booking
      ? new Date(booking.booking_date).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : 'your date'

    const timeText = booking?.start_time ? `at ${booking.start_time}` : ''
    const guestText = booking?.guest_count ? `${booking.guest_count} ${booking.guest_count === 1 ? 'guest' : 'guests'}` : ''

    // Send email to diner
    if (dinerEmail) {
      const dinerHtml = `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">Booking Cancelled</h1>
          <p>Dear ${dinerName},</p>
          <p>Your booking with <strong>${chefName}</strong> on <strong>${formattedDate}</strong> has been <strong>cancelled</strong>.</p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>Chef:</strong> ${chefName}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            ${timeText ? `<p><strong>Time:</strong> ${timeText}</p>` : ''}
            ${guestText ? `<p><strong>Party Size:</strong> ${guestText}</p>` : ''}
            ${booking?.total_price ? `<p><strong>Quote Amount:</strong> $${booking.total_price}</p>` : ''}
            <p><strong>Reference ID:</strong> ${bookingId}</p>
          </div>
          
          <p>If you need to rebook or have any questions, feel free to reply to this email or browse our chefs for other availability.</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
        </div>
      `

      await sendEmailOrLog({
        to: dinerEmail,
        subject: `Booking Cancelled — ${chefName} on ${formattedDate}`,
        html: dinerHtml,
        fallbackLog: `[Email] Cancellation email to diner ${dinerEmail} for booking ${bookingId}`,
      })
    }

    // Send email to chef
    if (chefEmail) {
      const chefHtml = `
        <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #1a1a1a;">Booking Cancelled</h1>
          <p>Hi <strong>${chefName}</strong>,</p>
          <p>The booking with <strong>${dinerName}</strong> on <strong>${formattedDate}</strong> has been <strong>cancelled</strong> by the diner.</p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <p><strong>Guest:</strong> ${dinerName}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            ${timeText ? `<p><strong>Time:</strong> ${timeText}</p>` : ''}
            ${guestText ? `<p><strong>Party Size:</strong> ${guestText}</p>` : ''}
            ${booking?.total_price ? `<p><strong>Quote Amount:</strong> $${booking.total_price}</p>` : ''}
            <p><strong>Reference ID:</strong> ${bookingId}</p>
          </div>
          
          <p>The time slot has been freed and is now available for other bookings.</p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">— The Maison des Chefs Team</p>
        </div>
      `

      await sendEmailOrLog({
        to: chefEmail,
        subject: `Booking Cancelled — ${dinerName} on ${formattedDate}`,
        html: chefHtml,
        fallbackLog: `[Email] Cancellation email to chef ${chefEmail} for booking ${bookingId}`,
      })
    }

    return { success: true }
  } catch (err) {
    console.error('[Email] Error sending cancellation email:', err)
    return { success: false, error: 'Unexpected error' }
  }
}
