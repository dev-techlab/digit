import 'server-only';
import { headers } from 'next/headers';
import { db } from '@/lib/db';

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/**
 * Resolve the authenticated admin id from a request — `Authorization: Bearer
 * <token>` or the `admin_session` cookie — validated against admin_sessions
 * (unexpired, not revoked) AND the owning admin being `active`. Returns null
 * when there is no valid session or the admin is suspended/invited.
 */
export async function getAdminIdFromRequest(req: Request): Promise<string | null> {
  headers(); // Tell Next.js this route is dynamic
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearer ?? cookieValue(req.headers.get('cookie'), 'admin_session');
  if (!token) return null;

  const session = await db.admin_sessions.findFirst({
    where: {
      token,
      expires_at: { gt: new Date() },
      revoked_at: null,
      admins: { status: 'active' },
    },
    select: { admin_id: true },
  });

  return session?.admin_id ?? null;
}
