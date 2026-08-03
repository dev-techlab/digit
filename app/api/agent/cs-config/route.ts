import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const config = await db.cs_configs.findUnique({
    where: { store_id: agent.storeId }
  });
  
  return NextResponse.json({
    config: config ? {
      enabled: config.enabled,
      contactPhoneEnabled: config.contact_phone_enabled,
      contactPhone: config.contact_phone,
      platform: config.platform,
      jsUrl: config.js_url,
    } : {
      enabled: true,
      contactPhoneEnabled: false,
      contactPhone: null,
      platform: 'Custom JS Widget',
      jsUrl: null,
    },
  });
}

export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const set: any = { updated_at: new Date() };
  if (typeof body.enabled === 'boolean') set.enabled = body.enabled;
  if (typeof body.contactPhoneEnabled === 'boolean')
    set.contact_phone_enabled = body.contactPhoneEnabled;
  if (typeof body.contactPhone === 'string') set.contact_phone = body.contactPhone;
  if (typeof body.platform === 'string') set.platform = body.platform;
  if (typeof body.jsUrl === 'string') set.js_url = body.jsUrl;

  await db.cs_configs.upsert({
    where: { store_id: agent.storeId },
    update: set,
    create: {
      store_id: agent.storeId,
      ...set
    }
  });
  return NextResponse.json({ ok: true });
}
