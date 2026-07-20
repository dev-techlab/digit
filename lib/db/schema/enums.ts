import { pgEnum } from 'drizzle-orm/pg-core';

// --- Players / money ---
export const kycStatusEnum = pgEnum('kyc_status', [
  'unverified',
  'pending',
  'verified',
  'rejected',
]);
export const userStatusEnum = pgEnum('user_status', ['active', 'blocked']);
export const providerTypeEnum = pgEnum('provider_type', ['SC', 'GC']);
export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'completed',
  'failed',
  'cancelled',
]);
export const feeModeEnum = pgEnum('fee_mode', ['standard', 'waiver']);
export const paymentMethodEnum = pgEnum('payment_method', [
  'cashapp',
  'btc',
  'lightning',
  'pyusd',
  'ach',
  'card',
  'chime',
]);
export const txStatusEnum = pgEnum('tx_status', [
  'pending',
  'completed',
  'failed',
  'cancelled',
]);
export const txTypeEnum = pgEnum('tx_type', ['deposit', 'withdraw']);

// --- Engagement ---
export const bannerTypeEnum = pgEnum('banner_type', ['placeholder', 'gradient']);
export const bannerBadgeIconEnum = pgEnum('banner_badge_icon', ['coin', 'percent']);
export const scheduleIconEnum = pgEnum('schedule_icon', ['calendar', 'clock']);
export const bonusStatusEnum = pgEnum('bonus_status', [
  'claimable',
  'claimed',
  'locked',
  'none',
]);
export const referralStatusEnum = pgEnum('referral_status', ['pending', 'claimed']);
export const reviewStatusEnum = pgEnum('review_status', [
  'reviewing',
  'approved',
  'rejected',
]);

// --- Auth / flows ---
export const otpPurposeEnum = pgEnum('otp_purpose', [
  'register',
  'login',
  'bind_phone',
  'reset_password',
]);
export const postalStatusEnum = pgEnum('postal_status', [
  'pending',
  'completed',
  'rejected',
]);
export const ticketStatusEnum = pgEnum('ticket_status', ['open', 'answered', 'closed']);

// --- CMS / help ---
export const helpTabEnum = pgEnum('help_tab', ['general', 'deposit', 'withdraw']);
export const helpSectionIconEnum = pgEnum('help_section_icon', ['video', 'faq', 'guide']);
export const helpItemIconEnum = pgEnum('help_item_icon', ['play', 'coins', 'btc', 'pyusd']);

// --- Settings / social ---
export const settingTypeEnum = pgEnum('setting_type', [
  'string',
  'number',
  'boolean',
  'json',
  'url',
  'color',
  'image',
]);
export const socialPlatformEnum = pgEnum('social_platform', [
  'facebook',
  'instagram',
  'twitter',
  'telegram',
  'whatsapp',
  'youtube',
  'tiktok',
  'discord',
  'email',
  'livechat',
]);

// --- RBAC / media ---
export const adminStatusEnum = pgEnum('admin_status', ['active', 'suspended', 'invited']);
export const mediaKindEnum = pgEnum('media_kind', [
  'avatar',
  'provider_icon',
  'banner',
  'logo',
  'social_icon',
  'content',
  'kyc_doc',
  'other',
]);
export const permissionEffectEnum = pgEnum('permission_effect', ['allow', 'deny']);
export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'revoked',
  'expired',
]);
