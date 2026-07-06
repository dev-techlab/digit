import 'server-only';

// App code imports RBAC from here so the `server-only` guard keeps it out of
// client bundles. The query logic lives in ./rbac-core (no server-only) so it
// can also be exercised by the integration test (scripts/test-rbac.ts).
export {
  can,
  requirePermission,
  effectivePermissions,
  isSuperAdmin,
  SUPER_ADMIN_ROLE,
  PermissionError,
} from './rbac-core';
