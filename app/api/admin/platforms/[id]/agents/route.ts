import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission } from '@/lib/rbac-core';


export async function GET(req: Request, { params }: { params: { id: string } }) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requirePermission(adminId, 'platforms.read');
  } catch (e: any) {
    if (e && (e.digest === 'DYNAMIC_SERVER_USAGE' || e.message?.includes('NEXT_'))) throw e;
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const platformId = params.id;
  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';

  const connectedAgents = await db.store_platform_accounts.findMany({
    where: { platform_id: platformId },
    select: {
      updated_at: true,
      agents: {
        select: {
          id: true,
          username: true,
          nickname: true,
          email: true,
          status: true,
        }
      }
    }
  });

  const formattedAgents = connectedAgents.map(a => ({
    id: a.agents?.id,
    username: a.agents?.username,
    nickname: a.agents?.nickname,
    email: a.agents?.email,
    status: a.agents?.status,
    assignedAt: a.updated_at,
  }));

  let filteredAgents = formattedAgents;
  if (search) {
    const q = search.toLowerCase();
    filteredAgents = formattedAgents.filter(
      (a) =>
        a.username?.toLowerCase().includes(q) ||
        (a.nickname && a.nickname.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({ agents: filteredAgents });
}
