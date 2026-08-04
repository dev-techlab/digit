import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';


export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const platformId = url.searchParams.get('platformId');
  const search = url.searchParams.get('search')?.trim();
  
  if (!platformId) return NextResponse.json({ error: 'Missing platformId' }, { status: 400 });

  // Only accounts for members belonging to this agent's store
  // If agent is a sub/sale agent, we might want to restrict to their own members.
  const agentCol = agent.type === 'sub' ? 'sub_agent_id' : (agent.type === 'sale' ? 'sale_agent_id' : null);
  
  const memberWhere: any = { store_id: agent.storeId };
  if (agentCol) memberWhere[agentCol] = agent.id;
  if (search) {
    memberWhere.username = { contains: search, mode: 'insensitive' };
  }

  const accounts = await db.member_platform_accounts.findMany({
    where: {
      platform_id: platformId,
      members: memberWhere,
    },
    include: {
      members: {
        select: {
          username: true,
          remark: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const formatted = accounts.map(a => ({
    id: a.id,
    gameUsername: a.game_username,
    memberUsername: a.members.username,
    notes: a.members.remark,
    createdAt: a.created_at,
    balance: '0.00', // Real balance fetch would require platform integration
    state: 'offline', // Real state fetch would require platform integration
  }));

  return NextResponse.json({ accounts: formatted });
}

const createSchema = z.object({
  platformId: z.string().uuid(),
  purchaseAmount: z.number().min(0).default(0),
  usernameNotes: z.string().min(1), // Acts as the player's username or note
});

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const randPass = () => String(Math.floor(100000 + Math.random() * 900000));

    // 1. Create member in portal (assuming this creates a brand new user for this platform account)
    const newMember = await db.members.create({
      data: {
        store_id: agent.storeId,
        sale_agent_id: agent.type === 'sale' ? agent.id : (agent.type === 'sub' ? agent.id : null),
        sub_agent_id: agent.type === 'sub' ? agent.id : null,
        username: data.usernameNotes.toLowerCase().replace(/\s+/g, ''),
        password_hash: randPass(), // Dummy pass for platform-only members
        remark: data.usernameNotes,
        online_sc: data.purchaseAmount > 0 ? data.purchaseAmount : 0,
      },
    });

    // 2. Link member to platform
    const platformAccount = await db.member_platform_accounts.create({
      data: {
        member_id: newMember.id,
        platform_id: data.platformId,
        game_username: newMember.username,
        game_password: randPass(),
      },
    });

    // 3. If purchaseAmount > 0, record a transaction
    if (data.purchaseAmount > 0) {
      await db.member_transactions.create({
        data: {
          store_id: agent.storeId,
          member_id: newMember.id,
          platform_id: data.platformId,
          type: 'recharge', // Represents a deposit/purchase
          channel: 'online',
          amount: data.purchaseAmount,
          status: 'completed',
          in_score: data.purchaseAmount,
          out_score: 0,
        },
      });
    }

    return NextResponse.json({ success: true, accountId: platformAccount.id });
  } catch (err) {
    console.error(err);
    if (err instanceof ZodError) {
      return NextResponse.json({ error: (err as any).issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
