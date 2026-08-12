import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const member = await db.members.findFirst({
      where: {
        id: params.id,
        store_id: agent.storeId,
      },
    });

    if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const rawLogins = await db.member_logins.findMany({
      where: { member_id: member.id },
      orderBy: { created_at: 'desc' },
      take: 20,
      select: {
        ip_address: true,
        device: true,
        created_at: true,
      },
    });

    const logins = rawLogins.map((l) => ({
      ipAddress: l.ip_address,
      device: l.device,
      createdAt: l.created_at,
    }));

    const rawBindings = await db.member_platform_accounts.findMany({
      where: { member_id: member.id },
      select: {
        game_username: true,
        created_at: true,
        game_platforms: {
          select: { name: true },
        },
      },
    });

    const bindings = rawBindings.map((b) => ({
      platform: b.game_platforms.name,
      gameUsername: b.game_username,
      createdAt: b.created_at,
    }));

    const safeFormatted = {
      id: member.id,
      storeId: member.store_id,
      saleAgentId: member.sale_agent_id,
      subAgentId: member.sub_agent_id,
      username: member.username,
      phone: member.phone,
      onlineSc: member.online_sc,
      scRewardEnabled: member.sc_reward_enabled,
      remark: member.remark,
      status: member.status,
      createdAt: member.created_at,
    };

    return NextResponse.json({ member: safeFormatted, logins, bindings });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/members/[id]', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
