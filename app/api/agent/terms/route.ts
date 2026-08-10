import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAgentFromRequest } from '@/lib/agent-auth';
import { sanitizeHtml } from '@/lib/sanitize-html';
import { z } from 'zod';

const putSchema = z.object({
  locale: z.enum(['en', 'es']).optional().default('en'),
  content: z.string().nullable().optional()
});


export async function GET(req: Request) {
  try {
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
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/agent/terms', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const agent = await getAgentFromRequest(req);
    if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (agent.type !== 'store') {
      return NextResponse.json({ error: 'Only the store account can manage terms' }, { status: 403 });
    }
  
    const body = await req.json().catch(() => ({}));
    const parseResult = putSchema.safeParse(body);
  
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }
  
    const { locale, content: rawContent } = parseResult.data;
    const content = typeof rawContent === 'string' ? sanitizeHtml(rawContent) : null;
  
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
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('PUT /api/agent/terms', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
