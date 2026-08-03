import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authorize(
  req: Request,
  permKey: string
): Promise<{ adminId: string; error: undefined } | { adminId: undefined; error: NextResponse }> {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId)
    return {
      adminId: undefined,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  try {
    await requirePermission(adminId, permKey);
  } catch (e) {
    if (e instanceof PermissionError) {
      return {
        adminId: undefined,
        error: NextResponse.json({ error: e.message }, { status: e.status }),
      };
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

export async function GET(req: Request) {
  const { error } = await authorize(req, 'bonuses.read');
  if (error) return error;

  const bonuses = await db.bonuses.findMany({
    where: { deleted_at: null },
    orderBy: [{ sort: 'asc' }, { title: 'asc' }]
  });
  return NextResponse.json({ bonuses });
}

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
  if (!id)
    return NextResponse.json(
      { error: 'id (or a title to derive it from) is required' },
      { status: 400 }
    );

  const values: any = {
    id,
    title,
    description,
    tags,
    active: body.active !== false,
    banner_type: bannerType,
    banner_gradient: bannerType === 'gradient' ? str(body.bannerGradient) || null : null,
    banner_badge_icon:
      bannerType === 'gradient' &&
      (body.bannerBadgeIcon === 'coin' || body.bannerBadgeIcon === 'percent')
        ? body.bannerBadgeIcon
        : null,
    banner_badge_text: bannerType === 'gradient' ? str(body.bannerBadgeText) || null : null,
    schedule_icon: scheduleIcon,
    schedule_text: str(body.scheduleText),
    schedule_countdown_seconds: int(body.scheduleCountdownSeconds),
    sort: int(body.sort) ?? 0,
  };

  try {
    let row = await db.bonuses.findUnique({ where: { id } });
    if (row && row.deleted_at === null) {
      return NextResponse.json({ error: 'A bonus with that id already exists' }, { status: 409 });
    }
    if (row) {
      row = await db.bonuses.update({ where: { id }, data: { ...values, deleted_at: null } });
    } else {
      row = await db.bonuses.create({ data: values });
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

export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'bonuses.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = str(body.id);
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: any = {};
  if (str(body.title)) set.title = str(body.title);
  if (str(body.description)) set.description = str(body.description);
  if (Array.isArray(body.tags)) {
    set.tags = body.tags.filter(
      (t: unknown): t is string => typeof t === 'string' && t.trim().length > 0
    );
  }
  if (typeof body.active === 'boolean') set.active = body.active;
  if (body.bannerType === 'gradient' || body.bannerType === 'placeholder') {
    set.banner_type = body.bannerType;
    if (body.bannerType === 'placeholder') {
      set.banner_gradient = null;
      set.banner_badge_icon = null;
      set.banner_badge_text = null;
    } else {
      if (body.bannerGradient != null) set.banner_gradient = str(body.bannerGradient) || null;
      if (body.bannerBadgeIcon === 'coin' || body.bannerBadgeIcon === 'percent')
        set.banner_badge_icon = body.bannerBadgeIcon;
      else if (body.bannerBadgeIcon === null || body.bannerBadgeIcon === '')
        set.banner_badge_icon = null;
      if (body.bannerBadgeText != null) set.banner_badge_text = str(body.bannerBadgeText) || null;
    }
  }
  if (body.scheduleIcon === 'clock' || body.scheduleIcon === 'calendar')
    set.schedule_icon = body.scheduleIcon;
  if (body.scheduleText != null) set.schedule_text = str(body.scheduleText);
  if ('scheduleCountdownSeconds' in body)
    set.schedule_countdown_seconds = int(body.scheduleCountdownSeconds);
  if (body.sort != null) set.sort = int(body.sort) ?? 0;

  try {
    const row = await db.bonuses.update({ where: { id }, data: set });
    await logAdminAction({
      adminId,
      action: 'bonus.update',
      entityType: 'bonus',
      entityId: id,
      changes: set,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ bonus: row });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'not found' }, { status: 404 });
    console.error('PUT /api/admin/bonuses', err);
    return NextResponse.json({ error: 'Failed to update bonus' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { error, adminId } = await authorize(req, 'bonuses.delete');
  if (error) return error;

  const id = new URL(req.url).searchParams.get('id')?.trim() ?? '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const row = await db.bonuses.update({
      where: { id },
      data: { deleted_at: new Date() }
    });
    await logAdminAction({
      adminId,
      action: 'bonus.delete',
      entityType: 'bonus',
      entityId: id,
      changes: { bonus: row },
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'not found' }, { status: 404 });
    console.error('DELETE /api/admin/bonuses', err);
    return NextResponse.json({ error: 'Failed to delete bonus' }, { status: 500 });
  }
}
