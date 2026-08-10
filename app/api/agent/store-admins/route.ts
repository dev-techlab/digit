import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';


export async function GET(req: Request) {
  try {
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
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/store-admins', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

const postSchema = z.object({
  username: z.string().min(4, 'Username must be at least 4 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  nickname: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  status: z.enum(['active', 'disabled']).optional().default('active'),
});

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage store administrators' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const data = postSchema.parse(body);

    const created = await db.store_administrators.create({
      data: {
        store_id: agent.storeId,
        username: data.username.trim(),
        password_hash: await bcrypt.hash(data.password, 10),
        nickname: data.nickname?.trim() || null,
        email: data.email?.trim() || null,
        status: data.status,
      },
      select: { id: true }
    });
    return NextResponse.json({ ok: true, id: created.id });
  } catch (e: any) {
    if (e instanceof ZodError) {
      return NextResponse.json({ error: e.issues[0].message }, { status: 400 });
    }
    if (e.code === 'P2002') {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ error: 'Failed to create store administrator' }, { status: 500 });
  }
}

const putSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['active', 'disabled']).optional(),
  nickname: z.string().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(6).optional().or(z.literal('')),
});

export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json(
      { error: 'Only the store account can manage store administrators' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const data = putSchema.parse(body);

    const set: any = {};
    if (data.status) set.status = data.status;
    if (data.nickname !== undefined) set.nickname = data.nickname.trim() || null;
    if (data.email !== undefined) set.email = data.email.trim() || null;
    if (data.password) {
      set.password_hash = await bcrypt.hash(data.password, 10);
    }

    if (Object.keys(set).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await db.store_administrators.updateMany({
      where: {
        id: data.id,
        store_id: agent.storeId
      },
      data: set
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('PUT /api/agent/store-admins', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
