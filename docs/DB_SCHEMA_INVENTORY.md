# Database Schema Inventory — every table, where it's defined, how it got there, how it's filled

This is the index that ties together [DB_GUIDE.md](./DB_GUIDE.md) (workflow),
[DB_DIAGRAM.md](./DB_DIAGRAM.md) (core app + super-admin ERD), and
[ADMIN_PANEL_AUDIT.md](./ADMIN_PANEL_AUDIT.md) §3 (agent panel ERD) — one flat table of
**every** table currently in the database, so you can see at a glance what exists, which
migration introduced it, and whether it has a seeder, without cross-referencing three docs.

**When you come back after a few days away** (see DB_GUIDE.md workflow): `git pull`, then check
this file's "Migration history" section against your local `drizzle/meta/_journal.json` — any
tag listed here that isn't in your local journal is a migration you haven't applied yet.
Run `pnpm db:migrate` to apply pending ones; **never `pnpm db:push`** against a database with
real data (see DB_GUIDE.md — push computes a live diff and can drop/alter destructively).

## Table inventory

| Table | Schema file | Migration | Seeded by | Notes |
|---|---|---|---|---|
| `users` | `lib/db/schema/users.ts` | 0000 | `seed.ts` | player accounts |
| `wallets` | `lib/db/schema/users.ts` | 0000 | `seed.ts` | 1:1 with users |
| `sessions` | `lib/db/schema/users.ts` | 0000 / 0002 (+`revoked_at`) | runtime only | player auth |
| `otp_codes` | `lib/db/schema/users.ts` | 0000 / 0002 (+`attempts`) | runtime only | phone/email verification |
| `postal_requests` | `lib/db/schema/users.ts` | 0000 | runtime only | |
| `support_tickets` | `lib/db/schema/users.ts` | 0000 | runtime only | |
| `game_providers` | `lib/db/schema/providers.ts` | 0000 | `seed.ts` (from `data/providers.{sc,gc}.json`) | player-side GC/SC catalog — fixtures refreshed by `fetch:providers`, but a re-run of `db:seed` is what actually loads them into this table (no live-sync path of its own; that's `game_platforms` below) |
| `provider_deposit_tiers` | `lib/db/schema/providers.ts` | 0000 | `seed.ts` | |
| `user_provider_accounts` | `lib/db/schema/providers.ts` | 0000 | runtime only | |
| `orders` | `lib/db/schema/finance.ts` | 0000 | `seed.ts` | deposit/recharge orders |
| `transactions` | `lib/db/schema/finance.ts` | 0000 | `seed.ts` | player wallet ledger |
| `bonuses` | `lib/db/schema/engagement.ts` | 0000 | `seed.ts` | reference data |
| `user_bonus_claims` | `lib/db/schema/engagement.ts` | 0000 | `seed.ts` | |
| `referral_commissions` | `lib/db/schema/engagement.ts` | 0000 | `seed.ts` | |
| `redemption_reviews` | `lib/db/schema/engagement.ts` | 0000 | `seed.ts` | player-side redemption queue |
| `profile_tasks` | `lib/db/schema/engagement.ts` | 0000 | `seed.ts` | reference data |
| `user_profile_task_claims` | `lib/db/schema/engagement.ts` | 0000 | runtime only | |
| `content_pages` | `lib/db/schema/content.ts` | 0000 | `seed.ts` | legal + guide pages |
| `banners` | `lib/db/schema/content.ts` | 0000 | `seed.ts` | game-page carousel |
| `help_sections` | `lib/db/schema/content.ts` | 0000 | `seed.ts` | |
| `help_items` | `lib/db/schema/content.ts` | 0000 | `seed.ts` | |
| `help_steps` | `lib/db/schema/content.ts` | 0000 | `seed.ts` | |
| `site_settings` | `lib/db/schema/content.ts` | 0000 / 0002 (`is_public` default) | `seed.ts` | global key/value config, mix of public (`is_public: true`) and internal rows — e.g. `provider.api_base_url` (internal, `is_public: false`), read by `lib/provider-api.ts#getProviderApiBaseUrl` |
| `social_links` | `lib/db/schema/content.ts` | 0000 | `seed.ts` | |
| `admins` | `lib/db/schema/rbac.ts` | 0000 / 0001 (dropped `is_super_admin`) | `admin:create` / `createAdmin()` | back-office staff |
| `roles` | `lib/db/schema/rbac.ts` | 0000 | `seed.ts` | dynamic RBAC roles |
| `permissions` | `lib/db/schema/rbac.ts` | 0000 | `seed.ts` | dynamic RBAC permissions |
| `role_permissions` | `lib/db/schema/rbac.ts` | 0000 | `seed.ts` | M:N |
| `admin_roles` | `lib/db/schema/rbac.ts` | 0000 | runtime only | M:N |
| `admin_permissions` | `lib/db/schema/rbac.ts` | 0000 | runtime only | per-admin overrides |
| `admin_sessions` | `lib/db/schema/rbac.ts` | 0000 | runtime only | |
| `admin_invitations` | `lib/db/schema/rbac.ts` | 0000 | runtime only | |
| `admin_audit_logs` | `lib/db/schema/rbac.ts` | 0000 | runtime only | |
| `media_assets` | `lib/db/schema/media.ts` | 0000 | runtime only | Cloudflare R2 registry |
| `game_platforms` | `lib/db/schema/agent/game-platform.ts` | 0003 / 0005 (+`external_id`, `provider_code`, `provider_type`, `launch_url`, `synced_at`) | `agent:seed`, `platforms:seed`, `platforms:sync` | agent-side 47-game catalog; `platforms:sync` is the live path (falls back to the same JSON fixtures if the API is down) — logic lives in `lib/provider-api.ts#syncGamePlatforms`, shared with the `providers.sync` cron job |
| `agents` | `lib/db/schema/agent/agent.ts` | 0003 | `agent:seed` | store/sale/sub hierarchy |
| `agent_sessions` | `lib/db/schema/agent/agent-session.ts` | 0003 | runtime only | agent login tokens |
| `store_settings` | `lib/db/schema/agent/store-setting.ts` | 0003 | `agent:seed` | 1:1 with store agent |
| `store_platform_accounts` | `lib/db/schema/agent/store-platform-account.ts` | 0003 | `agent:seed` | store × platform POS account |
| `store_administrators` | `lib/db/schema/agent/store-administrator.ts` | 0003 | runtime only | staff logins per store |
| `kiosks` | `lib/db/schema/agent/kiosk.ts` | 0003 | runtime only | |
| `members` | `lib/db/schema/agent/member.ts` | 0003 | `agent:seed` | players, panel-scoped |
| `member_logins` | `lib/db/schema/agent/member-login.ts` | 0003 | `agent:seed` | login history |
| `member_platform_accounts` | `lib/db/schema/agent/member-platform-account.ts` | 0003 | runtime only | member × platform binding |
| `member_transactions` | `lib/db/schema/agent/member-transaction.ts` | 0003 | `agent:seed` | recharge/redeem ledger |
| `agent_transactions` | `lib/db/schema/agent/agent-transaction.ts` | 0003 | runtime only | deposit/withdraw/transfer |
| `promotions` | `lib/db/schema/agent/promotion.ts` | 0003 | `agent:seed` | |
| `redemption_audits` | `lib/db/schema/agent/redemption-audit.ts` | 0003 | runtime only | store-side audit queue |
| `cs_configs` | `lib/db/schema/agent/cs-config.ts` | 0003 | `agent:seed` | |
| `store_terms` | `lib/db/schema/agent/store-terms.ts` | 0003 | `agent:seed` (EN only) | per-locale, null ⇒ inherit |
| `posters` | `lib/db/schema/agent/poster.ts` | 0003 | `agent:seed` | |
| `agent_notices` | `lib/db/schema/agent/agent-notice.ts` | 0004 | none yet | bell / My Notices |

**Not a table** — `relations.ts` only declares Drizzle `relations()` helpers, no `pgTable`.

## Migration history

| Tag | What it did |
|---|---|
| `0000_fat_multiple_man` | Initial schema — every core/player + super-admin RBAC table (34 tables) |
| `0001_brainy_invaders` | Dropped `admins.is_super_admin` (superseded by the roles/permissions model) |
| `0002_familiar_mandarin` | `site_settings.is_public` default `false`; added `otp_codes.attempts`, `sessions.revoked_at` |
| `0003_charming_thaddeus_ross` | Added the entire agent panel (17 tables) |
| `0004_talented_dormammu` | Added `agent_notices` |
| `0005_open_jigsaw` | Added `game_platforms.external_id` / `provider_code` / `provider_type` / `launch_url` / `synced_at` (live-provider sync support) |

## Pending changes

_None tracked right now._ When you edit a schema file locally and haven't generated a migration
for it yet, add a line here (table, file, what changed, why) so it isn't lost if you step away
before running `pnpm db:generate`. Clear the line once the migration is generated and merged.

## Seeder reference

| Script | npm command | Covers |
|---|---|---|
| `scripts/seed.ts` | `pnpm db:seed` | Core/player-side tables + RBAC roles/permissions |
| `scripts/seed-agent.ts` | `pnpm agent:seed` | Demo store `Deluxe001` + agent-panel tables |
| `scripts/seed-platforms.ts` | `pnpm platforms:seed` | `game_platforms` from committed provider snapshots (offline) |
| `scripts/sync-platforms.ts` | `pnpm platforms:sync` | `game_platforms` from the live provider API, falling back to `data/providers.{sc,gc}.json` |
| `scripts/fetch-providers.ts` | `pnpm fetch:providers` | **Not a DB seeder** — refreshes `data/providers.{sc,gc}.json` from the live API. Re-run `db:seed` or `platforms:seed`/`platforms:sync` afterward to actually load the refreshed data |
| `scripts/create-admin.ts` | `pnpm admin:create` | One-off `admins` row |

Tables marked "runtime only" above have no seeder — they're populated by normal app usage
(logins, transactions, uploads) and are expected to be empty on a fresh seed.
