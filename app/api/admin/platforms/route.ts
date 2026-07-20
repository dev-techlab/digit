import { NextResponse } from 'next/server';
import { asc, eq, isNull, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';
import { isUniqueViolation } from '@/lib/db-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const optStr = (v: unknown) => {
  const t = str(v);
  return t === '' ? null : t;
};

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
 * Master `game_platforms` catalog — shared across every store tenant on the
 * agent panel (stores only pick which platforms to enable, under Game
 * Setting; they don't own or edit the catalog itself). Admin-only by design.
 */

/** GET /api/admin/platforms — full catalog (active + inactive, excluding soft-deleted) for management. */
export async function GET(req: Request) {
  const { error } = await authorize(req, 'platforms.read');
  if (error) return error;

  const platforms = await db
    .select()
    .from(s.gamePlatforms)
    .where(isNull(s.gamePlatforms.deletedAt))
    .orderBy(asc(s.gamePlatforms.sort), asc(s.gamePlatforms.name));
  return NextResponse.json({ platforms });
}

/** POST /api/admin/platforms — create a new platform in the catalog. */
export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'platforms.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const name = str(body.name);
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  const slug = str(body.slug) || slugify(name);
  if (!slug) return NextResponse.json({ error: 'invalid name/slug' }, { status: 400 });

  const values = {
    name,
    slug,
    iconUrl: optStr(body.iconUrl),
    providerCode: optStr(body.providerCode),
    providerType: optStr(body.providerType),
    launchUrl: optStr(body.launchUrl),
    sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
    isActive: typeof body.isActive === 'boolean' ? body.isActive : true,
  };

  try {
    const [row] = await db.insert(s.gamePlatforms).values(values).returning();
    await logAdminAction({
      adminId,
      action: 'platform.create',
      entityType: 'game_platform',
      entityId: row.id,
      changes: row,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ platform: row }, { status: 201 });
  } catch (err) {
    if (!isUniqueViolation(err)) {
      console.error('POST /api/admin/platforms', err);
      return NextResponse.json({ error: 'Failed to create platform' }, { status: 500 });
    }
    // `name`/`slug` conflict against a soft-deleted platform restores it (with
    // the new values) instead of failing — the name/slug is otherwise
    // invisible/reusable once deleted. A conflict against a still-active
    // platform is a real conflict.
    const [conflicting] = await db
      .select({ id: s.gamePlatforms.id, deletedAt: s.gamePlatforms.deletedAt })
      .from(s.gamePlatforms)
      .where(or(eq(s.gamePlatforms.name, name), eq(s.gamePlatforms.slug, slug)));
    if (!conflicting?.deletedAt) {
      return NextResponse.json(
        { error: 'A platform with that name or slug already exists' },
        { status: 409 }
      );
    }
    const [row] = await db
      .update(s.gamePlatforms)
      .set({ ...values, deletedAt: null })
      .where(eq(s.gamePlatforms.id, conflicting.id))
      .returning();
    await logAdminAction({
      adminId,
      action: 'platform.create',
      entityType: 'game_platform',
      entityId: row.id,
      changes: row,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ platform: row }, { status: 201 });
  }
}

/** PUT /api/admin/platforms — update an existing platform ({ id, ...fields }). */
export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'platforms.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = str(body.id);
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: Partial<typeof s.gamePlatforms.$inferInsert> = {};
  if (str(body.name)) set.name = str(body.name);
  if (str(body.slug)) set.slug = slugify(str(body.slug));
  if ('iconUrl' in body) set.iconUrl = optStr(body.iconUrl);
  if ('providerCode' in body) set.providerCode = optStr(body.providerCode);
  if ('providerType' in body) set.providerType = optStr(body.providerType);
  if ('launchUrl' in body) set.launchUrl = optStr(body.launchUrl);
  if (body.sort != null && Number.isFinite(Number(body.sort))) set.sort = Number(body.sort);
  if (typeof body.isActive === 'boolean') set.isActive = body.isActive;

  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  try {
    const [row] = await db
      .update(s.gamePlatforms)
      .set(set)
      .where(eq(s.gamePlatforms.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
    await logAdminAction({
      adminId,
      action: 'platform.update',
      entityType: 'game_platform',
      entityId: id,
      changes: set,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ platform: row });
  } catch {
    return NextResponse.json(
      { error: 'A platform with that name or slug already exists' },
      { status: 409 }
    );
  }
}

/**
 * DELETE /api/admin/platforms?id=... — soft delete: stamps `deletedAt` and
 * hides the platform from every catalog view (this list, the agent's Game
 * Setting / Platform Catalog screens). Nothing is destroyed — existing
 * `store_platform_accounts`, `member_platform_accounts`, transactions, and
 * redemption audits are left exactly as they were, so historical reports
 * keep the real platform name. There is no separate hard-delete path.
 */
export async function DELETE(req: Request) {
  const { error, adminId } = await authorize(req, 'platforms.write');
  if (error) return error;

  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const [row] = await db
    .update(s.gamePlatforms)
    .set({ deletedAt: new Date() })
    .where(eq(s.gamePlatforms.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await logAdminAction({
    adminId,
    action: 'platform.delete',
    entityType: 'game_platform',
    entityId: id,
    changes: { platform: row },
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
