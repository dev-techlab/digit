import { NextResponse } from 'next/server';
import { asc, eq, isNotNull, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';

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

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const int = (v: unknown): number | null => {
  const n = Number(v);
  return v != null && v !== '' && Number.isFinite(n) ? Math.trunc(n) : null;
};
const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** GET /api/admin/bonuses — full bonus definition catalog (including inactive, excluding soft-deleted) for management. */
export async function GET(req: Request) {
  const { error } = await authorize(req, 'bonuses.read');
  if (error) return error;

  const bonuses = await db
    .select()
    .from(s.bonuses)
    .where(isNull(s.bonuses.deletedAt))
    .orderBy(asc(s.bonuses.sort), asc(s.bonuses.title));
  return NextResponse.json({ bonuses });
}

/** POST /api/admin/bonuses — create a new bonus definition. */
export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'bonuses.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const title = str(body.title);
  const id = str(body.id) ? slugify(str(body.id)) : slugify(title);
  const description = str(body.description);
  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0)
    : [];
  const bannerType = body.bannerType === 'gradient' ? 'gradient' : 'placeholder';
  const scheduleIcon = body.scheduleIcon === 'clock' ? 'clock' : 'calendar';

  if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });
  if (!description) return NextResponse.json({ error: 'description required' }, { status: 400 });
  if (!id) return NextResponse.json({ error: 'id (or a title to derive it from) is required' }, { status: 400 });

  const values: typeof s.bonuses.$inferInsert = {
    id,
    title,
    description,
    tags,
    active: body.active !== false,
    bannerType,
    bannerGradient: bannerType === 'gradient' ? str(body.bannerGradient) || null : null,
    bannerBadgeIcon:
      bannerType === 'gradient' && (body.bannerBadgeIcon === 'coin' || body.bannerBadgeIcon === 'percent')
        ? body.bannerBadgeIcon
        : null,
    bannerBadgeText: bannerType === 'gradient' ? str(body.bannerBadgeText) || null : null,
    scheduleIcon,
    scheduleText: str(body.scheduleText),
    scheduleCountdownSeconds: int(body.scheduleCountdownSeconds),
    sort: int(body.sort) ?? 0,
  };

  try {
    // A same-slug conflict against a soft-deleted bonus restores it (with the
    // new values) instead of failing — the slug is otherwise
    // invisible/reusable once deleted. A conflict against a still-active
    // bonus is a real conflict and falls through to the WHERE clause not
    // matching, leaving `row` undefined.
    const [row] = await db
      .insert(s.bonuses)
      .values(values)
      .onConflictDoUpdate({
        target: s.bonuses.id,
        set: { ...values, deletedAt: null },
        setWhere: isNotNull(s.bonuses.deletedAt),
      })
      .returning();
    if (!row) {
      return NextResponse.json({ error: 'A bonus with that id already exists' }, { status: 409 });
    }
    await logAdminAction({
      adminId,
      action: 'bonus.create',
      entityType: 'bonus',
      entityId: row.id,
      changes: row,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ bonus: row }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/bonuses', err);
    return NextResponse.json({ error: 'Failed to create bonus' }, { status: 500 });
  }
}

/** PUT /api/admin/bonuses — update an existing bonus ({ id, ...fields }). The id itself is immutable. */
export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'bonuses.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = str(body.id);
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: Partial<typeof s.bonuses.$inferInsert> = {};
  if (str(body.title)) set.title = str(body.title);
  if (str(body.description)) set.description = str(body.description);
  if (Array.isArray(body.tags)) {
    set.tags = body.tags.filter((t: unknown): t is string => typeof t === 'string' && t.trim().length > 0);
  }
  if (typeof body.active === 'boolean') set.active = body.active;
  if (body.bannerType === 'gradient' || body.bannerType === 'placeholder') {
    set.bannerType = body.bannerType;
    if (body.bannerType === 'placeholder') {
      set.bannerGradient = null;
      set.bannerBadgeIcon = null;
      set.bannerBadgeText = null;
    } else {
      if (body.bannerGradient != null) set.bannerGradient = str(body.bannerGradient) || null;
      if (body.bannerBadgeIcon === 'coin' || body.bannerBadgeIcon === 'percent')
        set.bannerBadgeIcon = body.bannerBadgeIcon;
      else if (body.bannerBadgeIcon === null || body.bannerBadgeIcon === '') set.bannerBadgeIcon = null;
      if (body.bannerBadgeText != null) set.bannerBadgeText = str(body.bannerBadgeText) || null;
    }
  }
  if (body.scheduleIcon === 'clock' || body.scheduleIcon === 'calendar') set.scheduleIcon = body.scheduleIcon;
  if (body.scheduleText != null) set.scheduleText = str(body.scheduleText);
  if ('scheduleCountdownSeconds' in body) set.scheduleCountdownSeconds = int(body.scheduleCountdownSeconds);
  if (body.sort != null) set.sort = int(body.sort) ?? 0;

  const [row] = await db.update(s.bonuses).set(set).where(eq(s.bonuses.id, id)).returning();
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await logAdminAction({
    adminId,
    action: 'bonus.update',
    entityType: 'bonus',
    entityId: id,
    changes: set,
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ bonus: row });
}

/**
 * DELETE /api/admin/bonuses?id=... — soft delete: stamps `deletedAt` and
 * hides the bonus from the catalog (this list, the player Bonus Center).
 * Nothing is destroyed — existing `user_bonus_claims` (a player's claim
 * history for this bonus) are left exactly as they were. There is no
 * separate hard-delete path.
 */
export async function DELETE(req: Request) {
  const { error, adminId } = await authorize(req, 'bonuses.delete');
  if (error) return error;

  const id = new URL(req.url).searchParams.get('id')?.trim() ?? '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const [row] = await db
    .update(s.bonuses)
    .set({ deletedAt: new Date() })
    .where(eq(s.bonuses.id, id))
    .returning();
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await logAdminAction({
    adminId,
    action: 'bonus.delete',
    entityType: 'bonus',
    entityId: id,
    changes: { bonus: row },
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true });
}
