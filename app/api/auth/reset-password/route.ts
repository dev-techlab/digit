import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';
import { userIdByPhone, setUserPassword } from '@/lib/user-service';
import { z } from 'zod';

const resetSchema = z.object({
  destination: z.string().trim().min(1, 'destination and code are required'),
  code: z.string().trim().min(1, 'destination and code are required'),
  newPassword: z.string().min(6, 'Password must be at least 6 characters')
});


/**
 * POST /api/auth/reset-password — { destination, code, newPassword }.
 * Verifies the `reset_password` OTP for the phone, then sets a new password
 * for the account bound to it. Doesn't start a session — the player logs in
 * with the new password afterward.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = resetSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { destination, code, newPassword } = parseResult.data;

    const result = await verifyOtp(destination, 'reset_password', code);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

    const userId = result.userId ?? (await userIdByPhone(destination));
    if (!userId) {
      return NextResponse.json({ error: 'No account found for this phone number' }, { status: 404 });
    }

    await setUserPassword(userId, newPassword);
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/auth/reset-password', err);
    return NextResponse.json({ error: (err as any)?.message || 'Failed to reset password' }, { status: 500 });
  }
}
