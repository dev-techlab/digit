# Agent Panel — UI Button & Path Map

> Complete inventory of every clickable control in the agent panel: where it lives, its label,
> what it does, and which API path it hits. Use this list while capturing screenshots — every
> row marked ✅ is implemented and clickable; rows marked 🔶 are intentional placeholders
> (visual-only, third-party integration out of scope). File references point at the component
> that renders the control.
>
> Login: `Deluxe001 / deluxe123` at `/admin/login`. Panel: `/admin`.

## Global shell — `components/agent/AgentPanel.tsx`

| Button / control | Action | API path | Status |
|---|---|---|---|
| Hamburger (top-left) | <1024px: opens sidebar drawer · ≥1024px: collapses sidebar to icons | — | ✅ |
| Sidebar backdrop / ✕ (mobile) | Closes the drawer | — | ✅ |
| Bell 🔔 | Opens notifications dropdown ("No messages") | — | ✅ |
| Bell → View More › | Opens the **My Notices** tab | `GET /api/agent/notices` | ✅ |
| Sidebar → Dashboard | Opens Dashboard tab | `GET /api/agent/dashboard` | ✅ |
| Sidebar → My Wallet | Opens My Wallet tab | `GET /api/agent/wallet` | ✅ |
| Sidebar → Account System | Expands/collapses submenu | — | ✅ |
| Sidebar → Game Setting | Opens Game Setting tab | `GET /api/agent/game-settings` | ✅ |
| Sidebar → Sale Agent List | Opens Sale Agent List tab | `GET /api/agent/agents?type=sale` | ✅ |
| Sidebar → Member List | Opens Member List tab | `GET /api/agent/members` | ✅ |
| Sidebar → Sub Agent List | Opens Sub Agent List tab | `GET /api/agent/agents?type=sub` | ✅ |
| Sidebar → Kiosk List | Opens Kiosk List tab | `GET /api/agent/kiosks` | ✅ |
| Sidebar → Member Rewards | Opens Member Rewards tab | `GET /api/agent/wallet` | ✅ |
| Sidebar → Promotion Config | Opens Promotion Config tab | `GET /api/agent/promotions` | ✅ |
| Sidebar → Store Administrator | Opens Store Administrator tab | `GET /api/agent/store-admins` | ✅ |
| Sidebar → Transaction List | Opens Transaction List tab | `GET /api/agent/transactions` | ✅ |
| Sidebar → CS Config | Opens CS Config tab | `GET /api/agent/cs-config` | ✅ |
| Sidebar → Terms | Opens Terms tab | `GET /api/agent/terms` | ✅ |
| Sidebar → Download posters | Opens posters tab | `GET /api/agent/posters` | ✅ |
| Sidebar → Tutorial | Opens Tutorial tab (video guide grid) | — | ✅ |
| Sidebar → Doc Preview | Opens Doc Preview tab (manual viewer) | — | ✅ |
| Sidebar → Change Password | Opens Change Password tab | `POST /api/agent/change-password` | ✅ |
| Sidebar → Logout | Ends session, redirects to `/admin/login` | `POST /api/agent/logout` | ✅ |
| Sidebar → Customer Service | Opens chat widget panel | — | ✅ (placeholder chat) |
| Tab chip (click) | Switches to that open tab | — | ✅ |
| Tab chip ✕ | Closes tab (Dashboard pinned) | — | ✅ |
| Floating green bubble | Opens CS chat widget | — | ✅ |
| Chat: ‹ back / ✕ | Closes chat | — | ✅ |
| Chat: + / 😊 / Send | Visual only (no live chat backend) | — | 🔶 |

## Login — `components/agent/AgentLoginView.tsx` (`/admin/login`)

| Button | Action | API path | Status |
|---|---|---|---|
| Sign In | Authenticates, sets `agent_session` cookie, → `/admin` | `POST /api/agent/login` | ✅ |

## Dashboard — `screens/DashboardScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| Date range inputs | Sets from/to for stats | — | ✅ |
| Search | Reloads KPIs/trend/top games for range | `GET /api/agent/dashboard?from&to` | ✅ |
| Reset | Restores default 4-day range and reloads | same | ✅ |

## My Wallet — `screens/WalletScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| Tips card → Clear | Moves tips into online balance | `POST /api/agent/wallet {action:'clear_tips'}` | ✅ |
| Change Email | 2-step modal: verify current email (6-digit code + **Send Code**) → enter new email → Confirm | `PUT /api/agent/wallet {email}` (code send simulated) | ✅ |
| Invite link copy 📋 | Copies invite URL (✓ feedback) | — | ✅ |
| Basic → Store Logo box | File picker (JPG/PNG/GIF/WEBP ≤2MB) with preview | saved via `PUT /api/agent/wallet {logoUrl}` | ✅ |
| Basic → Save | Saves store name/limits/reward/logo | `PUT /api/agent/wallet` | ✅ |
| Agent Deposit / Withdraw / Transfer tabs | Switches funding form | — | ✅ |
| Deposit methods (PYUSD ✓ / USDC / Bitcoin / **Bitcoin Lightning Network**) | Selects payment method (✓ corner badge on selected) | — | ✅ |
| Confirm Deposit | Records deposit order — rejects below **$50 minimum** | `POST /api/agent/wallet {action:'deposit'}` | ✅ |
| Deposit Guide ❓ | Info link under the deposit button | — | 🔶 (visual) |
| Withdraw methods (PYUSD/USDC/BTC/Bank/ACH) | Selects payout method (fee badges) | — | ✅ |
| Confirm Withdraw | Debits balance, records order with Balance Before/After ($2 fee on PYUSD/USDC) | `POST /api/agent/wallet {action:'withdraw'}` | ✅ |
| Transfer → OK | Sends balance to another agent in your store (validates recipient, remark ≤100) | `POST /api/agent/wallet {action:'transfer', recipient}` | ✅ |
| Log tabs (Report / **Agent Deposit Log** / **Agent Withdraw Log** / **Agent Transfer Log** / **Agent Transfer Request Log**) | Switches log table (per-reference columns incl. Order No, Fee, Balance Before/After, Sender/Receiver) | `GET /api/agent/wallet` | ✅ |
| Log row → Cancel | Cancels own pending order (withdraw refunds balance) | `POST /api/agent/wallet {action:'cancel', id}` | ✅ |

## Game Setting — `screens/GameSettingScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| Card toggle | Enables/disables the platform for this store | `PUT /api/agent/game-settings` | ✅ |
| Score ⟳ refresh | Re-syncs kiosk score timestamp (POS call simulated) | `POST /api/agent/game-settings` | ✅ |
| Account copy 📋 | Copies kiosk ID / store account (turns green) | — | ✅ |
| View Details | Opens Edit Platform Account modal | — | ✅ |
| Modal → Save | Saves kiosk/POS/limits config | `PUT /api/agent/game-settings` | ✅ |
| Modal → Close | Closes without saving | — | ✅ |

## Sale Agent List / Sub Agent List — `screens/AgentListScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| Search | Server search by username/nickname/email | `GET /api/agent/agents?type=&search=` | ✅ |
| Code / Status filters | Client-side filter by invite code / status | — | ✅ |
| Reset | Clears all filters | — | ✅ |
| + Add | Opens Add User drawer (random username prefilled) | — | ✅ |
| Drawer → Confirm | Creates sale/sub agent | `POST /api/agent/agents` | ✅ |
| Drawer → Cancel | Closes drawer | — | ✅ |
| Total Report | Opens per-agent totals modal | `GET /api/agent/agents?report=1` | ✅ |

## Member List — `screens/MemberScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| Search / Phone + Search | Server search | `GET /api/agent/members?search=&phone=` | ✅ |
| Reset | Clears filters, reloads page 1 | same | ✅ |
| + Add Member | Opens modal (random username/password prefilled) | — | ✅ |
| Modal → Create | Creates member | `POST /api/agent/members` | ✅ |
| Row → Game Platform Binding | Opens detail modal (bindings + login history) | `GET /api/agent/members/:id` | ✅ |
| Row → More ▾ | Opens Edit Member modal (remark) | — | ✅ |
| Edit → Save | Saves remark | `PUT /api/agent/members` | ✅ |
| Pagination ‹ 1 2 › | Pages through members | `GET /api/agent/members?page=` | ✅ |

## Promotion Config — `screens/PromotionScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| Type / Status filters + Search | Filters the list | — | ✅ |
| Reset | Clears filters | — | ✅ |
| + Add Promotion | Opens config drawer | — | ✅ |
| Drawer: type radios, % input, day checkboxes, toggles | Sets promo config | — | ✅ |
| Drawer → Confirm | Creates promotion | `POST /api/agent/promotions` | ✅ |
| Row → Enable/Disable | Toggles status | `PUT /api/agent/promotions` | ✅ |
| Row → Delete | Deletes promotion | `DELETE /api/agent/promotions?id=` | ✅ |

## Store Administrator — `screens/StoreAdminScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| + Add store administrator | Opens modal | — | ✅ |
| Modal → Confirm | Creates staff login | `POST /api/agent/store-admins` | ✅ |
| Row → Disable/Activate | Toggles status | `PUT /api/agent/store-admins` | ✅ |

## Transaction List — `screens/TransactionScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| Transaction List / Redemption Audit tabs | Switches view | — | ✅ |
| Search + Type + Search btn | Filters ledger | `GET /api/agent/transactions?search=&type=` | ✅ |
| Reset | Clears filters | same | ✅ |
| Report | Opens Daily + Game breakdown modal | `GET /api/agent/transactions?report=1` | ✅ |
| Audit: Status select | Filters queue (default Pending Review) | `GET /api/agent/redemption-audits?status=` | ✅ |
| Audit row → Approve | Approves redemption | `PUT /api/agent/redemption-audits` | ✅ |
| Audit row → Reject | Rejects redemption | `PUT /api/agent/redemption-audits` | ✅ |

## CS Config — `screens/CsConfigScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| Enable toggle | Turns widget on/off | — (saved on Save) | ✅ |
| Contact Phone toggle (+ phone input) | Shows clickable phone entry | — | ✅ |
| Platform select / JS URL | Widget source config | — | ✅ |
| Save | Persists config | `PUT /api/agent/cs-config` | ✅ |

## Terms — `screens/TermsScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| EN / ES tabs | Switches locale (keeps unsaved edits per locale) | — | ✅ |
| Save | Saves current locale content | `PUT /api/agent/terms` | ✅ |
| Use inherited version | Clears content → players fall back to global terms | `PUT /api/agent/terms {content:null}` | ✅ |

## Download posters — `screens/PostersScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| Download (each poster) | Generates & downloads a print-ready PNG (brand + title + QR block + your invite link) | — | ✅ |

## Tutorial — `screens/TutorialScreen.tsx`

| Button | Action | Status |
|---|---|---|
| Video cards | Visual placeholders (no video hosting yet) | 🔶 |

## Doc Preview — `screens/DocPreviewScreen.tsx`

Renders the full **DLink Agents System Manual** (22 pages: cover + TOC + 20 sections,
content extracted from the production docx render in `demo.html`) —
[manual-content.ts](../components/agent/screens/manual-content.ts).

| Button | Action | Status |
|---|---|---|
| First Page / ‹ › / page dots (1–22) | Page navigation | ✅ |
| Zoom − / + | 60–180% zoom | ✅ |
| Contents | TOC dropdown — jump to any section (current highlighted) | ✅ |
| TOC page entries (page 2) | Click a chapter to jump to it | ✅ |
| Fullscreen | Real `requestFullscreen` on the viewer (toggles off if active) | ✅ |

## Change Password — `screens/ChangePasswordScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| Confirm | Validates (min 6 chars, match) and changes password | `POST /api/agent/change-password` | ✅ |
| Reset | Clears the three fields | — | ✅ |

## My Notices — `screens/NoticesScreen.tsx` (opened from bell → View More)

| Button | Action | API path | Status |
|---|---|---|---|
| Notice Title + Search | Filters notices by keyword | `GET /api/agent/notices?search=` | ✅ |
| Reset | Clears the filter | same | ✅ |
| Row → View | Placeholder (no notice detail page yet) | — | 🔶 |

## Kiosk List — `screens/KioskScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| + Add Kiosk | Opens modal | — | ✅ |
| Modal → Confirm | Creates kiosk | `POST /api/agent/kiosks` | ✅ |

## Member Rewards — `screens/MemberRewardsScreen.tsx`

| Button | Action | API path | Status |
|---|---|---|---|
| Save | Saves Phone Bind Reward SC | `PUT /api/agent/wallet` | ✅ |

---

## Responsive behavior (mobile / tablet / desktop)

| Breakpoint | Behavior |
|---|---|
| **< 640px (mobile)** | Sidebar becomes an overlay drawer (hamburger opens, backdrop/✕ closes) · tab bar scrolls horizontally · KPI cards, filter inputs, balance cards, funding methods and form labels stack full-width · summary strip 2-col grid · chat widget fits viewport · tables scroll horizontally inside their card |
| **640–1023px (tablet)** | Drawer sidebar still; 2-col KPI/card grids; filter inputs inline; summary strip 4-col |
| **≥ 1024px (desktop)** | Fixed sidebar (hamburger collapses it to icon rail) · 3-col game grid · 4-col KPI row · 8-col summary strip |
