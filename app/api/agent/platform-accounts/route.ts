import { NextResponse } from 'next/server';
import { z, ZodError } from 'zod';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { getAdminIdFromRequest } from '@/lib/admin-auth';

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  const adminId = await getAdminIdFromRequest(req);

  if (!agent && !adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(req.url);
  const platformId = url.searchParams.get('platformId');
  const search = url.searchParams.get('search')?.trim();
  const state = url.searchParams.get('state')?.trim();
  const storeId = url.searchParams.get('storeId');
  
  if (!platformId) return NextResponse.json({ error: 'Missing platformId' }, { status: 400 });

  const memberWhere: any = {};
  
  if (agent) {
    memberWhere.store_id = agent.storeId;
    const agentCol = agent.type === 'sub' ? 'sub_agent_id' : (agent.type === 'sale' ? 'sale_agent_id' : null);
    if (agentCol) memberWhere[agentCol] = agent.id;
  } else if (storeId) {
    memberWhere.store_id = storeId;
  }

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
          online_sc: true,
        },
      },
      game_platforms: {
        select: {
          name: true
        }
      }
    },
    orderBy: { created_at: 'desc' },
  });

  let formatted = accounts.map(a => {
    // Determine mock state based on ID or something deterministic if possible, or just 'offline'
    let mockState = 'offline';
    if (a.game_username?.includes('90')) mockState = 'online';
    if (a.game_username?.includes('55')) mockState = 'locked';

    return {
      id: a.id,
      platformName: a.game_platforms?.name || 'Unknown',
      gameUsername: a.game_username,
      memberUsername: a.members?.username,
      notes: a.members?.remark,
      createdAt: a.created_at,
      balance: a.members?.online_sc?.toString() || '0.00',
      state: mockState,
    };
  });

  if (state) {
    formatted = formatted.filter(f => f.state === state);
  }

  return NextResponse.json({ accounts: formatted });
}

const createSchema = z.object({
  platformId: z.string().uuid(),
  purchaseAmount: z.number().min(0).default(0),
  usernameNotes: z.string().min(1),
  storeId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const agent = await getAgentFromRequest(req);
  const adminId = await getAdminIdFromRequest(req);

  if (!agent && !adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const activeStoreId = agent?.storeId || data.storeId;
    if (!activeStoreId) {
       return NextResponse.json({ error: 'Missing storeId for admin' }, { status: 400 });
    }

    const randPass = () => String(Math.floor(100000 + Math.random() * 900000));
    
    // Create member in portal
    const newMember = await db.members.create({
      data: {
        store_id: activeStoreId,
        sale_agent_id: agent?.type === 'sale' ? agent.id : (agent?.type === 'sub' ? agent.id : null),
        sub_agent_id: agent?.type === 'sub' ? agent.id : null,
        username: data.usernameNotes.toLowerCase().replace(/\s+/g, '') + randPass().slice(0, 4),
        password_hash: randPass(),
        remark: data.usernameNotes,
        online_sc: data.purchaseAmount > 0 ? data.purchaseAmount : 0,
      },
    });

    // Link member to platform
    const platformAccount = await db.member_platform_accounts.create({
      data: {
        member_id: newMember.id,
        platform_id: data.platformId,
        game_username: newMember.username,
        game_password: randPass(),
      },
    });

    if (data.purchaseAmount > 0) {
      await db.member_transactions.create({
        data: {
          store_id: activeStoreId,
          member_id: newMember.id,
          platform_id: data.platformId,
          type: 'recharge',
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

const updateSchema = z.object({
  id: z.string().uuid(),
  gameUsername: z.string().min(1),
  notes: z.string().optional(),
});

export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  const adminId = await getAdminIdFromRequest(req);

  if (!agent && !adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = updateSchema.parse(body);

    const account = await db.member_platform_accounts.findUnique({
      where: { id: data.id },
      include: { members: true }
    });

    if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

    // Ensure agent can only edit their own members
    if (agent && account.members?.store_id !== agent.storeId) {
      return NextResponse.json({ error: 'Unauthorized access to this account' }, { status: 403 });
    }

    await db.$transaction([
      db.member_platform_accounts.update({
        where: { id: data.id },
        data: {
          game_username: data.gameUsername,
        }
      }),
      db.members.update({
        where: { id: account.member_id },
        data: {
          remark: data.notes || '',
        }
      })
    ]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    if (err instanceof ZodError) {
      return NextResponse.json({ error: (err as any).issues[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
