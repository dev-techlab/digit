import { NextResponse } from 'next/server';
import {
  verifyAgentLogin,
  createAgentSession,
  AGENT_SESSION_COOKIE,
  AGENT_SESSION_TTL_S,
} from '@/lib/agent-auth';
import { sessionCookieOptions } from '@/lib/auth-tokens';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

/** POST /api/agent/login — { username, password } → sets the agent_session cookie. */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = loginSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { username, password } = parseResult.data;

    const agentId = await verifyAgentLogin(username, password);
    if (!agentId) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

    const { token } = await createAgentSession(agentId, {
      userAgent: req.headers.get('user-agent') ?? undefined,
    });
    const res = NextResponse.json({ ok: true, agentId });
    res.cookies.set(AGENT_SESSION_COOKIE, token, sessionCookieOptions(AGENT_SESSION_TTL_S));
    return res;
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/agent/login', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
