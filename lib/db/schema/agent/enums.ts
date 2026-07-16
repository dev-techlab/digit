import { pgEnum } from 'drizzle-orm/pg-core';

// ---------------------------------------------------------------------------
// Agent panel enums — shared by the models in this directory.
// ---------------------------------------------------------------------------

export const agentTypeEnum = pgEnum('agent_type', ['store', 'sale', 'sub']);
export const agentStatusEnum = pgEnum('agent_status', ['active', 'disabled']);
export const agentTxTypeEnum = pgEnum('agent_tx_type', ['deposit', 'withdraw', 'transfer']);
export const agentTxStatusEnum = pgEnum('agent_tx_status', [
  'pending',
  'completed',
  'failed',
  'cancelled',
]);
export const withdrawMethodEnum = pgEnum('withdraw_method', [
  'paypal_pyusd',
  'cashapp_usdc',
  'bitcoin',
  'bitcoin_lightning',
  'bank_card',
  'ach',
]);
export const memberTxTypeEnum = pgEnum('member_tx_type', [
  'recharge', // money in → score loaded into game
  'redeem', // score out → money back to member
  'bonus', // promotion credit
  'transfer', // online SC movement
]);
export const memberTxChannelEnum = pgEnum('member_tx_channel', ['online', 'kiosk']);
export const promotionTypeEnum = pgEnum('promotion_type', [
  'promotion_game', // 100% bonus, first game after first deposit of the day
  'double_game',
  'loyalty_drop',
]);
export const promotionStatusEnum = pgEnum('promotion_status', ['enabled', 'disabled']);
export const auditStatusEnum = pgEnum('audit_status', ['pending', 'approved', 'rejected']);
export const posterCategoryEnum = pgEnum('poster_category', ['portrait', 'card']);
export const termsLocaleEnum = pgEnum('terms_locale', ['en', 'es']);
