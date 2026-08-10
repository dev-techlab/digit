import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';


const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const int = (v: unknown, fallback = 0) =>
  Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : fallback;
const bool = (v: unknown, fallback = false) => (typeof v === 'boolean' ? v : fallback);

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
  try {
    const { error } = await authorize(req, 'providers.read');
    if (error) return error;
  
    const providers = await db.game_providers.findMany({
      where: { deleted_at: null },
      orderBy: [{ sort: 'asc' }, { name: 'asc' }]
    });
    return NextResponse.json({ providers });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/admin/providers', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

const postSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(v => Number(v)),
  name: z.string().min(1, 'name required'),
  providerCode: z.string().min(1, 'providerCode required'),
  launchUrlTemplate: z.string().min(1, 'launchUrlTemplate required'),
  iconUrl: z.string().min(1, 'iconUrl required'),
  providerType: z.enum(['SC', 'GC'], { message: 'providerType must be SC or GC' }),
  status: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : 1),
  sort: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : 0),
  createType: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : 1),
  operate: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : 0),
  needInitBalance: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : 0),
  canManualInput: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : 1),
  iframeSupported: z.boolean().optional().default(false),
  isMachineSupported: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : 0),
  redeemField: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : 0),
  invalidPasswordState: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : 0),
  canChangePassword: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : 1),
});

export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'providers.write');
  if (error) return error;

  try {
    const body = await req.json();
    const data = postSchema.parse(body);

    if (!Number.isFinite(data.id))
      return NextResponse.json({ error: 'A numeric id is required' }, { status: 400 });

    const values = {
      id: data.id,
      name: data.name,
      provider_code: data.providerCode,
      launch_url_template: data.launchUrlTemplate,
      icon_url: data.iconUrl,
      provider_type: data.providerType,
      status: data.status,
      sort: data.sort,
      create_type: data.createType,
      operate: data.operate,
      need_init_balance: data.needInitBalance,
      can_manual_input: data.canManualInput,
      iframe_supported: data.iframeSupported,
      is_machine_supported: data.isMachineSupported,
      redeem_field: data.redeemField,
      invalid_password_state: data.invalidPasswordState,
      can_change_password: data.canChangePassword,
    };

    let row = await db.game_providers.findUnique({ where: { id: data.id } });
    if (row && row.deleted_at === null) {
      return NextResponse.json(
        { error: 'A provider with that id already exists' },
        { status: 409 }
      );
    }
    if (row) {
      row = await db.game_providers.update({ where: { id: data.id }, data: { ...values, deleted_at: null } });
    } else {
      row = await db.game_providers.create({ data: values });
    }

    await logAdminAction({
      adminId,
      action: 'provider.create',
      entityType: 'game_provider',
      entityId: String(row.id),
      changes: row,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ provider: row }, { status: 201 });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'A provider with that id already exists' },
        { status: 409 }
      );
    }
    console.error('POST /api/admin/providers', err);
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}

const putSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(v => Number(v)),
  name: z.string().optional(),
  providerCode: z.string().optional(),
  launchUrlTemplate: z.string().optional(),
  iconUrl: z.string().optional(),
  providerType: z.enum(['SC', 'GC']).optional(),
  status: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  sort: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  createType: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  operate: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  needInitBalance: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  canManualInput: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  iframeSupported: z.boolean().optional(),
  isMachineSupported: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  redeemField: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  invalidPasswordState: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
  canChangePassword: z.union([z.string(), z.number()]).optional().transform(v => v !== undefined ? Number(v) : undefined),
});

export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'providers.write');
  if (error) return error;

  try {
    const body = await req.json();
    const data = putSchema.parse(body);

    if (!Number.isFinite(data.id)) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const set: any = { synced_at: new Date() };
    if (data.name !== undefined) set.name = data.name;
    if (data.providerCode !== undefined) set.provider_code = data.providerCode;
    if (data.launchUrlTemplate !== undefined) set.launch_url_template = data.launchUrlTemplate;
    if (data.iconUrl !== undefined) set.icon_url = data.iconUrl;
    if (data.providerType !== undefined) set.provider_type = data.providerType;
    if (data.status !== undefined) set.status = data.status;
    if (data.sort !== undefined) set.sort = data.sort;
    if (data.createType !== undefined) set.create_type = data.createType;
    if (data.operate !== undefined) set.operate = data.operate;
    if (data.needInitBalance !== undefined) set.need_init_balance = data.needInitBalance;
    if (data.canManualInput !== undefined) set.can_manual_input = data.canManualInput;
    if (data.iframeSupported !== undefined) set.iframe_supported = data.iframeSupported;
    if (data.isMachineSupported !== undefined) set.is_machine_supported = data.isMachineSupported;
    if (data.redeemField !== undefined) set.redeem_field = data.redeemField;
    if (data.invalidPasswordState !== undefined) set.invalid_password_state = data.invalidPasswordState;
    if (data.canChangePassword !== undefined) set.can_change_password = data.canChangePassword;

    const row = await db.game_providers.update({
      where: { id: data.id },
      data: set
    });
    await logAdminAction({
      adminId,
      action: 'provider.update',
      entityType: 'game_provider',
      entityId: String(data.id),
      changes: set,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ provider: row });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    if (err.code === 'P2025') return NextResponse.json({ error: 'not found' }, { status: 404 });
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'Update conflicts with an existing provider' },
        { status: 409 }
      );
    }
    console.error('PUT /api/admin/providers', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { error, adminId } = await authorize(req, 'providers.write');
  if (error) return error;

  const id = int(new URL(req.url).searchParams.get('id'), NaN);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    const row = await db.game_providers.update({
      where: { id },
      data: { deleted_at: new Date() }
    });
    await logAdminAction({
      adminId,
      action: 'provider.delete',
      entityType: 'game_provider',
      entityId: String(id),
      changes: { provider: row },
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err.code === 'P2025') return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
