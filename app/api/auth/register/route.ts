import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  registerUser,
  createUserSession,
  getUserProfile,
  UserConflictError,
} from '@/lib/user-service';
import { USER_SESSION_COOKIE, USER_SESSION_TTL_S, sessionCookieOptions } from '@/lib/auth-tokens';
import { requestOtp } from '@/lib/otp';
import { sendEmailVerification } from '@/lib/mail';
import { sendSms } from '@/lib/sms';

const registerSchema = z
  .object({
    username: z.string().min(8, 'Username must be at least 8 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    email: z.string().email('Invalid email address').optional(),
    phone: z.string().min(7, 'Phone number must be valid').optional(),
    inviteCode: z.string().optional(),
  })
  .refine(
    (data) => {
      // Quick Register allows sending empty body
      const isQuick =
        !data.email && !data.phone && !data.username && !data.password && !data.inviteCode;
      if (isQuick) return true;
      return !!data.email || !!data.phone || (!!data.username && !!data.password);
    },
    { message: 'Email, phone, or username/password is required', path: ['root'] }
  );

/**
 * POST /api/auth/register — { username?, password? }.
 * Omit both for Quick Register (server generates + returns them once).
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const parseResult = registerSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0].message }, { status: 400 });
  }

  const { username, password, email, phone, inviteCode } = parseResult.data;

  try {
    const created = await registerUser({ username, password, email, phone, inviteCode });

    let verificationMethod = null;
    let pendingVerification = false;

    if (email) {
      const otpReq = await requestOtp(email, 'register', created.id, { skipEmail: true });
      if (otpReq.ok) {
        // Assume verifyUrl expects token or code. We'll pass the code.
        const origin = req.headers.get('origin') || 'http://localhost:3000';
        await sendEmailVerification({
          to: email,
          verifyUrl: `${origin}/auth/verify-email?code=${otpReq.code}&email=${encodeURIComponent(email)}`,
          code: otpReq.code,
        });
        verificationMethod = 'email';
        pendingVerification = true;
      }
    } else if (phone) {
      const otpReq = await requestOtp(phone, 'register', created.id);
      if (otpReq.ok) {
        const smsResult = await sendSms(
          phone,
          `Your OctanLink verification code is: ${otpReq.code}`
        );
        if (!smsResult.ok) {
          return NextResponse.json({ error: smsResult.error }, { status: 400 });
        }
        verificationMethod = 'phone';
        pendingVerification = true;
      }
    }

    if (pendingVerification) {
      return NextResponse.json(
        {
          ok: true,
          pendingVerification: true,
          verificationMethod,
          user: await getUserProfile(created.id),
          credentials: created.generated
            ? { username: created.username, password: created.password }
            : undefined,
        },
        { status: 201 }
      );
    }

    const { token } = await createUserSession(created.id, {
      userAgent: req.headers.get('user-agent') ?? undefined,
    });
    const res = NextResponse.json(
      {
        ok: true,
        user: await getUserProfile(created.id),
        credentials: created.generated
          ? { username: created.username, password: created.password }
          : undefined,
      },
      { status: 201 }
    );
    res.cookies.set(USER_SESSION_COOKIE, token, sessionCookieOptions(USER_SESSION_TTL_S));
    return res;
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err && (err as any).name === 'UserConflictError') {
      return NextResponse.json({ error: (err as any).message }, { status: 409 });
    }
    console.error('POST /api/auth/register', err);
    return NextResponse.json(
      { error: (err as any)?.message || 'Registration failed' },
      { status: 500 }
    );
  }
}
