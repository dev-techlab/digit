// Test stub — `next/headers`'s `cookies()` throws when called outside a
// Next.js request scope, which vitest's plain Node environment never provides.
// Only `.get(name)?.value` is used anywhere in this codebase (see lib/data.ts,
// app/api/*/logout/route.ts), so a jar with no cookies is all callers need:
// it exercises the same "no session" path a real anonymous request would.
export function cookies() {
  return { get: (_name: string) => undefined as { value: string } | undefined };
}
