import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/cs-config — customer-service widget config for this store. */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [config] = await db
    .select()
    .from(s.csConfigs)
    .where(eq(s.csConfigs.storeId, agent.storeId));
  return NextResponse.json({
    config: config ?? {
      enabled: true,
      contactPhoneEnabled: false,
      contactPhone: null,
      platform: 'Custom JS Widget',
      jsUrl: null,
    },
  });
}

/** PUT /api/agent/cs-config — upsert the config. */
export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const set: Partial<typeof s.csConfigs.$inferInsert> = { updatedAt: new Date() };
  if (typeof body.enabled === 'boolean') set.enabled = body.enabled;
  if (typeof body.contactPhoneEnabled === 'boolean')
    set.contactPhoneEnabled = body.contactPhoneEnabled;
  if (typeof body.contactPhone === 'string') set.contactPhone = body.contactPhone;
  if (typeof body.platform === 'string') set.platform = body.platform;
  if (typeof body.jsUrl === 'string') set.jsUrl = body.jsUrl;

  await db
    .insert(s.csConfigs)
    .values({ storeId: agent.storeId, ...set })
    .onConflictDoUpdate({ target: s.csConfigs.storeId, set });
  return NextResponse.json({ ok: true });
}
