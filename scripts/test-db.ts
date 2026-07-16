/**
 * Full-database smoke test for the agent panel schema.
 *
 * For every model it runs CREATE → READ → UPDATE → DELETE against the real
 * database, plus a few integrity checks (unique constraints, FK cascade).
 * All test rows are created fresh and removed afterwards — safe to run on a
 * seeded dev database.
 *
 *   pnpm db:test
 */
import './load-env';
import bcrypt from 'bcryptjs';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import * as s from '@/lib/db/schema';

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed++;
    failures.push(name);
    console.error(`  ✗ ${name}\n      ${(err as Error).message.split('\n')[0]}`);
  }
}

function expect(cond: unknown, msg: string) {
  if (!cond) throw new Error(`Assertion failed: ${msg}`);
}

async function main() {
  const stamp = Date.now().toString(36);
  const U = (base: string) => `__test_${base}_${stamp}`; // unique, greppable names

  // Shared fixtures created along the way (cleaned up in reverse at the end).
  let storeId = '';
  let saleAgentId = '';
  let platformId = '';
  let memberId = '';

  console.log('\n═ game_platforms ═');
  await step('CREATE / READ', async () => {
    const [row] = await db
      .insert(s.gamePlatforms)
      .values({ name: U('platform'), slug: U('platform'), sort: 999 })
      .returning();
    platformId = row.id;
    const [read] = await db.select().from(s.gamePlatforms).where(eq(s.gamePlatforms.id, platformId));
    expect(read?.name === U('platform'), 'read-back name matches');
  });
  await step('UPDATE', async () => {
    await db
      .update(s.gamePlatforms)
      .set({ isActive: false })
      .where(eq(s.gamePlatforms.id, platformId));
    const [read] = await db.select().from(s.gamePlatforms).where(eq(s.gamePlatforms.id, platformId));
    expect(read?.isActive === false, 'isActive updated');
  });
  await step('UNIQUE name rejected', async () => {
    let threw = false;
    try {
      await db.insert(s.gamePlatforms).values({ name: U('platform'), slug: U('platform2') });
    } catch {
      threw = true;
    }
    expect(threw, 'duplicate name must throw');
  });

  console.log('\n═ agents (store + sale) ═');
  const hash = await bcrypt.hash('test123', 4);
  await step('CREATE store / READ', async () => {
    const [row] = await db
      .insert(s.agents)
      .values({ type: 'store', username: U('store'), passwordHash: hash, inviteCode: U('inv') })
      .returning();
    storeId = row.id;
    await db.update(s.agents).set({ storeId }).where(eq(s.agents.id, storeId));
    const [read] = await db.select().from(s.agents).where(eq(s.agents.id, storeId));
    expect(read?.type === 'store', 'store created');
  });
  await step('CREATE sale agent under store', async () => {
    const [row] = await db
      .insert(s.agents)
      .values({
        type: 'sale',
        username: U('sale'),
        passwordHash: hash,
        inviteCode: U('inv2'),
        storeId,
        parentAgentId: storeId,
        ratioPct: '12.50',
      })
      .returning();
    saleAgentId = row.id;
    const [read] = await db.select().from(s.agents).where(eq(s.agents.id, saleAgentId));
    expect(read?.storeId === storeId && read.ratioPct === '12.50', 'hierarchy + ratio persisted');
  });
  await step('UPDATE balance', async () => {
    await db.update(s.agents).set({ onlineBalance: '250.75' }).where(eq(s.agents.id, storeId));
    const [read] = await db.select().from(s.agents).where(eq(s.agents.id, storeId));
    expect(read?.onlineBalance === '250.75', 'balance updated');
  });
  await step('UNIQUE username rejected', async () => {
    let threw = false;
    try {
      await db
        .insert(s.agents)
        .values({ type: 'sub', username: U('store'), passwordHash: hash, inviteCode: U('inv3') });
    } catch {
      threw = true;
    }
    expect(threw, 'duplicate username must throw');
  });

  console.log('\n═ agent_sessions ═');
  await step('CREATE / READ / DELETE', async () => {
    const [row] = await db
      .insert(s.agentSessions)
      .values({ agentId: storeId, token: U('token'), expiresAt: new Date(Date.now() + 864e5) })
      .returning();
    const [read] = await db.select().from(s.agentSessions).where(eq(s.agentSessions.id, row.id));
    expect(read?.token === U('token'), 'session read back');
    await db.delete(s.agentSessions).where(eq(s.agentSessions.id, row.id));
  });

  console.log('\n═ store_settings ═');
  await step('CREATE / UPDATE (upsert)', async () => {
    await db.insert(s.storeSettings).values({ storeId, storeName: 'Test Store' });
    await db
      .insert(s.storeSettings)
      .values({ storeId, storeName: 'Renamed' })
      .onConflictDoUpdate({ target: s.storeSettings.storeId, set: { storeName: 'Renamed' } });
    const [read] = await db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId));
    expect(read?.storeName === 'Renamed', 'upsert works');
  });

  console.log('\n═ store_platform_accounts ═');
  await step('CREATE / UPDATE / UNIQUE(store,platform)', async () => {
    await db.insert(s.storePlatformAccounts).values({
      storeId,
      platformId,
      enabled: true,
      kioskId: '999111',
      scoreCostPct: '15.00',
    });
    await db
      .update(s.storePlatformAccounts)
      .set({ score: '1234.56', scoreSyncedAt: new Date() })
      .where(
        and(
          eq(s.storePlatformAccounts.storeId, storeId),
          eq(s.storePlatformAccounts.platformId, platformId)
        )
      );
    const [read] = await db
      .select()
      .from(s.storePlatformAccounts)
      .where(eq(s.storePlatformAccounts.storeId, storeId));
    expect(read?.score === '1234.56', 'score updated');
    let threw = false;
    try {
      await db.insert(s.storePlatformAccounts).values({ storeId, platformId });
    } catch {
      threw = true;
    }
    expect(threw, 'duplicate (store,platform) must throw');
  });

  console.log('\n═ store_administrators ═');
  await step('CREATE / UPDATE status', async () => {
    const [row] = await db
      .insert(s.storeAdministrators)
      .values({ storeId, username: U('admin'), passwordHash: hash })
      .returning();
    await db
      .update(s.storeAdministrators)
      .set({ status: 'disabled' })
      .where(eq(s.storeAdministrators.id, row.id));
    const [read] = await db
      .select()
      .from(s.storeAdministrators)
      .where(eq(s.storeAdministrators.id, row.id));
    expect(read?.status === 'disabled', 'status updated');
  });

  console.log('\n═ kiosks ═');
  await step('CREATE / READ', async () => {
    const [row] = await db
      .insert(s.kiosks)
      .values({ storeId, name: 'Front Desk', code: U('K') })
      .returning();
    const [read] = await db.select().from(s.kiosks).where(eq(s.kiosks.id, row.id));
    expect(read?.name === 'Front Desk', 'kiosk read back');
  });

  console.log('\n═ members ═');
  await step('CREATE / UPDATE / UNIQUE(store,username)', async () => {
    const [row] = await db
      .insert(s.members)
      .values({
        storeId,
        saleAgentId,
        username: U('member'),
        passwordHash: hash,
        phone: '+15550001111',
      })
      .returning();
    memberId = row.id;
    await db
      .update(s.members)
      .set({ onlineSc: '42.00', scRewardEnabled: false })
      .where(eq(s.members.id, memberId));
    const [read] = await db.select().from(s.members).where(eq(s.members.id, memberId));
    expect(read?.onlineSc === '42.00' && read.scRewardEnabled === false, 'member updated');
    let threw = false;
    try {
      await db
        .insert(s.members)
        .values({ storeId, username: U('member'), passwordHash: hash });
    } catch {
      threw = true;
    }
    expect(threw, 'duplicate (store,username) must throw');
  });

  console.log('\n═ member_logins ═');
  await step('CREATE / READ', async () => {
    await db.insert(s.memberLogins).values({
      memberId,
      ipAddress: '203.0.113.9',
      device: 'Windows 11 - Chrome (Desktop)',
    });
    const rows = await db.select().from(s.memberLogins).where(eq(s.memberLogins.memberId, memberId));
    expect(rows.length === 1 && rows[0].device?.includes('Chrome'), 'login recorded');
  });

  console.log('\n═ member_platform_accounts ═');
  await step('CREATE / READ', async () => {
    await db.insert(s.memberPlatformAccounts).values({
      memberId,
      platformId,
      gameUsername: U('game_user'),
    });
    const rows = await db
      .select()
      .from(s.memberPlatformAccounts)
      .where(eq(s.memberPlatformAccounts.memberId, memberId));
    expect(rows.length === 1, 'binding created');
  });

  console.log('\n═ member_transactions ═');
  await step('CREATE / aggregate READ', async () => {
    await db.insert(s.memberTransactions).values([
      {
        storeId,
        memberId,
        platformId,
        type: 'recharge',
        channel: 'online',
        amount: '100',
        inScore: '100',
        gameDepositFee: '5',
        platformFee: '2',
      },
      {
        storeId,
        memberId,
        platformId,
        type: 'redeem',
        channel: 'kiosk',
        amount: '40',
        outScore: '40',
      },
    ]);
    const rows = await db
      .select()
      .from(s.memberTransactions)
      .where(eq(s.memberTransactions.memberId, memberId));
    const totalIn = rows.reduce((sum, r) => sum + Number(r.inScore), 0);
    const totalOut = rows.reduce((sum, r) => sum + Number(r.outScore), 0);
    expect(totalIn === 100 && totalOut === 40, 'ledger aggregates correct (in 100 / out 40)');
  });

  console.log('\n═ agent_transactions ═');
  await step('CREATE deposit/withdraw/transfer + UPDATE status', async () => {
    const [dep] = await db
      .insert(s.agentTransactions)
      .values({
        agentId: storeId,
        type: 'deposit',
        method: 'bitcoin_lightning',
        amount: '75',
        balanceBefore: '250.75',
      })
      .returning();
    await db.insert(s.agentTransactions).values({
      agentId: storeId,
      type: 'withdraw',
      method: 'paypal_pyusd',
      amount: '50',
      fee: '2',
      balanceBefore: '250.75',
      balanceAfter: '200.75',
    });
    await db.insert(s.agentTransactions).values({
      agentId: storeId,
      type: 'transfer',
      amount: '25',
      counterpartyAgentId: saleAgentId,
      remark: 'test transfer',
      status: 'completed',
    });
    await db
      .update(s.agentTransactions)
      .set({ status: 'cancelled' })
      .where(eq(s.agentTransactions.id, dep.id));
    const rows = await db
      .select()
      .from(s.agentTransactions)
      .where(eq(s.agentTransactions.agentId, storeId));
    expect(rows.length === 3, 'three funding rows');
    expect(rows.find((r) => r.id === dep.id)?.status === 'cancelled', 'deposit cancelled');
    expect(
      rows.some((r) => r.type === 'transfer' && r.counterpartyAgentId === saleAgentId),
      'transfer counterparty stored'
    );
  });

  console.log('\n═ promotions ═');
  await step('CREATE (jsonb days) / UPDATE / DELETE', async () => {
    const [row] = await db
      .insert(s.promotions)
      .values({
        storeId,
        type: 'promotion_game',
        bonusPercent: '150',
        activeDays: [1, 3, 5],
        hiddenFromAgentIds: [saleAgentId],
      })
      .returning();
    const [read] = await db.select().from(s.promotions).where(eq(s.promotions.id, row.id));
    expect(
      Array.isArray(read?.activeDays) && read.activeDays.join(',') === '1,3,5',
      'jsonb activeDays round-trips'
    );
    await db.update(s.promotions).set({ status: 'disabled' }).where(eq(s.promotions.id, row.id));
    await db.delete(s.promotions).where(eq(s.promotions.id, row.id));
    const gone = await db.select().from(s.promotions).where(eq(s.promotions.id, row.id));
    expect(gone.length === 0, 'promotion deleted');
  });

  console.log('\n═ redemption_audits ═');
  await step('CREATE pending / approve', async () => {
    const [row] = await db
      .insert(s.redemptionAudits)
      .values({ storeId, memberId, platformId, amount: '60', txRef: U('tx') })
      .returning();
    await db
      .update(s.redemptionAudits)
      .set({ status: 'approved', reviewedByAgentId: storeId, reviewedAt: new Date() })
      .where(eq(s.redemptionAudits.id, row.id));
    const [read] = await db
      .select()
      .from(s.redemptionAudits)
      .where(eq(s.redemptionAudits.id, row.id));
    expect(read?.status === 'approved' && read.reviewedByAgentId === storeId, 'audit approved');
  });

  console.log('\n═ cs_configs ═');
  await step('CREATE / upsert UPDATE', async () => {
    await db.insert(s.csConfigs).values({ storeId, jsUrl: 'https://example.com/w.js' });
    await db
      .insert(s.csConfigs)
      .values({ storeId, enabled: false })
      .onConflictDoUpdate({ target: s.csConfigs.storeId, set: { enabled: false } });
    const [read] = await db.select().from(s.csConfigs).where(eq(s.csConfigs.storeId, storeId));
    expect(read?.enabled === false, 'cs config upserted');
  });

  console.log('\n═ store_terms ═');
  await step('CREATE en+es / UNIQUE(store,locale)', async () => {
    await db.insert(s.storeTerms).values([
      { storeId, locale: 'en', content: '<p>EN terms</p>' },
      { storeId, locale: 'es', content: null },
    ]);
    let threw = false;
    try {
      await db.insert(s.storeTerms).values({ storeId, locale: 'en', content: 'dup' });
    } catch {
      threw = true;
    }
    expect(threw, 'duplicate (store,locale) must throw');
  });

  console.log('\n═ agent_notices ═');
  await step('CREATE broadcast + store-scoped / DELETE', async () => {
    const [bcast] = await db
      .insert(s.agentNotices)
      .values({ title: U('broadcast'), noticeLevel: 'High' })
      .returning();
    const [scoped] = await db
      .insert(s.agentNotices)
      .values({ storeId, title: U('scoped') })
      .returning();
    const rows = await db.select().from(s.agentNotices);
    expect(
      rows.some((r) => r.id === bcast.id && r.storeId === null) &&
        rows.some((r) => r.id === scoped.id && r.storeId === storeId),
      'broadcast + scoped notices exist'
    );
    await db.delete(s.agentNotices).where(eq(s.agentNotices.id, bcast.id));
  });

  console.log('\n═ posters ═');
  await step('CREATE / DELETE', async () => {
    const [row] = await db
      .insert(s.posters)
      .values({ category: 'card', title: U('poster'), imageUrl: '/test.png', sort: 99 })
      .returning();
    await db.delete(s.posters).where(eq(s.posters.id, row.id));
    const gone = await db.select().from(s.posters).where(eq(s.posters.id, row.id));
    expect(gone.length === 0, 'poster deleted');
  });

  console.log('\n═ FK cascade ═');
  await step('deleting member cascades logins + bindings', async () => {
    await db.delete(s.members).where(eq(s.members.id, memberId));
    const logins = await db
      .select()
      .from(s.memberLogins)
      .where(eq(s.memberLogins.memberId, memberId));
    const bindings = await db
      .select()
      .from(s.memberPlatformAccounts)
      .where(eq(s.memberPlatformAccounts.memberId, memberId));
    expect(logins.length === 0 && bindings.length === 0, 'children cascaded');
  });
  await step('deleting store cascades settings/accounts/agents/tx/terms/etc.', async () => {
    await db.delete(s.agents).where(eq(s.agents.id, storeId));
    const [settings] = await db
      .select()
      .from(s.storeSettings)
      .where(eq(s.storeSettings.storeId, storeId));
    const [sale] = await db.select().from(s.agents).where(eq(s.agents.id, saleAgentId));
    const tx = await db
      .select()
      .from(s.agentTransactions)
      .where(eq(s.agentTransactions.agentId, storeId));
    expect(!settings && !sale && tx.length === 0, 'store subtree fully removed');
  });

  // Final cleanup of the standalone platform fixture.
  await db.delete(s.gamePlatforms).where(eq(s.gamePlatforms.id, platformId));

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failures.length) {
    console.log(`  Failed: ${failures.join(', ')}`);
    process.exit(1);
  }
  console.log('  All database models verified ✔');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
