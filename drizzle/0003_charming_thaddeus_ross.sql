CREATE TYPE "public"."agent_status" AS ENUM('active', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."agent_tx_status" AS ENUM('pending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."agent_tx_type" AS ENUM('deposit', 'withdraw', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."agent_type" AS ENUM('store', 'sale', 'sub');--> statement-breakpoint
CREATE TYPE "public"."audit_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."member_tx_channel" AS ENUM('online', 'kiosk');--> statement-breakpoint
CREATE TYPE "public"."member_tx_type" AS ENUM('recharge', 'redeem', 'bonus', 'transfer');--> statement-breakpoint
CREATE TYPE "public"."poster_category" AS ENUM('portrait', 'card');--> statement-breakpoint
CREATE TYPE "public"."promotion_status" AS ENUM('enabled', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."promotion_type" AS ENUM('promotion_game', 'double_game', 'loyalty_drop');--> statement-breakpoint
CREATE TYPE "public"."terms_locale" AS ENUM('en', 'es');--> statement-breakpoint
CREATE TYPE "public"."withdraw_method" AS ENUM('paypal_pyusd', 'cashapp_usdc', 'bitcoin', 'bank_card', 'ach');--> statement-breakpoint
CREATE TABLE "agent_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"token" text NOT NULL,
	"ip_address" "inet",
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "agent_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"type" "agent_tx_type" NOT NULL,
	"method" "withdraw_method",
	"amount" numeric(14, 2) NOT NULL,
	"fee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"address" text,
	"counterparty_agent_id" uuid,
	"status" "agent_tx_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "agent_type" NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"nickname" text,
	"email" text,
	"store_id" uuid,
	"parent_agent_id" uuid,
	"ratio_pct" numeric(6, 2) DEFAULT '0' NOT NULL,
	"invite_code" text NOT NULL,
	"online_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tips_balance" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "agent_status" DEFAULT 'active' NOT NULL,
	"remark" text,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agents_username_unique" UNIQUE("username"),
	CONSTRAINT "agents_invite_code_unique" UNIQUE("invite_code")
);
--> statement-breakpoint
CREATE TABLE "cs_configs" (
	"store_id" uuid PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"contact_phone_enabled" boolean DEFAULT false NOT NULL,
	"contact_phone" text,
	"platform" text DEFAULT 'Custom JS Widget' NOT NULL,
	"js_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "game_platforms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"icon_url" text,
	"sort" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "game_platforms_name_unique" UNIQUE("name"),
	CONSTRAINT "game_platforms_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "kiosks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"status" "agent_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_logins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"ip_address" "inet",
	"device" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_platform_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"game_username" text,
	"game_password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "member_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"member_id" uuid,
	"platform_id" uuid,
	"type" "member_tx_type" NOT NULL,
	"channel" "member_tx_channel" DEFAULT 'online' NOT NULL,
	"amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"online_sc_change" numeric(14, 2) DEFAULT '0' NOT NULL,
	"store_balance_vary" numeric(14, 2) DEFAULT '0' NOT NULL,
	"in_score" numeric(14, 2) DEFAULT '0' NOT NULL,
	"out_score" numeric(14, 2) DEFAULT '0' NOT NULL,
	"bonus_score" numeric(14, 2) DEFAULT '0' NOT NULL,
	"game_deposit_fee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"platform_fee" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" "agent_tx_status" DEFAULT 'completed' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"sale_agent_id" uuid,
	"sub_agent_id" uuid,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"phone" text,
	"online_sc" numeric(14, 2) DEFAULT '0' NOT NULL,
	"sc_reward_enabled" boolean DEFAULT true NOT NULL,
	"remark" text,
	"status" "agent_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" "poster_category" NOT NULL,
	"title" text,
	"image_url" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promotions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"assign_agent_id" uuid,
	"type" "promotion_type" NOT NULL,
	"hidden_from_agent_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"bonus_percent" numeric(6, 2) DEFAULT '100' NOT NULL,
	"min_deposit" numeric(12, 2) DEFAULT '20' NOT NULL,
	"max_bonus" numeric(12, 2) DEFAULT '100' NOT NULL,
	"redemption_multiplier" numeric(6, 2) DEFAULT '2' NOT NULL,
	"active_days" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"timezone" text DEFAULT 'America/New_York' NOT NULL,
	"hidden_from_players" boolean DEFAULT false NOT NULL,
	"online_only" boolean DEFAULT false NOT NULL,
	"status" "promotion_status" DEFAULT 'enabled' NOT NULL,
	"remark" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "redemption_audits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"member_id" uuid,
	"platform_id" uuid,
	"tx_ref" text,
	"amount" numeric(14, 2) NOT NULL,
	"status" "audit_status" DEFAULT 'pending' NOT NULL,
	"reviewed_by_agent_id" uuid,
	"reviewed_at" timestamp with time zone,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_administrators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"nickname" text,
	"email" text,
	"status" "agent_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_administrators_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "store_platform_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"platform_id" uuid NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"kiosk_id" text,
	"pos_account" text,
	"pos_password" text,
	"money_box" text,
	"remark" text,
	"score_cost_pct" numeric(6, 2) DEFAULT '20' NOT NULL,
	"min_deposit" numeric(12, 2) DEFAULT '10' NOT NULL,
	"min_redemption" numeric(12, 2) DEFAULT '10' NOT NULL,
	"redeem_daily_limit" numeric(12, 2) DEFAULT '3000' NOT NULL,
	"min_deposit_to_unlock" numeric(12, 2) DEFAULT '0' NOT NULL,
	"score" numeric(14, 2),
	"score_synced_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"store_id" uuid PRIMARY KEY NOT NULL,
	"store_name" text DEFAULT '' NOT NULL,
	"daily_max_redeem" numeric(12, 2) DEFAULT '5000' NOT NULL,
	"daily_max_withdraw" numeric(12, 2) DEFAULT '500' NOT NULL,
	"phone_bind_reward_sc" numeric(10, 2) DEFAULT '3' NOT NULL,
	"logo_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"locale" "terms_locale" NOT NULL,
	"content" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_counterparty_agent_id_agents_id_fk" FOREIGN KEY ("counterparty_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_parent_agent_id_agents_id_fk" FOREIGN KEY ("parent_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cs_configs" ADD CONSTRAINT "cs_configs_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kiosks" ADD CONSTRAINT "kiosks_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_logins" ADD CONSTRAINT "member_logins_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_platform_accounts" ADD CONSTRAINT "member_platform_accounts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_platform_accounts" ADD CONSTRAINT "member_platform_accounts_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."game_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_transactions" ADD CONSTRAINT "member_transactions_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_transactions" ADD CONSTRAINT "member_transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_transactions" ADD CONSTRAINT "member_transactions_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."game_platforms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_sale_agent_id_agents_id_fk" FOREIGN KEY ("sale_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_sub_agent_id_agents_id_fk" FOREIGN KEY ("sub_agent_id") REFERENCES "public"."agents"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_assign_agent_id_agents_id_fk" FOREIGN KEY ("assign_agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_audits" ADD CONSTRAINT "redemption_audits_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_audits" ADD CONSTRAINT "redemption_audits_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_audits" ADD CONSTRAINT "redemption_audits_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."game_platforms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redemption_audits" ADD CONSTRAINT "redemption_audits_reviewed_by_agent_id_agents_id_fk" FOREIGN KEY ("reviewed_by_agent_id") REFERENCES "public"."agents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_administrators" ADD CONSTRAINT "store_administrators_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_platform_accounts" ADD CONSTRAINT "store_platform_accounts_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_platform_accounts" ADD CONSTRAINT "store_platform_accounts_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."game_platforms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_terms" ADD CONSTRAINT "store_terms_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_tx_agent_time_idx" ON "agent_transactions" USING btree ("agent_id","created_at");--> statement-breakpoint
CREATE INDEX "agents_store_idx" ON "agents" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "member_logins_member_idx" ON "member_logins" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX "mpa_member_platform_uq" ON "member_platform_accounts" USING btree ("member_id","platform_id");--> statement-breakpoint
CREATE INDEX "member_tx_store_time_idx" ON "member_transactions" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "member_tx_store_platform_idx" ON "member_transactions" USING btree ("store_id","platform_id");--> statement-breakpoint
CREATE UNIQUE INDEX "members_store_username_uq" ON "members" USING btree ("store_id","username");--> statement-breakpoint
CREATE INDEX "members_store_idx" ON "members" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "redemption_audits_store_status_idx" ON "redemption_audits" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "spa_store_platform_uq" ON "store_platform_accounts" USING btree ("store_id","platform_id");--> statement-breakpoint
CREATE UNIQUE INDEX "store_terms_store_locale_uq" ON "store_terms" USING btree ("store_id","locale");