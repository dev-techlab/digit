import 'server-only';
import bcrypt from 'bcryptjs';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
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
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearer ?? cookieValue(req.headers.get('cookie'), AGENT_SESSION_COOKIE);
  if (!token) return null;

  const rows = await db
    .select({
      id: s.agents.id,
      type: s.agents.type,
      username: s.agents.username,
      nickname: s.agents.nickname,
      email: s.agents.email,
      storeId: s.agents.storeId,
    })
    .from(s.agentSessions)
    .innerJoin(s.agents, eq(s.agents.id, s.agentSessions.agentId))
    .where(
      and(
        eq(s.agentSessions.token, token),
        gt(s.agentSessions.expiresAt, new Date()),
        isNull(s.agentSessions.revokedAt),
        eq(s.agents.status, 'active')
      )
    )
    .limit(1);

  const a = rows[0];
  if (!a) return null;
  return { ...a, storeId: a.storeId ?? a.id };
}

/** Verify username/password → agent id, or null. */
export async function verifyAgentLogin(username: string, password: string) {
  const [agent] = await db
    .select({ id: s.agents.id, passwordHash: s.agents.passwordHash, status: s.agents.status })
    .from(s.agents)
    .where(eq(s.agents.username, username))
    .limit(1);
  if (!agent || agent.status !== 'active') return null;
  const ok = await bcrypt.compare(password, agent.passwordHash);
  if (!ok) return null;
  await db.update(s.agents).set({ lastLoginAt: new Date() }).where(eq(s.agents.id, agent.id));
  return agent.id;
}

export async function createAgentSession(agentId: string, meta?: { userAgent?: string }) {
  const token = newSessionToken();
  await db.insert(s.agentSessions).values({
    agentId,
    token,
    userAgent: meta?.userAgent,
    expiresAt: new Date(Date.now() + AGENT_SESSION_TTL_S * 1000),
  });
  return { token };
}

export async function revokeAgentSession(token: string) {
  await db
    .update(s.agentSessions)
    .set({ revokedAt: new Date() })
    .where(eq(s.agentSessions.token, token));
}

export function agentSessionTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  return bearer ?? cookieValue(req.headers.get('cookie'), AGENT_SESSION_COOKIE);
}
