import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user-auth';
import { getUserProfile } from '@/lib/user-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/auth/me — the authenticated user's profile, or 401. */
export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ user: await getUserProfile(userId) });
}
