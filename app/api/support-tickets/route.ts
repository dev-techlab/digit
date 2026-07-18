import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { getUserIdFromRequest } from '@/lib/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/support-tickets — { message, email? } — Help Center "still need
 * help?" submission. No login required; `userId`/`email` are attached when a
 * session is present so support can identify the account.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';
  if (!message) return NextResponse.json({ error: 'Please describe your issue' }, { status: 400 });

  const userId = await getUserIdFromRequest(req);
  let email = typeof body.email === 'string' && body.email.includes('@') ? body.email.trim() : null;
  if (!email && userId) {
    const [user] = await db
      .select({ email: s.users.email })
      .from(s.users)
      .where(eq(s.users.id, userId));
    email = user?.email ?? null;
  }

  const [row] = await db
    .insert(s.supportTickets)
    .values({ userId, email, message })
    .returning({ id: s.supportTickets.id });

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}
