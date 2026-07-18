import { NextResponse } from 'next/server';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const int = (v: unknown, fallback = 0) => (Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : fallback);
const bool = (v: unknown, fallback = false) => (typeof v === 'boolean' ? v : fallback);

/** Resolve + permission-check the caller; returns the adminId or a ready-to-return error response. */
async function authorize(req: Request, permKey: string) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  try {
    await requirePermission(adminId, permKey);
  } catch (e) {
    if (e instanceof PermissionError) {
      return { error: NextResponse.json({ error: e.message }, { status: e.status }) };
    }
    throw e;
  }
  return { adminId };
}

/** GET /api/admin/providers — full provider catalog for management. */
export async function GET(req: Request) {
  const { error } = await authorize(req, 'providers.read');
  if (error) return error;

  const providers = await db
    .select()
    .from(s.gameProviders)
    .orderBy(asc(s.gameProviders.sort), asc(s.gameProviders.name));
  return NextResponse.json({ providers });
}

/** POST /api/admin/providers — create a new provider row. */
export async function POST(req: Request) {
  const { error } = await authorize(req, 'providers.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = int(body.id, NaN);
  const name = str(body.name);
  const providerCode = str(body.providerCode);
  const launchUrlTemplate = str(body.launchUrlTemplate);
  const iconUrl = str(body.iconUrl);
  const providerType = body.providerType === 'GC' ? 'GC' : body.providerType === 'SC' ? 'SC' : '';

  if (!Number.isFinite(id)) return NextResponse.json({ error: 'A numeric id is required' }, { status: 400 });
  if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });
  if (!providerCode) return NextResponse.json({ error: 'providerCode required' }, { status: 400 });
  if (!launchUrlTemplate) return NextResponse.json({ error: 'launchUrlTemplate required' }, { status: 400 });
  if (!iconUrl) return NextResponse.json({ error: 'iconUrl required' }, { status: 400 });
  if (!providerType) return NextResponse.json({ error: 'providerType must be SC or GC' }, { status: 400 });

  try {
    const [row] = await db
      .insert(s.gameProviders)
      .values({
        id,
        name,
        providerCode,
        launchUrlTemplate,
        iconUrl,
        providerType,
        status: int(body.status, 1),
        sort: int(body.sort, 0),
        createType: int(body.createType, 1),
        operate: int(body.operate, 0),
        needInitBalance: int(body.needInitBalance, 0),
        canManualInput: int(body.canManualInput, 1),
        iframeSupported: bool(body.iframeSupported, false),
        isMachineSupported: int(body.isMachineSupported, 0),
        redeemField: int(body.redeemField, 0),
        invalidPasswordState: int(body.invalidPasswordState, 0),
        canChangePassword: int(body.canChangePassword, 1),
      })
      .returning();
    return NextResponse.json({ provider: row }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'A provider with that id already exists' }, { status: 409 });
  }
}

/** PUT /api/admin/providers — update an existing provider ({ id, ...fields }). */
export async function PUT(req: Request) {
  const { error } = await authorize(req, 'providers.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = int(body.id, NaN);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: Partial<typeof s.gameProviders.$inferInsert> = { syncedAt: new Date() };
  if (str(body.name)) set.name = str(body.name);
  if (str(body.providerCode)) set.providerCode = str(body.providerCode);
  if (str(body.launchUrlTemplate)) set.launchUrlTemplate = str(body.launchUrlTemplate);
  if (str(body.iconUrl)) set.iconUrl = str(body.iconUrl);
  if (body.providerType === 'SC' || body.providerType === 'GC') set.providerType = body.providerType;
  if (body.status != null) set.status = int(body.status);
  if (body.sort != null) set.sort = int(body.sort);
  if (body.createType != null) set.createType = int(body.createType);
  if (body.operate != null) set.operate = int(body.operate);
  if (body.needInitBalance != null) set.needInitBalance = int(body.needInitBalance);
  if (body.canManualInput != null) set.canManualInput = int(body.canManualInput);
  if (typeof body.iframeSupported === 'boolean') set.iframeSupported = body.iframeSupported;
  if (body.isMachineSupported != null) set.isMachineSupported = int(body.isMachineSupported);
  if (body.redeemField != null) set.redeemField = int(body.redeemField);
  if (body.invalidPasswordState != null) set.invalidPasswordState = int(body.invalidPasswordState);
  if (body.canChangePassword != null) set.canChangePassword = int(body.canChangePassword);

  try {
    const [row] = await db.update(s.gameProviders).set(set).where(eq(s.gameProviders.id, id)).returning();
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ provider: row });
  } catch {
    return NextResponse.json({ error: 'Update failed' }, { status: 409 });
  }
}

/** DELETE /api/admin/providers?id=... — permanently remove a provider (and its deposit tiers/accounts, cascade). */
export async function DELETE(req: Request) {
  const { error } = await authorize(req, 'providers.write');
  if (error) return error;

  const id = int(new URL(req.url).searchParams.get('id'), NaN);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const [row] = await db.delete(s.gameProviders).where(eq(s.gameProviders.id, id)).returning();
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
