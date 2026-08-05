import './load-env';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

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

const U = (base: string) => `__seed_${base}_${Date.now().toString(36)}`;

async function main() {
  for (let i = 0; i < PLATFORMS.length; i++) {
    await db.game_platforms.create({
      data: { name: PLATFORMS[i], slug: slugify(PLATFORMS[i]), sort: i }
    }).catch(() => {});
  }
  const platforms = await db.game_platforms.findMany();
  const byName = new Map(platforms.map((p) => [p.name, p]));
  console.log(`✓ ${platforms.length} game platforms`);

  const passwordHash = await bcrypt.hash('deluxe123', 10);
  let store = await db.agents.findFirst({ where: { username: 'Deluxe001' } });
  if (!store) {
    store = await db.agents.create({
      data: {
        type: 'store',
        username: 'Deluxe001',
        password_hash: passwordHash,
        nickname: 'Deluxe001',
        email: 'pi2@gmail.com',
        invite_code: 'MC223717111J000I',
        online_balance: '104.81',
        ratio_pct: '0',
      }
    });
    store = await db.agents.update({ where: { id: store.id }, data: { store_id: store.id } });
  }
  console.log(`✓ store agent Deluxe001 (${store.id})`);

  await db.store_settings.create({
    data: { store_id: store.id, store_name: '', daily_max_redeem: '5000', daily_max_withdraw: '500' }
  }).catch(() => {});

  const enabledAccounts = [
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
    await db.store_platform_accounts.create({
      data: {
        store_id: store.id,
        platform_id: platform.id,
        enabled: true,
        kiosk_id: acc.kioskId,
        pos_account: acc.posAccount,
        pos_password: 'pos-secret',
        money_box: '1',
        score: acc.score,
        score_synced_at: acc.score ? new Date(Date.now() - 30 * 864e5) : null,
      }
    }).catch(() => {});
  }
  console.log(`✓ ${enabledAccounts.length} enabled platform accounts`);

  const memberNames = [
    '5534453', '6236932', '9152778', '3413558', '8915107', '4594254',
    '3983964', '6706582', '8477356', '7765567', '2318804', '9910311',
    '4127765', '5563901', '7182246', '8804132', '3345519', '6650287',
  ];
  const memberHash = await bcrypt.hash('member123', 10);
  const memberIds: string[] = [];
  for (let i = 0; i < memberNames.length; i++) {
    const username = memberNames[i];
    const existing = await db.users.findFirst({
      where: { username }
    });
    if (existing) {
      memberIds.push(existing.id);
      continue;
    }
    const m = await db.users.create({
      data: {
        username,
        nickname: username,
        password_hash: memberHash,
        invite_code: U('inv'),
        phone: username === '7765567' ? '+17852206399' : null,
        agent_invite_code: store.invite_code,
      }
    });
    memberIds.push(m.id);
  }
  console.log(`✓ ${memberIds.length} members`);

  const txCount = await db.transactions.count();
  if (txCount === 0) {
    const enabled = await db.store_platform_accounts.findMany({ where: { store_id: store.id } });
    const rows = [];
    for (let d = 30; d >= 1; d--) {
      const dayStart = new Date(Date.now() - d * 864e5);
      const nTx = 1 + ((d * 7) % 4); 
      for (let k = 0; k < nTx; k++) {
        const member = memberIds[(d * 5 + k * 3) % memberIds.length];
        const acc = enabled[(d + k) % enabled.length];
        const amount = 20 + ((d * 13 + k * 29) % 80); 
        const isRedeem = (d + k) % 4 === 0;
        rows.push({
          id: randomUUID(),
          user_id: member,
          type: isRedeem ? 'withdraw' : 'deposit',
          method: 'cashapp',
          method_label: 'Cash App',
          address: 'test',
          amount: amount,
          status: 'completed',
          created_at: new Date(dayStart.getTime() + k * 3.7e6),
        });
      }
    }
    await db.transactions.createMany({ data: rows as any });
    console.log(`✓ ${rows.length} member transactions`);
  } else {
    console.log(`✓ member transactions already present (${txCount})`);
  }

  const promoExists = await db.promotions.findFirst({ where: { store_id: store.id } });
  if (!promoExists) {
    await db.promotions.create({
      data: {
        store_id: store.id,
        type: 'promotion_game',
        bonus_percent: '100',
        min_deposit: '20',
        max_bonus: '100',
        redemption_multiplier: '2',
        status: 'enabled',
      }
    });
  }

  await db.cs_configs.create({
    data: {
      store_id: store.id,
      enabled: true,
      platform: 'Custom JS Widget',
      js_url: 'https://plugin-code.salesmartly.com/js/project_637673_657809_1772192169.js',
    }
  }).catch(() => {});

  const termsEn = `<ul><li>You must be at least 21 years old and not a political figure to participate in the game.</li><li>Only one account is allowed per person; creating multiple accounts may invalidate all credits and wins.</li><li>Please use the services provided by this platform in accordance with the terms and conditions of federal and state laws; otherwise, all credits and wins will be invalidated.</li><li>The maximum daily deposit and withdrawal limits may vary by each agent store operator. Please contact your store operator for details.</li><li>All paid and free credits must be played through before becoming eligible for redemption.</li><li>Operating Hours: Loading and gameplay are available 24/7.</li><li>Please choose service providers (store operators) you are familiar with and trustworthy. If you are defrauded by a service provider, please use anti-fraud services and leave your contact information.</li></ul>`;
  for (const locale of ['en', 'es'] as const) {
    await db.store_terms.create({
      data: { store_id: store.id, locale, content: locale === 'en' ? termsEn : null }
    }).catch(() => {});
  }

  const posterCount = await db.posters.count();
  if (posterCount === 0) {
    await db.posters.createMany({
      data: [
        { category: 'portrait', title: 'One-Stop Gaming', image_url: '/posters/portrait-1.png', sort: 0 },
        { category: 'portrait', title: 'Big Win Jackpot', image_url: '/posters/portrait-2.png', sort: 1 },
        { category: 'portrait', title: 'Scan to Join', image_url: '/posters/portrait-3.png', sort: 2 },
        { category: 'portrait', title: 'Multi-Platform', image_url: '/posters/portrait-4.png', sort: 3 },
        { category: 'portrait', title: 'Quick Deposit', image_url: '/posters/portrait-5.png', sort: 4 },
        { category: 'card', title: 'Play Anytime', image_url: '/posters/card-1.png', sort: 0 },
        { category: 'card', title: 'Free Money', image_url: '/posters/card-2.png', sort: 1 },
        { category: 'card', title: 'Play Anywhere', image_url: '/posters/card-3.png', sort: 2 },
      ]
    });
  }

  console.log('✓ promotion, CS config, terms, posters');
  console.log('\nDone. Login: Deluxe001 / deluxe123 at /agent/login (agent panel).');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
