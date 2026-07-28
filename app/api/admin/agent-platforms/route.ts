import { NextResponse } from 'next/server';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authorize(req: Request, permKey: string) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) {
    return { adminId: undefined, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
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

export async function GET(req: Request) {
  const auth = await authorize(req, 'platforms.read');
  if (auth.error) return auth.error;

  const url = new URL(req.url);
  const agentId = url.searchParams.get('agentId') || '';
  if (!agentId) return NextResponse.json({ platforms: [] });

  const rows = await db
    .select({
      id: s.gamePlatforms.id,
      name: s.gamePlatforms.name,
      slug: s.gamePlatforms.slug,
      iconUrl: s.gamePlatforms.iconUrl,
      isActive: s.gamePlatforms.isActive,
      assigned: sql<boolean>`${s.agentPlatformMappings.id} is not null`,
      availableFromTime: s.agentPlatformMappings.availableFromTime,
      availableToTime: s.agentPlatformMappings.availableToTime,
    })
    .from(s.gamePlatforms)
    .leftJoin(s.agentPlatformMappings, and(eq(s.agentPlatformMappings.agentId, agentId), eq(s.agentPlatformMappings.platformId, s.gamePlatforms.id)))
    .where(and(eq(s.gamePlatforms.isActive, true), isNull(s.gamePlatforms.deletedAt)))
    .orderBy(desc(s.gamePlatforms.sort), s.gamePlatforms.name);

  return NextResponse.json({ platforms: rows });
}

export async function PUT(req: Request) {
  const auth = await authorize(req, 'platforms.write');
  if (auth.error) return auth.error;

  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const agentId = typeof body.agentId === 'string' ? body.agentId : '';

  if (!agentId) return NextResponse.json({ error: 'agentId required' }, { status: 400 });

  const assignments: Array<{ platformId: string; availableFromTime?: string; availableToTime?: string }> = [];

  if (Array.isArray(body.assignments)) {
    for (const item of body.assignments) {
      if (typeof item === 'object' && item && typeof item.platformId === 'string') {
        assignments.push({
          platformId: item.platformId,
          availableFromTime: typeof item.availableFromTime === 'string' ? item.availableFromTime || null : undefined,
          availableToTime: typeof item.availableToTime === 'string' ? item.availableToTime || null : undefined,
        });
      }
    }
  } else {
    const platformIds = Array.isArray(body.platformIds)
      ? body.platformIds.filter((id: unknown): id is string => typeof id === 'string')
      : [];
    assignments.push(...platformIds.map((platformId: string) => ({ platformId })));
  }

  if (assignments.length === 0) {
    const existing = await db
      .select({ platformId: s.agentPlatformMappings.platformId })
      .from(s.agentPlatformMappings)
      .where(eq(s.agentPlatformMappings.agentId, agentId));
    if (existing.length > 0) {
      await db
        .delete(s.agentPlatformMappings)
        .where(and(eq(s.agentPlatformMappings.agentId, agentId), inArray(s.agentPlatformMappings.platformId, existing.map((r) => r.platformId))));
    }
    return NextResponse.json({ ok: true });
  }

  const desiredIds = new Set(assignments.map((a) => a.platformId));

  const existing = await db
    .select({ id: s.agentPlatformMappings.id, platformId: s.agentPlatformMappings.platformId })
    .from(s.agentPlatformMappings)
    .where(eq(s.agentPlatformMappings.agentId, agentId));

  const existingById = new Map(existing.map((row) => [row.platformId, row.id]));
  const existingIds = new Set(existing.map((row) => row.platformId));
  const toDelete = [...existingIds].filter((id) => !desiredIds.has(id));

  if (toDelete.length) {
    await db
      .delete(s.agentPlatformMappings)
      .where(and(eq(s.agentPlatformMappings.agentId, agentId), inArray(s.agentPlatformMappings.platformId, toDelete)));
  }

  for (const assignment of assignments) {
    const existingId = existingById.get(assignment.platformId);
    if (existingId) {
      const updateData: Record<string, string> = {};
      if (assignment.availableFromTime !== undefined) updateData.availableFromTime = assignment.availableFromTime;
      if (assignment.availableToTime !== undefined) updateData.availableToTime = assignment.availableToTime;
      if (Object.keys(updateData).length > 0) {
        await db.update(s.agentPlatformMappings).set(updateData).where(eq(s.agentPlatformMappings.id, existingId));
      }
    } else {
      await db.insert(s.agentPlatformMappings).values({
        agentId,
        platformId: assignment.platformId,
        availableFromTime: assignment.availableFromTime || null,
        availableToTime: assignment.availableToTime || null,
      });
    }
  }

  return NextResponse.json({ ok: true });
}