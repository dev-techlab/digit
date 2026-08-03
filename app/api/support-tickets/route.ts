import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}) as Record<string, unknown>);
  const message = typeof body.message === 'string' ? body.message.trim().slice(0, 2000) : '';
  if (!message) return NextResponse.json({ error: 'Please describe your issue' }, { status: 400 });

  const userId = await getUserIdFromRequest(req);
  let email = typeof body.email === 'string' && body.email.includes('@') ? body.email.trim() : null;
  if (!email && userId) {
    const user = await db.users.findUnique({
      where: { id: userId },
      select: { email: true }
    });
    email = user?.email ?? null;
  }

  const row = await db.support_tickets.create({
    data: { user_id: userId, email, message },
    select: { id: true }
  });

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}
