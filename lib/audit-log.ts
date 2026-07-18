import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';

/** Best-effort client IP from standard proxy headers (no infra guarantees these are set). */
export function clientIp(req: Request): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  return req.headers.get('x-real-ip');
}

/** Record an entry in `admin_audit_logs`. Never throws — a logging failure must not block the action it's logging. */
export async function logAdminAction(params: {
  adminId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  changes?: unknown;
  ipAddress?: string | null;
}): Promise<void> {
  try {
    await db.insert(s.adminAuditLogs).values({
      adminId: params.adminId,
      action: params.action,
      entityType: params.entityType ?? null,
      entityId: params.entityId ?? null,
      changes: params.changes == null ? null : (params.changes as object),
      ipAddress: params.ipAddress ?? null,
    });
  } catch (err) {
    console.error('[audit-log] failed to record', params.action, err);
  }
}
