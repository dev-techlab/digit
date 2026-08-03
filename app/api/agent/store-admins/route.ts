import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db.store_administrators.findMany({
    where: { store_id: agent.storeId },
    select: {
      id: true,
      username: true,
      nickname: true,
      email: true,
      status: true,
      created_at: true,
    },
    orderBy: { created_at: 'desc' }
  });
  
  return NextResponse.json({ admins: rows.map(r => ({
    id: r.id,
    username: r.username,
    nickname: r.nickname,
    email: r.email,
    status: r.status,
    createdAt: r.created_at,
  })) });
}

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage store administrators' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  try {
    const created = await db.store_administrators.create({
      data: {
        store_id: agent.storeId,
        username,
        password_hash: await bcrypt.hash(password, 10),
        nickname: typeof body.nickname === 'string' ? body.nickname : null,
        email: typeof body.email === 'string' ? body.email : null,
        status: body.status === 'disabled' ? 'disabled' : 'active',
      },
      select: { id: true }
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to create store administrator' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage store administrators' },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: any = {};
  if (body.status === 'active' || body.status === 'disabled') set.status = body.status;
  if (typeof body.nickname === 'string') set.nickname = body.nickname;
  if (typeof body.email === 'string') set.email = body.email;
  if (typeof body.password === 'string' && body.password.length >= 6) {
    set.password_hash = await bcrypt.hash(body.password, 10);
  }

  await db.store_administrators.updateMany({
    where: {
      id,
      store_id: agent.storeId
    },
    data: set
  });
  return NextResponse.json({ ok: true });
}
