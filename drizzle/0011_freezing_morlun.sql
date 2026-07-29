ALTER TABLE "store_settings" ADD COLUMN "agent_withdraw_commission_per" numeric(5, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "agent_transactions" ADD COLUMN "commission_per" numeric(5, 2) DEFAULT '0' NOT NULL;
ALTER TABLE "agent_transactions" ADD COLUMN "net_amount" numeric(14, 2);