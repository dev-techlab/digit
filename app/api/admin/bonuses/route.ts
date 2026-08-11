import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';
import { z } from 'zod';

const postSchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(1, 'title required'),
  description: z.string().trim().min(1, 'description required'),
  tags: z.array(z.string().trim().min(1)).optional().default([]),
  active: z.boolean().optional().default(true),
  bannerType: z.enum(['gradient', 'placeholder']).optional().default('placeholder'),
  bannerGradient: z.string().trim().nullable().optional(),
  bannerBadgeIcon: z.enum(['coin', 'percent']).nullable().optional(),
  bannerBadgeText: z.string().trim().nullable().optional(),
  scheduleIcon: z.enum(['clock', 'calendar']).optional().default('calendar'),
  scheduleText: z.string().trim().optional(),
  scheduleCountdownSeconds: z.coerce.number().int().nullable().optional(),
  sort: z.coerce.number().int().optional().default(0)
});

const putSchema = z.object({
  id: z.string().trim().min(1, 'id required'),
  title: z.string().trim().optional(),
  description: z.string().trim().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  active: z.boolean().optional(),
  bannerType: z.enum(['gradient', 'placeholder']).optional(),
  bannerGradient: z.string().trim().nullable().optional(),
  bannerBadgeIcon: z.enum(['coin', 'percent', '']).nullable().optional(),
  bannerBadgeText: z.string().trim().nullable().optional(),
  scheduleIcon: z.enum(['clock', 'calendar']).optional(),
  scheduleText: z.string().trim().optional(),
  scheduleCountdownSeconds: z.coerce.number().int().nullable().optional(),
  sort: z.coerce.number().int().optional()
});

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
  } catch (e: any) {
    if (e && (e.digest === 'DYNAMIC_SERVER_USAGE' || e.message?.includes('NEXT_'))) throw e;
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

const slugify = (v: string) =>
  v
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export async function GET(req: Request) {
  try {
    const { error } = await authorize(req, 'bonuses.read');
    if (error) return error;
  
    const bonuses = await db.bonuses.findMany({
      where: { deleted_at: null },
      orderBy: [{ sort: 'asc' }, { title: 'asc' }]
    });
    return NextResponse.json({ bonuses });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/admin/bonuses', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'bonuses.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parseResult = postSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const data = parseResult.data;
  const id = data.id ? slugify(data.id) : slugify(data.title);
  
  if (!id) {
    return NextResponse.json({ error: 'id (or a title to derive it from) is required' }, { status: 400 });
  }

  const values: any = {
    id,
    title: data.title,
    description: data.description,
    tags: data.tags,
    active: data.active,
    banner_type: data.bannerType,
    banner_gradient: data.bannerType === 'gradient' ? data.bannerGradient || null : null,
    banner_badge_icon:
      data.bannerType === 'gradient' && (data.bannerBadgeIcon === 'coin' || data.bannerBadgeIcon === 'percent')
        ? data.bannerBadgeIcon
        : null,
    banner_badge_text: data.bannerType === 'gradient' ? data.bannerBadgeText || null : null,
    schedule_icon: data.scheduleIcon,
    schedule_text: data.scheduleText || '',
    schedule_countdown_seconds: data.scheduleCountdownSeconds ?? null,
    sort: data.sort ?? 0,
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
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('POST /api/admin/bonuses', err);
    return NextResponse.json({ error: 'Failed to create bonus' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'bonuses.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const parseResult = putSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const data = parseResult.data;
  const id = data.id;

  const set: any = {};
  if (data.title !== undefined) set.title = data.title;
  if (data.description !== undefined) set.description = data.description;
  if (data.tags !== undefined) set.tags = data.tags;
  if (data.active !== undefined) set.active = data.active;
  if (data.bannerType !== undefined) {
    set.banner_type = data.bannerType;
    if (data.bannerType === 'placeholder') {
      set.banner_gradient = null;
      set.banner_badge_icon = null;
      set.banner_badge_text = null;
    } else {
      if (data.bannerGradient !== undefined) set.banner_gradient = data.bannerGradient || null;
      if (data.bannerBadgeIcon === 'coin' || data.bannerBadgeIcon === 'percent')
        set.banner_badge_icon = data.bannerBadgeIcon;
      else if (data.bannerBadgeIcon === null || data.bannerBadgeIcon === '')
        set.banner_badge_icon = null;
      if (data.bannerBadgeText !== undefined) set.banner_badge_text = data.bannerBadgeText || null;
    }
  }
  if (data.scheduleIcon !== undefined) set.schedule_icon = data.scheduleIcon;
  if (data.scheduleText !== undefined) set.schedule_text = data.scheduleText;
  if (data.scheduleCountdownSeconds !== undefined) set.schedule_countdown_seconds = data.scheduleCountdownSeconds;
  if (data.sort !== undefined) set.sort = data.sort;

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
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
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
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err.code === 'P2025') return NextResponse.json({ error: 'not found' }, { status: 404 });
    console.error('DELETE /api/admin/bonuses', err);
    return NextResponse.json({ error: 'Failed to delete bonus' }, { status: 500 });
  }
}
