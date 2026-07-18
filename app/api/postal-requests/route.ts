import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getUserIdFromRequest } from '@/lib/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/postal-requests — { code } — the sweepstakes "Alternate Method
 * of Entry" postal request. No login required (anonymous visitors can mail
 * in an entry code per the sweepstakes rules), so `userId` is attached only
 * when a session happens to be present.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const code = typeof body.code === 'string' ? body.code.trim().slice(0, 100) : '';
  if (!code)
    return NextResponse.json({ error: 'A postal request code is required' }, { status: 400 });

  const userId = await getUserIdFromRequest(req);
  const [row] = await db
    .insert(s.postalRequests)
    .values({ userId, code })
    .returning({ id: s.postalRequests.id });

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}
