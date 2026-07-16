# Digit Link — Agent/Store Admin Panel: Comprehensive Audit

> Source: 22 reference screenshots of the production Digit Link agent panel (`digitlink.mobi`,
> logged in as store agent **Deluxe001**), captured 2026-07-16, plus the saved page snapshot
> `demo.html` (Vue 3 + vxe-ui SPA). This document audits every screen, its fields and behaviors,
> maps each to the database entities required to power it, and closes with a gap analysis against
> the current `octanlink` codebase and the implementation plan.

---

## 1. What this panel is

The agent panel is the **B2B side** of Digit Link. Digit Link is a distribution/recharge hub that
sits on top of ~47 third-party sweepstakes game platforms (Orion Stars, Juwa, Fire Kirin, Vegas X,
Game Vault, …). A **store** (agent) resells game credits to **members** (players):

- The store keeps a **kiosk/POS account** on each game platform (Kiosk ID + POS credentials) and
  holds a **score** (credit) balance there.
- Members register through the store's **invite link** and deposit money → the store's POS loads
  the equivalent score into the member's game account, minus a **platform fee** and subject to a
  **score cost %**.
- Redemptions flow the opposite way and pass through a **Redemption Audit** queue.
- The store recruits **sale agents** (commissioned resellers, have a `ratio %`) and **sub agents**
  (sub-operators), and can create extra **store administrator** logins for staff.
- The store funds itself via **agent deposit / withdraw / transfer** (PayPal PYUSD, CashApp USDC,
  Bitcoin, Bank Card, ACH — $2 fee flagged on PYUSD/USDC), tracked in a wallet with **Online
  Balance** and **Tips**.
- **Promotions** (deposit-match bonuses) are configurable per store or per agent.

**UX shell**: fixed left sidebar (logo + nav), top bar (collapse toggle, notification bell, agent
username), and a **chip tab-bar** under the top bar — every opened section becomes a closable tab
(Dashboard is pinned). Green primary buttons for "Add", blue for search/confirm. Floating
customer-service bubble bottom-right (SaleSmartly chat widget). Light theme, `vxe-ui` tables.

### Sidebar navigation (order observed)

| # | Item | Sub-items |
|---|------|-----------|
| 1 | Dashboard | — |
| 2 | My Wallet | — |
| 3 | Account System ▾ | Game Setting · Sale Agent List · Member List · Sub Agent List · Kiosk List · Member Rewards |
| 4 | Promotion Config | — |
| 5 | Store Administrator | — |
| 6 | Transaction List | (tabs: Transaction List · Redemption Audit) |
| 7 | CS Config | — |
| 8 | Terms | — |
| 9 | Download posters | — |
| 10 | Tutorial | — |
| 11 | Doc Preview | — |
| 12 | Change Password | — |
| 13 | Logout | — |
| 14 | Customer Service (footer, opens chat) | — |

---

## 2. Screen-by-screen audit

### 2.1 Dashboard (screenshot 01)

- **Filters**: Date Range (datetime range, default rolling ~4 days `07/13 00:00 – 07/17 00:00`),
  fixed timezone chip **US Eastern (ET)**, `Search` + `Reset` buttons.
- **KPI cards row 1**: `Total In` ($, split Online / Kiosk), `Total Out` ($, split Online /
  Kiosk), `Gross Net` (In − Out), `Total Net` (highlighted card; sub-line `Platform Fee: $x`).
- **KPI cards row 2**: `Active Members` (count, "Played in range"), `Total Members` (count,
  green `+N today`).
- **Daily Trend**: line/area chart over the range (empty state: box illustration + "No data in
  selected range").
- **Top Games by Net**: table `# | Game | Total In | Total Net` (empty state "No data").

**DB needs**: member transactions aggregated by day + channel (online/kiosk) and by game
platform; members table with `createdAt` and last-played tracking.

### 2.2 My Wallet (screenshot 02)

- **Balance cards**: `Online Balance $104.81` (purple gradient), `Tips $0.00` (yellow, `Clear`
  action).
- **Identity block**: masked Email + `Change Email` button; **Invite Link**
  `https://digitlink.mobi?inviteCode=MC223717111J000I` with copy button; hint that members
  self-register through the link.
- **Basic settings form**: Store Name (0/20 chars), Daily Max Redeem (USD/day, e.g. 5000), Daily
  Max Withdraw (USD/day, 500), Phone Bind Reward SC (3), Store Logo upload (JPG/PNG/GIF/WEBP ≤
  2MB), `Save`.
- **Agent funding tabs**: `Agent Deposit` | `Agent Withdraw` | `Agent Transfer`.
  - Withdraw: method picker — PayPal PYUSD (fee up to $2), CashApp USDC (fee up to $2), Bitcoin,
    Bank Card, ACH Bank Transfer; Withdraw Amount; method-specific address field (e.g. PYUSD
    wallet address); `Confirm Withdraw`; first-time-address warning (email verification required).
- **Report block tabs**: `Report` | `Agent Deposit Log` | `Agent Withdraw Log` | `Agent Transfer
  Log` | `Agent Transfer Request Log`.
  - Report: date-range (max query 31 days) → daily rows `Start Time | End Time | Deposit |
    Deposit Fee | Deposit Orders | …` + Summary row; pagination `Total 4, 20/page, Go to`.

**DB needs**: agent wallet balances (online + tips), agent funding transactions (type, method,
amount, fee, address, status), store settings (name, limits, phone-bind reward, logo), invite
code on the store, daily aggregates for the report.

### 2.3 Account System → Game Setting (screenshot 03)

- Banner: "Game settings are managed by your agent. Contact your agent for changes." + purple
  strip "The following games can automatically add or subtract points. Simply configure your game
  store account."
- **Card grid (3-col) of ~47 game platforms**, each card: game icon + name, enable **toggle**,
  `Score: 1,500.00 · a month ago ⟳` (kiosk score balance + refresh), `Kiosk ID` (some) /
  `Store Account` input with copy, `View Details` button. Enabled cards have a green left border.
- Observed platforms (47): Golden Dragon, Dragon Cash, Fire Phoenix, Black Mamba, ORCA,
  Fortune2go, Magic City777, Diamond Dragon, Thunder7, Riversweeps, Fire Kirin, Orion Stars,
  Panda Master, Ultra Panda, V Blink, Game Vault, Galaxy, Juwa1.0, Juwa2.0, Cash Frenzy, Gold
  Star, Mega Spin, Cash Machine, Game Room, Golden Kirin, Vegas X, Noble, Milky Way, Mafia, Vegas
  Sweep, YOLO, Blue Dragon, Great Balls of Fire, Medusa777, Mr All In One, Jack 2 Win, Joker777,
  Glamour Spin, Golden Treasure, High Stakes, Egame, Fish Glory, Acebook, Game Time, Vegas Roll,
  Jackpot Carnival, MajikBonus.
- Enabled examples: Golden Dragon (Kiosk ID 4242852), Fire Phoenix (score 1,500, acct
  `Deluxe123`), Riversweeps (`Deluxe123`), Orion Stars (score 2,500, `Deluxe123`), Ultra Panda
  (1,500, `Deluxe123`), V Blink (1,500, `Deluxe123`), Juwa2.0 (2,000, `Deluxe333`).

### 2.4 Edit Platform Account modal (screenshot 04)

Fields: Select Platform (readonly), *Kiosk ID, *Pos Account, *Pos Password (masked), *Money Box,
Remark, Score Cost (%) (20.00), Min Deposit Amount (10), Min Redemption Amount (10), Redeem Daily
Limit (3000), Min. Deposit to Unlock (0.00). `Close`.

**DB needs**: `game_platforms` catalog + per-store `store_platform_accounts` (enabled, kioskId,
posAccount, posPassword, moneyBox, remark, scoreCostPct, minDeposit, minRedemption,
redeemDailyLimit, minDepositToUnlock, cached score + refreshedAt).

### 2.5 Sale Agent List (screenshot 05) + Add User (06) + Total Report (07)

- Filters: Search (Username/Nickname/Email), Code, Status (All/…), `Search/Reset/More▾`.
- Actions: green `+ Add`, blue `Total Report`; hint "Only direct sale agents' commission can be
  edited".
- Table: `Username | Ratio | Balance | Nickname | Email | Invite Link | …` (horizontal scroll).
- **Add User drawer (06)**: *Username (prefilled random e.g. `p97897`), *Password, *Nickname,
  Ratio (0.00 %), Kiosk (select), Cashier (select), Remark (0/300). Confirm/Cancel.
- **Report — All Sale Agents modal (07)**: Date Range (defaults to month-to-date) + sortable
  columns: `Sale Agent | Deposit | Depositors | Withdrawal | Withdrawers | TotalIn Score |
  TotalOut Score | Gross Net Score | Total Bonus Score | Game Deposit Fee | Platform Fee ❓`.

### 2.6 Member List (screenshot 08) + Add Member (09) + Edit Member (10)

- Filters: username, Phone, Sale Agent, `More▾`.
- Green `+ Add Member`.
- Table: `Username | Phone | Sale Agent | Online SC | Deposit ⇅ | Withdraw ⇅ | TotalNet ❓⇅ |
  TotalIn Score | TotalOut Score | …` — 18 members, numeric usernames (e.g. 5534453), badge `No
  SC Reward` on some, phone e.g. `+17852206399`, Online SC `$4.00`. Pagination `Total 18,
  10/page, pages 1-2, Go to`.
- Row operations (10): `Game Platform Binding`, `More ▾`; login history visible (time, IP,
  OS/browser e.g. `166.199.171.12 macOS - Safari (Mobile)`).
- **Add Member modal (09)**: *Username (prefilled `5293383`), *Password (prefilled `883219`),
  Remark. `Create`.
- **Edit Member modal (10)**: Remark only (`Edit Member[5534453]`). `Save`.

**DB needs**: `members` (username, password, phone, saleAgent, subAgent, onlineSc, flags,
remark), login history (time, ip, device), per-member aggregates, member↔platform bindings.

### 2.7 Promotion Config (screenshots 11, 12)

- List page (12): filters Promotion Type / Status; green `+ Add Promotion`; table `# | User |
  Promotion Type | Threshold | Reward | Condition | Operations`.
- **Add Promotion drawer (11)**:
  - *Promotion Type: `Promotion Game (100% Bonus)` ("The first game after the first deposit of
    the day") | `Double Game Bonus` | `Loyalty Drop`.
  - Assign to Users (default = Store Account; SALE/SUB agents for agent-specific promos).
  - Hidden from Users (multi-select of SUB/SALE accounts).
  - Bonus Percentage (preset/custom 1–200; `Bonus = min(deposit × bonusPercent%, Max Bonus)`).
  - Min Deposit (Threshold) 20.00 · *Max Bonus Amount 100.00.
  - Redemption Multiplier (2x default; `redemption condition = bonus × multiplier`).
  - Active Days (Sun–Sat checkboxes; empty = every day) · Timezone (Eastern ET).
  - Hidden from Players toggle · Online Only toggle (only online balance transfers trigger).
  - Status Enabled/Disabled · Remark. `Confirm/Cancel`.

### 2.8 Store Administrator (screenshot 13)

- `+ Add store administrator`; **modal**: *Username, *Password, Nickname, Email, Status
  (Active/Disabled). Table of staff logins.

### 2.9 Transaction List (screenshot 14) + Report modal (15)

- Tabs: **Transaction List** | **Redemption Audit**.
- Filters: Search (Member Username/Game PlayerId), Game Name (select), Transaction Type (All/…),
  Sale Agent, Sub Agent, Status, Time Range + ET, `Search/Reset`, `Collapse^`, bell toggle.
- **Summary strip**: `Store Balance Vary ❓ | TotalIn Score | TotalOut Score | Gross Net Score ❓ |
  Total Bonus Score ❓ | Game Deposit Fee | Platform Fee ❓` + `Report` button.
- Table: `User Detail | Create Time | Amount ⇅ | Online SC Changes | Store Balance Vary | Game &
  Product | …`.
- **Report modal (15)**: filters Sub Agent / Sale Agent / Member Username; **Daily Breakdown**
  (`Date | Store Balance Vary | TotalIn Score | TotalOut Score | Gross Net Score | Total Bonus
  Score | Game Deposit Fee | Platform Fee | TotalNet`) + **Game Breakdown** (same by Game).

### 2.10 Redemption Audit (screenshot 16)

- Filters: Player username / TX ID, Game Name, Sale Agent, Sub Agent, Status (default **Pending
  Review**), Submit Time range.
- Table: `Store Name | Submit Time | Player | Game Platform | Amount | Operations` (approve /
  reject). Pagination.

### 2.11 CS Config (screenshot 17)

- "Default Configuration" + `Enabled` badge; info: platform already provides 24-hour service.
- Fields: Enable toggle, Contact Phone toggle ("Show a clickable phone number in the player
  customer-service entry"), *Platform select (`Custom JS Widget`), JS URL (SaleSmartly project
  script). `Save`.

### 2.12 Terms (screenshot 18)

- Rich-text **Terms Editor**, per-locale tabs **EN | ES**; info "Players in your store see this
  (or fall back to upstream/global if you leave it empty)"; toolbar (text style, B/I/U, lists,
  indent, undo/redo, clear); `Save` + `Use inherited version`.
- Production copy (EN) includes: 21+ age & non-political-figure rule, one account per person,
  federal/state-law compliance, per-store deposit/withdraw limits, playthrough before redemption,
  24/7 operating hours, anti-fraud guidance.

### 2.13 Download posters (screenshot 19)

- Info: print & display; players scan QR to self-register.
- Sections **Portrait** (5 posters) and **Card** (3 designs), each with `Download` button;
  artwork embeds the store's QR/invite code.

### 2.14 Doc Preview (screenshot 20)

- Embedded PDF viewer: "DLink Agents System Manual" (2 pages; page nav, zoom, fullscreen).

### 2.15 Change Password (screenshot 21)

- Card: info "change your password regularly; at least 6 characters"; *Current, *New, *Confirm;
  `Confirm` + `Reset`; inline validation ("Please enter current password").

### 2.16 Customer Service (screenshot 22)

- Floating chat widget (SaleSmartly): message thread + composer ("Powered by SaleSmartly").
  Sidebar footer link opens it.

---

## 3. Data model required (target schema)

```
game_platforms            catalog of 47 games (name, slug, icon, sort, active)
agents                    store/sale/sub hierarchy: type, parent, store root, username,
                          password_hash, nickname, email, ratio %, invite_code, status,
                          online_balance, tips_balance, remark, last_login_at
store_settings            1:1 with store agent: store_name, daily_max_redeem,
                          daily_max_withdraw, phone_bind_reward_sc, logo_url
store_platform_accounts   store × platform: enabled, kiosk_id, pos_account, pos_password,
                          money_box, remark, score_cost_pct, min_deposit, min_redemption,
                          redeem_daily_limit, min_deposit_to_unlock, score, score_synced_at
store_administrators      staff logins per store: username, password_hash, nickname, email,
                          status
members                   players: username, password_hash, phone, store_id, sale_agent_id,
                          sub_agent_id, online_sc, sc_reward_enabled, remark, created_at
member_logins             login history: member_id, ip, user_agent/os, created_at
member_platform_accounts  member × platform binding: game_username, game_password
member_transactions       recharge/redeem/bonus rows: member, platform, type, amount,
                          online_sc_change, store_balance_vary, in_score, out_score,
                          bonus_score, game_deposit_fee, platform_fee, channel
                          (online|kiosk), status, created_at
agent_transactions        agent deposit/withdraw/transfer: agent, type, method
                          (paypal_pyusd|cashapp_usdc|bitcoin|bank_card|ach), amount, fee,
                          address, status, created_at
promotions                store/agent promos: type (promotion_game|double_game|loyalty_drop),
                          assign_to, hidden_from (jsonb), bonus_percent, min_deposit,
                          max_bonus, redemption_multiplier, active_days (jsonb), timezone,
                          hidden_from_players, online_only, status, remark
redemption_audits         pending review queue: member, platform, amount, tx ref, status
                          (pending|approved|rejected), reviewed_by, reviewed_at
kiosks                    physical kiosk list per store: name, code, status
cs_configs                per store: enabled, contact_phone_enabled, contact_phone,
                          platform, js_url
store_terms               per store × locale (en|es): rich-text content (null ⇒ inherit)
posters                   marketing assets: category (portrait|card), image_url, sort
```

Aggregations (dashboard, reports) are computed from `member_transactions` /
`agent_transactions` grouped by day / game / agent — no separate stats table needed at this
scale (indexes on `(store_id, created_at)` and `(store_id, platform_id, created_at)`).

---

## 4. Gap analysis vs current codebase

| Area | Current state (`octanlink`) | Gap |
|------|------------------------------|-----|
| Player-facing app | Fully built (game lobby, wallet, bonus, orders, legal, profile) | n/a — out of scope here |
| Admin auth | `admins` + sessions + RBAC + login/logout/me routes + login UI | ✅ Reusable as-is for panel auth |
| Admin dashboard | Placeholder card ("build out real admin panel sections here") | ❌ Entire panel to build |
| Agent hierarchy (store/sale/sub) | None | ❌ New tables + CRUD |
| Members management | Player `users` exist but are not tied to stores/agents | ❌ New `members` model (panel-scoped) |
| Game platform catalog | `gameProviders` (player-side GC/SC catalog from live API) | ❌ Separate agent-side platform + POS account model |
| Wallet / funding | Player wallets only | ❌ Agent wallet + funding tx + logs |
| Promotions | Player `bonuses` | ❌ Agent promotion config model |
| Transactions / reports | Player `transactions` | ❌ Member tx ledger + daily/game breakdown reports |
| Redemption audit | `redemptionReviews` (player-side) | ❌ Store-side audit queue |
| CS config / Terms / Posters | Player-side content tables | ❌ Store-scoped versions |
| UI kit for panel | Player-styled components (dark casino theme) | ❌ Light admin theme w/ sidebar + chip tabs + data tables |

## 5. Implementation plan (what is being built now)

1. **Schema** — new `lib/db/schema/agent.ts` (+ enums) with every table in §3; migration via
   `drizzle-kit`; indexes on hot query paths.
2. **Seed** — `scripts/seed-agent.ts`: 47 game platforms, demo store `Deluxe001`
   (password `deluxe123`), store settings, 7 enabled platform accounts matching the screenshots,
   18 demo members, sample transactions across the last 30 days, sample promotion, CS config,
   EN/ES terms, posters.
3. **API** — `app/api/agent/*` routes (session-cookie auth, store-scoped):
   login/logout/me/change-password, dashboard stats, wallet + funding + logs, game-settings
   CRUD + score refresh, sale agents CRUD + report, members CRUD + logins + bindings, sub
   agents, kiosks, promotions CRUD, store admins CRUD, transactions + report + summary,
   redemption audits + approve/reject, cs-config, terms, posters.
4. **UI** — `/admin` shell rebuilt to match screenshots: fixed sidebar, top bar, chip tab-bar
   (openable/closable tabs, Dashboard pinned), floating CS bubble; screens for every section in
   §2 (tables with sort/filter/pagination, drawers/modals for add/edit, KPI cards, empty
   states).

**Out of scope / mocked**: real POS integrations with the 47 game platforms (score refresh is
simulated), real payment rails (PYUSD/USDC/BTC/ACH withdrawals are recorded, not executed),
SaleSmartly chat (bubble UI only), PDF manual content.
