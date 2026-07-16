import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { agents } from './agent';
import { agentTxTypeEnum, agentTxStatusEnum, withdrawMethodEnum } from './enums';

/** Agent funding ledger: deposits, withdrawals and inter-agent transfers. */
export const agentTransactions = pgTable(
  'agent_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    agentId: uuid('agent_id')
      .notNull()
      .references(() => agents.id, { onDelete: 'cascade' }),
    type: agentTxTypeEnum('type').notNull(),
    method: withdrawMethodEnum('method'),
    amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
    fee: numeric('fee', { precision: 14, scale: 2 }).notNull().default('0'),
    address: text('address'),
    counterpartyAgentId: uuid('counterparty_agent_id').references(() => agents.id),
    balanceBefore: numeric('balance_before', { precision: 14, scale: 2 }),
    balanceAfter: numeric('balance_after', { precision: 14, scale: 2 }),
    remark: text('remark'),
    status: agentTxStatusEnum('status').notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    agentTimeIdx: index('agent_tx_agent_time_idx').on(t.agentId, t.createdAt),
  })
);
