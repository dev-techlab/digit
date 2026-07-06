export type HelpTab = 'general' | 'deposit' | 'withdraw';
export type HelpItemIcon = 'play' | 'coins' | 'btc' | 'pyusd';
export type HelpSectionIcon = 'video' | 'faq' | 'guide';

export interface HelpStep {
  title: string;
  description: string;
}

export interface HelpItem {
  id: string;
  title: string;
  icon: HelpItemIcon;
  /** How the item opens when tapped. */
  kind: 'video' | 'guide' | 'faq';
  steps?: HelpStep[];
  /** FAQ answer body (kind === 'faq'). */
  body?: string;
}

export interface HelpSection {
  key: string;
  label: string;
  icon: HelpSectionIcon;
  items: HelpItem[];
}

// ---- Reusable step sets --------------------------------------------------

const BTC_CASHAPP_BUY: HelpStep[] = [
  {
    title: 'Open the Bitcoin tab',
    description: 'Launch Cash App and tap the Bitcoin (₿) tab on the home screen.',
  },
  {
    title: 'Tap Buy',
    description: 'Choose a preset amount or enter a custom amount of Bitcoin to buy.',
  },
  {
    title: 'Confirm your purchase',
    description: 'Verify the amount and confirm with your PIN or Face ID.',
  },
  {
    title: 'Bitcoin is ready',
    description: 'Your BTC balance updates instantly and is ready to send.',
  },
];

const BTC_LIGHTNING_PAY: HelpStep[] = [
  {
    title: 'Open the Bitcoin tab',
    description: 'In Cash App, tap the Bitcoin (₿) tab, then the send/scan icon.',
  },
  {
    title: 'Copy the Lightning invoice',
    description: 'On Digit Link, copy the Lightning Network invoice for your deposit.',
  },
  {
    title: 'Paste the invoice',
    description: 'Paste the invoice into Cash App — the amount fills in automatically.',
  },
  {
    title: 'Send the payment',
    description: 'Review the amount and confirm. Lightning transfers settle in seconds.',
  },
];

const PYUSD_GET: HelpStep[] = [
  { title: 'Open Crypto', description: 'In PayPal or Venmo, open the Crypto / Finances section.' },
  {
    title: 'Select PayPal USD',
    description: 'Tap Buy and choose PayPal USD (PYUSD) from the token list.',
  },
  { title: 'Enter an amount', description: 'Enter the amount you want and review the details.' },
  {
    title: 'Confirm',
    description: 'Confirm the purchase — PYUSD is added to your wallet balance.',
  },
];

const PYUSD_PAY: HelpStep[] = [
  {
    title: 'Copy the PYUSD address',
    description: 'On Digit Link, copy the PYUSD deposit address shown for your order.',
  },
  { title: 'Open Transfer → Send', description: 'In your PYUSD wallet, tap Transfer, then Send.' },
  {
    title: 'Paste the address',
    description: 'Paste the Digit Link address and enter the amount to send.',
  },
  {
    title: 'Review and confirm',
    description: 'Double-check the address and amount, then confirm the transfer.',
  },
];

const PYUSD_HASH: HelpStep[] = [
  {
    title: 'Open your activity',
    description: 'Open the activity / history view in your crypto wallet.',
  },
  {
    title: 'Select the transfer',
    description: 'Tap the PYUSD transfer you just sent to Digit Link.',
  },
  {
    title: 'View on blockchain',
    description: 'Open the transaction details or "View on blockchain".',
  },
  {
    title: 'Copy the hash',
    description: 'Copy the transaction hash (TxID) and paste it into Digit Link.',
  },
];

const BTC_ADDRESS_CASHAPP: HelpStep[] = [
  { title: 'Open the Bitcoin tab', description: 'Launch Cash App and tap the Bitcoin (₿) tab.' },
  {
    title: 'Tap Deposit Bitcoin',
    description: 'Scroll to "More ways to get bitcoin" and tap Deposit bitcoin.',
  },
  {
    title: 'Open Copy address',
    description: 'Cash App shows your Bitcoin Network and Lightning Network addresses.',
  },
  {
    title: 'Choose Bitcoin Network',
    description: 'Use the on-chain Bitcoin Network address — not the Lightning one.',
  },
  {
    title: 'Copy your Bitcoin Network address',
    description:
      'Tap the copy icon next to the Bitcoin Network address and paste it into Digit Link.',
  },
];

const PYUSD_ADDRESS: HelpStep[] = [
  {
    title: 'Open your PYUSD wallet',
    description: 'In PayPal or Venmo, open the PayPal USD (PYUSD) wallet.',
  },
  {
    title: 'Tap Transfer → Receive',
    description: 'Tap Transfer, then choose Receive to view your address.',
  },
  {
    title: 'Select the right network',
    description: 'Confirm the network matches the one Digit Link expects.',
  },
  {
    title: 'Copy your PYUSD address',
    description: 'Copy the receive address and paste it into the Digit Link withdraw form.',
  },
];

// ---- Tab content ---------------------------------------------------------

export const HELP_CONTENT: Record<HelpTab, HelpSection[]> = {
  general: [
    {
      key: 'general-videos',
      label: 'Video Tutorials',
      icon: 'video',
      items: [
        { id: 'platform-intro', title: 'Platform Introduction', icon: 'play', kind: 'video' },
      ],
    },
    {
      key: 'general-faq',
      label: 'FAQ',
      icon: 'faq',
      items: [
        {
          id: 'what-is-gc-sc',
          title: 'What is GC/SC?',
          icon: 'coins',
          kind: 'faq',
          body: 'Gold Coins (GC) are for fun play only and carry no monetary value. Sweepstakes Coins (SC) are promotional entries that can be redeemed for cash prizes once wagering requirements are met. You receive free SC with Gold Coin purchases and through daily bonuses.',
        },
      ],
    },
  ],
  deposit: [
    {
      key: 'deposit-videos',
      label: 'Video Tutorials',
      icon: 'video',
      items: [
        {
          id: 'v-btc-cashapp',
          title: 'How to buy BTC using Cash App?',
          icon: 'btc',
          kind: 'video',
        },
        {
          id: 'v-btc-lightning',
          title: 'How to make a BTC Lightning payment using Cash App?',
          icon: 'btc',
          kind: 'video',
        },
        {
          id: 'v-pyusd-get',
          title: 'How to get PYUSD on PayPal or Venmo?',
          icon: 'pyusd',
          kind: 'video',
        },
        {
          id: 'v-pyusd-pay',
          title: 'How to pay with PYUSD on PayPal or Venmo?',
          icon: 'pyusd',
          kind: 'video',
        },
      ],
    },
    {
      key: 'deposit-guides',
      label: 'Step-by-step Guides',
      icon: 'guide',
      items: [
        {
          id: 'g-btc-cashapp',
          title: 'How to buy BTC using Cash App?',
          icon: 'btc',
          kind: 'guide',
          steps: BTC_CASHAPP_BUY,
        },
        {
          id: 'g-btc-lightning',
          title: 'How to make a BTC Lightning payment using Cash App?',
          icon: 'btc',
          kind: 'guide',
          steps: BTC_LIGHTNING_PAY,
        },
        {
          id: 'g-pyusd-get',
          title: 'How to get PYUSD on PayPal or Venmo?',
          icon: 'pyusd',
          kind: 'guide',
          steps: PYUSD_GET,
        },
        {
          id: 'g-pyusd-pay',
          title: 'How to pay with PYUSD on PayPal or Venmo?',
          icon: 'pyusd',
          kind: 'guide',
          steps: PYUSD_PAY,
        },
        {
          id: 'g-pyusd-hash',
          title: 'How to get PYUSD transaction hash?',
          icon: 'pyusd',
          kind: 'guide',
          steps: PYUSD_HASH,
        },
      ],
    },
  ],
  withdraw: [
    {
      key: 'withdraw-guides',
      label: 'Step-by-step Guides',
      icon: 'guide',
      items: [
        {
          id: 'w-btc-address',
          title: 'How to get a Bitcoin address in CashApp?',
          icon: 'btc',
          kind: 'guide',
          steps: BTC_ADDRESS_CASHAPP,
        },
        {
          id: 'w-pyusd-address',
          title: 'How to get a PYUSD address?',
          icon: 'pyusd',
          kind: 'guide',
          steps: PYUSD_ADDRESS,
        },
      ],
    },
  ],
};
