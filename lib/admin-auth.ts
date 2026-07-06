import 'server-only';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';

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
  const authHeader = req.headers.get('authorization');
  const bearer = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = bearer ?? cookieValue(req.headers.get('cookie'), 'admin_session');
  if (!token) return null;

  const session = await db
    .select({ adminId: s.adminSessions.adminId })
    .from(s.adminSessions)
    .innerJoin(s.admins, eq(s.admins.id, s.adminSessions.adminId))
    .where(
      and(
        eq(s.adminSessions.token, token),
        gt(s.adminSessions.expiresAt, new Date()),
        isNull(s.adminSessions.revokedAt),
        eq(s.admins.status, 'active')
      )
    )
    .limit(1);

  return session[0]?.adminId ?? null;
}
