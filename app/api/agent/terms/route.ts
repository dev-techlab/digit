import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getAgentFromRequest } from '@/lib/agent-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/agent/terms — per-locale terms for this store (null = inherit upstream). */
export async function GET(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select({ locale: s.storeTerms.locale, content: s.storeTerms.content })
    .from(s.storeTerms)
    .where(eq(s.storeTerms.storeId, agent.storeId));
  return NextResponse.json({
    terms: { en: rows.find((r) => r.locale === 'en')?.content ?? null,
             es: rows.find((r) => r.locale === 'es')?.content ?? null },
  });
}

/** PUT /api/agent/terms — { locale: 'en'|'es', content: string|null }. */
export async function PUT(req: Request) {
  const agent = await getAgentFromRequest(req);
  if (!agent) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const locale = body.locale === 'es' ? 'es' : 'en';
  const content = typeof body.content === 'string' ? body.content : null;

  const existing = await db
    .select({ id: s.storeTerms.id })
    .from(s.storeTerms)
    .where(and(eq(s.storeTerms.storeId, agent.storeId), eq(s.storeTerms.locale, locale)));
  if (existing[0]) {
    await db
      .update(s.storeTerms)
      .set({ content, updatedAt: new Date() })
      .where(eq(s.storeTerms.id, existing[0].id));
  } else {
    await db.insert(s.storeTerms).values({ storeId: agent.storeId, locale, content });
  }
  return NextResponse.json({ ok: true });
}
