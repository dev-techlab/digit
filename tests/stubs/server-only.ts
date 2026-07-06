// Test stub — the real `server-only` package throws when imported outside a
// React Server Component. Vitest aliases the import to this no-op so we can
// unit-test server modules (lib/data, lib/settings, …) directly.
export {};
