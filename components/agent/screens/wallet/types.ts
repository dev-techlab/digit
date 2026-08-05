export interface LogRow {
  id: string;
  type: 'deposit' | 'withdraw' | 'transfer';
  method: string | null;
  amount: string;
  fee: string;
  commissionPer?: string;
  netAmount?: string | null;
  address: string | null;
  balanceBefore: string | null;
  balanceAfter: string | null;
  remark: string | null;
  counterparty: string | null;
  status: string;
  createdAt: string;
}

export interface WalletData {
  store: {
    email: string | null;
    username: string;
    inviteCode: string;
    onlineBalance: string;
    tipsBalance: string;
    commissionPer: string;
  };
  settings: {
    storeName: string;
    dailyMaxRedeem: string;
    dailyMaxWithdraw: string;
    phoneBindRewardSc: string;
    logoUrl: string | null;
  } | null;
  logs: LogRow[];
  report: { day: string; deposit: string; depositFee: string; depositOrders: number }[];
}
