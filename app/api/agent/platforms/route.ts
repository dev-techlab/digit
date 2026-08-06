import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { getAdminIdFromRequest } from '@/lib/admin-auth';

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  const adminId = await getAdminIdFromRequest(req);

  if (!agent && !adminId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let rawPlatforms = [];

  if (agent) {
    const mappings = await db.agent_platform_mappings.findMany({
      where: {
        agent_id: agent.storeId,
        game_platforms: {
          deleted_at: null
        }
      },
      select: {
        game_platforms: true
      },
      orderBy: [
        { game_platforms: { sort: 'asc' } },
        { game_platforms: { name: 'asc' } }
      ]
    });
    rawPlatforms = mappings.map(m => m.game_platforms);
  } else {
    // Admin sees all platforms
    rawPlatforms = await db.game_platforms.findMany({
      where: {
        deleted_at: null
      },
      orderBy: [
        { sort: 'asc' },
        { name: 'asc' }
      ]
    });
  }

  const platforms = rawPlatforms.map(p => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    iconUrl: p.icon_url,
    externalId: p.external_id,
    providerCode: p.provider_code,
    providerType: p.provider_type,
    launchUrl: p.launch_url,
    sort: p.sort,
    isActive: p.is_active,
    syncedAt: p.synced_at,
    createdAt: p.created_at,
  }));

  return NextResponse.json({ platforms });
}

