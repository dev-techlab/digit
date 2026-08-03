import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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
  const { error } = await authorize(req, 'providers.read');
  if (error) return error;

  const providers = await db.game_providers.findMany({
    where: { deleted_at: null },
    orderBy: [{ sort: 'asc' }, { name: 'asc' }]
  });
  return NextResponse.json({ providers });
}

export async function POST(req: Request) {
  const { error, adminId } = await authorize(req, 'providers.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = int(body.id, NaN);
  const name = str(body.name);
  const providerCode = str(body.providerCode);
  const launchUrlTemplate = str(body.launchUrlTemplate);
  const iconUrl = str(body.iconUrl);
  const providerType = body.providerType === 'GC' ? 'GC' : body.providerType === 'SC' ? 'SC' : '';

  if (!Number.isFinite(id))
    return NextResponse.json({ error: 'A numeric id is required' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  if (!providerCode) return NextResponse.json({ error: 'providerCode required' }, { status: 400 });
  if (!launchUrlTemplate)
    return NextResponse.json({ error: 'launchUrlTemplate required' }, { status: 400 });
  if (!iconUrl) return NextResponse.json({ error: 'iconUrl required' }, { status: 400 });
  if (!providerType)
    return NextResponse.json({ error: 'providerType must be SC or GC' }, { status: 400 });

  const values: any = {
    id,
    name,
    provider_code: providerCode,
    launch_url_template: launchUrlTemplate,
    icon_url: iconUrl,
    provider_type: providerType,
    status: int(body.status, 1),
    sort: int(body.sort, 0),
    create_type: int(body.createType, 1),
    operate: int(body.operate, 0),
    need_init_balance: int(body.needInitBalance, 0),
    can_manual_input: int(body.canManualInput, 1),
    iframe_supported: bool(body.iframeSupported, false),
    is_machine_supported: int(body.isMachineSupported, 0),
    redeem_field: int(body.redeemField, 0),
    invalid_password_state: int(body.invalidPasswordState, 0),
    can_change_password: int(body.canChangePassword, 1),
  };

  try {
    let row = await db.game_providers.findUnique({ where: { id } });
    if (row && row.deleted_at === null) {
      return NextResponse.json(
        { error: 'A provider with that id already exists' },
        { status: 409 }
      );
    }
    if (row) {
      row = await db.game_providers.update({ where: { id }, data: { ...values, deleted_at: null } });
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

export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'providers.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = int(body.id, NaN);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: any = { synced_at: new Date() };
  if (str(body.name)) set.name = str(body.name);
  if (str(body.providerCode)) set.provider_code = str(body.providerCode);
  if (str(body.launchUrlTemplate)) set.launch_url_template = str(body.launchUrlTemplate);
  if (str(body.iconUrl)) set.icon_url = str(body.iconUrl);
  if (body.providerType === 'SC' || body.providerType === 'GC')
    set.provider_type = body.providerType;
  if (body.status != null) set.status = int(body.status);
  if (body.sort != null) set.sort = int(body.sort);
  if (body.createType != null) set.create_type = int(body.createType);
  if (body.operate != null) set.operate = int(body.operate);
  if (body.needInitBalance != null) set.need_init_balance = int(body.needInitBalance);
  if (body.canManualInput != null) set.can_manual_input = int(body.canManualInput);
  if (typeof body.iframeSupported === 'boolean') set.iframe_supported = body.iframeSupported;
  if (body.isMachineSupported != null) set.is_machine_supported = int(body.isMachineSupported);
  if (body.redeemField != null) set.redeem_field = int(body.redeemField);
  if (body.invalidPasswordState != null) set.invalid_password_state = int(body.invalidPasswordState);
  if (body.canChangePassword != null) set.can_change_password = int(body.canChangePassword);

  try {
    const row = await db.game_providers.update({
      where: { id },
      data: set
    });
    await logAdminAction({
      adminId,
      action: 'provider.update',
      entityType: 'game_provider',
      entityId: String(id),
      changes: set,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ provider: row });
  } catch (err: any) {
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
    if (err.code === 'P2025') return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
