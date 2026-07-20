# Admin Panel — Users & Agents Management

> Adds two screens to the super-admin panel (`/admin`) that were previously missing entirely: a
> **Users** list of everyone who self-registers on the player-facing site (home page / `/game`
> lobby, Quick Register or Manual Register), and an **Agents** list/create screen for the
> top-level store accounts that power the separate agent panel (`/agent`). Both give the admin an
> easy way to change access — block/unblock a player, or block/restore a store's login.

## 1. Users screen (`/admin/users`)

**Where the data comes from**: the `users` table (`lib/db/schema/users.ts`), populated by
`POST /api/auth/register` when a player registers via the `RegisterModal` on the home page —
Quick Register (auto-generated username/password) or Manual Register (username, password, invite
code). No new fields were added to registration; this screen simply surfaces everything already
captured for each registered player, joined with their wallet balances.

- **List** (`GET /api/admin/users`): paginated (20/page), searchable by username / nickname /
  email / phone, filterable by status. Columns: Username, Nickname, Email, Phone (+ Bound
  badge), KYC status, Gold Coin, Online SC, Invite Code, Registered date, Status.
- **Block / Unblock** (`PUT /api/admin/users`): toggles `users.status` between `active` and
  `blocked`.
  - Blocking a user immediately **revokes all of their active sessions**
    (`lib/user-service.ts#blockUser`) and their username/password can no longer sign in
    (`verifyUserLogin` now rejects any account that isn't `active`).
  - Unblocking restores login ability but does not restore the sessions that were revoked.
- Requires the `users.read` / `users.write` permissions (already part of the existing RBAC
  matrix — the `admin`, `finance`, and `support` roles already had `users.read`).

### Schema change

```
users.status  user_status enum ('active' | 'blocked')  NOT NULL DEFAULT 'active'
```

Migration: `drizzle/0006_warm_starfox.sql`.

## 2. Agents screen (`/admin/agents`)

**What an "agent" is here**: the root **store** account of the B2B agent panel hierarchy
(`agents` table, `type = 'store'` — see `docs/ADMIN_PANEL_AUDIT.md` §3). A store then creates its
own sale agents, sub agents, and store administrators from *its own* `/agent` panel — those are
unchanged. What was missing was a way for the super-admin to create the first-level store
accounts and see all of them in one place.

- **List** (`GET /api/admin/agents`): paginated (20/page), searchable by username / nickname /
  email. Columns: Username, Nickname, Email, Online Balance, Invite Code, Last Login, Created,
  Status.
- **Create** (`POST /api/admin/agents`): Username, Password, Nickname, Email, Remark. On success
  the username **and password are shown once** in a confirmation modal (same "copy now, it won't
  be shown again" convention as the player Quick Register flow) — the password is never stored or
  retrievable in plaintext afterwards. Creating a store also provisions its `store_settings` row
  so the store's own `/agent` panel (My Wallet → Basic Settings) works immediately.
- **Block Access / Restore Access** (`PUT /api/admin/agents`): toggles `agents.status` between
  `active` and `disabled` and revokes the store's active `agent_sessions` on block. The same
  route also supports resetting a store's password (`{ id, password }`) for support cases.
- Requires the new `agents.read` / `agents.write` permissions (added to the RBAC seed matrix in
  `scripts/seed.ts`; granted automatically to the `admin` role, and implicitly to `super_admin`).

## 3. Files touched

| File | Change |
|---|---|
| `lib/db/schema/enums.ts` | + `userStatusEnum` |
| `lib/db/schema/users.ts` | + `users.status` column |
| `lib/user-service.ts` | login rejects non-active accounts; + `blockUser`/`unblockUser`/`revokeUserSessions` |
| `drizzle/0006_warm_starfox.sql` | migration |
| `app/api/admin/users/route.ts` | new — list + block/unblock |
| `app/api/admin/agents/route.ts` | new — list + create + block/unblock/reset password |
| `components/admin/screens/UsersScreen.tsx` | new |
| `components/admin/screens/AgentsScreen.tsx` | new |
| `app/admin/(panel)/users/page.tsx`, `app/admin/(panel)/agents/page.tsx` | new routes |
| `components/admin/AdminShell.tsx` | + Users / Agents nav items (permission-gated) |
| `scripts/seed.ts` | + `agents` resource in the RBAC permission matrix |

## 4. Out of scope

- Sale agents, sub agents, store administrators, and members (players *of a store*) are managed
  from the `/agent` panel by the store itself and are unaffected by this change.
- No new fields were added to the player registration form — see §1 for why.
