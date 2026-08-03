import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { sanitizeHtml } from '@/lib/sanitize-html';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db.store_terms.findMany({
    where: { store_id: agent.storeId },
    select: { locale: true, content: true }
  });
  
  return NextResponse.json({
    terms: {
      en: rows.find((r) => r.locale === 'en')?.content ?? null,
      es: rows.find((r) => r.locale === 'es')?.content ?? null,
    },
  });
}

export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (agent.type !== 'store') {
    return NextResponse.json({ error: 'Only the store account can manage terms' }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const locale = body.locale === 'es' ? 'es' : 'en';
  const content = typeof body.content === 'string' ? sanitizeHtml(body.content) : null;

  await db.store_terms.upsert({
    where: {
      store_id_locale: {
        store_id: agent.storeId,
        locale
      }
    },
    update: { content, updated_at: new Date() },
    create: {
      store_id: agent.storeId,
      locale,
      content
    }
  });

  return NextResponse.json({ ok: true });
}
