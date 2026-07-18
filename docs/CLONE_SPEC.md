# Digit Link — Clone Spec (Next.js + Tailwind CSS)

Source: https://digitlink.mobi — "DigitLink", a mobile-first gaming-recharge / sweepstakes platform with two virtual currencies: **SC** (Sweepstakes Coins, redeemable) and **GC** (Gold Coins, play-only). The live site is a Vue 3 SPA (Vite build, `vue-router`, `vue-i18n`, EN + ES locales). This document specs out a **1:1 UI clone** built with **Next.js (App Router) + TypeScript + Tailwind CSS**.

Everything below was reverse-engineered from the live site: the shipped `index.html`, the main JS bundle (routes, component options, and the inlined i18n message dictionary — so most copy quoted here is the _actual_ production English text, not a paraphrase), the main CSS bundle (custom-property design tokens), the PWA manifest, and the one public API endpoint provided. No headless browser was available during research, so exact pixel spacing is inferred from CSS source rather than visual screenshots — treat spacing values as strong starting points, not gospel, and eyeball-correct against the live site while building.

---

## 1. Scope & data-reality constraints

**This is a frontend/UI clone**, not a functional backend. Concretely:

| Category                                                                                | Reality                                                                                                                            | Approach in the clone                                                                                                                                                                 |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Game provider list                                                                      | **Public, unauthenticated GET API** — confirmed working                                                                            | Call it for real, cache the response to a static JSON file, serve from cache after (see §8)                                                                                           |
| Everything else (auth, wallet, deposit/withdraw, orders, bonus, referral, KYC, profile) | Requires a logged-in session token on the real site (confirmed: hitting these endpoints returns `401 Token is invalid or expired`) | Build the real UI, backed by static/mock JSON fixtures with the same shape. No real payments, SMS, KYC, or geo-check — these are visual/UI only.                                      |
| Assets (logo, provider icons, splash images)                                            | Hosted on `static.digitlink.mobi` CDN, publicly loadable                                                                           | Spec references the live CDN URLs for now; recommend downloading and self-hosting under `/public` before shipping anywhere real (don't permanently hotlink a third party's asset CDN) |

Goal: every route below should be navigable and **look like the original**, with the Game page carrying real live data and every other page carrying realistic static data.

---

## 2. Tech stack

- **Next.js 14+, App Router, TypeScript**
- **Tailwind CSS**, theme extended with the tokens in §4 (no other CSS framework)
- **Data fetching**: server-side `fetch` + on-disk JSON cache, see §8 — this is the "GET once, static JSON from then on" behavior requested
- **Fonts**: system font stack, matching the original exactly — `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`. SF Pro isn't web-licensable, so on non-Apple devices it already falls back the same way the original does — no font files to source, just declare the stack via `next/font` or plain Tailwind `fontFamily`.
- **Theme**: light/dark/auto, toggled via `data-theme` attribute on `<html>` (matches the original's `html[data-theme='light']` override pattern) — implement with a small context + `localStorage`, not a heavy dependency.
- **Motion**: Tailwind `keyframes`/`animation` entries for the catalog in §4.6; reach for Framer Motion only for the splash-screen exit transition and modal/drawer enter-exit if CSS transitions get awkward.
- **Images**: `next/image` with `static.digitlink.mobi` in `remotePatterns` initially; swap to local `/public` assets when self-hosting.

---

## 3. Information architecture (confirmed routes)

Extracted two independent ways (Vue Router `path:` definitions _and_ the lazy-loaded chunk filenames actually shipped) — they agree, so this list is high-confidence.

| Route                       | Page / chunk name                           | Auth                           | Layout  | Purpose                                                                   |
| --------------------------- | ------------------------------------------- | ------------------------------ | ------- | ------------------------------------------------------------------------- |
| `/`                         | —                                           | No                             | —       | Redirects into the app shell (default tab = Game)                         |
| `/game`                     | `Game`                                      | No                             | default | **Home/lobby.** Game-provider grid, this is where the real API data lands |
| `/bonus`                    | `Bonus`                                     | No                             | default | Bonus Center — claimable rewards                                          |
| `/share-activity`           | `ShareActivity`                             | Yes                            | default | Referral / "invite & earn" landing                                        |
| `/invite`                   | `InviteList`                                | —                              | —       | Full referral dashboard: invitee list, commissions                        |
| `/profile`                  | (core bundle) + `ProfileRouteEmpty`         | No (page loads; content gated) | default | Account hub — guest CTA or full account menu                              |
| `/orders`                   | `Orders`                                    | Yes                            | default | Order / transaction history + order detail dialog                         |
| `/redemption-reviews`       | `RedemptionReviews`                         | Yes                            | default | Redemption review queue (list/cancel/visibility)                          |
| `/postal-request`           | `PostalRequest`                             | No                             | default | Postal request code flow                                                  |
| `/payment/:code`            | `PaymentResult`                             | No                             | empty   | Landing page after an external payment redirect (success/fail/pending)    |
| `/deposit-guide`            | (static content)                            | No                             | default | "How to deposit" instructions                                             |
| `/help-guide`               | `HelpGuide`                                 | No                             | default | General help / FAQ guide                                                  |
| `/terms`                    | `TermsConditions` (via `LegalPageLayout`)   | No                             | default | Terms & Conditions                                                        |
| `/privacy`                  | `PrivacyPolicy` (via `LegalPageLayout`)     | No                             | default | Privacy Policy                                                            |
| `/sweeps-rules`             | `SweepsRules` (via `LegalPageLayout`)       | No                             | default | Official sweepstakes rules                                                |
| `/responsible-gaming`       | `ResponsibleGaming` (via `LegalPageLayout`) | No                             | default | "Responsible Social Gameplay" policy                                      |
| `/access-denied`            | `GeoRestricted`                             | No                             | empty   | Geo-blocked / "Region Not Available"                                      |
| `/404` + `/:pathMatch(.*)*` | `NotFound`                                  | No                             | minimal | Not found                                                                 |

**Not routes — modals/drawers/sheets instead** (confirmed via component + CSS class names, no dedicated path exists for any of these): Login, Register, OTP/SMS verification, Forgot/Reset Password, Bind Phone/Email, Wallet balance panel, Deposit, Withdraw, KYC (Sumsub) flow, Order Detail dialog, Avatar editor, Help-ticket submission, Change password, "What is GC/SC?" info sheet.

---

## 4. Design system → Tailwind tokens

### 4.1 Brand

- Name: **Digit Link** / short name **DigitLink**
- Tagline (splash screen, verbatim): **"Explore a bigger world..."**
- `theme-color` / PWA background: `#041f16`
- App icons: 512×512 / 192×192 maskable + any, source `https://static.digitlink.mobi/img/p/...` and `/img/icons/icon-*.png`

### 4.2 Color tokens

Dark is the **default** theme; light is opt-in via `html[data-theme="light"]`. Values below are extracted directly from the shipped CSS custom properties.

| Token                   | Dark (default)                                                                                                      | Light                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--bg-primary`          | `#052d27` (deep green-black)                                                                                        | `#ffffff`                                                                                                                                                                 |
| `--bg-secondary`        | `#0a0a0a`                                                                                                           | `#f5f5f7`                                                                                                                                                                 |
| `--bg-tertiary`         | `rgba(255,255,255,.06)`                                                                                             | `#ebebeb`                                                                                                                                                                 |
| Splash background       | `linear-gradient(180deg, #041f16 0%, #0a3629 100%)`                                                                 | `#ffffff`                                                                                                                                                                 |
| Primary / brand accent  | `#00d632` (glow), `#43ad6b` (solid/success green), `--btn-primary-bg: color-mix(in srgb, #43ad6b 92%, #000)`        | same family, verify against live site — red (`#ff3b30`) also appears scoped to primary in some component contexts (likely a danger/GC-specific variant, confirm visually) |
| Success                 | `#00c853` / `#43ad6b`                                                                                               | same                                                                                                                                                                      |
| Error / danger          | `#ff3b30`                                                                                                           | `#ff3b30`                                                                                                                                                                 |
| Warning                 | `#ff9500` / `#ffcc00`                                                                                               | same                                                                                                                                                                      |
| Info                    | `#007aff` / `#0a84ff`                                                                                               | same                                                                                                                                                                      |
| Text on dark            | `--balance-color:#ffffff`                                                                                           | `--balance-color:#000000`                                                                                                                                                 |
| Card bg                 | `rgba(255,255,255,.05)` glass                                                                                       | `rgba(255,255,255,.7)` glass                                                                                                                                              |
| Card border             | `rgba(255,255,255,.08)`                                                                                             | `rgba(0,0,0,.08)`                                                                                                                                                         |
| Divider                 | `rgba(255,255,255,.08)`                                                                                             | `rgba(0,0,0,.1)`                                                                                                                                                          |
| Input bg                | `rgba(255,255,255,.04)`                                                                                             | `rgba(245,245,247,.8)`                                                                                                                                                    |
| Input border            | `rgba(255,255,255,.08)`                                                                                             | `rgba(0,0,0,.12)`                                                                                                                                                         |
| Modal bg                | `#000000`-based sheet                                                                                               | `#ffffff`                                                                                                                                                                 |
| Drawer bg               | `#102618`                                                                                                           | `rgba(240,253,244,.97)`                                                                                                                                                   |
| Btn secondary bg        | `rgba(255,255,255,.05)`                                                                                             | `rgba(0,0,0,.06)`                                                                                                                                                         |
| Btn disabled            | text `rgba(255,255,255,.25)`, bg `rgba(255,255,255,.04)`                                                            | text `rgba(0,0,0,.25)`, bg `rgba(0,0,0,.05)`                                                                                                                              |
| Accent glow colors seen | green `#00d632` (primary), purple `#a855f7` (secondary accent, e.g. VIP), plus success-tinted `#22c55e` box-shadows | —                                                                                                                                                                         |

Map these into `tailwind.config.ts` under `theme.extend.colors` as a semantic palette (`brand`, `bg.primary/secondary/tertiary`, `success`, `danger`, `warning`, `info`, `card`, `divider`, `input`) with dark-mode variants driven by the `data-theme` attribute (`darkMode: ['selector', '[data-theme="dark"]']` or invert the default, since dark is the default here rather than light).

### 4.3 Radius scale

`2px 3px 4px 5px 6px 7px 8px 10px 12px 14px 16px 18px 20px 22px 24px 32px` plus `50%` (avatars/circular icons), `40%` (squircle-ish), and `999px` (pill buttons — `--btn-primary-radius: 9999px`). Modal radius specifically `20px`.

### 4.4 Elevation / glass effect

- `--glass-blur: 20px` (backdrop-filter blur — used heavily for header scrims, cards, drawers)
- `--header-bar-scrim`: `rgba(7,40,31,.74)` dark / `rgba(240,253,244,.82)` light
- Colored glow shadows tied to state, e.g. success `0 0 0 1px #22c55e33, 0 4px 20px #22c55e26, inset 0 1px #ffffff0d`; primary focus ring `0 0 0 3px #00d6322e, 0 4px 12px #00000038`; error `0 0 0 4px #ff3b301a`

### 4.5 Breakpoints

Original uses many fine-grained `max-width` breakpoints (mobile-first, mobile-web-app oriented): `320 340 360 380 400 480 600 640 767 768 900 1023 1024 1025 1200 1280`. For Tailwind, don't reproduce all of them — collapse to a practical scale and fine-tune per component if something clips:

```
screens: { xs: '380px', sm: '480px', md: '768px', lg: '1024px', xl: '1280px' }
```

Note the app is fundamentally a **mobile viewport PWA** — desktop likely just centers a phone-width shell (verify against live site at desktop width before assuming a distinct desktop layout is needed).

### 4.6 Motion / keyframe catalog

Confirmed `@keyframes` in the bundle (name → likely purpose):

- `splashLogoIn`, `splashFadeUp`, `splashShimmer`, `splashGlow` — splash screen entrance + ambient glow + progress-bar shimmer
- `pulse`, `ping` — generic attention pulses (notification dots, live indicators)
- `coin-shine`, `coin-shine-fast` — shimmer sweep on coin/balance icons
- `cartShimmer` / `cartShimmerLight` — deposit "cart"/checkout shimmer
- `fabBreathe` / `fabBreatheLight`, `fabRingPulse` — floating action button idle animation
- `checkPop` — success checkmark pop-in (form validation, OTP success)
- `focusRing`, `focusDot`, `focusAnim` — input focus states
- `embedFadeUp`, `embedLaunchGlow`, `embedLogoIn`, `embedShimmer`, `miniBreathe`/`miniBreatheLight` — game-launch/iframe embed loading sequence
- `modalScaleIn` — modal/sheet open transition
- `logoFloat`, `floatCircle` — decorative background motion
- `promo-banner-text-breathe`, `extra-tag-highlight`, `free-tag-highlight` — promo banner emphasis loops
- `auth-tab-underline-grow`, `payment-tab-underline-grow` — sliding underline on tab switches
- `expiry-blink` — countdown/expiry warning blink
- `btn-buy-shine` — CTA button shine sweep
- `glow-pulse`, `particle-burst` — reward/claim celebratory effects
- `lockPulse` — locked-state indicator

Recreate the ~6-8 that are visually load-bearing (splash sequence, tab underline slide, button shine, coin shimmer, modal scale-in, fab breathe) as Tailwind `keyframes`; skip the long tail unless a specific page clone calls for it.

---

## 5. App shell

1. **Splash screen** (first paint only): centered logo in a rounded-square (140×140, `border-radius:28px`), "DIGIT LINK" brand wordmark below it (uppercase, letter-spacing `0.08em`, 20px/700), tagline **"Explore a bigger world..."** beneath that (13px, 55% opacity), then a 100×40 shimmering progress bar. Background: dark radial-gradient glow over `linear-gradient(180deg,#041f16,#0a3629)`. Exits via 0.5s scale+fade.
2. **Header / top bar**: translucent scrim (`--header-bar-scrim`, blurred), balance capsule showing SC/GC, likely a menu/sidebar trigger.
3. **Bottom tab bar** (`BottomNavigation` component, 4 items, confirmed via router-push switch cases + i18n labels):

   | Tab     | Route             | Label         |
   | ------- | ----------------- | ------------- |
   | Game    | `/game`           | "Game Center" |
   | Bonus   | `/bonus`          | "Bonus"       |
   | Share   | `/share-activity` | "Share"       |
   | Profile | `/profile`        | "Profile"     |

   Active tab gets a filled/glow icon variant; inactive gets an outline variant.

4. **Sidebar/drawer**: guest state shows **"Welcome!"** / **"Sign in to play"**; authenticated state shows account info + logout.
5. **PWA install prompt**: banner driven by `profile.menu.installPwa` ("Install PWA") — a dismissible install-to-homescreen callout.

---

## 6. Page-by-page breakdown

> Copy quoted in this section is pulled verbatim from the site's shipped locale dictionary — reuse it as-is for a faithful clone.

### 6.1 Game (`/game`) — Home / Lobby

The one page with **real data**. Sections top to bottom:

- Balance capsule (SC/GC, unified pill — see §6.5 for full balance model)
- Promo banner(s) — carousel, "shop.firstDeposit.banner"-style first-deposit promo present in the live app
- SC / GC currency toggle (the API takes `providerType=SC|GC` — mirror as a two-tab or segmented control)
- Provider grid: cards from the real API, each showing `iconUrl`, `name`, a deposit-tiers/bonus badge when `depositTiers` is non-null, and a launch action. See §8 for the data contract.
- Empty/loading states (skeleton shimmer cards while fetching)

### 6.2 Bonus (`/bonus`) — Bonus Center

Header **"Bonus Center"**. Reward cards with a `bonus-badge`, claim CTA, likely segmented into available/claimed. Use `reward.claim` / `reward.pending` / `reward.history` as the three logical states of any reward card.

### 6.3 Share / Invite (`/share-activity`, `/invite`)

- Entry card: `referral.entryTitle` / `referral.entryDesc`
- Invitee reward callout: `referral.inviteeRewardTitle` / `referral.inviteeRewardDesc`
- **"Claim Now"** button (`referral.claimNow`), states: `Claimed`, "Next claim in {time}"
- `InviteList`: table/list of invitees + commission summary (referral commission info/list/summary/claims endpoints back this in the real app)
- Share sheet: `profile.shareInvite` / `profile.shareMessage`, invite-link copy-to-clipboard (`profile.inviteLinkCopied`)

### 6.4 Profile (`/profile`) — Account hub

Two states:

- **Guest** (`ProfileRouteEmpty`): `profile.guestPreview.title` / `.subtitle`, **Login** / **Register** buttons (`profile.guestPreview.login` / `.register`)
- **Logged in**:
  - Avatar + nickname (tap → Avatar Editor: `profile.avatarEditor.title`, pick avatar, edit nickname)
  - Balance breakdown card (see §6.5)
  - KYC verification banner (see §6.7) if not yet verified
  - Menu list (`profile.menu.*`), confirmed items: **Bind Phone**, **Change Password**, **Display Language**, **Theme** (Dark / Light / Auto — `themeDark`/`themeLight`/`themeAuto`), **Security Settings**, **Help Center**, **Order History**, **Install PWA**, "How to buy BTC using PayPal" / "How to buy PYUSD using PayPal" (help articles), Logout
  - System info footnote (desktop vs mobile device string)

### 6.5 Wallet / Balance (panel, not a route)

Dual-currency model, confirmed field labels:

- **Gold Coins** (`wallet.goldCoin`) — play-only (`wallet.playOnly`)
- **Sweepstakes Coins** (`wallet.sweepStakesCoins`) — sub-buckets seen: **Online SC**, **Store SC**, **Kiosk SC**
- **Total Balance**, **Unplayed** (`unwagered` — "Balance that needs to be played before withdrawal"), **Redeemable** (`withdrawable` — "Balance available for withdrawal"), **Free Bonus** (`redeemable`)
- **Convert** action + **"What is GC/SC?"** info sheet
- Visual: "balance-scale" component suggests a literal left/right scale visualization comparing two balances, plus a glow effect class `balance-amount-sc-glow` for the SC amount specifically

### 6.6 Deposit & Withdraw (panels, not routes)

- **Deposit**: method tiles (card, Bitcoin on-chain, **Bitcoin Lightning Network**, PYUSD), amount entry with **deposit tiers** (fixed amounts + bonus, e.g. $10→+$0, $20→+$5, $50→+$10, $100→+$15 — these come straight from the provider API's `depositTiers`), wallet-balance preview, recharge CTA
- **Withdraw**: method tiles (ACH — routing + account number, debit card, Cash App, Chime, crypto wallet address, "Centrexs" email-based payout), **fee options**: Standard fee vs a **fee-waiver** ("Fee Waiver" badge, converts an SC bonus to balance instead of paying a fee), security notices per method (verbatim, e.g. _"Please ensure your wallet address is correct. Incorrect addresses may result in permanent loss of funds."_)
- **Payment Result** (`/payment/:code`): success / pending / failed state after returning from an external payment page

### 6.7 KYC verification (Sumsub-backed, panel not route)

- Reminder banner: **"Complete KYC Verification"** — _"In accordance with U.S. state regulations governing sweepstakes promotions, all participants must complete identity verification (KYC) before initiating any cash withdrawal requests."_ Three benefit bullets (secure/encrypted, one-time for lifetime access, unlocks withdrawals instantly) + **"Verify Now"** CTA.
- States: not verified / pending / verified / rejected (with a reason shown)
- Single-account consent dialog before starting the Sumsub flow

### 6.8 Orders (`/orders`)

List of past orders + **Order Detail dialog** with confirmed fields: Order Number, User ID, Username, Amount, Total/Pay/Bitcoin/Actual/Received Amount, Payment Method, Payment/Transaction/Order IDs, Payment Address, Fee (+ Fee Mode: standard/waiver, Fee Waived flag), SC Bonus, Status, Create/Update/Complete Time. Actions: search, submit, void, cancel.

### 6.9 Redemption Reviews (`/redemption-reviews`)

List + cancel + visibility-toggle actions on pending redemption reviews.

### 6.10 Postal Request (`/postal-request`)

Standalone flow for requesting/entering a postal request code.

### 6.11 Deposit Guide (`/deposit-guide`) & Help Guide (`/help-guide`)

Static step-by-step instructional content pages (image + text steps), plus a Help Center with support-ticket submission ("Briefly describe your issue so we can help you better").

### 6.12 Legal pages — Terms, Privacy, Sweeps Rules, Responsible Gaming

All four share a `LegalPageLayout` wrapper: simple header with back button + page title, long-form scrollable text body. Titles are hardcoded English (not i18n-keyed) in the source: "Terms & Conditions", "Privacy Policy", "Sweeps Rules", "Responsible Social Gameplay".

### 6.13 Access Denied / Region Not Available (`/access-denied`)

`GeoRestricted` empty-state: illustration + "Region Not Available" message (geo-IP block).

### 6.14 404 (`/404`)

`NotFound` empty-state + link back home.

### 6.15 Auth (modals, not routes)

- **Login**: tabs **Account** / **Phone** (sliding underline), fields username+password or phone+OTP, "Forgot Password?", banner copy _"Welcome back! Ready to play?"_, feature bullets (Secure & Safe / Lightning Fast / Exclusive Rewards)
- **Register**: **Quick Register** ("One-click to generate account credentials" — auto-fills a generated username/password) vs **Manual Register** (customize credentials), Account or Phone method, banner _"Join us and start winning!"_, terms/privacy consent notice, password strength meter (Weak/Medium/Strong)
- **Reset/Retrieve password**: phone-based — _"Your account username and password will be sent to this phone number via SMS."_
- **Bind Phone**: instructions panel (valid US +1 number, code valid 5 minutes, one account per number)

---

## 7. Component inventory

- **Buttons**: primary (pill, `radius:9999px`, gradient/solid green, shine-sweep on hover), secondary (translucent), outline, disabled state, phone-register variant (distinct teal `#004d40`/`#14b096`)
- **Cards**: glass card (blurred translucent), solid balance card, provider card, promo banner card
- **Balance capsule / scale**: segmented SC|GC pill in the header; expandable balance breakdown panel
- **Tabs**: sliding-underline tab group (login method, payment method)
- **Modals / bottom sheets**: `radius:20px`, scale-in entrance, scrim overlay
- **Badges**: bonus badge, fee-waiver badge, "new"/highlight tags
- **Inputs**: text/phone/OTP inputs with focus-ring and error states (red ring + shake/blink on error)
- **Empty states**: 404, access-denied, empty order list, guest profile
- **Skeleton/shimmer loaders**: provider grid loading state
- **Toast/inline notifications**: success/error/warning banners tied to the semantic colors in §4.2

---

## 8. Data & API integration plan

### 8.1 The one real endpoint

```
GET https://digitlink.mobi/prod-api/member/game/available-providers?inviteCode=&providerType=SC
GET https://digitlink.mobi/prod-api/member/game/available-providers?inviteCode=&providerType=GC
```

Response shape (confirmed live, 48 SC providers / 2 GC providers at time of writing):

```jsonc
{
  "code": 200,
  "message": "操作成功",
  "data": [
    {
      "id": 51,
      "name": "Golden Dragon",
      "providerCode": "goldenDragonCookie",
      "launchUrlTemplate": "https://www.playgd.mobi",
      "iconUrl": "https://static.digitlink.mobi/img/p/gd.png",
      "status": 1,
      "sort": 0,
      "createType": 1,
      "depositTiers": null, // or [{ "amount": "10.00", "bonusAmount": "0.00" }, ...]
      "operate": 0,
      "needInitBalance": 0,
      "canManualInput": 1,
      "providerType": "SC", // or "GC"
      "iframeSupported": false,
      "isMachineSupported": 0,
      "redeemField": 2,
      "invalidPasswordState": 0,
      "canChangePassword": 1,
    },
  ],
}
```

### 8.2 "Fetch once, DB from then on" *(superseded — see note)*

> **Current implementation:** the original plan below (disk-JSON cache-through
> read on every request) was superseded by seeding the live snapshot straight
> into the `game_providers` table; the app now reads via
> `lib/data.ts#getProviders()` (a plain DB query), never touching the network
> at request time. `data/providers.{sc,gc}.json` remain as the committed seed
> fixtures. The upstream endpoint itself moved from an env var to the
> admin-managed `site_settings` row `provider.api_base_url` (see
> `lib/settings.ts#getProviderApiBaseUrl`), consumed by `pnpm platforms:sync`
> (`scripts/sync-platforms.ts`) and the manual refresh script
> `scripts/fetch-providers.ts` (`pnpm fetch:providers`).

```
data/providers.sc.json     ← committed seed fixture (real snapshot, captured during this research)
data/providers.gc.json     ← committed seed fixture
scripts/fetch-providers.ts ← manual refresh script (`pnpm fetch:providers`) that re-hits the
                              live endpoint and overwrites the seed JSON on demand
scripts/sync-platforms.ts  ← syncs the agent-panel `game_platforms` catalog from the same endpoint
```

### 8.3 Everything else → mock fixtures

For auth/wallet/orders/bonus/referral/KYC, since these need a real session we don't have, create static fixtures with the same field names discovered in §6 (e.g. `data/mock/orders.json`, `data/mock/bonus.json`, `data/mock/wallet.json`) and read them the same way — this keeps the data-access pattern identical between the one real integration and the mocked ones, so swapping in a real backend later is a drop-in change.

---

## 9. Proposed folder structure

```
app/
  layout.tsx                 // root layout: theme provider, splash screen, fonts
  page.tsx                   // "/" → redirect to /game
  (shell)/
    game/page.tsx
    bonus/page.tsx
    share-activity/page.tsx
    profile/page.tsx
    invite/page.tsx
    orders/page.tsx
    redemption-reviews/page.tsx
    postal-request/page.tsx
    deposit-guide/page.tsx
    help-guide/page.tsx
  payment/[code]/page.tsx
  legal/
    terms/page.tsx
    privacy/page.tsx
    sweeps-rules/page.tsx
    responsible-gaming/page.tsx
  access-denied/page.tsx
  not-found.tsx               // Next's 404 convention
components/
  shell/ (SplashScreen, Header, BottomNav, Sidebar, PwaInstallBanner)
  auth/ (LoginModal, RegisterModal, OtpInput, ResetPasswordModal)
  wallet/ (BalanceCapsule, BalancePanel, DepositModal, WithdrawModal)
  game/ (ProviderGrid, ProviderCard, CurrencyToggle)
  profile/ (ProfileMenu, AvatarEditor, KycBanner)
  orders/ (OrderList, OrderDetailDialog)
  ui/ (Button, Card, Modal, Tabs, Badge, Input, Skeleton)
lib/
  providers.ts                // cache-through data access, §8.2
  theme.tsx                   // theme context
data/
  providers.sc.json
  providers.gc.json
  mock/
    orders.json
    bonus.json
    wallet.json
    referral.json
scripts/
  fetch-providers.mjs
tailwind.config.ts
CLONE_SPEC.md                 // this file
```

---

## 10. Suggested build phases

1. **Foundation** — scaffold, Tailwind theme (§4), root layout, theme toggle, splash screen, header, bottom nav
2. **Game/Home** — real provider API + disk cache (§8), provider grid/cards, SC/GC toggle
3. **Bonus + Share/Invite** — mock-backed
4. **Profile** — guest + logged-in states, menu, avatar editor
5. **Wallet/Deposit/Withdraw** — panel UI, mock-backed
6. **Orders / Redemption Reviews / Postal Request / Payment Result** — mock-backed
7. **Legal + error/edge pages** (Terms, Privacy, Sweeps Rules, Responsible Gaming, Access Denied, 404)
8. **Auth modals** (Login/Register/Reset/Bind Phone) — UI only, mock success/failure
9. **Polish** — animation pass (§4.6), responsive QA against the breakpoint list, dark/light parity check

---

## 11. Open questions / caveats

- No browser automation was available for this research, so layout was reconstructed from CSS/class names and route/i18n metadata rather than screenshots — do a visual side-by-side pass against the live site per page while building, especially for spacing and the exact provider-grid layout.
- Whether `--btn-primary-bg:#ff3b30` is the **light-theme** primary color or a scoped danger/GC variant couldn't be resolved from source alone — confirm visually before hardcoding red as a theme primary.
- Multi-language: at minimum EN + ES strings exist in the bundle. This spec (and the initial build) targets **English only**; flag if i18n is actually wanted.
- Provider list is dynamic and currently returns 48 SC / 2 GC entries — the seed JSON is a point-in-time snapshot (captured 2026-07-02); refresh via `pnpm fetch:providers` if it goes stale.
