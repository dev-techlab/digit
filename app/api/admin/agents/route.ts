import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { and, desc, eq, ilike, isNull, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';
import { isUniqueViolation } from '@/lib/db-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Resolve + permission-check the caller; returns the adminId or a ready-to-return error response. */
async function authorize(
  req: Request,
  permKey: string
): Promise<{ adminId: string; error: undefined } | { adminId: undefined; error: NextResponse }> {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId)
    return { adminId: undefined, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  try {
    await requirePermission(adminId, permKey);
  } catch (e) {
    if (e instanceof PermissionError) {
      return { adminId: undefined, error: NextResponse.json({ error: e.message }, { status: e.status }) };
    }
    throw e;
  }
  return { adminId, error: undefined };
}

/**
 * GET /api/admin/agents?page=&pageSize=&search= — top-level store/agent
 * accounts (the B2B side that resells game credits to members). Only
 * `type = 'store'` root accounts are managed here; each store then creates
 * its own sale/sub agents and store administrators from its own panel.
 */
export async function GET(req: Request) {
  const { error } = await authorize(req, 'agents.read');
  if (error) return error;

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize')) || 20));
  const search = url.searchParams.get('search')?.trim();

  const where = and(
    eq(s.agents.type, 'store'),
    search
      ? or(
          ilike(s.agents.username, `%${search}%`),
          ilike(s.agents.nickname, `%${search}%`),
          ilike(s.agents.email, `%${search}%`)
        )
      : undefined
  );

  const [rows, [{ count }]] = await Promise.all([
    db
      .select({
        id: s.agents.id,
        username: s.agents.username,
        nickname: s.agents.nickname,
        email: s.agents.email,
        inviteCode: s.agents.inviteCode,
        onlineBalance: s.agents.onlineBalance,
        status: s.agents.status,
        remark: s.agents.remark,
        lastLoginAt: s.agents.lastLoginAt,
        createdAt: s.agents.createdAt,
      })
      .from(s.agents)
      .where(where)
      .orderBy(desc(s.agents.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: sql<number>`count(*)::int` }).from(s.agents).where(where),
  ]);

  return NextResponse.json({ agents: rows, total: count });
}

/**
 * POST /api/admin/agents — create a new store (root agent) account. The
 * password is only ever returned here, at creation time — same "shown once"
 * convention as the player Quick Register flow — so keep it visible in the
 * UI until the operator has copied it.
 */
export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'agents.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const nickname = typeof body.nickname === 'string' ? body.nickname.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const remark = typeof body.remark === 'string' ? body.remark.slice(0, 300) : null;

  if (!username || username.length < 4) {
    return NextResponse.json({ error: 'Username must be at least 4 characters' }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  try {
    const [created] = await db
      .insert(s.agents)
      .values({
        type: 'store',
        username,
        passwordHash: await bcrypt.hash(password, 10),
        nickname: nickname || username,
        email: email || null,
        inviteCode: `MC${randomBytes(8).toString('hex').toUpperCase()}`,
        remark,
      })
      .returning();
    // A store's storeId is itself — the root of its own agent hierarchy.
    await db.update(s.agents).set({ storeId: created.id }).where(eq(s.agents.id, created.id));
    await db
      .insert(s.storeSettings)
      .values({ storeId: created.id })
      .onConflictDoNothing();

    await logAdminAction({
      adminId,
      action: 'agent.create',
      entityType: 'agent',
      entityId: created.id,
      changes: { username, nickname: nickname || username, email: email || null },
      ipAddress: clientIp(req),
    });
    return NextResponse.json(
      { agent: { id: created.id, username, password }, ok: true },
      { status: 201 }
    );
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 409 });
    }
    console.error('POST /api/admin/agents', err);
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 });
  }
}

/** PUT /api/admin/agents — { id, status?, password? } toggle access / reset a store's password. */
export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'agents.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: Partial<typeof s.agents.$inferInsert> = {};
  if (body.status === 'active' || body.status === 'disabled') set.status = body.status;
  if (typeof body.password === 'string' && body.password.length >= 6) {
    set.passwordHash = await bcrypt.hash(body.password, 10);
  }
  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const [row] = await db
    .update(s.agents)
    .set(set)
    .where(and(eq(s.agents.id, id), eq(s.agents.type, 'store')))
    .returning({ id: s.agents.id });
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  if (set.status) {
    await db
      .update(s.agentSessions)
      .set({ revokedAt: new Date() })
      .where(and(eq(s.agentSessions.agentId, id), isNull(s.agentSessions.revokedAt)));
  }

  await logAdminAction({
    adminId,
    action: set.status ? `agent.${set.status === 'active' ? 'unblock' : 'block'}` : 'agent.reset_password',
    entityType: 'agent',
    entityId: id,
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
