import { NextResponse } from 'next/server'
import { getResendApiKeyStatus } from '@/lib/email/resend'

export async function GET() {
  const resendStatus = getResendApiKeyStatus()

  return NextResponse.json({
    email: {
      resend: resendStatus,
    },
    timestamp: new Date().toISOString(),
  })
}