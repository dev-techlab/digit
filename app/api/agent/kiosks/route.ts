import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/kiosks — kiosk terminals for this store. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(s.kiosks)
    .where(eq(s.kiosks.storeId, agent.storeId))
    .orderBy(desc(s.kiosks.createdAt));
  return NextResponse.json({ kiosks: rows });
}

/** POST /api/agent/kiosks — add a kiosk. */
export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!name || !code) {
    return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
  }

  const [created] = await db
    .insert(s.kiosks)
    .values({ storeId: agent.storeId, name, code })
    .returning({ id: s.kiosks.id });
  return NextResponse.json({ ok: true, id: created.id });
}
