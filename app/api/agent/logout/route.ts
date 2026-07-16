import { NextResponse } from 'next/server';
import {
  agentSessionTokenFromRequest,
  revokeAgentSession,
  AGENT_SESSION_COOKIE,
} from '@/lib/agent-auth';
import { sessionCookieOptions } from '@/lib/auth-tokens';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/agent/logout — revokes the session and clears the cookie. */
export async function POST(req: Request) {
  const token = agentSessionTokenFromRequest(req);
  if (token) await revokeAgentSession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AGENT_SESSION_COOKIE, '', sessionCookieOptions(0));
  return res;
}
