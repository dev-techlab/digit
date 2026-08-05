/** True for a Prisma unique-violation (P2002) or Postgres unique-violation (SQLSTATE 23505). */
export function isUniqueViolation(err: unknown): boolean {
  if (typeof err === 'object' && err !== null) {
    if ('code' in err) {
      const code = (err as any).code;
      if (code === 'P2002' || code === '23505') return true;
    }
  }
  return false;
}
