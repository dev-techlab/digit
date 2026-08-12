import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { z } from 'zod';

const postSchema = z.object({
  name: z.string().trim().min(1, 'Name and code are required'),
  code: z.string().trim().min(1, 'Name and code are required'),
});

export async function GET(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await db.kiosks.findMany({
      where: { store_id: agent.storeId },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({
      kiosks: rows.map((r) => ({
        id: r.id,
        storeId: r.store_id,
        name: r.name,
        code: r.code,
        createdAt: r.created_at,
      })),
    });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/kiosks', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (agent.type !== 'store') {
      return NextResponse.json(
        { error: 'Only the store account can manage kiosks' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const parseResult = postSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const { name, code } = parseResult.data;

    const created = await db.kiosks.create({
      data: { store_id: agent.storeId, name, code },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/agent/kiosks', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
