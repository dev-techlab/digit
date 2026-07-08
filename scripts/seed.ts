/**
 * Seed the database from the committed mock fixtures + reference data.
 *
 * Idempotent-ish: uses onConflictDoNothing on natural keys so re-running won't
 * duplicate. Run with: `pnpm db:seed` (after `pnpm db:migrate`).
 *
 * Mapping source of truth: DB_DIAGRAM.md §5 (mock → table) and §7 (RBAC seed).
 */
import './load-env';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';
import { HELP_CONTENT } from '@/lib/help-content';
import { PROFILE_TASKS } from '@/lib/profile-tasks';
import { createAdmin } from '@/lib/admin-service';

const ROOT = process.cwd();
const readJson = (p: string) => JSON.parse(readFileSync(join(ROOT, p), 'utf-8'));

/**
 * Resolve the seed admin password. `SEED_ADMIN_PASSWORD` (if set) is used and
 * ROTATES existing accounts. In production with none set, a strong random one
 * is generated and printed once (still rotates). In dev, falls back to a
 * well-known default that does NOT rotate an already-created admin.
 */
function seedAdminPassword(): { password: string; rotate: boolean } {
  const fromEnv = process.env.SEED_ADMIN_PASSWORD;
  if (fromEnv) return { password: fromEnv, rotate: true };
  if (process.env.NODE_ENV === 'production') {
    const generated = randomBytes(12).toString('base64url');
    console.warn(`  ⚠ SEED_ADMIN_PASSWORD unset — generated admin password: ${generated}`);
    return { password: generated, rotate: true };
  }
  return { password: 'admin1234', rotate: false }; // dev only
}

/** Parse "2026-06-27 16:31:16" (no tz) and ISO strings alike. */
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
    for (const p of rows) {
      await db
        .insert(s.gameProviders)
        .values({
          id: p.id,
          name: p.name,
          providerCode: p.providerCode,
          launchUrlTemplate: p.launchUrlTemplate,
          iconUrl: p.iconUrl,
          status: p.status,
          sort: p.sort,
          createType: p.createType,
          operate: p.operate,
          needInitBalance: p.needInitBalance,
          canManualInput: p.canManualInput,
          providerType: p.providerType,
          iframeSupported: p.iframeSupported,
          isMachineSupported: p.isMachineSupported,
          redeemField: p.redeemField,
          invalidPasswordState: p.invalidPasswordState,
          canChangePassword: p.canChangePassword,
        })
        .onConflictDoNothing();

      for (const [i, tier] of (p.depositTiers ?? []).entries()) {
        await db
          .insert(s.providerDepositTiers)
          .values({
            providerId: p.id,
            amount: tier.amount,
            bonusAmount: tier.bonusAmount,
            sort: i,
          })
          .onConflictDoNothing();
      }
    }
    console.log(`  providers[${file}]: ${rows.length}`);
  }
}

async function seedDemoUserAndData() {
  const referral = readJson('data/mock/referral.json');
  const wallet = readJson('data/mock/wallet.json');

  const passwordHash = await bcrypt.hash('demo1234', 10);
  const [user] = await db
    .insert(s.users)
    .values({
      username: 'player_2481',
      nickname: 'Lucky Player',
      passwordHash,
      avatarEmoji: '🎰',
      phoneBound: false,
      kycStatus: 'unverified',
      pwaInstalled: false,
      inviteCode: referral.inviteCode,
    })
    .onConflictDoNothing()
    .returning();

  const userId =
    user?.id ??
    (await db.query.users.findFirst({ where: (u, { eq }) => eq(u.username, 'player_2481') }))!.id;

  await db
    .insert(s.wallets)
    .values({
      userId,
      goldCoin: wallet.goldCoin,
      onlineSc: wallet.onlineSC,
      storeSc: wallet.storeSC,
      kioskSc: wallet.kioskSC,
      unwagered: wallet.unwagered,
      freeBonus: wallet.freeBonus,
    })
    .onConflictDoNothing();

  // Orders
  for (const o of readJson('data/mock/orders.json') as any[]) {
    await db
      .insert(s.orders)
      .values({
        orderNo: o.orderNo,
        userId,
        amount: o.amount,
        payAmount: o.payAmount,
        actualDepositAmount: o.actualDepositAmount,
        paymentMethod: o.paymentMethod,
        fee: o.fee,
        feeMode: o.feeMode,
        feeWaived: o.feeWaived,
        scBonus: o.scBonus,
        status: o.status,
        createdAt: parseDate(o.createTime),
      })
      .onConflictDoNothing();
  }

  // Transactions
  for (const t of readJson('data/mock/transactions.json') as any[]) {
    await db
      .insert(s.transactions)
      .values({
        id: t.id,
        userId,
        address: t.address,
        methodLabel: t.methodLabel,
        method: t.method,
        status: t.status,
        amount: t.amount,
        type: t.type,
        createdAt: parseDate(t.createTime),
      })
      .onConflictDoNothing();
  }

  // Bonuses (definition) + per-user claim state
  for (const b of readJson('data/mock/bonus.json') as any[]) {
    await db
      .insert(s.bonuses)
      .values({
        id: b.id,
        title: b.title,
        description: b.description,
        tags: b.tags,
        active: b.active,
        bannerType: b.banner.type,
        bannerGradient: b.banner.gradient ?? null,
        bannerBadgeIcon: b.banner.badgeIcon ?? null,
        bannerBadgeText: b.banner.badgeText ?? null,
        scheduleIcon: b.schedule.icon,
        scheduleText: b.schedule.text ?? '',
        scheduleCountdownSeconds: b.schedule.countdownSeconds ?? null,
      })
      .onConflictDoNothing();

    if (b.status && b.status !== 'none') {
      await db
        .insert(s.userBonusClaims)
        .values({
          userId,
          bonusId: b.id,
          status: b.status,
          claimedAt: b.status === 'claimed' ? new Date() : null,
        })
        .onConflictDoNothing();
    }
  }

  // Referral commissions (invitees) — these tables have no natural unique key,
  // so guard on "already seeded for this user" to stay idempotent.
  const hasReferrals = await db.query.referralCommissions.findFirst({
    where: (t, { eq }) => eq(t.referrerUserId, userId),
  });
  if (!hasReferrals) {
    for (const inv of referral.invitees as any[]) {
      await db.insert(s.referralCommissions).values({
        referrerUserId: userId,
        inviteeDisplay: inv.username,
        reward: inv.reward,
        status: inv.status,
        joinedAt: parseDate(inv.joinedAt),
      });
    }
  }

  // Redemption reviews (resolve provider name → id where possible). Guard by
  // orderNo so re-seeding doesn't duplicate.
  for (const r of readJson('data/mock/redemption-reviews.json') as any[]) {
    const exists = await db.query.redemptionReviews.findFirst({
      where: (t, { eq }) => eq(t.orderNo, r.orderNo),
    });
    if (exists) continue;
    const provider = await db.query.gameProviders.findFirst({
      where: (g, { eq }) => eq(g.name, r.provider),
    });
    await db.insert(s.redemptionReviews).values({
      orderNo: r.orderNo,
      userId,
      providerId: provider?.id ?? null,
      providerName: r.provider,
      amount: r.amount,
      status: r.status,
      visible: r.visible,
      submittedAt: parseDate(r.submittedAt),
    });
  }

  console.log('  demo user + wallet/orders/transactions/bonuses/referrals/redemptions');
}

async function seedProfileTasks() {
  for (const [i, t] of PROFILE_TASKS.entries()) {
    await db
      .insert(s.profileTasks)
      .values({
        key: t.key,
        title: t.title,
        description: t.description,
        rewardGc: t.rewardGc,
        rewardSc: t.rewardSc,
        sort: i,
      })
      .onConflictDoNothing();
  }
  console.log(`  profile_tasks: ${PROFILE_TASKS.length}`);
}

async function seedHelp() {
  // help_* rows have no natural key — skip entirely if already seeded.
  if (await db.query.helpSections.findFirst()) {
    console.log('  help_sections/items/steps: already seeded, skipped');
    return;
  }
  for (const [tab, sections] of Object.entries(HELP_CONTENT)) {
    for (const [si, section] of sections.entries()) {
      const [sec] = await db
        .insert(s.helpSections)
        .values({
          tab: tab as any,
          key: section.key,
          label: section.label,
          icon: section.icon as any,
          sort: si,
        })
        .returning();
      for (const [ii, item] of section.items.entries()) {
        const [it] = await db
          .insert(s.helpItems)
          .values({
            sectionId: sec.id,
            title: item.title,
            icon: (item as any).icon ?? null,
            body: (item as any).body ?? null,
            sort: ii,
          })
          .returning();
        for (const [pi, step] of ((item as any).steps ?? []).entries()) {
          await db.insert(s.helpSteps).values({
            itemId: it.id,
            title: step.title,
            description: step.description,
            sort: pi,
          });
        }
      }
    }
  }
  console.log('  help_sections/items/steps');
}

async function seedContentPages() {
  const pages = [
    ['terms', 'Terms & Conditions'],
    ['privacy', 'Privacy Policy'],
    ['sweeps-rules', 'Official Sweepstakes Rules'],
    ['responsible-gaming', 'Responsible Social Gameplay'],
    ['deposit-guide', 'How to Deposit'],
  ];
  for (const [slug, title] of pages) {
    await db
      .insert(s.contentPages)
      .values({
        slug,
        title,
        body: `> TODO: migrate the real copy from the ${slug} page component into this field.`,
      })
      .onConflictDoNothing();
  }
  console.log(`  content_pages: ${pages.length}`);
}

async function seedBanners() {
  // banners have only a random-uuid PK, so onConflict can't dedupe — guard instead.
  if (await db.query.banners.findFirst()) {
    console.log('  banners: already seeded, skipped');
    return;
  }
  const rows = [
    { imageUrl: 'https://media.digitlink.mobi/banners/weekend-reload.png', sort: 0 },
    { imageUrl: 'https://media.digitlink.mobi/banners/refer-friend.png', sort: 1 },
    { imageUrl: 'https://media.digitlink.mobi/banners/vip-loyalty.png', sort: 2 },
  ];
  await db.insert(s.banners).values(rows);
  console.log(`  banners: ${rows.length}`);
}

async function seedSettings() {
  const rows: (typeof s.siteSettings.$inferInsert)[] = [
    { key: 'site.name', value: 'Octan Link', type: 'string', group: 'branding' },
    {
      key: 'site.logo_url',
      value: 'https://digitlink.mobi/img/icons/icon-192x192.png',
      type: 'image',
      group: 'branding',
    },
    { key: 'site.url', value: 'https://octanlink.com', type: 'url', group: 'general' },
    { key: 'support.email', value: 'support@octanlink.com', type: 'string', group: 'contact' },
    { key: 'support.livechat_enabled', value: 'true', type: 'boolean', group: 'feature' },
    { key: 'currency.gc_label', value: 'Gold Coins', type: 'string', group: 'branding' },
    { key: 'currency.sc_label', value: 'Sweepstakes Coins', type: 'string', group: 'branding' },
    { key: 'referral.reward_sc', value: '5.00', type: 'number', group: 'feature' },
  ];
  // These seeded settings are all safe for the public site; mark them explicitly
  // now that is_public defaults to false (fail-closed).
  for (const r of rows) {
    await db
      .insert(s.siteSettings)
      .values({ ...r, isPublic: true })
      .onConflictDoNothing();
  }
  console.log(`  site_settings: ${rows.length}`);
}

async function seedSocialLinks() {
  const rows: (typeof s.socialLinks.$inferInsert)[] = [
    { platform: 'telegram', label: 'Telegram', url: 'https://t.me/octanlink', sort: 0 },
    { platform: 'facebook', label: 'Facebook', url: 'https://facebook.com/octanlink', sort: 1 },
    { platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/octanlink', sort: 2 },
    { platform: 'twitter', label: 'X (Twitter)', url: 'https://x.com/octanlink', sort: 3 },
    { platform: 'youtube', label: 'YouTube', url: 'https://youtube.com/@octanlink', sort: 4 },
    { platform: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/@octanlink', sort: 5 },
    { platform: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/10000000000', sort: 6 },
    { platform: 'email', label: 'Email', url: 'mailto:support@octanlink.mobi', sort: 7 },
  ];
  for (const r of rows) await db.insert(s.socialLinks).values(r).onConflictDoNothing();
  console.log(`  social_links: ${rows.length}`);
}

async function seedRbac() {
  // Permissions (DB_DIAGRAM §7.4)
  const matrix: Record<string, { group: string; actions: string[] }> = {
    users: { group: 'Players', actions: ['read', 'write'] },
    wallets: { group: 'Players', actions: ['read', 'write'] },
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
  for (const [resource, { group, actions }] of Object.entries(matrix)) {
    for (const action of actions) {
      const key = `${resource}.${action}`;
      allKeys.push(key);
      await db
        .insert(s.permissions)
        .values({ key, resource, action, group, isSystem: true })
        .onConflictDoNothing();
    }
  }

  // Roles (DB_DIAGRAM §7.5)
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

  const permByKey = new Map((await db.select().from(s.permissions)).map((p) => [p.key, p.id]));

  for (const def of roleDefs) {
    const [role] = await db
      .insert(s.roles)
      .values({
        slug: def.slug,
        name: def.name,
        level: def.level,
        isSystem: def.isSystem,
      })
      .onConflictDoNothing()
      .returning();
    const roleId =
      role?.id ??
      (await db.query.roles.findFirst({ where: (r, { eq }) => eq(r.slug, def.slug) }))!.id;

    // super_admin gets no explicit rows (implicit '*' via the role slug in RBAC)
    const keys = def.keys === '*' ? [] : def.keys;
    for (const key of keys) {
      const pid = permByKey.get(key);
      if (pid) {
        await db
          .insert(s.rolePermissions)
          .values({ roleId, permissionId: pid })
          .onConflictDoNothing();
      }
    }
  }

  // Seed admin *users* as data, each with role(s) assigned via admin_roles —
  // no static super flag. Super-admin = the super_admin role.
  //
  // Password source (see seedAdminPassword): SEED_ADMIN_PASSWORD if set (and it
  // ROTATES existing accounts); otherwise a random one in production (printed
  // once); otherwise the dev-only default 'admin1234'. Never ships a fixed
  // credential to production.
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
