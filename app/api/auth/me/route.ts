import { NextResponse } from 'next/server';
import { getUserIdFromRequest } from '@/lib/user-auth';
import { getUserProfile } from '@/lib/user-service';


/** GET /api/auth/me — the authenticated user's profile, or 401. */
export async function GET(req: Request) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    return NextResponse.json({ user: await getUserProfile(userId) });
  } catch (err: any) {
    if (err && (err.digest === 'DYNAMIC_SERVER_USAGE' || err.message?.includes('NEXT_'))) throw err;
    console.error('GET /api/auth/me', err);
    return NextResponse.json({ error: (err as any)?.message || 'Internal server error' }, { status: 500 });
  }
}
