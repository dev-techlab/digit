/**
 * Seed the agent-panel data: 47 game platforms, demo store agent `Deluxe001`
 * (password `deluxe123`), store settings, enabled platform accounts, demo
 * members with logins/transactions, a sample promotion, CS config, terms and
 * posters. Idempotent — safe to re-run (upserts by natural keys).
 *
 *   pnpm agent:seed
 */
import './load-env';
import bcrypt from 'bcryptjs';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';

const PLATFORMS = [
  'Golden Dragon',
  'Dragon Cash',
  'Fire Phoenix',
  'Black Mamba',
  'ORCA',
  'Fortune2go',
  'Magic City777',
  'Diamond Dragon',
  'Thunder7',
  'Riversweeps',
  'Fire Kirin',
  'Orion Stars',
  'Panda Master',
  'Ultra Panda',
  'V Blink',
  'Game Vault',
  'Galaxy',
  'Juwa1.0',
  'Juwa2.0',
  'Cash Frenzy',
  'Gold Star',
  'Mega Spin',
  'Cash Machine',
  'Game Room',
  'Golden Kirin',
  'Vegas X',
  'Noble',
  'Milky Way',
  'Mafia',
  'Vegas Sweep',
  'YOLO',
  'Blue Dragon',
  'Great Balls of Fire',
  'Medusa777',
  'Mr All In One',
  'Jack 2 Win',
  'Joker777',
  'Glamour Spin',
  'Golden Treasure',
  'High Stakes',
  'Egame',
  'Fish Glory',
  'Acebook',
  'Game Time',
  'Vegas Roll',
  'Jackpot Carnival',
  'MajikBonus',
];

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

async function main() {
  // --- Game platforms ---------------------------------------------------------
  for (let i = 0; i < PLATFORMS.length; i++) {
    await db
      .insert(s.gamePlatforms)
      .values({ name: PLATFORMS[i], slug: slugify(PLATFORMS[i]), sort: i })
      .onConflictDoNothing();
  }
  const platforms = await db.select().from(s.gamePlatforms);
  const byName = new Map(platforms.map((p) => [p.name, p]));
  console.log(`✓ ${platforms.length} game platforms`);

  // --- Demo store agent -------------------------------------------------------
  const passwordHash = await bcrypt.hash('deluxe123', 10);
  let [store] = await db.select().from(s.agents).where(eq(s.agents.username, 'Deluxe001'));
  if (!store) {
    [store] = await db
      .insert(s.agents)
      .values({
        type: 'store',
        username: 'Deluxe001',
        passwordHash,
        nickname: 'Deluxe001',
        email: 'pi2@gmail.com',
        inviteCode: 'MC223717111J000I',
        onlineBalance: '104.81',
        ratioPct: '0',
      })
      .returning();
    await db.update(s.agents).set({ storeId: store.id }).where(eq(s.agents.id, store.id));
    store.storeId = store.id;
  }
  console.log(`✓ store agent Deluxe001 (${store.id})`);

  await db
    .insert(s.storeSettings)
    .values({ storeId: store.id, storeName: '', dailyMaxRedeem: '5000', dailyMaxWithdraw: '500' })
    .onConflictDoNothing();

  // --- Platform accounts (as seen in the screenshots) --------------------------
  const enabledAccounts: Array<{
    name: string;
    kioskId?: string;
    posAccount?: string;
    score?: string;
  }> = [
    { name: 'Golden Dragon', kioskId: '4242852', posAccount: 'boss' },
    { name: 'Fire Phoenix', posAccount: 'Deluxe123', score: '1500' },
    { name: 'Riversweeps', posAccount: 'Deluxe123' },
    { name: 'Orion Stars', posAccount: 'Deluxe123', score: '2500' },
    { name: 'Ultra Panda', posAccount: 'Deluxe123', score: '1500' },
    { name: 'V Blink', posAccount: 'Deluxe123', score: '1500' },
    { name: 'Juwa2.0', posAccount: 'Deluxe333', score: '2000' },
  ];
  for (const acc of enabledAccounts) {
    const platform = byName.get(acc.name);
    if (!platform) continue;
    await db
      .insert(s.storePlatformAccounts)
      .values({
        storeId: store.id,
        platformId: platform.id,
        enabled: true,
        kioskId: acc.kioskId,
        posAccount: acc.posAccount,
        posPassword: 'pos-secret',
        moneyBox: '1',
        score: acc.score,
        scoreSyncedAt: acc.score ? new Date(Date.now() - 30 * 864e5) : null,
      })
      .onConflictDoNothing();
  }
  console.log(`✓ ${enabledAccounts.length} enabled platform accounts`);

  // --- Members (18, numeric usernames like the screenshots) ---------------------
  const memberNames = [
    '5534453',
    '6236932',
    '9152778',
    '3413558',
    '8915107',
    '4594254',
    '3983964',
    '6706582',
    '8477356',
    '7765567',
    '2318804',
    '9910311',
    '4127765',
    '5563901',
    '7182246',
    '8804132',
    '3345519',
    '6650287',
  ];
  const memberHash = await bcrypt.hash('member123', 10);
  const memberIds: string[] = [];
  for (let i = 0; i < memberNames.length; i++) {
    const username = memberNames[i];
    const existing = await db
      .select({ id: s.members.id })
      .from(s.members)
      .where(and(eq(s.members.storeId, store.id), eq(s.members.username, username)));
    if (existing[0]) {
      memberIds.push(existing[0].id);
      continue;
    }
    const [m] = await db
      .insert(s.members)
      .values({
        storeId: store.id,
        username,
        passwordHash: memberHash,
        phone: username === '7765567' ? '+17852206399' : null,
        onlineSc: username === '7765567' ? '4.00' : '0',
        scRewardEnabled: username !== '8915107',
        createdAt: new Date(Date.now() - (memberNames.length - i) * 2 * 864e5),
      })
      .returning({ id: s.members.id });
    memberIds.push(m.id);
    await db.insert(s.memberLogins).values([
      {
        memberId: m.id,
        ipAddress: '166.199.171.12',
        device: 'macOS - Safari (Mobile)',
        createdAt: new Date(Date.now() - 6 * 864e5),
      },
      {
        memberId: m.id,
        ipAddress: '49.36.89.247',
        device: 'Windows 10 - Chrome (Desktop)',
        createdAt: new Date(Date.now() - 6.8 * 864e5),
      },
    ]);
  }
  console.log(`✓ ${memberIds.length} members`);

  // --- Sample transactions over the last 30 days -------------------------------
  const txCount = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(s.memberTransactions)
    .where(eq(s.memberTransactions.storeId, store.id));
  if (txCount[0].n === 0) {
    const enabled = await db
      .select()
      .from(s.storePlatformAccounts)
      .where(eq(s.storePlatformAccounts.storeId, store.id));
    const rows: (typeof s.memberTransactions.$inferInsert)[] = [];
    for (let d = 30; d >= 1; d--) {
      const dayStart = new Date(Date.now() - d * 864e5);
      const nTx = 1 + ((d * 7) % 4); // deterministic 1..4 tx/day
      for (let k = 0; k < nTx; k++) {
        const member = memberIds[(d * 5 + k * 3) % memberIds.length];
        const acc = enabled[(d + k) % enabled.length];
        const amount = 20 + ((d * 13 + k * 29) % 80); // $20..$99
        const isRedeem = (d + k) % 4 === 0;
        const fee = +(amount * 0.05).toFixed(2);
        rows.push({
          storeId: store.id,
          memberId: member,
          platformId: acc?.platformId ?? null,
          type: isRedeem ? 'redeem' : 'recharge',
          channel: (d + k) % 3 === 0 ? 'kiosk' : 'online',
          amount: String(amount),
          onlineScChange: isRedeem ? String(amount) : `-${amount}`,
          storeBalanceVary: isRedeem ? `-${amount}` : String(amount),
          inScore: isRedeem ? '0' : String(amount),
          outScore: isRedeem ? String(amount) : '0',
          bonusScore: !isRedeem && k === 0 ? String(Math.min(amount, 100)) : '0',
          gameDepositFee: isRedeem ? '0' : String(fee),
          platformFee: String(+(amount * 0.02).toFixed(2)),
          status: 'completed',
          createdAt: new Date(dayStart.getTime() + k * 3.7e6),
        });
      }
    }
    await db.insert(s.memberTransactions).values(rows);
    console.log(`✓ ${rows.length} member transactions`);
  } else {
    console.log(`✓ member transactions already present (${txCount[0].n})`);
  }

  // --- Promotion, CS config, terms, posters ------------------------------------
  const promoExists = await db
    .select({ id: s.promotions.id })
    .from(s.promotions)
    .where(eq(s.promotions.storeId, store.id));
  if (!promoExists[0]) {
    await db.insert(s.promotions).values({
      storeId: store.id,
      type: 'promotion_game',
      bonusPercent: '100',
      minDeposit: '20',
      maxBonus: '100',
      redemptionMultiplier: '2',
      status: 'enabled',
    });
  }

  await db
    .insert(s.csConfigs)
    .values({
      storeId: store.id,
      enabled: true,
      platform: 'Custom JS Widget',
      jsUrl: 'https://plugin-code.salesmartly.com/js/project_637673_657809_1772192169.js',
    })
    .onConflictDoNothing();

  const termsEn = `<ul><li>You must be at least 21 years old and not a political figure to participate in the game.</li><li>Only one account is allowed per person; creating multiple accounts may invalidate all credits and wins.</li><li>Please use the services provided by this platform in accordance with the terms and conditions of federal and state laws; otherwise, all credits and wins will be invalidated.</li><li>The maximum daily deposit and withdrawal limits may vary by each agent store operator. Please contact your store operator for details.</li><li>All paid and free credits must be played through before becoming eligible for redemption.</li><li>Operating Hours: Loading and gameplay are available 24/7.</li><li>Please choose service providers (store operators) you are familiar with and trustworthy. If you are defrauded by a service provider, please use anti-fraud services and leave your contact information.</li></ul>`;
  for (const locale of ['en', 'es'] as const) {
    await db
      .insert(s.storeTerms)
      .values({ storeId: store.id, locale, content: locale === 'en' ? termsEn : null })
      .onConflictDoNothing();
  }

  const posterCount = await db.select({ n: sql<number>`count(*)::int` }).from(s.posters);
  if (posterCount[0].n === 0) {
    await db.insert(s.posters).values([
      { category: 'portrait', title: 'One-Stop Gaming', imageUrl: '/posters/portrait-1.png', sort: 0 },
      { category: 'portrait', title: 'Big Win Jackpot', imageUrl: '/posters/portrait-2.png', sort: 1 },
      { category: 'portrait', title: 'Scan to Join', imageUrl: '/posters/portrait-3.png', sort: 2 },
      { category: 'portrait', title: 'Multi-Platform', imageUrl: '/posters/portrait-4.png', sort: 3 },
      { category: 'portrait', title: 'Quick Deposit', imageUrl: '/posters/portrait-5.png', sort: 4 },
      { category: 'card', title: 'Play Anytime', imageUrl: '/posters/card-1.png', sort: 0 },
      { category: 'card', title: 'Free Money', imageUrl: '/posters/card-2.png', sort: 1 },
      { category: 'card', title: 'Play Anywhere', imageUrl: '/posters/card-3.png', sort: 2 },
    ]);
  }

  console.log('✓ promotion, CS config, terms, posters');
  console.log('\nDone. Login: Deluxe001 / deluxe123 at /admin/login (agent panel).');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
