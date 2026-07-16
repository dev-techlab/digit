import { NextResponse } from 'next/server';
import {
  verifyAgentLogin,
  createAgentSession,
  AGENT_SESSION_COOKIE,
  AGENT_SESSION_TTL_S,
} from '@/lib/agent-auth';
import { sessionCookieOptions } from '@/lib/auth-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/agent/login — { username, password } → sets the agent_session cookie. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  const agentId = await verifyAgentLogin(username, password);
  if (!agentId) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });

  const { token } = await createAgentSession(agentId, {
    userAgent: req.headers.get('user-agent') ?? undefined,
  });
  const res = NextResponse.json({ ok: true, agentId });
  res.cookies.set(AGENT_SESSION_COOKIE, token, sessionCookieOptions(AGENT_SESSION_TTL_S));
  return res;
}
