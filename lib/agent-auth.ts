import 'server-only';
import { headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { newSessionToken } from '@/lib/auth-tokens';

export const AGENT_SESSION_COOKIE = 'agent_session';
export const AGENT_SESSION_TTL_S = 7 * 24 * 60 * 60; // 7 days

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export interface AgentContext {
  id: string;
  type: 'store' | 'sale' | 'sub';
  username: string;
  nickname: string | null;
  email: string | null;
  /** Root store id — equals `id` when the agent IS the store. */
  storeId: string;
}

/** Resolve the authenticated agent from the `agent_session` cookie (or Bearer). */
export async function getAgentFromRequest(req: Request): Promise<AgentContext | null> {
  headers(); // Tell Next.js this route is dynamic
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearer ?? cookieValue(req.headers.get('cookie'), AGENT_SESSION_COOKIE);
  if (!token) return null;

  const session = await db.agent_sessions.findFirst({
    where: {
      token,
      expires_at: { gt: new Date() },
      revoked_at: null,
      agents: { status: 'active' },
    },
    include: {
      agents: {
        select: {
          id: true,
          type: true,
          username: true,
          nickname: true,
          email: true,
          store_id: true,
        },
      },
    },
  });

  const a = session?.agents;
  if (!a) return null;
  return { ...a, storeId: a.store_id ?? a.id } as AgentContext;
}

/** Verify username/password → agent id, or null. */
export async function verifyAgentLogin(username: string, password: string) {
  const agent = await db.agents.findFirst({
    where: { username },
    select: { id: true, password_hash: true, status: true },
  });
  if (agent) {
    if (agent.status !== 'active') return null;
    const ok = await bcrypt.compare(password, agent.password_hash);
    if (!ok) return null;
    await db.agents.update({
      where: { id: agent.id },
      data: { last_login_at: new Date() },
    });
    return agent.id;
  }

  // Store administrators are extra staff logins for a store (no row of their
  // own in `agents`, and `agent_sessions.agent_id` has no separate identity
  // for them) — authenticate them, then resolve the session to their store's
  // agent id so they get that store's full 'store'-type access.
  const admin = await db.store_administrators.findFirst({
    where: { username },
    select: { store_id: true, password_hash: true, status: true },
  });
  if (!admin || admin.status !== 'active') return null;
  const ok = await bcrypt.compare(password, admin.password_hash);
  if (!ok) return null;
  return admin.store_id;
}

export async function createAgentSession(agentId: string, meta?: { userAgent?: string }) {
  const token = newSessionToken();
  await db.agent_sessions.create({
    data: {
      agent_id: agentId,
      token,
      user_agent: meta?.userAgent,
      expires_at: new Date(Date.now() + AGENT_SESSION_TTL_S * 1000),
    },
  });
  return { token };
}

export async function revokeAgentSession(token: string) {
  await db.agent_sessions.updateMany({
    where: { token },
    data: { revoked_at: new Date() },
  });
}

export function agentSessionTokenFromRequest(req: Request): string | null {
  headers(); // Tell Next.js this route is dynamic
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return bearer ?? cookieValue(req.headers.get('cookie'), AGENT_SESSION_COOKIE);
}
