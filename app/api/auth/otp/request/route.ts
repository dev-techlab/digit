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
  try {
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

    if (!destination.includes('@')) {
      const { sendSms } = await import('@/lib/sms');
      const smsResult = await sendSms(destination, `Your OctanLink verification code is: ${result.code}`);
      if (!smsResult.ok) {
        return NextResponse.json({ error: smsResult.error }, { status: 400 });
      }
    }

    // Never return the code in production; echo it only in non-prod so the flow is testable without an SMS gateway.
    return NextResponse.json({
      ok: true,
    });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/auth/otp/request', err);
    return NextResponse.json({ error: (err as any)?.message || 'Internal server error' }, { status: 500 });
  }
}
