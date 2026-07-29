import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAdminIdFromRequest } from '@/lib/admin-auth';
import { requirePermission } from '@/lib/rbac-core';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const adminId = await getAdminIdFromRequest(req);
  if (!adminId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await requirePermission(adminId, 'agents.read');
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 403 });
  }

  const agentId = params.id;

  const [agent] = await db
    .select({
      id: s.agents.id,
      username: s.agents.username,
      nickname: s.agents.nickname,
      email: s.agents.email,
      inviteCode: s.agents.inviteCode,
      commissionPer: s.agents.commissionPer,
      onlineBalance: s.agents.onlineBalance,
      status: s.agents.status,
      remark: s.agents.remark,
      lastLoginAt: s.agents.lastLoginAt,
      createdAt: s.agents.createdAt,
      agentWithdrawCommissionPer: s.storeSettings.agentWithdrawCommissionPer,
    })
    .from(s.agents)
    .leftJoin(s.storeSettings, eq(s.agents.id, s.storeSettings.storeId))
    .where(and(eq(s.agents.id, agentId), eq(s.agents.type, 'store')))
    .limit(1);

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  return NextResponse.json({ agent });
}
