import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

  const row = await db.agents.findUnique({
    where: { id: agent.id },
    select: { password_hash: true }
  });
  
  if (!row || !(await bcrypt.compare(current, row.password_hash))) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
  }

  await db.agents.update({
    where: { id: agent.id },
    data: { password_hash: await bcrypt.hash(next, 10) }
  });
  return NextResponse.json({ ok: true });
}
