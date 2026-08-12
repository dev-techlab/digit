import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';

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

export async function GET(req: Request) {
  try {
    const { error } = await authorize(req, 'platforms.read');
    if (error) return error;

    const platforms = await db.game_platforms.findMany({
      where: { deleted_at: null },
      include: {
        store_platform_accounts: true,
        member_platform_accounts: true,
      },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }],
    });

    const formatted = platforms.map((p) => {
      const agentIds = new Set(p.store_platform_accounts.map((a) => a.store_id));
      const customerIds = new Set(p.member_platform_accounts.map((m) => m.member_id));
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
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/admin/platforms', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

const postSchema = z.object({
  name: z.string().min(1, 'name required'),
  slug: z.string().optional().or(z.literal('')),
  iconUrl: z.string().optional().or(z.literal('')),
  providerCode: z.string().optional().or(z.literal('')),
  providerType: z.string().optional().or(z.literal('')),
  launchUrl: z.string().optional().or(z.literal('')),
  sort: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : 0)),
  isActive: z.boolean().optional().default(true),
});

export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'platforms.write');
  if (error) return error;

  let parsedData: any = null;
  try {
    const body = await req.json();
    parsedData = postSchema.parse(body);

    const name = parsedData.name.trim();
    const slug = parsedData.slug?.trim() || slugify(name);
    if (!slug) return NextResponse.json({ error: 'invalid name/slug' }, { status: 400 });

    const values = {
      name,
      slug,
      icon_url: parsedData.iconUrl?.trim() || null,
      provider_code: parsedData.providerCode?.trim() || null,
      provider_type: parsedData.providerType?.trim() || null,
      launch_url: parsedData.launchUrl?.trim() || null,
      sort: Number.isFinite(parsedData.sort) ? parsedData.sort : 0,
      is_active: parsedData.isActive,
    };

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
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    if (err.code !== 'P2002') {
      console.error('POST /api/admin/platforms', err);
      return NextResponse.json({ error: 'Failed to create platform' }, { status: 500 });
    }

    // We already know it's a P2002 error from here on out
    const name = parsedData?.name?.trim();
    const slug = parsedData?.slug?.trim() || (name ? slugify(name) : '');
    const conflicting = await db.game_platforms.findFirst({
      where: { OR: [{ name }, { slug }] },
    });
    if (!conflicting?.deleted_at) {
      return NextResponse.json(
        { error: 'A platform with that name or slug already exists' },
        { status: 409 }
      );
    }
    // Cannot proceed with recreating without valid data so just error out for now
    return NextResponse.json(
      { error: 'Platform exists and was deleted. Please restore it instead.' },
      { status: 409 }
    );
  }
}

const putSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  slug: z.string().optional().or(z.literal('')),
  iconUrl: z.string().optional().or(z.literal('')),
  providerCode: z.string().optional().or(z.literal('')),
  providerType: z.string().optional().or(z.literal('')),
  launchUrl: z.string().optional().or(z.literal('')),
  sort: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => (v !== undefined ? Number(v) : undefined)),
  isActive: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'platforms.write');
  if (error) return error;

  try {
    const body = await req.json();
    const data = putSchema.parse(body);

    const set: any = {};
    if (data.name !== undefined) set.name = data.name.trim();
    if (data.slug !== undefined) set.slug = slugify(data.slug.trim());
    if (data.iconUrl !== undefined) set.icon_url = data.iconUrl.trim() || null;
    if (data.providerCode !== undefined) set.provider_code = data.providerCode.trim() || null;
    if (data.providerType !== undefined) set.provider_type = data.providerType.trim() || null;
    if (data.launchUrl !== undefined) set.launch_url = data.launchUrl.trim() || null;
    if (data.sort !== undefined && Number.isFinite(data.sort)) set.sort = data.sort;
    if (data.isActive !== undefined) set.is_active = data.isActive;

    if (Object.keys(set).length === 0) {
      return NextResponse.json({ error: 'no fields to update' }, { status: 400 });
    }

    const row = await db.game_platforms.update({
      where: { id: data.id },
      data: set,
    });
    await logAdminAction({
      adminId,
      action: 'platform.update',
      entityType: 'game_platform',
      entityId: data.id,
      changes: set,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ platform: row });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
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
      data: { deleted_at: new Date() },
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
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err.code === 'P2025') return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
