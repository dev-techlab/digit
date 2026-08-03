-- CreateEnum
CREATE TYPE "admin_status" AS ENUM ('active', 'suspended', 'invited');

-- CreateEnum
CREATE TYPE "agent_status" AS ENUM ('active', 'disabled');

-- CreateEnum
CREATE TYPE "agent_tx_status" AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "agent_tx_type" AS ENUM ('deposit', 'withdraw', 'transfer');

-- CreateEnum
CREATE TYPE "agent_type" AS ENUM ('store', 'sale', 'sub');

-- CreateEnum
CREATE TYPE "audit_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "banner_badge_icon" AS ENUM ('coin', 'percent');

-- CreateEnum
CREATE TYPE "banner_type" AS ENUM ('placeholder', 'gradient');

-- CreateEnum
CREATE TYPE "bonus_status" AS ENUM ('claimable', 'claimed', 'locked', 'none');

-- CreateEnum
CREATE TYPE "fee_mode" AS ENUM ('standard', 'waiver');

-- CreateEnum
CREATE TYPE "help_item_icon" AS ENUM ('play', 'coins', 'btc', 'pyusd');

-- CreateEnum
CREATE TYPE "help_section_icon" AS ENUM ('video', 'faq', 'guide');

-- CreateEnum
CREATE TYPE "help_tab" AS ENUM ('general', 'deposit', 'withdraw');

-- CreateEnum
CREATE TYPE "invitation_status" AS ENUM ('pending', 'accepted', 'revoked', 'expired');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('unverified', 'pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "media_kind" AS ENUM ('avatar', 'provider_icon', 'banner', 'logo', 'social_icon', 'content', 'kyc_doc', 'other');

-- CreateEnum
CREATE TYPE "member_tx_channel" AS ENUM ('online', 'kiosk');

-- CreateEnum
CREATE TYPE "member_tx_type" AS ENUM ('recharge', 'redeem', 'bonus', 'transfer');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "otp_purpose" AS ENUM ('register', 'login', 'bind_phone', 'reset_password');

-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('cashapp', 'btc', 'lightning', 'pyusd', 'ach', 'card', 'chime');

-- CreateEnum
CREATE TYPE "permission_effect" AS ENUM ('allow', 'deny');

-- CreateEnum
CREATE TYPE "postal_status" AS ENUM ('pending', 'completed', 'rejected');

-- CreateEnum
CREATE TYPE "poster_category" AS ENUM ('portrait', 'card');

-- CreateEnum
CREATE TYPE "promotion_status" AS ENUM ('enabled', 'disabled');

-- CreateEnum
CREATE TYPE "promotion_type" AS ENUM ('promotion_game', 'double_game', 'loyalty_drop');

-- CreateEnum
CREATE TYPE "provider_type" AS ENUM ('SC', 'GC');

-- CreateEnum
CREATE TYPE "referral_status" AS ENUM ('pending', 'claimed');

-- CreateEnum
CREATE TYPE "review_status" AS ENUM ('reviewing', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "schedule_icon" AS ENUM ('calendar', 'clock');

-- CreateEnum
CREATE TYPE "setting_type" AS ENUM ('string', 'number', 'boolean', 'json', 'url', 'color', 'image');

-- CreateEnum
CREATE TYPE "social_platform" AS ENUM ('facebook', 'instagram', 'twitter', 'telegram', 'whatsapp', 'youtube', 'tiktok', 'discord', 'email', 'livechat');

-- CreateEnum
CREATE TYPE "terms_locale" AS ENUM ('en', 'es');

-- CreateEnum
CREATE TYPE "ticket_status" AS ENUM ('open', 'answered', 'closed');

-- CreateEnum
CREATE TYPE "tx_status" AS ENUM ('pending', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "tx_type" AS ENUM ('deposit', 'withdraw');

-- CreateEnum
CREATE TYPE "user_status" AS ENUM ('active', 'blocked');

-- CreateEnum
CREATE TYPE "withdraw_method" AS ENUM ('paypal_pyusd', 'cashapp_usdc', 'bitcoin', 'bitcoin_lightning', 'bank_card', 'ach');

-- CreateTable
CREATE TABLE "admin_audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID,
    "action" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "changes" JSONB,
    "ip_address" INET,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_invitations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role_id" UUID,
    "invited_by_admin_id" UUID,
    "status" "invitation_status" NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_admin_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_permissions" (
    "admin_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "effect" "permission_effect" NOT NULL DEFAULT 'allow',
    "granted_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_permissions_admin_id_permission_id_pk" PRIMARY KEY ("admin_id","permission_id")
);

-- CreateTable
CREATE TABLE "admin_roles" (
    "admin_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_by_admin_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_roles_admin_id_role_id_pk" PRIMARY KEY ("admin_id","role_id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "admin_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "status" "admin_status" NOT NULL DEFAULT 'active',
    "last_login_at" TIMESTAMPTZ(6),
    "created_by_admin_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_notices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "notice_type" TEXT NOT NULL DEFAULT 'General',
    "notice_level" TEXT NOT NULL DEFAULT 'Normal',
    "publisher" TEXT NOT NULL DEFAULT 'Platform',
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_platform_mappings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "available_from_time" TEXT,
    "available_to_time" TEXT,

    CONSTRAINT "agent_platform_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_platforms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "available_from_time" TEXT,
    "available_to_time" TEXT,

    CONSTRAINT "agent_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "agent_id" UUID NOT NULL,
    "type" "agent_tx_type" NOT NULL,
    "method" "withdraw_method",
    "amount" DECIMAL(14,2) NOT NULL,
    "fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "address" TEXT,
    "counterparty_agent_id" UUID,
    "status" "agent_tx_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "balance_before" DECIMAL(14,2),
    "balance_after" DECIMAL(14,2),
    "remark" TEXT,
    "commission_per" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(14,2),

    CONSTRAINT "agent_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "agent_type" NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nickname" TEXT,
    "email" TEXT,
    "store_id" UUID,
    "parent_agent_id" UUID,
    "ratio_pct" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "invite_code" TEXT NOT NULL,
    "online_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "tips_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "agent_status" NOT NULL DEFAULT 'active',
    "remark" TEXT,
    "last_login_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "commission_per" DECIMAL(6,2) NOT NULL DEFAULT 0,

    CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banners" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "image_url" TEXT NOT NULL,
    "link_url" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonuses" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "banner_type" "banner_type" NOT NULL,
    "banner_gradient" TEXT,
    "banner_badge_icon" "banner_badge_icon",
    "banner_badge_text" TEXT,
    "schedule_icon" "schedule_icon" NOT NULL,
    "schedule_text" TEXT NOT NULL DEFAULT '',
    "schedule_countdown_seconds" INTEGER,
    "sort" SMALLINT NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_pages" (
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "content_pages_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "cs_configs" (
    "store_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "contact_phone_enabled" BOOLEAN NOT NULL DEFAULT false,
    "contact_phone" TEXT,
    "platform" TEXT NOT NULL DEFAULT 'Custom JS Widget',
    "js_url" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cs_configs_pkey" PRIMARY KEY ("store_id")
);

-- CreateTable
CREATE TABLE "game_platforms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon_url" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "external_id" INTEGER,
    "provider_code" TEXT,
    "provider_type" TEXT,
    "launch_url" TEXT,
    "synced_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "game_platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_providers" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "provider_code" TEXT NOT NULL,
    "launch_url_template" TEXT NOT NULL,
    "icon_url" TEXT NOT NULL,
    "status" SMALLINT NOT NULL,
    "sort" SMALLINT NOT NULL DEFAULT 0,
    "create_type" SMALLINT NOT NULL,
    "operate" SMALLINT NOT NULL,
    "need_init_balance" SMALLINT NOT NULL,
    "can_manual_input" SMALLINT NOT NULL,
    "provider_type" "provider_type" NOT NULL,
    "iframe_supported" BOOLEAN NOT NULL,
    "is_machine_supported" SMALLINT NOT NULL,
    "redeem_field" SMALLINT NOT NULL,
    "invalid_password_state" SMALLINT NOT NULL,
    "can_change_password" SMALLINT NOT NULL,
    "synced_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "game_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "section_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "icon" "help_item_icon",
    "body" TEXT,
    "sort" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "help_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_sections" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tab" "help_tab" NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "icon" "help_section_icon" NOT NULL,
    "sort" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "help_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_steps" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "item_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sort" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "help_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kiosks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "agent_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kiosks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "r2_key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL DEFAULT 'octanlink-media',
    "kind" "media_kind" NOT NULL,
    "content_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "original_name" TEXT,
    "uploaded_by_admin_id" UUID,
    "uploaded_by_user_id" UUID,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_logins" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "ip_address" INET,
    "device" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_logins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_platform_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "member_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "game_username" TEXT,
    "game_password" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_platform_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_transactions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "member_id" UUID,
    "platform_id" UUID,
    "type" "member_tx_type" NOT NULL,
    "channel" "member_tx_channel" NOT NULL DEFAULT 'online',
    "amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "online_sc_change" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "store_balance_vary" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "in_score" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "out_score" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bonus_score" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "game_deposit_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "platform_fee" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "agent_tx_status" NOT NULL DEFAULT 'completed',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "sale_agent_id" UUID,
    "sub_agent_id" UUID,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "online_sc" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sc_reward_enabled" BOOLEAN NOT NULL DEFAULT true,
    "remark" TEXT,
    "status" "agent_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_no" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "pay_amount" DECIMAL(18,2) NOT NULL,
    "actual_deposit_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "payment_method" TEXT NOT NULL,
    "fee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "fee_mode" "fee_mode" NOT NULL,
    "fee_waived" BOOLEAN NOT NULL DEFAULT false,
    "sc_bonus" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "order_status" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "destination" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "purpose" "otp_purpose" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempts" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "group" TEXT NOT NULL DEFAULT 'general',
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "postal_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "code" TEXT NOT NULL,
    "status" "postal_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "postal_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "posters" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "category" "poster_category" NOT NULL,
    "title" TEXT,
    "image_url" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_tasks" (
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reward_gc" INTEGER NOT NULL,
    "reward_sc" INTEGER NOT NULL,
    "sort" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "profile_tasks_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "assign_agent_id" UUID,
    "type" "promotion_type" NOT NULL,
    "hidden_from_agent_ids" JSONB NOT NULL DEFAULT '[]',
    "bonus_percent" DECIMAL(6,2) NOT NULL DEFAULT 100,
    "min_deposit" DECIMAL(12,2) NOT NULL DEFAULT 20,
    "max_bonus" DECIMAL(12,2) NOT NULL DEFAULT 100,
    "redemption_multiplier" DECIMAL(6,2) NOT NULL DEFAULT 2,
    "active_days" JSONB NOT NULL DEFAULT '[]',
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "hidden_from_players" BOOLEAN NOT NULL DEFAULT false,
    "online_only" BOOLEAN NOT NULL DEFAULT false,
    "status" "promotion_status" NOT NULL DEFAULT 'enabled',
    "remark" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_deposit_tiers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_id" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "bonus_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "sort" SMALLINT NOT NULL DEFAULT 0,

    CONSTRAINT "provider_deposit_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_audits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "member_id" UUID,
    "platform_id" UUID,
    "tx_ref" TEXT,
    "amount" DECIMAL(14,2) NOT NULL,
    "status" "audit_status" NOT NULL DEFAULT 'pending',
    "reviewed_by_agent_id" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "submitted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "redemption_audits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_no" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "provider_id" INTEGER,
    "provider_name" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "review_status" NOT NULL DEFAULT 'reviewing',
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "submitted_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "redemption_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_commissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "referrer_user_id" UUID NOT NULL,
    "invitee_user_id" UUID,
    "invitee_display" TEXT NOT NULL,
    "reward" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "status" "referral_status" NOT NULL DEFAULT 'pending',
    "joined_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "referral_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "granted_by_admin_id" UUID,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "level" SMALLINT NOT NULL DEFAULT 0,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "user_agent" TEXT,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "setting_type" NOT NULL DEFAULT 'string',
    "group" TEXT NOT NULL DEFAULT 'general',
    "label" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "social_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "platform" "social_platform" NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort" SMALLINT NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_administrators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nickname" TEXT,
    "email" TEXT,
    "status" "agent_status" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_administrators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_platform_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "kiosk_id" TEXT,
    "pos_account" TEXT,
    "pos_password" TEXT,
    "money_box" TEXT,
    "remark" TEXT,
    "score_cost_pct" DECIMAL(6,2) NOT NULL DEFAULT 20,
    "min_deposit" DECIMAL(12,2) NOT NULL DEFAULT 10,
    "min_redemption" DECIMAL(12,2) NOT NULL DEFAULT 10,
    "redeem_daily_limit" DECIMAL(12,2) NOT NULL DEFAULT 3000,
    "min_deposit_to_unlock" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "score" DECIMAL(14,2),
    "score_synced_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_platform_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_settings" (
    "store_id" UUID NOT NULL,
    "store_name" TEXT NOT NULL DEFAULT '',
    "daily_max_redeem" DECIMAL(12,2) NOT NULL DEFAULT 5000,
    "daily_max_withdraw" DECIMAL(12,2) NOT NULL DEFAULT 500,
    "phone_bind_reward_sc" DECIMAL(10,2) NOT NULL DEFAULT 3,
    "logo_url" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "agent_withdraw_commission_per" DECIMAL(5,2) NOT NULL DEFAULT 0,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("store_id")
);

-- CreateTable
CREATE TABLE "store_terms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "store_id" UUID NOT NULL,
    "locale" "terms_locale" NOT NULL,
    "content" TEXT,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "status" "ticket_status" NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "method_label" TEXT NOT NULL,
    "method" "payment_method" NOT NULL,
    "status" "tx_status" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "type" "tx_type" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_bonus_claims" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "bonus_id" TEXT NOT NULL,
    "status" "bonus_status" NOT NULL DEFAULT 'none',
    "claimed_at" TIMESTAMPTZ(6),
    "next_available_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_bonus_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_profile_task_claims" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "task_key" TEXT NOT NULL,
    "completed_at" TIMESTAMPTZ(6),
    "reward_claimed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_profile_task_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_provider_accounts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "provider_id" INTEGER NOT NULL,
    "game_username" TEXT NOT NULL,
    "game_password_enc" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "initialized" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_provider_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "username" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "phone" TEXT,
    "phone_bound" BOOLEAN NOT NULL DEFAULT false,
    "email" TEXT,
    "avatar_url" TEXT,
    "avatar_emoji" TEXT NOT NULL DEFAULT '🎰',
    "kyc_status" "kyc_status" NOT NULL DEFAULT 'unverified',
    "pwa_installed" BOOLEAN NOT NULL DEFAULT false,
    "invite_code" TEXT NOT NULL,
    "referred_by_user_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "user_status" NOT NULL DEFAULT 'active',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "gold_coin" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "online_sc" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "store_sc" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "kiosk_sc" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "unwagered" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "free_bonus" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_invitations_token_unique" ON "admin_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_unique" ON "admin_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "admins_username_unique" ON "admins"("username");

-- CreateIndex
CREATE UNIQUE INDEX "admins_email_unique" ON "admins"("email");

-- CreateIndex
CREATE UNIQUE INDEX "agent_platform_mappings_agent_platform_uq" ON "agent_platform_mappings"("agent_id", "platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_platforms_agent_platform_uq" ON "agent_platforms"("agent_id", "platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_sessions_token_unique" ON "agent_sessions"("token");

-- CreateIndex
CREATE INDEX "agent_tx_agent_time_idx" ON "agent_transactions"("agent_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "agents_username_unique" ON "agents"("username");

-- CreateIndex
CREATE UNIQUE INDEX "agents_invite_code_unique" ON "agents"("invite_code");

-- CreateIndex
CREATE INDEX "agents_store_idx" ON "agents"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_platforms_name_unique" ON "game_platforms"("name");

-- CreateIndex
CREATE UNIQUE INDEX "game_platforms_slug_unique" ON "game_platforms"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_r2_key_unique" ON "media_assets"("r2_key");

-- CreateIndex
CREATE INDEX "member_logins_member_idx" ON "member_logins"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "mpa_member_platform_uq" ON "member_platform_accounts"("member_id", "platform_id");

-- CreateIndex
CREATE INDEX "member_tx_store_platform_idx" ON "member_transactions"("store_id", "platform_id");

-- CreateIndex
CREATE INDEX "member_tx_store_time_idx" ON "member_transactions"("store_id", "created_at");

-- CreateIndex
CREATE INDEX "members_store_idx" ON "members"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "members_store_username_uq" ON "members"("store_id", "username");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_no_unique" ON "orders"("order_no");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_unique" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "redemption_audits_store_status_idx" ON "redemption_audits"("store_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_unique" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "roles_slug_unique" ON "roles"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_unique" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "social_links_platform_unique" ON "social_links"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "store_administrators_username_unique" ON "store_administrators"("username");

-- CreateIndex
CREATE UNIQUE INDEX "spa_store_platform_uq" ON "store_platform_accounts"("store_id", "platform_id");

-- CreateIndex
CREATE UNIQUE INDEX "store_terms_store_locale_uq" ON "store_terms"("store_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "user_bonus_claims_user_id_bonus_id_unique" ON "user_bonus_claims"("user_id", "bonus_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_profile_task_claims_user_id_task_key_unique" ON "user_profile_task_claims"("user_id", "task_key");

-- CreateIndex
CREATE UNIQUE INDEX "user_provider_accounts_user_id_provider_id_unique" ON "user_provider_accounts"("user_id", "provider_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_unique" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_invite_code_unique" ON "users"("invite_code");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_unique" ON "wallets"("user_id");

-- AddForeignKey
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_accepted_admin_id_admins_id_fk" FOREIGN KEY ("accepted_admin_id") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_invited_by_admin_id_admins_id_fk" FOREIGN KEY ("invited_by_admin_id") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_invitations" ADD CONSTRAINT "admin_invitations_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_granted_by_admin_id_admins_id_fk" FOREIGN KEY ("granted_by_admin_id") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_permissions" ADD CONSTRAINT "admin_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_assigned_by_admin_id_admins_id_fk" FOREIGN KEY ("assigned_by_admin_id") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_roles" ADD CONSTRAINT "admin_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_admins_id_fk" FOREIGN KEY ("admin_id") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_created_by_admin_id_admins_id_fk" FOREIGN KEY ("created_by_admin_id") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_notices" ADD CONSTRAINT "agent_notices_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_platform_mappings" ADD CONSTRAINT "agent_platform_mappings_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_platform_mappings" ADD CONSTRAINT "agent_platform_mappings_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "game_platforms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_platforms" ADD CONSTRAINT "agent_platforms_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_platforms" ADD CONSTRAINT "agent_platforms_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "game_platforms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_sessions" ADD CONSTRAINT "agent_sessions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_transactions" ADD CONSTRAINT "agent_transactions_counterparty_agent_id_agents_id_fk" FOREIGN KEY ("counterparty_agent_id") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_parent_agent_id_agents_id_fk" FOREIGN KEY ("parent_agent_id") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agents" ADD CONSTRAINT "agents_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cs_configs" ADD CONSTRAINT "cs_configs_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "help_items" ADD CONSTRAINT "help_items_section_id_help_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "help_sections"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "help_steps" ADD CONSTRAINT "help_steps_item_id_help_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "help_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kiosks" ADD CONSTRAINT "kiosks_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_admin_id_admins_id_fk" FOREIGN KEY ("uploaded_by_admin_id") REFERENCES "admins"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_user_id_users_id_fk" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_logins" ADD CONSTRAINT "member_logins_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_platform_accounts" ADD CONSTRAINT "member_platform_accounts_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_platform_accounts" ADD CONSTRAINT "member_platform_accounts_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "game_platforms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_transactions" ADD CONSTRAINT "member_transactions_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_transactions" ADD CONSTRAINT "member_transactions_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "game_platforms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_transactions" ADD CONSTRAINT "member_transactions_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_sale_agent_id_agents_id_fk" FOREIGN KEY ("sale_agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_sub_agent_id_agents_id_fk" FOREIGN KEY ("sub_agent_id") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "postal_requests" ADD CONSTRAINT "postal_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_assign_agent_id_agents_id_fk" FOREIGN KEY ("assign_agent_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "provider_deposit_tiers" ADD CONSTRAINT "provider_deposit_tiers_provider_id_game_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "game_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "redemption_audits" ADD CONSTRAINT "redemption_audits_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "redemption_audits" ADD CONSTRAINT "redemption_audits_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "game_platforms"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "redemption_audits" ADD CONSTRAINT "redemption_audits_reviewed_by_agent_id_agents_id_fk" FOREIGN KEY ("reviewed_by_agent_id") REFERENCES "agents"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "redemption_audits" ADD CONSTRAINT "redemption_audits_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "redemption_reviews" ADD CONSTRAINT "redemption_reviews_provider_id_game_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "game_providers"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "redemption_reviews" ADD CONSTRAINT "redemption_reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_invitee_user_id_users_id_fk" FOREIGN KEY ("invitee_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "referral_commissions" ADD CONSTRAINT "referral_commissions_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_granted_by_admin_id_admins_id_fk" FOREIGN KEY ("granted_by_admin_id") REFERENCES "admins"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "store_administrators" ADD CONSTRAINT "store_administrators_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "store_platform_accounts" ADD CONSTRAINT "store_platform_accounts_platform_id_game_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "game_platforms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "store_platform_accounts" ADD CONSTRAINT "store_platform_accounts_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "store_terms" ADD CONSTRAINT "store_terms_store_id_agents_id_fk" FOREIGN KEY ("store_id") REFERENCES "agents"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_bonus_claims" ADD CONSTRAINT "user_bonus_claims_bonus_id_bonuses_id_fk" FOREIGN KEY ("bonus_id") REFERENCES "bonuses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_bonus_claims" ADD CONSTRAINT "user_bonus_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile_task_claims" ADD CONSTRAINT "user_profile_task_claims_task_key_profile_tasks_key_fk" FOREIGN KEY ("task_key") REFERENCES "profile_tasks"("key") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_profile_task_claims" ADD CONSTRAINT "user_profile_task_claims_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_provider_accounts" ADD CONSTRAINT "user_provider_accounts_provider_id_game_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "game_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_provider_accounts" ADD CONSTRAINT "user_provider_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
