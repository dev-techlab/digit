import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';

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

export async function GET(req: Request) {
  const { error } = await authorize(req, 'platforms.read');
  if (error) return error;

  const platforms = await db.game_platforms.findMany({
    where: { deleted_at: null },
    include: {
      store_platform_accounts: true,
      member_platform_accounts: true,
    },
    orderBy: [{ sort: 'asc' }, { name: 'asc' }]
  });

  const formatted = platforms.map(p => {
    const agentIds = new Set(p.store_platform_accounts.map(a => a.store_id));
    const customerIds = new Set(p.member_platform_accounts.map(m => m.member_id));
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      iconUrl: p.icon_url,
      providerCode: p.provider_code,
      providerType: p.provider_type,
      launchUrl: p.launch_url,
      sort: p.sort,
      isActive: p.is_active,
      createdAt: p.created_at,
      agentCount: agentIds.size,
      customerCount: customerIds.size,
    };
  });

  return NextResponse.json({ platforms: formatted });
}

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
    icon_url: optStr(body.iconUrl),
    provider_code: optStr(body.providerCode),
    provider_type: optStr(body.providerType),
    launch_url: optStr(body.launchUrl),
    sort: Number.isFinite(Number(body.sort)) ? Number(body.sort) : 0,
    is_active: typeof body.isActive === 'boolean' ? body.isActive : true,
  };

  try {
    const row = await db.game_platforms.create({ data: values });
    await logAdminAction({
      adminId,
      action: 'platform.create',
      entityType: 'game_platform',
      entityId: row.id,
      changes: row,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ platform: row }, { status: 201 });
  } catch (err: any) {
    if (err.code !== 'P2002') {
      console.error('POST /api/admin/platforms', err);
      return NextResponse.json({ error: 'Failed to create platform' }, { status: 500 });
    }
    const conflicting = await db.game_platforms.findFirst({
      where: { OR: [{ name }, { slug }] }
    });
    if (!conflicting?.deleted_at) {
      return NextResponse.json(
        { error: 'A platform with that name or slug already exists' },
        { status: 409 }
      );
    }
    const row = await db.game_platforms.update({
      where: { id: conflicting.id },
      data: { ...values, deleted_at: null }
    });
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

export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'platforms.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = str(body.id);
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: any = {};
  if (str(body.name)) set.name = str(body.name);
  if (str(body.slug)) set.slug = slugify(str(body.slug));
  if ('iconUrl' in body) set.icon_url = optStr(body.iconUrl);
  if ('providerCode' in body) set.provider_code = optStr(body.providerCode);
  if ('providerType' in body) set.provider_type = optStr(body.providerType);
  if ('launchUrl' in body) set.launch_url = optStr(body.launchUrl);
  if (body.sort != null && Number.isFinite(Number(body.sort))) set.sort = Number(body.sort);
  if (typeof body.isActive === 'boolean') set.is_active = body.isActive;

  if (Object.keys(set).length === 0) {
    return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
  }

  try {
    const row = await db.game_platforms.update({
      where: { id },
      data: set
    });
    await logAdminAction({
      adminId,
      action: 'platform.update',
      entityType: 'game_platform',
      entityId: id,
      changes: set,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ platform: row });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'A platform with that name or slug already exists' },
        { status: 409 }
      );
    }
    console.error('PUT /api/admin/platforms', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { error, adminId } = await authorize(req, 'platforms.write');
  if (error) return error;

  const id = new URL(req.url).searchParams.get('id') ?? '';
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const row = await db.game_platforms.update({
      where: { id },
      data: { deleted_at: new Date() }
    });
    await logAdminAction({
      adminId,
      action: 'platform.delete',
      entityType: 'game_platform',
      entityId: id,
      changes: { platform: row },
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err.code === 'P2025') return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
