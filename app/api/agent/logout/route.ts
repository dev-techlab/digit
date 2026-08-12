import { NextResponse } from 'next/server';
import {
  agentSessionTokenFromRequest,
  revokeAgentSession,
  AGENT_SESSION_COOKIE,
} from '@/lib/agent-auth';
import { sessionCookieOptions } from '@/lib/auth-tokens';

/** POST /api/agent/logout — revokes the session and clears the cookie. */
export async function POST(req: Request) {
  try {
    const token = agentSessionTokenFromRequest(req);
    if (token) await revokeAgentSession(token);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AGENT_SESSION_COOKIE, '', sessionCookieOptions(0));
    return res;
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/agent/logout', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
