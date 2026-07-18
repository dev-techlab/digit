import { NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otp';
import { userIdByPhone, setUserPassword } from '@/lib/user-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reset-password — { destination, code, newPassword }.
 * Verifies the `reset_password` OTP for the phone, then sets a new password
 * for the account bound to it. Doesn't start a session — the player logs in
 * with the new password afterward.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const destination = typeof body.destination === 'string' ? body.destination.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (!destination || !code) {
    return NextResponse.json({ error: 'destination and code are required' }, { status: 400 });
  }
  if (newPassword.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const result = await verifyOtp(destination, 'reset_password', code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  const userId = result.userId ?? (await userIdByPhone(destination));
  if (!userId) {
    return NextResponse.json({ error: 'No account found for this phone number' }, { status: 404 });
  }

  await setUserPassword(userId, newPassword);
  return NextResponse.json({ ok: true });
}
