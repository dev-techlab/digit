export interface DepositTier {
  amount: string;
  bonusAmount: string;
}

export interface GameProvider {
  id: number;
  name: string;
  providerCode: string;
  launchUrlTemplate: string;
  iconUrl: string;
  status: number;
  sort: number;
  createType: number;
  depositTiers: DepositTier[] | null;
  operate: number;
  needInitBalance: number;
  canManualInput: number;
  providerType: 'SC' | 'GC';
  iframeSupported: boolean;
  isMachineSupported: number;
  redeemField: number;
  invalidPasswordState: number;
  canChangePassword: number;
}

export interface WalletBalance {
  goldCoin: string;
  onlineSC: string;
  storeSC: string;
  kioskSC: string;
  totalBalance: string;
  unwagered: string;
  withdrawable: string;
  freeBonus: string;
}

export interface OrderRecord {
  orderNo: string;
  username: string;
  amount: string;
  payAmount: string;
  actualDepositAmount: string;
  paymentMethod: string;
  fee: string;
  feeMode: 'standard' | 'waiver';
  feeWaived: boolean;
  scBonus: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  createTime: string;
}

export type TransactionMethod =
  'cashapp' | 'btc' | 'lightning' | 'pyusd' | 'ach' | 'card' | 'chime';

export interface Transaction {
  id: string;
  /** Wallet address / reference shown in the row, masked in the middle by the UI. */
  address: string;
  /** Human-readable payment method, e.g. "Cash App". */
  methodLabel: string;
  method: TransactionMethod;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  /** Positive decimal string, e.g. "6.99". Sign is derived from `type`. */
  amount: string;
  type: 'deposit' | 'withdraw';
  createTime: string;
}

export interface BonusReward {
  id: string;
  title: string;
  description: string;
  tags: string[];
  active: boolean;
  banner:
    | { type: 'placeholder' }
    | { type: 'gradient'; gradient: string; badgeIcon?: 'coin' | 'percent'; badgeText?: string };
  schedule: {
    icon: 'calendar' | 'clock';
    text: string;
    countdownSeconds?: number;
  };
  status: 'claimable' | 'claimed' | 'locked' | 'none';
}

export interface ReferralSummary {
  inviteCode: string;
  inviteLink: string;
  totalInvited: number;
  totalCommission: string;
  pendingCommission: string;
  invitees: { username: string; joinedAt: string; reward: string; status: 'pending' | 'claimed' }[];
}

export interface RedemptionReview {
  id: string;
  orderNo: string;
  amount: string;
  provider: string;
  status: 'reviewing' | 'approved' | 'rejected';
  visible: boolean;
  submittedAt: string;
}
