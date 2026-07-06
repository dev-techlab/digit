import { NextResponse } from 'next/server';
import { requestOtp, type OtpPurpose } from '@/lib/otp';
import { otpPurposeEnum } from '@/lib/db/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PURPOSES = new Set<string>(otpPurposeEnum.enumValues);

/** POST /api/auth/otp/request — { destination, purpose } → issues a code. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const destination = typeof body.destination === 'string' ? body.destination.trim() : '';
  const purpose = typeof body.purpose === 'string' ? body.purpose : '';
  if (!destination || !PURPOSES.has(purpose)) {
    return NextResponse.json({ error: 'Valid destination and purpose are required' }, { status: 400 });
  }

  const result = await requestOtp(destination, purpose as OtpPurpose);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 });

  // The real system delivers `code` via SMS. Never return it in production;
  // echo it only in non-prod so the flow is testable without an SMS gateway.
  return NextResponse.json({
    ok: true,
    ...(process.env.NODE_ENV !== 'production' ? { devCode: result.code } : {}),
  });
}
