import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { eq, like, or } from 'drizzle-orm';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission } from '@/lib/rbac-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  try {
    await requirePermission(adminId, 'platforms.read');
  } catch (e) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const platformId = params.id;
  const url = new URL(req.url);
  const search = url.searchParams.get('search') || '';

  let agentQuery = db
    .select({
      id: s.agents.id,
      username: s.agents.username,
      nickname: s.agents.nickname,
      email: s.agents.email,
      status: s.agents.status,
      assignedAt: s.storePlatformAccounts.updatedAt,
    })
    .from(s.storePlatformAccounts)
    .innerJoin(s.agents, eq(s.storePlatformAccounts.storeId, s.agents.id))
    .where(eq(s.storePlatformAccounts.platformId, platformId));

  const connectedAgents = await agentQuery;

  // Filter in memory for simplicity or add where clause
  let filteredAgents = connectedAgents;
  if (search) {
    const q = search.toLowerCase();
    filteredAgents = connectedAgents.filter(a => 
      a.username.toLowerCase().includes(q) || 
      (a.nickname && a.nickname.toLowerCase().includes(q)) ||
      (a.email && a.email.toLowerCase().includes(q))
    );
  }

  return NextResponse.json({ agents: filteredAgents });
}
