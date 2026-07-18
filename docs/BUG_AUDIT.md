# OctanLink — Comprehensive Bug Audit (User / Agent / Admin)

**Date:** 2026-07-19
**Method:** Live end-to-end testing against the running dev server (`localhost:3210`, Playwright browser automation) across all three roles, combined with three parallel full-codebase static reviews (one per role: player-facing, agent panel, admin panel). Every finding below is grounded in either a reproduced runtime failure or a specific file:line in the current tree.
**Scope:** `app/(shell)/**` + `app/api/auth/**` + `app/api/media/**` + `app/prod-api/**` (player), `app/agent/**` + `app/api/agent/**` (agent/store panel), `app/admin/**` + `app/api/admin/**` (super-admin back office), plus shared infra (`lib/db/schema/**`, `lib/jobs/index.ts`, `lib/provider-api.ts`, `scripts/*.ts`).

## Severity legend

| Severity | Meaning |
|---|---|
| 🔴 Critical | Security hole, data loss/corruption, or a core flow is completely broken/unusable |
| 🟠 High | Breaks a core flow in common cases, or a serious auth/authorization gap |
| 🟡 Medium | Real bug in an edge case, inconsistent/incorrect behavior |
| 🟢 Low | Cosmetic, UX polish, dead code |

## Summary

| Flow | 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low |
|---|---|---|---|---|
| User (player) | 2 | 3 | 9 | 3 |
| Agent panel | 4 | 4 | 5 | 8 |
| Admin panel | 2 | 4 | 6 | 5 |
| **Total** | **8** | **11** | **20** | **16** |

**55 findings total.** The single highest-value fix in the whole codebase: the player-facing app (the actual product) has zero wiring to its own, fully-built real backend — see User §🔴1 below.

**Status at a glance:** all **39** 🔴 Critical + 🟠 High + 🟡 Medium findings are ✅ **Fixed**. All **16** 🟢 Low findings are ⏳ **Pending** (unfixed, tracked below as originally reported). See [Fix status](#fix-status) for what changed on each fixed item.

## Fix status

All 8 🔴 Critical, 11 🟠 High, and 20 🟡 Medium findings were fixed and verified (typecheck + lint + full test suite green) on 2026-07-19 (Critical findings additionally got live Playwright re-testing). 🟢 Low findings are unfixed — tracked below as originally reported.

| # | Finding | Fix |
|---|---|---|
| User 🔴1 | Member auth flow fully mocked | Login/Register/Reset modals wired to real `/api/auth/*`; `lib/auth-context.tsx` now backed by a real `/api/auth/me` session check + `router.refresh()` so SSR data (wallet, etc.) updates immediately; added `POST /api/auth/reset-password` (didn't exist) to make Forgot Password functional |
| User 🔴2 | Postal-request / support-ticket forms discarded input | Added `POST /api/postal-requests` and `POST /api/support-tickets`; forms now call them for real |
| Agent 🔴1 | Stored XSS in Terms editor | Added missing `agent.type === 'store'` guard on the PUT route; added `lib/sanitize-html.ts` allowlist sanitizer, applied server-side on save and client-side on preview render |
| Agent 🔴2 | `clear_tips` double-credit race | Balance read moved inside the transaction with `SELECT ... FOR UPDATE` |
| Agent 🔴3 | Withdraw/transfer overdraft race | Same fix — balance check + row lock now inside the same transaction as the debit |
| Agent 🔴4 | Any store could mutate the global platform catalog | Write endpoints moved to `/api/admin/platforms` (new, permission-gated); `/api/agent/platforms` is now GET-only; added an admin "Platforms" screen so the catalog remains manageable |
| Admin 🔴1 | Admin login redirect race | Removed the `finally { setLoading(false) }` or `router.refresh()` combo that raced the pending navigation in `AdminLoginView.tsx`; single `router.replace('/admin')` on success, matching the working agent-login pattern |
| Admin 🔴2 | Provider delete — no blast-radius warning | DELETE is now two-phase: reports the real count of affected player accounts first, requires `?confirm=true` to actually delete; confirm dialog shows the real number |
| User 🟠3 | Referral signups never attributed | `registerUser` now accepts `inviteCode`, resolves the referrer by it, sets `users.referred_by_user_id`, and inserts a `referral_commissions` row so the referrer's Share & Earn dashboard reflects the signup |
| User 🟠4 | `bonus.daily-reset` / `referral.settle` empty stubs | Implemented both: daily-reset flips matured `claimed` bonus claims back to `claimable` and clears `next_available_at`; referral.settle matures `pending` commissions to `claimed` 24h after signup |
| User 🟠5 | Payment result page fabricated status from URL text | `resolveStatus` now queries `orders` (by `orderNo`) then `transactions` (by `id`) for the real status; unmatched references show a new honest "Payment Not Found" state instead of defaulting to success |
| Agent 🟠5 | Role checks missing on member/promotion/redemption-audit mutations | Added the same `agent.type !== 'store'` guard used elsewhere to `members` PUT, `promotions` POST/PUT/DELETE, and `redemption-audits` PUT |
| Agent 🟠6 | Approving a redemption never settled it | PUT now runs in a transaction: locks the member row, debits `members.online_sc`, and inserts a `member_transactions` (`redeem`) row, mirroring the wallet withdraw/transfer lock pattern |
| Agent 🟠7 | Transaction List hard-capped at 20 rows, no pagination UI | `TransactionScreen` now sends `page`/`pageSize` and renders the existing `Pagination` component (same pattern as `MemberScreen`) |
| Agent 🟠8 | Store Administrator logins were a dead end | `verifyAgentLogin` now also checks `store_administrators`; a successful admin login resolves to their store's agent id (no `agent_sessions` schema change needed) so they get that store's full access |
| Admin 🟠3 | `admin_audit_logs` never written to | Added `lib/audit-log.ts` (`logAdminAction`); wired into admin login and provider create/update/delete |
| Admin 🟠4 | "Active" toggle didn't hide a provider from players | `getProviders` (`lib/data.ts`) and the `/prod-api/member/game/available-providers` mirror now filter on `status = 1` |
| Admin 🟠5 | No rate limiting/lockout on admin login | Added `lib/rate-limit.ts` (in-memory, per email+IP): 5 failed attempts locks out for 15 minutes |
| Admin 🟠6 | Non-production seeds hit hardcoded admin password silently | `seedAdminPassword()` now always prints a warning when falling back to the dev password, for any `NODE_ENV` other than `production` |
| User 🟡6 | `providers.sync` clobbered cross-catalog name collisions | Sync now groups API entries by normalized name, detects a name present in both SC and GC, keeps whichever mapping the row already has (sticky — no more flip-flopping every 6h), and reports `crossTypeConflicts` instead of silently dropping one mapping |
| User 🟡7 | `/orders`, `/redemption-reviews`, `/share-activity` didn't enforce their auth gate | Added `components/shell/RequireAuth.tsx`; all three pages now show a sign-in prompt instead of a silently empty list for anonymous visitors |
| User 🟡8 | OTP hashed with unsalted SHA-256 | Switched to HMAC-SHA256 keyed with `OTP_HASH_SECRET` (new env var, documented in `.env.example`) |
| User 🟡9 | `verifyOtp` check-then-update race | Read + attempts-increment + consume now run inside one transaction with `SELECT ... FOR UPDATE` |
| User 🟡10 | `registerUser` duplicate-username race → raw 500 | Insert is now wrapped in try/catch; a Postgres unique-violation (23505) is converted to the intended `UserConflictError` (409) |
| User 🟡11 | OTP `destination` accepted any string | Added `isValidOtpDestination` (email or E.164-ish phone format) — `requestOtp` rejects anything else |
| User 🟡12 | `getOrders()` hardcoded `player_2481` | Now looks up the real username for the current session's user |
| User 🟡13 | `otp.purge` / `sessions.purge` empty stubs | Implemented both: deletes expired/consumed `otp_codes`, and expired-or-revoked `sessions` + `admin_sessions` |
| User 🟡14 | `startWorker` job loop had no per-job try/catch | Each job handler call is now wrapped in try/catch that logs `job "<name>" failed` before rethrowing (pg-boss still gets to apply its own retry/failure tracking) |
| Agent 🟡9 | Withdraw accepted a missing/invalid `method` silently | Added the same `if (!method) return 400` guard deposit already had |
| Agent 🟡10 | Wallet settings PUT could write `NaN` | Switched to the `Number.isFinite` guard pattern already used by `game-settings` |
| Agent 🟡11 | Promotion `assignAgentId` not validated to the same store | POST now verifies the assignee belongs to `agent.storeId` before accepting it |
| Agent 🟡12 | Six screens had no try/catch on API calls | Added try/catch + inline error banners to `KioskScreen`, `PromotionScreen` (create), `CsConfigScreen`, `TermsScreen`, `MemberRewardsScreen`, `MemberScreen` (saveEdit) |
| Agent 🟡13 | Sale/sub agent passwords could never be reset | `agents` PUT now accepts `password` (6+ chars) and hashes it, same as the `store-admins` route |
| Admin 🟡7 | Provider POST/PUT mislabeled every DB error as 409 | Added `lib/db-errors.ts#isUniqueViolation`; only a real unique-violation (23505) returns 409 now, anything else is logged and returns 500 |
| Admin 🟡8 | `ProvidersScreen` initial load had no `.catch` | Now redirects to `/admin/login` on a failed load, matching `AdminShell`'s own `/api/admin/me` handling |
| Admin 🟡9 | Provider "Active" toggle was optimistic with no rollback | On a failed PUT, the toggle now reverts to its prior state and shows an alert |
| Admin 🟡10 | Provider delete had no error handling | Already fixed as part of the Admin 🔴2 two-phase-delete rework — `remove()` now has try/catch with a user-facing alert |
| Admin 🟡11 | `removeRole`/`suspendAdmin`/`reactivateAdmin`/`setPassword` had no authz | Added an optional `actorAdminId` param to each; when provided, a non-super actor now needs `admins.manage` and can't act on an admin at/above their own role level (mirrors `assignRole`'s `guardRoleGrant`) |
| Admin 🟡12 | "Change Password" linked to the public, unauthenticated Forgot Password stub | Added a real authenticated flow: `POST /api/admin/change-password` (verifies current password, calls `setPassword`) + a `/admin/change-password` screen; sidebar now points there instead |

---

## 1. User (Player) Flow

*(Live-tested: opened Login/Register/Forgot-Password modals on `/game` and confirmed none submit to the backend. Full static audit additionally covered `app/api/auth/**`, `app/api/media/**`, `app/prod-api/**`, `lib/otp.ts`, `lib/user-service.ts`, `lib/jobs/index.ts`, `lib/provider-api.ts`, `scripts/fetch-providers.ts`, `scripts/sync-platforms.ts`.)*

### 🔴 Critical — ✅ Fixed (see [Fix status](#fix-status))

1. **The entire member auth flow is a non-functional client-only UI mock — reproduced live.**
   - [`components/auth/LoginModal.tsx`](../components/auth/LoginModal.tsx) — the Username, Password, Phone Number, and Verification Code `IconInput`s have **no `value`/`onChange` wired at all**. `submit()` (line 19-22) just calls `login()` and closes the modal — it never reads the typed credentials and never calls `/api/auth/login` or `/api/auth/otp/verify`. The Login button "succeeds" no matter what you type, including empty fields, and "Send code" (line 88-90) does nothing.
   - [`components/auth/RegisterModal.tsx`](../components/auth/RegisterModal.tsx) — same pattern; Username/Password/Confirm Password/Invite Code inputs are all unwired; `submit()` (line 18-21) calls the same fake `login()`. Neither "Quick Register" nor "Manual Register" ever calls `/api/auth/register`.
   - [`components/auth/ResetPasswordModal.tsx`](../components/auth/ResetPasswordModal.tsx) — the phone-number input is unwired; clicking "Retrieve" just flips local state to a fake success message. No password-reset endpoint exists on the backend either.
   - [`lib/auth-context.tsx`](../lib/auth-context.tsx) — `AuthProvider.login()` (line 43) is `() => setIsAuthenticated(true)`, a pure client-side flag flip to a hardcoded `DEMO_USER` (line 25-33, `player_2481`). No session cookie is ever set.
   - **Failure scenario:** clicking Login/Register instantly shows the header/profile UI as "authenticated," but server components (`lib/data.ts#currentUserId`, which reads the real `session` cookie) still see the visitor as anonymous — wallet/orders/bonus/referral data stay empty even though the UI claims you're logged in. A fully-built real backend already exists for this (bcrypt password hashing, a session table with revocation, rate-limited/hashed OTP — `app/api/auth/login`, `/register`, `/otp/request`, `/otp/verify`, `/me`, `/logout`) and is simply never called. Confirmed via grep that **zero files under `app/(shell)/**` make any `fetch()` call at all** — the whole player-facing app runs on fake local state, never touching the database. This is the single largest gap in the codebase: the agent and admin panels are real, wired applications; the actual product (the player-facing app) is still a static mock.
2. **Postal-request (sweepstakes AMOE) and support-ticket submissions are silently discarded — never persisted.** [`components/orders/PostalRequestForm.tsx:44`](../components/orders/PostalRequestForm.tsx) and [`components/legal/HelpCenterForm.tsx:61`](../components/legal/HelpCenterForm.tsx) both just do `onClick={() => setSubmitted(true)}` with no `fetch()` call — and no `app/api/postal*` or `app/api/support*` route exists at all, despite dedicated `postal_requests`/`support_tickets` tables built specifically for this. A user submitting a "No Purchase Necessary" postal entry code, or a support ticket, sees a fake "Request Submitted" success message while nothing is written to the DB and no admin ever sees it. For a sweepstakes platform, a non-functional Alternate Method of Entry is a legal/compliance-relevant bug, not just a UX one.

### 🟠 High — ✅ Fixed (see [Fix status](#fix-status))

3. **Referral signups can never be attributed to a referrer.** [`lib/user-service.ts:24-59`](../lib/user-service.ts) (`registerUser`) and [`app/api/auth/register/route.ts:17-23`](../app/api/auth/register/route.ts) never read/accept an invite code, and never set `users.referred_by_user_id` or insert a `referral_commissions` row — even though the schema and the Register UI's "Invite Code (Optional)" field both exist for exactly this. No matter how many people sign up via a friend's invite link, the referrer's Share & Earn dashboard never shows a payout.
4. **`bonus.daily-reset` and `referral.settle` background jobs are empty TODO stubs.** [`lib/jobs/index.ts:29-35`](../lib/jobs/index.ts) and `:50-56`. `user_bonus_claims.status`/`next_available_at` is never reset (a claimed recurring bonus can never be reclaimed, ever), and `referral_commissions.status` never transitions `pending → claimable` (referral earnings are permanently stuck pending). Bonus Center and Share & Earn are effectively one-shot/broken once real usage starts.
5. **Payment result page fabricates status from the URL text instead of checking the actual order.** [`app/payment/[code]/page.tsx:7-11`](../app/payment/%5Bcode%5D/page.tsx) (`resolveStatus`) does a substring check for `"fail"`/`"pending"` in the route param and defaults everything else to `'success'` — it never queries `orders`/`transactions` at all. Navigating to `/payment/anything123` shows "Payment Successful" regardless of whether that payment exists or really succeeded — a misleading confirmation on a money-movement page.

### 🟡 Medium — ✅ Fixed (see [Fix status](#fix-status))

6. `providers.sync`/`syncGamePlatforms` silently clobbers cross-type providers sharing a `providerCode` — [`lib/provider-api.ts:86-89`](../lib/provider-api.ts) de-dupes GC/SC by `providerCode` alone ("SC wins"), and since `game_platforms.name` is DB-unique, entries like "Fire Phoenix"/"Dragon Cash" that exist in both catalogs permanently lose their GC mapping (`externalId`/`providerType`) on every 6-hourly sync. Affects the agent/admin `game_platforms` catalog, not the public `/game` page.
7. `/orders`, `/redemption-reviews`, `/share-activity` don't enforce their documented "Auth: Yes" gate — no `middleware.ts` exists anywhere, and the pages just render an empty list for anonymous visitors (`lib/data.ts:116-117,141-142,208`) with no redirect or "please sign in" messaging.
8. OTP codes are hashed with unsalted SHA-256 over a 6-digit (1,000,000-value) space — [`lib/otp.ts:13-15`](../lib/otp.ts) — trivially reversible via a precomputed table if the `otp_codes` table is ever exposed, defeating the point of hashing "at rest."
9. `verifyOtp` has a check-then-update race with no transaction/row lock — [`lib/otp.ts:56-80`](../lib/otp.ts) — two concurrent requests with the same valid code can both pass the `consumed = false` check before either UPDATE commits, allowing the same code to redeem twice.
10. `registerUser` has a TOCTOU race on duplicate usernames that surfaces as a raw 500 instead of the intended 409 — [`lib/user-service.ts:42-56`](../lib/user-service.ts), [`app/api/auth/register/route.ts:43-48`](../app/api/auth/register/route.ts) only catches `UserConflictError`, not the raw Postgres unique-violation a double-submit race produces.
11. OTP `destination` accepts any non-empty string with no phone/email format validation — [`app/api/auth/otp/request/route.ts:13`](../app/api/auth/otp/request/route.ts), [`lib/otp.ts:22-45`](../lib/otp.ts) — allows spamming `otp_codes` rows with garbage destinations.
12. `getOrders()` hardcodes `username: 'player_2481'` (the seed demo account) for every caller — [`lib/data.ts:123-136`](../lib/data.ts). Currently dead code (no route calls it — `orders/page.tsx` uses `getTransactions()` instead), but a live bug the moment it's wired up.
13. `otp.purge` and `sessions.purge` background jobs are empty stubs — [`lib/jobs/index.ts:36-49`](../lib/jobs/index.ts) — expired rows in `otp_codes`/`sessions` (a security-sensitive table) are never deleted, only filtered at query time; unbounded table growth.
14. `startWorker`'s job loop has no per-job try/catch — [`lib/jobs/index.ts:96-103`](../lib/jobs/index.ts) — a thrown error (e.g. `syncGamePlatforms()` hitting a DB error with the JSON fallback also failing) has no application-level logging of which job/queue failed, only pg-boss's own generic error handler.

### 🟢 Low — ⏳ Pending

15. `verifyUserLogin` leaks username existence via a timing side-channel — [`lib/user-service.ts:18-22`](../lib/user-service.ts) — returns immediately for a nonexistent username but runs a ~10-round bcrypt compare for a wrong password, letting an attacker enumerate valid usernames by response time.
16. `content_pages` (the CMS table backing Terms/Privacy/etc., admin-editable per the RBAC seed) is completely disconnected from the actual legal pages, which hardcode their copy in JSX — [`scripts/seed.ts:307-326`](../scripts/seed.ts) seeds rows whose body is literally `"> TODO: migrate the real copy..."`. Any admin edit via the CMS would never appear on the live site.
17. `scripts/fetch-providers.ts` (replacing the deleted `.mjs` version) now requires DB connectivity to resolve the provider API base URL, a new failure mode the old, pure-env-var script didn't have — intentional per the admin-configurable design, but worth knowing operationally.

### Note — not a code bug, but a live QA hazard

Opening the player Login modal, the Username/Password fields were pre-filled with a real password (the agent demo login `Deluxe001`/`deluxe123`) via the browser's saved-password autofill, and the same value bled into the "Phone Number" field after switching tabs. Verified this is **not** hardcoded in the component (no default `value` exists) — it's because the inputs have no `type`/`name`/`autoComplete` attributes to hint the browser away from cross-matching credentials saved for a different form on the same origin. Worth adding those attributes once the modal is wired up for real (finding #1), so a browser never offers to autofill agent/admin credentials into the player-facing login form.

---

## 2. Agent Panel Flow

*(Full static audit — `app/api/agent/**`, `app/agent/**`, `components/agent/**`. Live-tested: login → dashboard works end-to-end, real API calls confirmed via network trace.)*

### 🔴 Critical — ✅ Fixed (see [Fix status](#fix-status))

1. **Stored XSS in the Terms editor, reachable by the lowest-privilege agent** — [`app/api/agent/terms/route.ts:26-47`](../app/api/agent/terms/route.ts) (PUT) has no `agent.type !== 'store'` guard (every other mutating route in this slice has one), so a `sub`-type agent can overwrite `store_terms.content`. [`components/agent/RichTextEditor.tsx`](../components/agent/RichTextEditor.tsx) captures raw `contentEditable` HTML with zero sanitization and sends it verbatim; [`components/agent/screens/TermsScreen.tsx:99-102`](../components/agent/screens/TermsScreen.tsx) renders it back via `dangerouslySetInnerHTML`. A malicious `sub` agent can inject `<img onerror=...>` that fires an authenticated same-origin `fetch` (e.g. to `/api/agent/wallet` transfer) the moment the store owner opens Terms → Preview.
2. **`clear_tips` race condition double-credits the store balance** — [`app/api/agent/wallet/route.ts:140-165`](../app/api/agent/wallet/route.ts). `tips` is read outside the transaction, `onlineBalance` is incremented by that stale value, and `tipsBalance` is unconditionally set to `0` rather than decremented. Two concurrent "Clear Tips" clicks (double-click / two tabs) both credit the full amount — $50 in tips becomes +$100 in online balance.
3. **Withdraw/Transfer balance check is a classic TOCTOU race → overdraft** — [`app/api/agent/wallet/route.ts:205-256`](../app/api/agent/wallet/route.ts) (withdraw) and `:259-294` (transfer). Balance is read once outside any transaction/lock; two concurrent requests can both pass the `balance < amount` check against the same stale read, then both apply an atomic decrement — net result, the balance goes negative even though the check was supposed to prevent it.
4. **Any store-tenant can mutate the global game-platform catalog** — [`app/api/agent/platforms/route.ts:34-129`](../app/api/agent/platforms/route.ts) (POST/PUT/DELETE) only checks `agent.type === 'store'`, not any notion of platform-super-admin, even though `game_platforms` is an explicitly shared, cross-tenant catalog. Any store owner can rename or delete a platform (e.g. "Orion Stars") that every other store currently has configured.

### 🟠 High — ✅ Fixed (see [Fix status](#fix-status))

5. **Role checks missing on member/promotion/redemption-audit mutations** — [`app/api/agent/members/route.ts:67-115`](../app/api/agent/members/route.ts), [`.../promotions/route.ts:43-120`](../app/api/agent/promotions/route.ts), [`.../redemption-audits/route.ts:45-67`](../app/api/agent/redemption-audits/route.ts) only scope by `storeId`, not by agent type — unlike `agents`/`kiosks`/`store-admins`/`platforms`/`wallet`/`game-settings`, which all reject non-`'store'` callers. A `sub` agent can edit/disable any member, create/delete any promotion, and approve/reject any redemption in the store.
6. **Approving a redemption never actually settles it** — [`app/api/agent/redemption-audits/route.ts:45-67`](../app/api/agent/redemption-audits/route.ts) only flips `status`; it never writes a `member_transactions` row or adjusts any balance. The audit queue shows "approved" but no money/score ever moves and there's no accounting trail.
7. **Transaction List is hard-capped at 20 rows, no pagination control exists** — [`components/agent/screens/TransactionScreen.tsx:63-72`](../components/agent/screens/TransactionScreen.tsx) never sends `page`/`pageSize` and renders no pagination UI, while the API (`app/api/agent/transactions/route.ts:23`) defaults `pageSize` to 20. Any store with >20 transactions can never see older history through the panel.
8. **Store Administrator logins are a dead end — they can never actually sign in** — [`app/api/agent/store-admins/route.ts:32-62`](../app/api/agent/store-admins/route.ts) creates rows in `store_administrators` with a hashed password, but [`lib/agent-auth.ts:64-75`](../lib/agent-auth.ts) (`verifyAgentLogin`, used by the only agent login route) only ever queries the `agents` table. No route anywhere authenticates against `store_administrators`.

### 🟡 Medium — ✅ Fixed (see [Fix status](#fix-status))

9. Withdraw accepts a missing/invalid `method` silently as `null` — deposit validates this, withdraw doesn't (`app/api/agent/wallet/route.ts:230-256`).
10. Wallet settings PUT skips the `Number.isFinite` guard used elsewhere — `{"dailyMaxRedeem":"abc"}` writes literal `NaN` into a numeric column (`app/api/agent/wallet/route.ts:101-113`, contrast with `game-settings/route.ts:69-77`).
11. Promotion `assignAgentId` isn't validated to belong to the same store — any valid agent UUID from another store is accepted and its username leaks into this store's promotion list (`app/api/agent/promotions/route.ts:61`).
12. Six screens call the API with no try/catch, so a server rejection is an unhandled promise rejection with zero user feedback: `KioskScreen.tsx`, `PromotionScreen.tsx` (create), `CsConfigScreen.tsx`, `TermsScreen.tsx`, `MemberRewardsScreen.tsx`, `MemberScreen.tsx` (saveEdit).
13. Sale/sub agent passwords can never be reset — the agents PUT route has no `passwordHash` handling, unlike the store-admins route (`app/api/agent/agents/route.ts:117-140`).

### 🟢 Low — ⏳ Pending

14. Role-gated nav items/buttons are shown to agent types that will just get 403'd (`AgentShell.tsx:174-223`, `PlatformCatalogScreen.tsx:176-221`).
15. Delete-promotion has no confirmation dialog, unlike the equivalent platform-deactivate action (`PromotionScreen.tsx:80-83`).
16. Notices "View" button has no `onClick` at all (`NoticesScreen.tsx:64`).
17. Wallet "Report" tab ignores the date-range filter entirely and hardcodes a trailing-4-day window (`app/api/agent/wallet/route.ts:63-81`), contradicting the documented 31-day range spec.
18. "Pos Password" is marked required (red asterisk) in the UI but is actually optional server-side (`GameSettingScreen.tsx:230` vs `saveDetail` lines 115-122).
19. "Change Email" 2FA is fully decorative — "Send Code" only starts a local timer, "Verify" only checks the code is 6 digits long, no server-side validation exists (`WalletScreen.tsx:733-791`).
20. "Download Poster" generates a placeholder gradient canvas with literal text, not real artwork or a scannable QR code (`PostersScreen.tsx`).
21. The 6-hourly platform-sync cron can silently overwrite manual edits agents make via the panel — no reconciliation between `scripts/sync-platforms.ts` and manual PUTs (`app/api/agent/platforms/route.ts`).

---

## 3. Admin Panel Flow

*(Full static audit — `app/api/admin/**`, `app/admin/**`, `components/admin/**`, RBAC layer. Live-tested: login is broken end-to-end — see #1 below, reproduced twice.)*

### 🔴 Critical — ✅ Fixed (see [Fix status](#fix-status))

1. **Admin login succeeds on the server but never navigates the user into the panel** — reproduced live: `POST /api/admin/login` with valid credentials (`admin@octanlink.com` / seeded password) returns `200 OK` and correctly sets the session cookie (confirmed: navigating directly to `/admin/dashboard` afterward works fine), but the login page itself never redirects — it re-fetches `/admin/login` via RSC and sits there looking like the login failed. Root cause in [`components/admin/AdminLoginView.tsx:19-47`](../components/admin/AdminLoginView.tsx): `handleSubmit` calls `router.push('/admin'); router.refresh();` and then unconditionally runs `finally { setLoading(false); }`. Because the component does `if (loading) return <BrandLoader />;` (line 49), flipping `loading` back to `false` remounts the login form mid-navigation and the `router.refresh()` call ends up refreshing the still-current `/admin/login` route instead of the target — the push is effectively cancelled. Compare with the agent panel's equivalent (`AgentLoginView.tsx:57`), which uses a single `router.replace('/agent')` and deliberately never resets `busy` on the success path — that one works correctly. **Every real admin trying to log in through the UI is blocked** (a page refresh onto `/admin/dashboard` is the only workaround, which a normal user won't know to try).
2. **Deleting a provider is instant, irreversible, and destroys player data with no warning of the blast radius** — [`app/api/admin/providers/route.ts:127-138`](../app/api/admin/providers/route.ts) (DELETE) cascades (FK `onDelete: 'cascade'`) to permanently delete `provider_deposit_tiers` and, critically, every player's `user_provider_accounts` row (their game credentials/balance) for that provider. The confirm dialog ([`ProvidersScreen.tsx:204-210`](../components/admin/screens/ProvidersScreen.tsx)) is generic boilerplate text with no count of affected accounts, there's no soft-delete, and (per finding #3 below) no audit log records who did it.

### 🟠 High — ✅ Fixed (see [Fix status](#fix-status))

3. **The `admin_audit_logs` table is never written to, anywhere** — confirmed via repo-wide search, the table exists in [`lib/db/schema/rbac.ts:127-136`](../lib/db/schema/rbac.ts) but nothing ever inserts into it; `lib/jobs/index.ts:64-70`'s `audit.archive` job is a TODO stub archiving a permanently-empty table. A back office built entirely around RBAC currently has zero audit trail for logins, provider deletes, or any other admin action.
4. **The "Active" toggle on a provider doesn't actually hide it from players** — [`lib/data.ts:44-49`](../lib/data.ts) and [`app/prod-api/member/game/available-providers/route.ts:20-32`](../app/prod-api/member/game/available-providers/route.ts) both query `game_providers` with no `status = 1` filter. Toggling a provider off in the admin panel ([`ProvidersScreen.tsx:196-202`](../components/admin/screens/ProvidersScreen.tsx)) updates the DB column but players still see it in the game lobby and in the public API mirror — only a hard `DELETE` (finding #2) actually removes it, which is the worst possible tradeoff.
5. **No rate limiting or lockout on admin login** — confirmed via repo-wide search, nothing outside the OTP code path touches rate-limit/lockout logic. `/api/admin/login` — the single gate protecting the entire back office — allows unlimited password guesses.
6. **Non-`production` deployments seed a hardcoded admin password with no warning** — [`scripts/seed.ts:29-38`](../scripts/seed.ts) only takes the "warn and use `SEED_ADMIN_PASSWORD`" path when `NODE_ENV === 'production'` exactly; any other value (staging, unset, typo) silently seeds `superadmin@octanlink.com` / `admin1234` with no warning printed at all. Combined with #5, this is a realistic full-compromise path on any non-strictly-`"production"` deployment.

### 🟡 Medium — ✅ Fixed (see [Fix status](#fix-status))

7. POST/PUT on `/api/admin/providers` mislabel every DB error as a 409 conflict (`app/api/admin/providers/route.ts:62-88,118-124`), hiding real 500-level failures.
8. `ProvidersScreen.tsx`'s initial data load has no `.catch` — a 401/403 (expired session) or network failure is an unhandled rejection that silently renders an empty "No Data" state instead of redirecting to login like `AdminShell.tsx` does for its own `/api/admin/me` call.
9. The provider "Active" toggle is optimistic with no rollback — if the PUT fails, the switch stays visually flipped even though nothing changed in the DB (compounds finding #4).
10. Provider delete has no error handling — a failed DELETE (403/404) leaves the row silently in the table with no feedback.
11. `removeRole`/`suspendAdmin`/`reactivateAdmin`/`setPassword` in `lib/admin-service.ts` take no actor parameter and perform zero authorization checks, unlike `assignRole` — currently unreachable (no route calls them yet), but a latent privilege-escalation trap for whoever wires up the next admin-management route.
12. Admin "Change Password" in the sidebar links to the public, unauthenticated Forgot Password page — which is itself just a `setTimeout` stub (no real password-reset backend exists at all) (`AdminShell.tsx:128`, `AdminForgotPasswordView.tsx:15-28`).

### 🟢 Low — ⏳ Pending

13. `admin_sessions.ip_address` column exists but is never populated (`lib/admin-service.ts` `createAdminSession`).
14. `sessions.purge` / expired-session cleanup job is a stub — expired rows are correctly rejected at auth time but never deleted, so `sessions`/`admin_sessions` grow unbounded.
15. The entire `admin_invitations` table + `invited` status enum value is dead code — nothing ever inserts, reads, or accepts an invitation.
16. Three admin routes import RBAC helpers from `@/lib/rbac-core` directly instead of the `server-only`-guarded `@/lib/rbac.ts` wrapper the rest of the app uses — not a live bug, but defeats a build-time safety net.
17. Provider PUT silently no-ops on attempts to clear a text field to empty, and silently coerces invalid numeric input (e.g. `"abc"`) to `0` instead of rejecting it (`app/api/admin/providers/route.ts:100-116`).

---

## Cross-cutting observations

- **Duplicate fetches on page load**: both `/api/admin/me` and `/api/agent/me` (and `/api/agent/dashboard`) fire twice on initial mount, confirmed via network trace. Likely React 18 Strict Mode double-invocation in dev rather than a production bug — worth a quick check that this doesn't also happen in a production build (`next build && next start`), since a duplicate dashboard query on every load is wasted DB load at scale.
- **Architectural split**: the agent and admin panels are real, database-backed applications with genuine (if buggy) business logic. The player-facing app is, as of this audit, still a fully static UI clone with a fake in-memory user — despite a complete, real backend already existing for it (`app/api/auth/**`). Wiring the player UI up to that backend is the single highest-value fix available in this codebase.
