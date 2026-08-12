import { db } from '@/lib/db';

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
    await db.admin_audit_logs.create({
      data: {
        admin_id: params.adminId,
        action: params.action,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        changes: params.changes == null ? null : (params.changes as any),
        ip_address: params.ipAddress ?? null,
      },
    });
  } catch (err) {
    console.error('[audit-log] failed to record', params.action, err);
  }
}
