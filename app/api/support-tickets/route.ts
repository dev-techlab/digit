import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUserIdFromRequest } from '@/lib/user-auth';
import { z } from 'zod';

const postSchema = z.object({
  message: z.string().trim().max(2000).min(1, 'Please describe your issue'),
  email: z.string().email().nullable().optional()
});


export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parseResult = postSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const { message, email: bodyEmail } = parseResult.data;

  const userId = await getUserIdFromRequest(req);
  let email = bodyEmail || null;
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
