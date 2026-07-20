function pgCode(err: unknown): unknown {
  if (typeof err !== 'object' || err === null) return undefined;
  if ('code' in err) return (err as { code: unknown }).code;
  // drizzle-orm wraps every driver error in DrizzleQueryError, which puts the
  // real Postgres error (the one with `.code`) on `.cause` rather than
  // copying it onto itself — check one level down so callers don't have to
  // know about that wrapping.
  if ('cause' in err) return pgCode((err as { cause: unknown }).cause);
  return undefined;
}

/** True for a Postgres unique-violation (SQLSTATE 23505) — e.g. a duplicate-key race. */
export function isUniqueViolation(err: unknown): boolean {
  return pgCode(err) === '23505';
}
