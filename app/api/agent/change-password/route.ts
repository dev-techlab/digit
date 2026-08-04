import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { z } from 'zod';

const passwordSchema = z.object({
  current: z.string().min(1, 'Current password is required'),
  next: z.string().min(6, 'Password must be at least 6 characters')
});


export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const parseResult = passwordSchema.safeParse(body);
  
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0]?.message || 'Invalid input' },
      { status: 400 }
    );
  }

  const { current, next } = parseResult.data;

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
