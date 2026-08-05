import { NextResponse } from 'next/server';
import { requestOtp, type OtpPurpose } from '@/lib/otp';
import { env } from '@/lib/env';
import { z } from 'zod';

const requestSchema = z.object({
  destination: z.string().trim().min(1, 'Valid destination and purpose are required'),
  purpose: z.enum(['login', 'register', 'reset_password'], { message: "Invalid input" })
});

/** POST /api/auth/otp/request — { destination, purpose } → issues a code. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parseResult = requestSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || 'Invalid input' },
      { status: 400 }
    );
  }

  const { destination, purpose } = parseResult.data;

  const result = await requestOtp(destination, purpose as OtpPurpose);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 429 });

  // The real system delivers `code` via SMS. Never return it in production;
  // echo it only in non-prod so the flow is testable without an SMS gateway.
  return NextResponse.json({
    ok: true,
    ...(env.NODE_ENV !== 'production' ? { devCode: result.code } : {}),
  });
}
