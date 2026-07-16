# Database Guide — Models, Migrations & Testing (Laravel-style workflow)

The agent panel's data layer is organized the way Laravel organizes `app/Models` +
`database/migrations`: **one model per file**, versioned migration files, seeders, and a
full-database smoke test.

## Layout

```
lib/db/schema/agent/            ← one model per file (like app/Models)
  enums.ts                        shared pg enums
  game-platform.ts                gamePlatforms      (47-game catalog)
  agent.ts                        agents             (store → sale/sub hierarchy)
  agent-session.ts                agentSessions      (login tokens)
  store-setting.ts                storeSettings      (1:1 store config)
  store-platform-account.ts       storePlatformAccounts (store × game POS account)
  store-administrator.ts          storeAdministrators
  kiosk.ts                        kiosks
  member.ts                       members            (players)
  member-login.ts                 memberLogins       (IP/device history)
  member-platform-account.ts      memberPlatformAccounts (game bindings)
  member-transaction.ts           memberTransactions (recharge/redeem ledger)
  agent-transaction.ts            agentTransactions  (deposit/withdraw/transfer)
  promotion.ts                    promotions
  redemption-audit.ts             redemptionAudits
  cs-config.ts                    csConfigs
  store-terms.ts                  storeTerms         (EN/ES)
  agent-notice.ts                 agentNotices       (bell / My Notices)
  poster.ts                       posters
  index.ts                        re-exports everything

drizzle/                        ← versioned migrations (like database/migrations)
  0000_*.sql … 0004_*.sql         numbered, immutable once applied
  meta/_journal.json              applied-migration ledger
```

## Command ↔ Laravel equivalent

| Task | Command | Laravel equivalent |
|---|---|---|
| Create a migration from model changes | `pnpm db:generate` | `php artisan make:migration` (auto-diffed) |
| Run pending migrations | `pnpm db:migrate` | `php artisan migrate` |
| Push schema directly (dev only) | `pnpm db:push` | `migrate:fresh`-ish, no file |
| Seed demo data | `pnpm agent:seed` | `php artisan db:seed` |
| **Test every model (CRUD + constraints)** | `pnpm db:test` | `php artisan test` (DB feature tests) |
| Browse data | `pnpm db:studio` | Telescope/phpMyAdmin-ish |

## Workflow for a schema change

1. Edit (or add) the model file in `lib/db/schema/agent/` — e.g. add a column to
   `member.ts`, or create `new-model.ts` and export it from `agent/index.ts`.
2. `pnpm db:generate` → writes a new numbered SQL file under `drizzle/`.
3. Review the generated SQL, then `pnpm db:migrate` to apply it.
4. `pnpm db:test` to confirm every model still passes CRUD + constraint checks.

Never edit an already-applied migration — generate a new one (same rule as Laravel).

## What `pnpm db:test` covers (25 checks, all green)

For **every** table: INSERT a fresh row → SELECT it back → UPDATE → (DELETE). Plus:

- **Unique constraints**: duplicate platform name, agent username,
  (store, platform) account, (store, member username), (store, terms locale) all rejected
- **jsonb round-trip**: promotion `activeDays` / `hiddenFromAgentIds`
- **Ledger math**: member transaction in/out score aggregates
- **Funding flows**: deposit (bitcoin_lightning), withdraw (fee + balance before/after),
  transfer (counterparty), status transitions (pending → cancelled)
- **FK cascades**: deleting a member removes its logins/bindings; deleting a store removes
  its settings, platform accounts, sub-agents, transactions, terms — the whole subtree

Test rows use `__test_*` prefixed names and are cleaned up at the end, so the script is safe
to run against a seeded dev database. A non-zero exit code means at least one model failed.
