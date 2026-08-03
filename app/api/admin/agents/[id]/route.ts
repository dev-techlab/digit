import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

  const agent = await db.agents.findFirst({
    where: { id: agentId, type: 'store' },
    select: {
      id: true,
      username: true,
      nickname: true,
      email: true,
      invite_code: true,
      commission_per: true,
      online_balance: true,
      status: true,
      remark: true,
      last_login_at: true,
      created_at: true,
      store_settings: {
        select: { agent_withdraw_commission_per: true }
      }
    }
  });

  if (!agent) {
    return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
  }

  const totalUsers = await db.members.count({
    where: { store_id: agentId }
  });

  const totalTransactions = await db.agent_transactions.count({
    where: { agent_id: agentId }
  });

  return NextResponse.json({
    agent: {
      id: agent.id,
      username: agent.username,
      nickname: agent.nickname,
      email: agent.email,
      inviteCode: agent.invite_code,
      commissionPer: agent.commission_per,
      onlineBalance: agent.online_balance,
      status: agent.status,
      remark: agent.remark,
      lastLoginAt: agent.last_login_at,
      createdAt: agent.created_at,
      agentWithdrawCommissionPer: agent.store_settings?.agent_withdraw_commission_per || 0,
      totalUsers,
      totalTransactions,
    },
  });
}

