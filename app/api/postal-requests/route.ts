import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

import { getUserIdFromRequest } from '@/lib/user-auth';
import { z } from 'zod';

const postSchema = z.object({
  code: z.string().trim().max(100).min(1, 'A postal request code is required')
});


/**
 * POST /api/postal-requests — { code } — the sweepstakes "Alternate Method
 * of Entry" postal request. No login required (anonymous visitors can mail
 * in an entry code per the sweepstakes rules), so `userId` is attached only
 * when a session happens to be present.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const parseResult = postSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json({ error: parseResult.error.issues[0]?.message || 'Invalid input' }, { status: 400 });
  }

  const { code } = parseResult.data;

  const userId = await getUserIdFromRequest(req);
  const row = await db.postal_requests.create({
    data: {
      user_id: userId || null,
      code
    },
    select: { id: true }
  });

  return NextResponse.json({ ok: true, id: row.id }, { status: 201 });
}
