/** True for a Postgres unique-violation (SQLSTATE 23505) — e.g. a duplicate-key race. */
export function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === '23505';
}
