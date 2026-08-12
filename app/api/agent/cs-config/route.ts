import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { z } from 'zod';

const putSchema = z.object({
  enabled: z.boolean().optional(),
  contactPhoneEnabled: z.boolean().optional(),
  contactPhone: z.string().trim().optional(),
  platform: z.string().trim().optional(),
  jsUrl: z.string().trim().optional(),
});

export async function GET(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const config = await db.cs_configs.findUnique({
      where: { store_id: agent.storeId },
    });

    return NextResponse.json({
      config: config
        ? {
            enabled: config.enabled,
            contactPhoneEnabled: config.contact_phone_enabled,
            contactPhone: config.contact_phone,
            platform: config.platform,
            jsUrl: config.js_url,
          }
        : {
            enabled: true,
            contactPhoneEnabled: false,
            contactPhone: null,
            platform: 'Custom JS Widget',
            jsUrl: null,
          },
    });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/cs-config', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const parseResult = putSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid input' },
        { status: 400 }
      );
    }

    const data = parseResult.data;

    const set: any = { updated_at: new Date() };
    if (data.enabled !== undefined) set.enabled = data.enabled;
    if (data.contactPhoneEnabled !== undefined)
      set.contact_phone_enabled = data.contactPhoneEnabled;
    if (data.contactPhone !== undefined) set.contact_phone = data.contactPhone;
    if (data.platform !== undefined) set.platform = data.platform;
    if (data.jsUrl !== undefined) set.js_url = data.jsUrl;

    await db.cs_configs.upsert({
      where: { store_id: agent.storeId },
      update: set,
      create: {
        store_id: agent.storeId,
        ...set,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('PUT /api/agent/cs-config', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
