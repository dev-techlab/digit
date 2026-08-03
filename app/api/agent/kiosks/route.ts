import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db.kiosks.findMany({
    where: { store_id: agent.storeId },
    orderBy: { created_at: 'desc' }
  });
  
  return NextResponse.json({ kiosks: rows.map(r => ({
    id: r.id,
    storeId: r.store_id,
    name: r.name,
    code: r.code,
    createdAt: r.created_at,
  })) });
}

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage kiosks' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const code = typeof body.code === 'string' ? body.code.trim() : '';
  if (!name || !code) {
    return NextResponse.json({ error: 'Name and code are required' }, { status: 400 });
  }

  const created = await db.kiosks.create({
    data: { store_id: agent.storeId, name, code },
    select: { id: true }
  });
  return NextResponse.json({ ok: true, id: created.id });
}
