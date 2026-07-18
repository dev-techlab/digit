import { NextResponse } from 'next/server';
import { asc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';
import { clientIp, logAdminAction } from '@/lib/audit-log';
import { isUniqueViolation } from '@/lib/db-errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
const int = (v: unknown, fallback = 0) =>
  Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : fallback;
const bool = (v: unknown, fallback = false) => (typeof v === 'boolean' ? v : fallback);

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
    await logAdminAction({
      adminId,
      action: 'provider.create',
      entityType: 'game_provider',
      entityId: String(row.id),
      changes: row,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ provider: row }, { status: 201 });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: 'A provider with that id already exists' }, { status: 409 });
    }
    console.error('POST /api/admin/providers', err);
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}

/** PUT /api/admin/providers — update an existing provider ({ id, ...fields }). */
export async function PUT(req: Request) {
  const { error, adminId } = await authorize(req, 'providers.write');
  if (error) return error;

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const id = int(body.id, NaN);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const set: Partial<typeof s.gameProviders.$inferInsert> = { syncedAt: new Date() };
  if (str(body.name)) set.name = str(body.name);
  if (str(body.providerCode)) set.providerCode = str(body.providerCode);
  if (str(body.launchUrlTemplate)) set.launchUrlTemplate = str(body.launchUrlTemplate);
  if (str(body.iconUrl)) set.iconUrl = str(body.iconUrl);
  if (body.providerType === 'SC' || body.providerType === 'GC')
    set.providerType = body.providerType;
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
    const [row] = await db
      .update(s.gameProviders)
      .set(set)
      .where(eq(s.gameProviders.id, id))
      .returning();
    if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
    await logAdminAction({
      adminId,
      action: 'provider.update',
      entityType: 'game_provider',
      entityId: String(id),
      changes: set,
      ipAddress: clientIp(req),
    });
    return NextResponse.json({ provider: row });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return NextResponse.json({ error: 'Update conflicts with an existing provider' }, { status: 409 });
    }
    console.error('PUT /api/admin/providers', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/providers?id=... — permanently remove a provider (and its
 * deposit tiers/accounts, cascade).
 *
 * Two-phase: without `&confirm=true` this only reports how many player
 * accounts (`user_provider_accounts` — real player game credentials/balance
 * for this provider) would be destroyed, and deletes nothing. The caller
 * must re-request with `confirm=true` to actually perform the (irreversible)
 * delete — this lets the UI show the real blast radius before committing,
 * instead of a generic "are you sure?" with no idea what it destroys.
 */
export async function DELETE(req: Request) {
  const { error, adminId } = await authorize(req, 'providers.write');
  if (error) return error;

  const url = new URL(req.url);
  const id = int(url.searchParams.get('id'), NaN);
  if (!Number.isFinite(id)) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const [existing] = await db
    .select({ id: s.gameProviders.id })
    .from(s.gameProviders)
    .where(eq(s.gameProviders.id, id));
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(s.userProviderAccounts)
    .where(eq(s.userProviderAccounts.providerId, id));

  if (url.searchParams.get('confirm') !== 'true') {
    return NextResponse.json({ requiresConfirmation: true, linkedAccounts: count });
  }

  const [row] = await db.delete(s.gameProviders).where(eq(s.gameProviders.id, id)).returning();
  if (!row) return NextResponse.json({ error: 'not found' }, { status: 404 });
  await logAdminAction({
    adminId,
    action: 'provider.delete',
    entityType: 'game_provider',
    entityId: String(id),
    changes: { provider: row, linkedAccountsRemoved: count },
    ipAddress: clientIp(req),
  });
  return NextResponse.json({ ok: true, linkedAccountsRemoved: count });
}
