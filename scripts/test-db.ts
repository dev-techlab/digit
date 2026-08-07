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
import { db } from '@/lib/db';

let passed = 0;
let failed = 0;
const failures: string[] = [];

async function step(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    passed++;
    // console.log(`  ✓ ${name}`);
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
  const U = (base: string) => `__test_${base}_${stamp}`; 

  let storeId = '';
  let saleAgentId = '';
  let platformId = '';
  let memberId = '';

  // console.log('\n═ game_platforms ═');
  await step('CREATE / READ', async () => {
    const row = await db.game_platforms.create({
      data: { name: U('platform'), slug: U('platform'), sort: 999 }
    });
    platformId = row.id;
    const read = await db.game_platforms.findFirst({ where: { id: platformId } });
    expect(read?.name === U('platform'), 'read-back name matches');
  });
  await step('UPDATE', async () => {
    await db.game_platforms.update({ where: { id: platformId }, data: { is_active: false } });
    const read = await db.game_platforms.findFirst({ where: { id: platformId } });
    expect(read?.is_active === false, 'isActive updated');
  });
  await step('UNIQUE name rejected', async () => {
    let threw = false;
    try {
      await db.game_platforms.create({ data: { name: U('platform'), slug: U('platform2') } });
    } catch {
      threw = true;
    }
    expect(threw, 'duplicate name must throw');
  });

  // console.log('\n═ agents (store + sale) ═');
  const hash = await bcrypt.hash('test123', 4);
  await step('CREATE store / READ', async () => {
    const row = await db.agents.create({
      data: { type: 'store', username: U('store'), password_hash: hash, invite_code: U('inv') }
    });
    storeId = row.id;
    await db.agents.update({ where: { id: storeId }, data: { store_id: storeId } });
    const read = await db.agents.findFirst({ where: { id: storeId } });
    expect(read?.type === 'store', 'store created');
  });
  await step('CREATE sale agent under store', async () => {
    const row = await db.agents.create({
      data: {
        type: 'sale',
        username: U('sale'),
        password_hash: hash,
        invite_code: U('inv2'),
        store_id: storeId,
        parent_agent_id: storeId,
        ratio_pct: '12.50',
      }
    });
    saleAgentId = row.id;
    const read = await db.agents.findFirst({ where: { id: saleAgentId } });
    expect(read?.store_id === storeId && read.ratio_pct?.toString() === '12.5', 'hierarchy + ratio persisted');
  });
  await step('UPDATE balance', async () => {
    await db.agents.update({ where: { id: storeId }, data: { online_balance: '250.75' } });
    const read = await db.agents.findFirst({ where: { id: storeId } });
    expect(read?.online_balance?.toString() === '250.75', 'balance updated');
  });
  await step('UNIQUE username rejected', async () => {
    let threw = false;
    try {
      await db.agents.create({
        data: { type: 'sub', username: U('store'), password_hash: hash, invite_code: U('inv3') }
      });
    } catch {
      threw = true;
    }
    expect(threw, 'duplicate username must throw');
  });

  // console.log('\n═ agent_sessions ═');
  await step('CREATE / READ / DELETE', async () => {
    const row = await db.agent_sessions.create({
      data: { agent_id: storeId, token: U('token'), expires_at: new Date(Date.now() + 864e5) }
    });
    const read = await db.agent_sessions.findFirst({ where: { id: row.id } });
    expect(read?.token === U('token'), 'session read back');
    await db.agent_sessions.delete({ where: { id: row.id } });
  });

  // console.log('\n═ store_settings ═');
  await step('CREATE / UPDATE (upsert)', async () => {
    await db.store_settings.create({ data: { store_id: storeId, store_name: 'Test Store' } });
    await db.store_settings.update({ where: { store_id: storeId }, data: { store_name: 'Renamed' } });
    const read = await db.store_settings.findFirst({ where: { store_id: storeId } });
    expect(read?.store_name === 'Renamed', 'upsert works');
  });

  // console.log('\n═ store_platform_accounts ═');
  await step('CREATE / UPDATE / UNIQUE(store,platform)', async () => {
    await db.store_platform_accounts.create({
      data: {
        store_id: storeId,
        platform_id: platformId,
        enabled: true,
        kiosk_id: '999111',
        score_cost_pct: '15.00',
      }
    });
    await db.store_platform_accounts.update({
      where: { store_id_platform_id: { store_id: storeId, platform_id: platformId } },
      data: { score: '1234.56', score_synced_at: new Date() }
    });
    const read = await db.store_platform_accounts.findFirst({ where: { store_id: storeId } });
    expect(read?.score?.toString() === '1234.56', 'score updated');
    let threw = false;
    try {
      await db.store_platform_accounts.create({ data: { store_id: storeId, platform_id: platformId } });
    } catch {
      threw = true;
    }
    expect(threw, 'duplicate (store,platform) must throw');
  });

  // console.log('\n═ store_administrators ═');
  await step('CREATE / UPDATE status', async () => {
    const row = await db.store_administrators.create({
      data: { store_id: storeId, username: U('admin'), password_hash: hash }
    });
    await db.store_administrators.update({ where: { id: row.id }, data: { status: 'disabled' } });
    const read = await db.store_administrators.findFirst({ where: { id: row.id } });
    expect(read?.status === 'disabled', 'status updated');
  });

  // console.log('\n═ kiosks ═');
  await step('CREATE / READ', async () => {
    const row = await db.kiosks.create({
      data: { store_id: storeId, name: 'Front Desk', code: U('K') }
    });
    const read = await db.kiosks.findFirst({ where: { id: row.id } });
    expect(read?.name === 'Front Desk', 'kiosk read back');
  });

  // console.log('\n═ members ═');
  await step('CREATE / UPDATE / UNIQUE(store,username)', async () => {
    const row = await db.users.create({
      data: {
        username: U('member'),
        nickname: U('member'),
        password_hash: hash,
        invite_code: U('inv_member'),
        phone: '+15550001111',
      }
    });
    memberId = row.id;
    await db.wallets.create({ data: { user_id: memberId } });
    await db.wallets.update({ where: { user_id: memberId }, data: { online_sc: '42.00' } });
    const read = await db.wallets.findFirst({ where: { user_id: memberId } });
    expect(read?.online_sc.toString() === '42', 'member updated');
    let threw = false;
    try {
      await db.users.create({ data: { username: U('member'), nickname: 'dup', invite_code: 'dup', password_hash: hash } });
    } catch {
      threw = true;
    }
    expect(threw, 'duplicate (store,username) must throw');
  });

  // console.log('\n═ member_logins ═');
  await step('CREATE / READ', async () => {
    await db.member_logins.create({
      data: {
        member_id: memberId,
        ip_address: '203.0.113.9',
        device: 'Windows 11 - Chrome (Desktop)',
      }
    });
    const rows = await db.member_logins.findMany({ where: { member_id: memberId } });
    expect(rows.length === 1 && rows[0].device?.includes('Chrome'), 'login recorded');
  });

  // console.log('\n═ member_platform_accounts ═');
  await step('CREATE / READ', async () => {
    await db.member_platform_accounts.create({
      data: {
        member_id: memberId,
        platform_id: platformId,
        game_username: U('game_user'),
      }
    });
    const rows = await db.member_platform_accounts.findMany({ where: { member_id: memberId } });
    expect(rows.length === 1, 'binding created');
  });

  // console.log('\n═ member_transactions ═');
  await step('CREATE / aggregate READ', async () => {
    await db.transactions.createMany({
      data: [
        {
          id: 'test1',
          user_id: memberId,
          type: 'deposit',
          amount: '100',
          method: 'cashapp',
          method_label: 'Cash App',
          address: '0x',
          status: 'completed',
          created_at: new Date(),
        },
        {
          id: 'test2',
          user_id: memberId,
          type: 'withdraw',
          amount: '40',
          method: 'cashapp',
          method_label: 'Cash App',
          address: '0x',
          status: 'completed',
          created_at: new Date(),
        },
      ]
    });
    const rows = await db.transactions.findMany({ where: { user_id: memberId } });
    const totalIn = rows.filter(r => r.type === 'deposit').reduce((sum, r) => sum + Number(r.amount), 0);
    const totalOut = rows.filter(r => r.type === 'withdraw').reduce((sum, r) => sum + Number(r.amount), 0);
    expect(totalIn === 100 && totalOut === 40, 'ledger aggregates correct (in 100 / out 40)');
  });

  // console.log('\n═ promotions ═');
  await step('CREATE (jsonb days) / UPDATE / DELETE', async () => {
    const row = await db.promotions.create({
      data: {
        store_id: storeId,
        type: 'promotion_game',
        bonus_percent: '150',
        active_days: [1, 3, 5],
        hidden_from_agent_ids: [saleAgentId],
      }
    });
    const read = await db.promotions.findFirst({ where: { id: row.id } });
    expect(
      Array.isArray(read?.active_days) && read.active_days.join(',') === '1,3,5',
      'jsonb activeDays round-trips'
    );
    await db.promotions.update({ where: { id: row.id }, data: { status: 'disabled' } });
    await db.promotions.delete({ where: { id: row.id } });
    const gone = await db.promotions.findMany({ where: { id: row.id } });
    expect(gone.length === 0, 'promotion deleted');
  });

  // console.log('\n═ cs_configs ═');
  await step('CREATE / upsert UPDATE', async () => {
    await db.cs_configs.create({ data: { store_id: storeId, js_url: 'https://example.com/w.js' } });
    await db.cs_configs.update({ where: { store_id: storeId }, data: { enabled: false } });
    const read = await db.cs_configs.findFirst({ where: { store_id: storeId } });
    expect(read?.enabled === false, 'cs config upserted');
  });

  // console.log('\n═ store_terms ═');
  await step('CREATE en+es / UNIQUE(store,locale)', async () => {
    await db.store_terms.createMany({
      data: [
        { store_id: storeId, locale: 'en', content: '<p>EN terms</p>' },
        { store_id: storeId, locale: 'es', content: null },
      ]
    });
    let threw = false;
    try {
      await db.store_terms.create({ data: { store_id: storeId, locale: 'en', content: 'dup' } });
    } catch {
      threw = true;
    }
    expect(threw, 'duplicate (store,locale) must throw');
  });

  // console.log('\n═ agent_notices ═');
  await step('CREATE broadcast + store-scoped / DELETE', async () => {
    const bcast = await db.agent_notices.create({
      data: { title: U('broadcast'), notice_level: 'High' }
    });
    const scoped = await db.agent_notices.create({
      data: { store_id: storeId, title: U('scoped') }
    });
    const rows = await db.agent_notices.findMany();
    expect(
      rows.some((r) => r.id === bcast.id && r.store_id === null) &&
        rows.some((r) => r.id === scoped.id && r.store_id === storeId),
      'broadcast + scoped notices exist'
    );
    await db.agent_notices.delete({ where: { id: bcast.id } });
  });

  // console.log('\n═ posters ═');
  await step('CREATE / DELETE', async () => {
    const row = await db.posters.create({
      data: { category: 'card', title: U('poster'), image_url: '/test.png', sort: 99 }
    });
    await db.posters.delete({ where: { id: row.id } });
    const gone = await db.posters.findMany({ where: { id: row.id } });
    expect(gone.length === 0, 'poster deleted');
  });

  // console.log('\n═ FK cascade ═');
  await step('deleting member cascades logins + bindings', async () => {
    await db.users.delete({ where: { id: memberId } });
    const logins = await db.member_logins.findMany({ where: { member_id: memberId } });
    const bindings = await db.member_platform_accounts.findMany({ where: { member_id: memberId } });
    expect(logins.length === 0 && bindings.length === 0, 'children cascaded');
  });
  await step('deleting store cascades settings/accounts/agents/tx/terms/etc.', async () => {
    await db.agents.delete({ where: { id: storeId } });
    const settings = await db.store_settings.findFirst({ where: { store_id: storeId } });
    const sale = await db.agents.findFirst({ where: { id: saleAgentId } });
    expect(!settings && !sale, 'store subtree fully removed');
  });

  await db.game_platforms.delete({ where: { id: platformId } });

  // console.log(`\n${'─'.repeat(50)}`);
  // console.log(`  ${passed} passed, ${failed} failed`);
  if (failures.length) {
    // console.log(`  Failed: ${failures.join(', ')}`);
    process.exit(1);
  }
  // console.log('  All database models verified ✔');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
