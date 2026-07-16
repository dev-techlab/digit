import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/agent/change-password — { current, next } (min 6 chars). */
export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const current = typeof body.current === 'string' ? body.current : '';
  const next = typeof body.next === 'string' ? body.next : '';
  if (!current || !next) {
    return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
  }
  if (next.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  const [row] = await db
    .select({ passwordHash: s.agents.passwordHash })
    .from(s.agents)
    .where(eq(s.agents.id, agent.id));
  if (!row || !(await bcrypt.compare(current, row.passwordHash))) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  await db
    .update(s.agents)
    .set({ passwordHash: await bcrypt.hash(next, 10) })
    .where(eq(s.agents.id, agent.id));
  return NextResponse.json({ ok: true });
}
