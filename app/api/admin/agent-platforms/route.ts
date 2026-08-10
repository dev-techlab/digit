import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission, PermissionError } from '@/lib/rbac-core';


async function authorize(req: Request, permKey: string) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) {
    return {
      adminId: undefined,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }
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
    const auth = await authorize(req, 'platforms.read');
    if (auth.error) return auth.error;
  
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agentId') || '';
    if (!agentId) return NextResponse.json({ platforms: [] });
  
    const platforms = await db.game_platforms.findMany({
      where: { is_active: true, deleted_at: null },
      orderBy: [{ sort: 'desc' }, { name: 'asc' }],
      include: {
        agent_platform_mappings: {
          where: { agent_id: agentId }
        }
      }
    });
  
    const rows = platforms.map(p => {
      const mapping = p.agent_platform_mappings[0];
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        iconUrl: p.icon_url,
        isActive: p.is_active,
        assigned: !!mapping,
        availableFromTime: mapping?.available_from_time ?? null,
        availableToTime: mapping?.available_to_time ?? null,
      };
    });
  
    return NextResponse.json({ platforms: rows });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/admin/agent-platforms', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

const putSchema = z.object({
  agentId: z.string().uuid(),
  assignments: z.array(z.object({
    platformId: z.string().uuid(),
    availableFromTime: z.string().optional().or(z.literal('')),
    availableToTime: z.string().optional().or(z.literal('')),
  })).optional(),
  platformIds: z.array(z.string().uuid()).optional(),
});

export async function PUT(req: Request) {
  const auth = await authorize(req, 'platforms.write');
  if (auth.error) return auth.error;

  try {
    const body = await req.json();
    const data = putSchema.parse(body);

    const assignments: Array<{
      platformId: string;
      availableFromTime?: string;
      availableToTime?: string;
    }> = [];

    if (data.assignments && data.assignments.length > 0) {
      for (const item of data.assignments) {
        assignments.push({
          platformId: item.platformId,
          availableFromTime: item.availableFromTime || undefined,
          availableToTime: item.availableToTime || undefined,
        });
      }
    } else if (data.platformIds && data.platformIds.length > 0) {
      assignments.push(...data.platformIds.map(platformId => ({ platformId })));
    }

    if (assignments.length === 0) {
    await db.agent_platform_mappings.deleteMany({
      where: { agent_id: data.agentId }
    });
    return NextResponse.json({ ok: true });
  }

  const desiredIds = new Set(assignments.map((a) => a.platformId));

  const existing = await db.agent_platform_mappings.findMany({
    where: { agent_id: data.agentId },
    select: { id: true, platform_id: true }
  });

  const existingById = new Map(existing.map((row) => [row.platform_id, row.id]));
  const existingIds = new Set(existing.map((row) => row.platform_id));
  const toDelete = [...existingIds].filter((id) => !desiredIds.has(id));

  if (toDelete.length) {
    await db.agent_platform_mappings.deleteMany({
      where: {
        agent_id: data.agentId,
        platform_id: { in: toDelete }
      }
    });
  }

  for (const assignment of assignments) {
    const existingId = existingById.get(assignment.platformId);
    if (existingId) {
      const updateData: Record<string, string> = {};
      if (assignment.availableFromTime !== undefined)
        updateData.available_from_time = assignment.availableFromTime;
      if (assignment.availableToTime !== undefined)
        updateData.available_to_time = assignment.availableToTime;
      if (Object.keys(updateData).length > 0) {
        await db.agent_platform_mappings.update({
          where: { id: existingId },
          data: updateData
        });
      }
    } else {
      await db.agent_platform_mappings.create({
        data: {
          agent_id: data.agentId,
          platform_id: assignment.platformId,
          available_from_time: assignment.availableFromTime || null,
          available_to_time: assignment.availableToTime || null,
        }
      });
    }
  }

  return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    if (err instanceof ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error('PUT /api/admin/agent-platforms', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

