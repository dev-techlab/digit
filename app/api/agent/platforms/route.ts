import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';


export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rawPlatforms = await db.agent_platform_mappings.findMany({
    where: {
      agent_id: agent.storeId,
      game_platforms: {
        deleted_at: null
      }
    },
    select: {
      game_platforms: {
        select: {
          id: true,
          name: true,
          slug: true,
          icon_url: true,
          external_id: true,
          provider_code: true,
          provider_type: true,
          launch_url: true,
          sort: true,
          is_active: true,
          synced_at: true,
          created_at: true,
        }
      }
    },
    orderBy: [
      { game_platforms: { sort: 'asc' } },
      { game_platforms: { name: 'asc' } }
    ]
  });

  const platforms = rawPlatforms.map(mapping => ({
    id: mapping.game_platforms.id,
    name: mapping.game_platforms.name,
    slug: mapping.game_platforms.slug,
    iconUrl: mapping.game_platforms.icon_url,
    externalId: mapping.game_platforms.external_id,
    providerCode: mapping.game_platforms.provider_code,
    providerType: mapping.game_platforms.provider_type,
    launchUrl: mapping.game_platforms.launch_url,
    sort: mapping.game_platforms.sort,
    isActive: mapping.game_platforms.is_active,
    syncedAt: mapping.game_platforms.synced_at,
    createdAt: mapping.game_platforms.created_at,
  }));

  return NextResponse.json({ platforms });
}
