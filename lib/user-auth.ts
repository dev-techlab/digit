import 'server-only';
import { userIdForToken } from '@/lib/user-service';
import { USER_SESSION_COOKIE } from '@/lib/auth-tokens';

function cookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/** Resolve the authenticated user id from a request's `session` cookie. */
export async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const token = cookieValue(req.headers.get('cookie'), USER_SESSION_COOKIE);
  if (!token) return null;
  return userIdForToken(token);
}
