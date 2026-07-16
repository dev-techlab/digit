import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/store-admins — staff logins for this store. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({
      id: s.storeAdministrators.id,
      username: s.storeAdministrators.username,
      nickname: s.storeAdministrators.nickname,
      email: s.storeAdministrators.email,
      status: s.storeAdministrators.status,
      createdAt: s.storeAdministrators.createdAt,
    })
    .from(s.storeAdministrators)
    .where(eq(s.storeAdministrators.storeId, agent.storeId))
    .orderBy(desc(s.storeAdministrators.createdAt));
  return NextResponse.json({ admins: rows });
}

/** POST /api/agent/store-admins — add a store administrator. */
export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
  }

  try {
    const [created] = await db
      .insert(s.storeAdministrators)
      .values({
        storeId: agent.storeId,
        username,
        passwordHash: await bcrypt.hash(password, 10),
        nickname: typeof body.nickname === 'string' ? body.nickname : null,
        email: typeof body.email === 'string' ? body.email : null,
        status: body.status === 'disabled' ? 'disabled' : 'active',
      })
      .returning({ id: s.storeAdministrators.id });
    return NextResponse.json({ ok: true, id: created.id });
  } catch {
    return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
  }
}

/** PUT /api/agent/store-admins — update status/nickname/email. */
export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: Partial<typeof s.storeAdministrators.$inferInsert> = {};
  if (body.status === 'active' || body.status === 'disabled') set.status = body.status;
  if (typeof body.nickname === 'string') set.nickname = body.nickname;
  if (typeof body.email === 'string') set.email = body.email;
  if (typeof body.password === 'string' && body.password.length >= 6) {
    set.passwordHash = await bcrypt.hash(body.password, 10);
  }

  await db
    .update(s.storeAdministrators)
    .set(set)
    .where(
      and(eq(s.storeAdministrators.id, id), eq(s.storeAdministrators.storeId, agent.storeId))
    );
  return NextResponse.json({ ok: true });
}
