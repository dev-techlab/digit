import './load-env';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { HELP_CONTENT } from '@/lib/help-content';
import { PROFILE_TASKS } from '@/lib/profile-tasks';
import { createAdmin } from '@/lib/admin-service';

const ROOT = process.cwd();
const readJson = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf-8'));

function seedAdminPassword(): { password: string; rotate: boolean } {
  const fromEnv = process.env.SEED_ADMIN_PASSWORD;
  if (fromEnv) return { password: fromEnv, rotate: true };
  if (process.env.NODE_ENV === 'production') {
    const generated = randomBytes(12).toString('base64url');
    console.warn(`  ⚠ SEED_ADMIN_PASSWORD unset — generated admin password: ${generated}`);
    return { password: generated, rotate: true };
  }
  console.warn(
    `  ⚠ SEED_ADMIN_PASSWORD unset and NODE_ENV=${JSON.stringify(process.env.NODE_ENV ?? undefined)} (not "production") — seeding the well-known dev password admin1234. Set SEED_ADMIN_PASSWORD before seeding any shared/staging environment.`
  );
  return { password: 'admin1234', rotate: false }; // dev only
}

function parseDate(v: string): Date {
  return new Date(v.includes('T') ? v : v.replace(' ', 'T') + 'Z');
}

async function seedProviders() {
  const files: Array<['SC' | 'GC', string]> = [
    ['SC', 'data/providers.sc.json'],
    ['GC', 'data/providers.gc.json'],
  ];
  for (const [, file] of files) {
    const rows = readJson(file) as any[];
    await db.game_providers.createMany({
      data: rows.map(p => ({
          id: p.id,
          name: p.name,
          provider_code: p.providerCode,
          launch_url_template: p.launchUrlTemplate,
          icon_url: p.iconUrl,
          status: p.status,
          sort: p.sort,
          create_type: p.createType,
          operate: p.operate,
          need_init_balance: p.needInitBalance,
          can_manual_input: p.canManualInput,
          provider_type: p.providerType,
          iframe_supported: p.iframeSupported,
          is_machine_supported: p.isMachineSupported,
          redeem_field: p.redeemField,
          invalid_password_state: p.invalidPasswordState,
          can_change_password: p.canChangePassword,
      })),
      skipDuplicates: true
    });

    for (const p of rows) {
      const existingTiers = await db.provider_deposit_tiers.findFirst({
        where: { provider_id: p.id },
      });
      if (!existingTiers && p.depositTiers?.length > 0) {
        await db.provider_deposit_tiers.createMany({
          data: (p.depositTiers as any[]).map((tier, i) => ({
            provider_id: p.id,
            amount: tier.amount,
            bonus_amount: tier.bonusAmount,
            sort: i,
          })),
          skipDuplicates: true
        });
      }
    }
    console.log(`  providers[${file}]: ${rows.length}`);
  }
}

async function seedDemoUserAndData() {
  const referral = readJson('data/mock/referral.json');
  const wallet = readJson('data/mock/wallet.json');

  const passwordHash = await bcrypt.hash('demo1234', 10);
  
  let user = await db.users.findUnique({ where: { username: 'player_2481' } });
  if (!user) {
    user = await db.users.create({
      data: {
        username: 'player_2481',
        nickname: 'Lucky Player',
        password_hash: passwordHash,
        avatar_emoji: '🎰',
        phone_bound: false,
        kyc_status: 'unverified',
        pwa_installed: false,
        invite_code: referral.inviteCode,
      }
    });
  }
  const userId = user.id;

  const w = await db.wallets.findUnique({ where: { user_id: userId } });
  if (!w) {
    await db.wallets.create({
      data: {
        user_id: userId,
        gold_coin: wallet.goldCoin,
        online_sc: wallet.onlineSC,
        store_sc: wallet.storeSC,
        kiosk_sc: wallet.kioskSC,
        unwagered: wallet.unwagered,
        free_bonus: wallet.freeBonus,
      }
    });
  }

  // Orders
  await db.orders.createMany({
    data: (readJson('data/mock/orders.json') as any[]).map(o => ({
        order_no: o.orderNo,
        user_id: userId,
        amount: o.amount,
        pay_amount: o.payAmount,
        actual_deposit_amount: o.actualDepositAmount,
        payment_method: o.paymentMethod,
        fee: o.fee,
        fee_mode: o.feeMode,
        fee_waived: o.feeWaived,
        sc_bonus: o.scBonus,
        status: o.status,
        created_at: parseDate(o.createTime),
    })),
    skipDuplicates: true
  });

  // Transactions
  await db.transactions.createMany({
    data: (readJson('data/mock/transactions.json') as any[]).map(t => ({
        id: t.id,
        user_id: userId,
        address: t.address,
        method_label: t.methodLabel,
        method: t.method,
        status: t.status,
        amount: t.amount,
        type: t.type,
        created_at: parseDate(t.createTime),
    })),
    skipDuplicates: true
  });

  // Bonuses
  await db.bonuses.createMany({
    data: (readJson('data/mock/bonus.json') as any[]).map(b => ({
        id: b.id,
        title: b.title,
        description: b.description,
        tags: b.tags,
        active: b.active,
        banner_type: b.banner.type,
        banner_gradient: b.banner.gradient ?? null,
        banner_badge_icon: b.banner.badgeIcon ?? null,
        banner_badge_text: b.banner.badgeText ?? null,
        schedule_icon: b.schedule.icon,
        schedule_text: b.schedule.text ?? '',
        schedule_countdown_seconds: b.schedule.countdownSeconds ?? null,
    })),
    skipDuplicates: true
  });

  const bonusClaims = (readJson('data/mock/bonus.json') as any[]).filter(b => b.status && b.status !== 'none');
  if (bonusClaims.length > 0) {
    const existingClaims = await db.user_bonus_claims.findFirst({ where: { user_id: userId } });
    if (!existingClaims) {
      await db.user_bonus_claims.createMany({
        data: bonusClaims.map(b => ({
            user_id: userId,
            bonus_id: b.id,
            status: b.status,
            claimed_at: b.status === 'claimed' ? new Date() : null,
        })),
        skipDuplicates: true
      });
    }
  }

  // Referral commissions
  const hasReferrals = await db.referral_commissions.findFirst({
    where: { referrer_user_id: userId },
  });
  if (!hasReferrals) {
    await db.referral_commissions.createMany({
      data: (referral.invitees as any[]).map(inv => ({
        referrer_user_id: userId,
        invitee_display: inv.username,
        reward: inv.reward,
        status: inv.status,
        joined_at: parseDate(inv.joinedAt),
      })),
      skipDuplicates: true
    });
  }

  // Redemption reviews
  for (const r of readJson('data/mock/redemption-reviews.json') as any[]) {
    const exists = await db.redemption_reviews.findFirst({
      where: { order_no: r.orderNo },
    });
    if (exists) continue;
    const provider = await db.game_providers.findFirst({
      where: { name: r.provider },
    });
    await db.redemption_reviews.create({
      data: {
        order_no: r.orderNo,
        user_id: userId,
        provider_id: provider?.id ?? null,
        provider_name: r.provider,
        amount: r.amount,
        status: r.status,
        visible: r.visible,
        submitted_at: parseDate(r.submittedAt),
      }
    });
  }

  console.log('  demo user + wallet/orders/transactions/bonuses/referrals/redemptions');
}

async function seedProfileTasks() {
  await db.profile_tasks.createMany({
    data: PROFILE_TASKS.map((t, i) => ({
        key: t.key,
        title: t.title,
        description: t.description,
        reward_gc: t.rewardGc,
        reward_sc: t.rewardSc,
        sort: i,
    })),
    skipDuplicates: true
  });
  console.log(`  profile_tasks: ${PROFILE_TASKS.length}`);
}

async function seedHelp() {
  if (await db.help_sections.findFirst()) {
    console.log('  help_sections/items/steps: already seeded, skipped');
    return;
  }
  for (const [tab, sections] of Object.entries(HELP_CONTENT)) {
    for (const [si, section] of sections.entries()) {
      const sec = await db.help_sections.create({
          data: {
            tab: tab as any,
            key: section.key,
            label: section.label,
            icon: section.icon as any,
            sort: si,
          }
      });
      for (const [ii, item] of section.items.entries()) {
        const it = await db.help_items.create({
          data: {
            section_id: sec.id,
            title: item.title,
            icon: (item as any).icon ?? null,
            body: (item as any).body ?? null,
            sort: ii,
          }
        });
        if ((item as any).steps?.length) {
          await db.help_steps.createMany({
            data: ((item as any).steps ?? []).map((step: any, pi: number) => ({
              item_id: it.id,
              title: step.title,
              description: step.description,
              sort: pi,
            }))
          });
        }
      }
    }
  }
  console.log('  help_sections/items/steps');
}

async function seedContentPages() {
  const pages = [
    {
      slug: 'terms',
      title: 'Terms & Conditions',
      body: `<p>These Terms & Conditions ("Terms") govern your access to and use of Octan Link (the "Platform"). By creating an account or using the Platform, you agree to be bound by these Terms.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">1. Eligibility</h2>\n<p>You must be at least 18 years old (or the age of majority in your jurisdiction) and a legal resident of a jurisdiction where use of the Platform is permitted to create an account.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">2. Virtual Currencies</h2>\n<p>Gold Coins (GC) have no monetary value and are for entertainment purposes only. Sweepstakes Coins (SC) may be redeemed for cash prizes subject to these Terms and the <a href="/sweeps-rules" class="text-brand">Sweeps Rules</a>.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">3. Account Responsibility</h2>\n<p>You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">4. Changes to These Terms</h2>\n<p>We may update these Terms from time to time. Continued use of the Platform after changes take effect constitutes acceptance of the revised Terms.</p>`
    },
    {
      slug: 'privacy',
      title: 'Privacy Policy',
      body: `<p>This Privacy Policy explains how Octan Link collects, uses, and protects your personal information when you use the Platform.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">1. Information We Collect</h2>\n<p>We collect information you provide directly (account details, contact information, identity verification documents) and information collected automatically (device information, usage data, approximate location for geo-compliance).</p>\n<h2 class="font-semibold text-[var(--text-primary)]">2. How We Use Information</h2>\n<p>We use your information to operate the Platform, process transactions, verify your identity, comply with legal obligations, and communicate with you about your account.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">3. Data Sharing</h2>\n<p>We share information with service providers who help us operate the Platform (payment processors, identity verification providers) and as required by law.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">4. Your Rights</h2>\n<p>You may request access to, correction of, or deletion of your personal information by contacting our support team through the Help Center.</p>`
    },
    {
      slug: 'sweeps-rules',
      title: 'Official Sweepstakes Rules',
      body: `<p>NO PURCHASE OR PAYMENT NECESSARY TO ENTER OR WIN. A purchase will not improve your chances of winning. Void where prohibited by law.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">1. Eligibility</h2>\n<p>Open to legal residents of eligible jurisdictions who are at least 18 years old. Employees of Octan Link and their immediate family members are not eligible to participate.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">2. Free Entry (AMOE)</h2>\n<p>You may obtain Sweepstakes Coins without purchase via the <a href="/postal-request" class="text-brand">Postal Request</a> method described on the Platform, subject to the same redemption requirements as purchased entries.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">3. Redemption</h2>\n<p>Sweepstakes Coins may be redeemed for cash prizes once applicable wagering and verification requirements have been met. Gold Coins have no cash value and cannot be redeemed.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">4. Odds</h2>\n<p>Odds of winning depend on the number of eligible entries received and game outcomes.</p>`
    },
    {
      slug: 'responsible-gaming',
      title: 'Responsible Social Gameplay',
      body: `<p>Octan Link is committed to promoting responsible social gameplay. Our games are intended for entertainment purposes and should never be viewed as a way to make money.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">Play Within Your Means</h2>\n<p>Only use funds you can comfortably afford. Set personal time and spending limits before you start playing.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">Warning Signs</h2>\n<p>If gameplay is affecting your relationships, finances, or wellbeing, take a break and seek support. Warning signs include chasing losses, hiding play from loved ones, and playing longer than intended.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">Self-Exclusion & Support</h2>\n<p>Contact our Help Center to set deposit limits, take a cooling-off period, or self-exclude from the Platform. If you or someone you know needs help, contact the National Council on Problem Gambling at 1-800-522-4700.</p>`
    },
    {
      slug: 'anti-fraud',
      title: 'Anti-Fraud Policy',
      body: `<p>Octan Link is committed to protecting our players and platform from fraud, including account takeover, payment fraud, bonus abuse, and the use of multiple accounts.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">Identity Verification</h2>\n<p>We may require identity verification (KYC) at any time, particularly before processing a withdrawal, to confirm you are the rightful owner of an account.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">One Account Per Person</h2>\n<p>Each individual, household, and device is permitted one account. Duplicate accounts may be suspended and any associated balances forfeited.</p>\n<h2 class="font-semibold text-[var(--text-primary)]">Reporting Suspicious Activity</h2>\n<p>If you suspect fraudulent activity on your account or believe someone is misusing the platform, contact our support team immediately via the <a href="/contact-us" class="text-brand">Contact Us</a> page.</p>`
    }
  ];
  await db.content_pages.createMany({
    data: pages,
    skipDuplicates: true
  });
  console.log(`  content_pages: ${pages.length}`);
}

async function seedBanners() {
  if (await db.banners.findFirst()) {
    console.log('  banners: already seeded, skipped');
    return;
  }
  const rows = [
    { image_url: '/banners/weekend-reload.png', sort: 0 },
    { image_url: '/banners/refer-friend.png', sort: 1 },
    { image_url: '/banners/vip-loyalty.png', sort: 2 },
  ];
  await db.banners.createMany({ data: rows });
  console.log(`  banners: ${rows.length}`);
}

async function seedSettings() {
  const rows = [
    { key: 'site.name', value: 'Octan Link', type: 'string', group: 'branding' },
    {
      key: 'site.logo_url',
      value: '/logo.png',
      type: 'image',
      group: 'branding',
    },
    { key: 'site.url', value: 'https://octanlink.com', type: 'url', group: 'general' },
    { key: 'support.email', value: 'support@octanlink.com', type: 'string', group: 'contact' },
    { key: 'support.livechat_enabled', value: 'true', type: 'boolean', group: 'feature' },
    { key: 'currency.gc_label', value: 'Gold Coins', type: 'string', group: 'branding' },
    { key: 'currency.sc_label', value: 'Sweepstakes Coins', type: 'string', group: 'branding' },
    { key: 'referral.reward_sc', value: '5.00', type: 'number', group: 'feature' },
  ].map((r: any) => ({ ...r, is_public: true }));

  await db.site_settings.createMany({ data: rows, skipDuplicates: true });

  const internalRows = [
    {
      key: 'provider.api_base_url',
      value: '/member/game/available-providers',
      type: 'url',
      group: 'integration',
      label: 'Provider catalog API base URL',
    },
  ].map((r: any) => ({ ...r, is_public: false }));
  
  await db.site_settings.createMany({ data: internalRows, skipDuplicates: true });

  console.log(`  site_settings: ${rows.length + internalRows.length}`);
}

async function seedSocialLinks() {
  const rows = [
    { platform: 'telegram', label: 'Telegram', url: 'https://t.me/octanlink', sort: 0 },
    { platform: 'facebook', label: 'Facebook', url: 'https://facebook.com/octanlink', sort: 1 },
    { platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/octanlink', sort: 2 },
    { platform: 'twitter', label: 'X (Twitter)', url: 'https://x.com/octanlink', sort: 3 },
    { platform: 'youtube', label: 'YouTube', url: 'https://youtube.com/@octanlink', sort: 4 },
    { platform: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/@octanlink', sort: 5 },
    { platform: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/10000000000', sort: 6 },
    { platform: 'email', label: 'Email', url: 'mailto:support@octanlink.mobi', sort: 7 },
  ];
  await db.social_links.createMany({ data: rows as any, skipDuplicates: true });
  console.log(`  social_links: ${rows.length}`);
}

async function seedRbac() {
  const matrix: Record<string, { group: string; actions: string[] }> = {
    users: { group: 'Players', actions: ['read', 'write'] },
    wallets: { group: 'Players', actions: ['read', 'write'] },
    agents: { group: 'Access', actions: ['read', 'write'] },
    kyc: { group: 'Players', actions: ['read', 'write'] },
    orders: { group: 'Finance', actions: ['read', 'write'] },
    transactions: { group: 'Finance', actions: ['read', 'write'] },
    redemption_reviews: { group: 'Finance', actions: ['read', 'write'] },
    providers: { group: 'Games', actions: ['read', 'write'] },
    bonuses: { group: 'Engagement', actions: ['read', 'write', 'delete'] },
    referrals: { group: 'Engagement', actions: ['read', 'write'] },
    content_pages: { group: 'Content', actions: ['read', 'write'] },
    banners: { group: 'Content', actions: ['read', 'write', 'delete'] },
    media: { group: 'Content', actions: ['upload', 'delete'] },
    settings: { group: 'Config', actions: ['read', 'manage'] },
    social_links: { group: 'Config', actions: ['read', 'manage'] },
    support_tickets: { group: 'Support', actions: ['read', 'write'] },
    postal_requests: { group: 'Support', actions: ['read', 'write'] },
    admins: { group: 'Access', actions: ['read', 'manage'] },
    roles: { group: 'Access', actions: ['read', 'manage'] },
    permissions: { group: 'Access', actions: ['read', 'manage'] },
    audit_logs: { group: 'Access', actions: ['read'] },
  };

  const allKeys: string[] = [];
  const permsToInsert = [];
  for (const [resource, { group, actions }] of Object.entries(matrix)) {
    for (const action of actions) {
      const key = `${resource}.${action}`;
      allKeys.push(key);
      permsToInsert.push({ key, resource, action, group, is_system: true });
    }
  }
  await db.permissions.createMany({ data: permsToInsert, skipDuplicates: true });

  const roleDefs: {
    slug: string;
    name: string;
    level: number;
    isSystem: boolean;
    keys: string[] | '*';
  }[] = [
    { slug: 'super_admin', name: 'Super Admin', level: 100, isSystem: true, keys: '*' },
    {
      slug: 'admin',
      name: 'Admin',
      level: 80,
      isSystem: true,
      keys: allKeys.filter(
        (k) => !['admins.manage', 'roles.manage', 'permissions.manage'].includes(k)
      ),
    },
    {
      slug: 'finance',
      name: 'Finance',
      level: 50,
      isSystem: false,
      keys: [
        'orders.read',
        'orders.write',
        'transactions.read',
        'transactions.write',
        'redemption_reviews.read',
        'redemption_reviews.write',
        'users.read',
        'wallets.read',
        'audit_logs.read',
      ],
    },
    {
      slug: 'content',
      name: 'Content',
      level: 40,
      isSystem: false,
      keys: [
        'content_pages.read',
        'content_pages.write',
        'banners.read',
        'banners.write',
        'banners.delete',
        'media.upload',
        'media.delete',
        'settings.read',
        'social_links.manage',
      ],
    },
    {
      slug: 'support',
      name: 'Support',
      level: 30,
      isSystem: false,
      keys: [
        'users.read',
        'kyc.read',
        'support_tickets.read',
        'support_tickets.write',
        'postal_requests.read',
        'postal_requests.write',
        'orders.read',
      ],
    },
  ];

  const permRecords = await db.permissions.findMany();
  const permByKey = new Map(permRecords.map((p) => [p.key, p.id]));

  for (const def of roleDefs) {
    let role = await db.roles.findUnique({ where: { slug: def.slug } });
    if (!role) {
      role = await db.roles.create({
        data: {
          slug: def.slug,
          name: def.name,
          level: def.level,
          is_system: def.isSystem,
        }
      });
    }

    const keys = def.keys === '*' ? [] : def.keys;
    for (const key of keys) {
      const pid = permByKey.get(key);
      if (pid) {
        await db.role_permissions.upsert({
          where: { role_id_permission_id: { role_id: role.id, permission_id: pid } },
          create: { role_id: role.id, permission_id: pid },
          update: {}
        });
      }
    }
  }

  const { password, rotate } = seedAdminPassword();
  const seedAdmins = [
    { username: 'superadmin', email: 'admin@octanlink.com', roles: ['super_admin'] },
    { username: 'opsadmin', email: 'ops@octanlink.com', roles: ['admin'] },
    { username: 'finance1', email: 'finance@octanlink.com', roles: ['finance'] },
    { username: 'support1', email: 'support@octanlink.com', roles: ['support'] },
  ];
  for (const a of seedAdmins) {
    await createAdmin({
      username: a.username,
      email: a.email,
      password,
      roleSlugs: a.roles,
      resetPasswordIfExists: rotate,
    });
    console.log(`  admin: ${a.email} → [${a.roles.join(', ')}]`);
  }

  console.log(`  permissions: ${allKeys.length}, roles: ${roleDefs.length}`);
}

async function main() {
  console.log('Seeding database…');
  await seedProviders();
  await seedDemoUserAndData();
  await seedProfileTasks();
  await seedHelp();
  await seedContentPages();
  await seedBanners();
  await seedSettings();
  await seedSocialLinks();
  await seedRbac();
  console.log('✓ Seed complete.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
