/**
 * "DLink Agents System Manual" — full content extracted from the production
 * doc-preview (demo.html snapshot, docx render). One entry per rendered page:
 * cover, table of contents, then the 20 manual sections.
 */

export type ManualBlock =
  | { t: 'h3'; text: string }
  | { t: 'p'; text: string }
  | { t: 'note'; title: string; text: string }
  | { t: 'table'; headers: string[]; rows: string[][] }
  | { t: 'ol'; items: string[] }
  | { t: 'fig'; text: string };

export interface ManualPage {
  title: string;
  blocks: ManualBlock[];
}

const p = (text: string): ManualBlock => ({ t: 'p', text });
const h3 = (text: string): ManualBlock => ({ t: 'h3', text });
const note = (title: string, text: string): ManualBlock => ({ t: 'note', title, text });
const table = (headers: string[], rows: string[][]): ManualBlock => ({ t: 'table', headers, rows });
const ol = (items: string[]): ManualBlock => ({ t: 'ol', items });
const fig = (text: string): ManualBlock => ({ t: 'fig', text });

export const MANUAL_TITLE = 'DLink Agents System Manual';

export const MANUAL_PAGES: ManualPage[] = [
  {
    title: 'Cover',
    blocks: [
      table(
        ['Item', 'Details'],
        [
          [
            'Intended Users',
            'DLink distributors / Sub Agents / Sale Agents / Store operators / Finance staff',
          ],
          ['Version', 'v1.0'],
          [
            'Note',
            'This manual is based on the current backend and player-side features. If the system is updated, use the live backend as the source of truth.',
          ],
          [
            'Reading Tips',
            'First-time users should read Quick Start and Backend and Player-Side Mapping first. Daily operators can go directly to the relevant menu section.',
          ],
        ]
      ),
    ],
  },
  {
    title: 'Table of Contents',
    blocks: [
      p('DLink Distributor Management System User Manual'),
      ol([
        'Manual Overview',
        'Core Concepts and Data Relationships',
        'Backend and Player-Side Mapping',
        'Quick Start',
        'Dashboard Overview',
        'Financial Operations',
        'Game Setting',
        'Sub Agent List',
        'Sale Agent List',
        'Member List',
        'Kiosk List',
        'Promotion Config',
        'Transaction List',
        'Customer Service',
        'Download Posters',
        'Notices',
        'Player-Side Pages',
        'Common Operations',
        'Field Reference',
        'Routine Checklist',
      ]),
    ],
  },
  {
    title: '1. Manual Overview',
    blocks: [
      p('This manual helps DLink distributors use the backend system for daily operations.'),
      p(
        'It explains backend menus, player-side mappings, and common operating scenarios so users can understand each function, operation steps, impact, and key notes.'
      ),
      h3('1.1 Intended Users'),
      table(
        ['Role', 'Main Use'],
        [
          [
            'Distributor / Main Account',
            'View overall data; set store information; manage games, agents, Kiosks, promotions, and transactions.',
          ],
          [
            'Sale Agent',
            'View own promotion data, copy Invite Link, and view members and transactions.',
          ],
          ['Sub Agent', 'Promote players and view attributed data within authorized scope.'],
          [
            'Store Operator',
            'Display posters, guide players to scan and register, and report device or player issues.',
          ],
        ]
      ),
      h3('1.2 Main Backend Functions'),
      table(
        ['Menu', 'Function'],
        [
          [
            'Dashboard',
            'View balance, Invite Link, store information, agent deposit/withdraw/transfer, and logs.',
          ],
          ['Account System', 'Manage game settings, Sale Agents, members, Sub Agents, and Kiosks.'],
          ['Promotion Config', 'Configure player-side promotions and reward rules.'],
          ['Transaction List', 'Query player transactions, balance changes, fees, and reports.'],
          ['Customer Service', 'Configure support entry and handle player tickets.'],
          ['Download posters', 'Download store promotional posters with QR codes.'],
          ['Tutorial', 'View backend tutorial videos.'],
          ['Change Password / Email', 'Change backend login password or Email.'],
          ['My Notices', 'View system notices.'],
          ['Support', 'Contact support through WhatsApp, Messenger, or Live Chat.'],
        ]
      ),
    ],
  },
  {
    title: '2. Core Concepts and Data Relationships',
    blocks: [
      h3('2.1 Core Objects'),
      table(
        ['Object', 'Note'],
        [
          [
            'Store / Store Account',
            'Store or main distributor account; the key unit for attribution, posters, game configuration, and reports.',
          ],
          ['Sub Agent', 'Sub Agent who can expand their own distribution network.'],
          [
            'Sale Agent',
            'Agent with an individual Invite Link who promotes directly to players.',
          ],
          [
            'Member',
            'Player/member registered through an Invite Link, poster QR code, or Kiosk.',
          ],
          [
            'Kiosk',
            'Offline device or location point used for promotion, deposits, game entry, and balance records.',
          ],
          ['Game Platform', 'Platform used for player games, deposits, and redemptions.'],
        ]
      ),
      h3('2.2 Player Registration and Attribution'),
      p(
        'Players register through a distributor or agent invite link, poster QR code, or Kiosk entry.'
      ),
      p(
        'After registration, players are attributed to the corresponding Store, Sale Agent, and Sub Agent. Their future deposits, game transfers, redemptions, bonuses, and tickets are recorded under the related backend account.'
      ),
      note(
        'Key Rule',
        'Do not mix QR codes, Invite Links, or posters from different stores or agents. Incorrect attribution may affect future earnings and support handling.'
      ),
      h3('2.3 Balance and Currency Concepts'),
      table(
        ['Field / Currency', 'Meaning', 'Usage Notes'],
        [
          [
            'Gold Coins / GC',
            'Entertainment coins only; not redeemable.',
            'The player side clearly states: Gold Coins cannot be redeemed.',
          ],
          [
            'Sweepstakes Coins / SC',
            'SC used for promotions or redemption.',
            'Usually divided into Unplayed and Redeemable.',
          ],
          [
            'Redeemable SC',
            'SC that becomes redeemable after conditions are met.',
            'Do not call it cash when speaking to players.',
          ],
          [
            'Bonus SC',
            'Reward SC from promotions, rewards, phone binding, and similar actions.',
            'Affects promotion cost and player rewards.',
          ],
        ]
      ),
      h3('2.4 Common Operation Terms'),
      table(
        ['Term', 'Note'],
        [
          [
            'Deposit',
            'In the player wallet, it means adding funds. In games, it usually means transferring online balance into a game.',
          ],
          [
            'Redeem',
            'Not a direct withdrawal to a bank card; it means moving funds from a game account back to online redeemable balance.',
          ],
          ['Withdraw', 'A player or agent withdraws available balance to an external account.'],
          ['Transfer', 'Balance transfer between agents or player-related accounts.'],
          ['Online to Game', 'Online balance transferred into a game.'],
          ['Game to Online', 'Game balance transferred back online.'],
        ]
      ),
    ],
  },
  {
    title: '3. Backend and Player-Side Mapping',
    blocks: [
      p(
        'Many backend settings directly affect what players see, which promotions they can join, which games they can use, and which support channels are available.'
      ),
      p(
        'Users should not treat the backend only as a reporting tool. Some settings directly affect the player experience.'
      ),
      table(
        ['Backend Module', 'Affected Player-Side Page', 'Main Impact'],
        [
          [
            'Dashboard',
            'Store information, invite entry, and balance rules on the player side.',
            'Store name, daily redeem/withdraw limits, and phone binding reward.',
          ],
          [
            'Game Setting',
            'Game Center',
            'Controls game display, account availability, and Deposit/Redeem availability.',
          ],
          [
            'Promotion Config',
            'Bonus Center and promotion banners',
            'First-deposit bonus, double bonus, loyalty rewards, visibility, and trigger rules.',
          ],
          [
            'CS Config',
            'Help Center and support floating button',
            'Controls ticket submission and displays WhatsApp, Telegram, Facebook, or a custom support widget.',
          ],
          ['Help Tickets', 'Player-submitted issues', 'View, add notes, and update status.'],
        ]
      ),
      note(
        'Post-Change Check',
        'After changing games, promotions, support settings, or posters, log in with a test player account and confirm that Game Center, Bonus Center, Help Center, and registration entry display as expected.'
      ),
    ],
  },
  {
    title: '4. Quick Start',
    blocks: [
      p('After receiving a backend account, complete the setup and checks in the following order.'),
      table(
        ['Step', 'Action', 'Menu', 'Purpose'],
        [
          ['1', 'Bind Email', 'Dashboard', 'Used for security verification and important notices.'],
          ['2', 'Change Default Password', 'Change Password', 'Improve account security.'],
          [
            '3',
            'Set Store Information',
            'Dashboard',
            'Set Store Name, Logo, daily limits, and phone binding reward.',
          ],
          [
            '4',
            'Configure Game Platform Accounts',
            'Account System > Game Setting',
            'Ensure players can enter games and process score changes in Game Center.',
          ],
          [
            '5',
            'Configure Support Entry',
            'CS Config',
            'Ensure players can contact support or submit tickets.',
          ],
          [
            '6',
            'Check Player-Side Display',
            'Player-side Game Center / Bonus / Menu',
            'Confirm backend settings are correctly reflected on the player side.',
          ],
          [
            '7',
            'Copy Invite Link',
            'Dashboard > Invite Link',
            'Used for player registration and attribution.',
          ],
          [
            '8',
            'Download Promotional Posters',
            'Download posters',
            'Print, display, or share online; test the QR code.',
          ],
        ]
      ),
    ],
  },
  {
    title: '5. Dashboard Overview',
    blocks: [
      fig('Figure 1: Dashboard - Balance · Figure 2: Dashboard - Store Settings'),
      h3('5.1 Function Overview'),
      p(
        'Dashboard is the agent home page. It shows Online Balance, Tips, Email, Invite Link, store settings, and entries for Agent Deposit, Agent Withdraw, and Agent Transfer.'
      ),
      h3('5.2 Page Functions'),
      table(
        ['Field / Function', 'Note'],
        [
          ['Online Balance', 'Current account online balance.'],
          ['Tips', 'Displays tips or extra earnings; Clear is available.'],
          ['Email / Change Email', 'View and change the bound Email.'],
          [
            'Invite Link',
            "Copy the current account's Invite Link for player registration attribution.",
          ],
          ['Store Name', 'Store name; may appear on the player side.'],
          ['Daily Max Redeem', 'Total daily redeem limit for the store.'],
          ['Daily Max Withdraw', 'Maximum daily player withdrawal amount.'],
          ['Phone Bind Reward SC', 'Reward SC for player phone binding.'],
          ['Store Logo', 'Upload the store logo; it appears on the player side.'],
        ]
      ),
      h3('5.3 Bind or Change Email'),
      p('Bind Email:'),
      ol([
        'On first login, the system prompts you to bind an Email.',
        'Enter a valid Email, click Send Code, and enter the 6-digit code to bind it.',
      ]),
      p('Change Email:'),
      ol([
        'Click Change Email on Dashboard.',
        'The Security Verification window appears.',
        'Click Send Code to send a code to the current Email.',
        'Enter the 6-digit code.',
        'Click Verify, then complete the Email change.',
      ]),
      note(
        'Notes',
        "Email is required for financial operations, account security, and system notices. If the current Email cannot receive codes, contact platform support. Do not switch directly to an employee's personal Email."
      ),
      h3('5.4 Invite Link'),
      p(
        'Invite Link is used for distributor or store promotion. Players who register through this link are attributed to the current account.'
      ),
      p(
        'Click the copy icon beside the Invite Link, then share it by SMS, WhatsApp, Facebook, or other channels. You can also download QR-code posters, print and display them, or share them online.'
      ),
    ],
  },
  {
    title: '6. Financial Operations',
    blocks: [
      p(
        'Financial operations are available below Dashboard. These actions affect account balances and should be handled only by authorized users. Fees vary by payment method and are shown after a method is selected.'
      ),
      h3('6.1 Agent Deposit'),
      fig('Figure 3: Agent Deposit'),
      table(
        ['Field / Action', 'Note'],
        [
          [
            'Select Payment Method',
            'Select a deposit method, including PayPal PYUSD, USDC on Solana, Bitcoin, or Bitcoin Lightning Network.',
          ],
          [
            'Deposit Amount',
            'Enter the deposit amount. The page shows a minimum deposit of $50.00.',
          ],
          ['Confirm Deposit', 'Confirm and submit the deposit.'],
          ['Agent Deposit Log', 'View deposit records at the bottom of the page.'],
        ]
      ),
      h3('6.2 Agent Withdraw'),
      fig('Figure 4: Agent Withdraw'),
      table(
        ['Withdraw Method', 'Note'],
        [
          ['Paypal PYUSD', 'PYUSD withdrawal'],
          ['USDC On Solana', 'USDC on Solana withdrawal; confirm address and network.'],
          ['Bitcoin', 'Bitcoin withdrawal'],
          ['Bank Card', 'Bank card withdrawal'],
          ['ACH Bank Transfer', 'ACH bank transfer'],
        ]
      ),
      note(
        'Withdrawal Risk Notice',
        'Crypto addresses and networks must be accurate. Before submitting, verify the amount, receiving address, fee, and available balance. Funds sent to a wrong address may not be recoverable.'
      ),
      h3('6.3 Agent Transfer'),
      fig('Figure 5: Agent Transfer'),
      table(
        ['Field', 'Note'],
        [
          ['Recipient agent', 'Recipient agent username'],
          ['Transfer amount', 'Transfer amount'],
          ['Remark', 'Optional remark for the transfer reason'],
          ['Email Verification', 'Some transfers require an Email verification code'],
          ['Agent Transfer Log', 'View transfer records'],
          [
            'Agent Transfer Request Log',
            'View transfer requests that are waiting, rejected, or completed.',
          ],
        ]
      ),
      h3('6.4 Report'),
      table(
        ['Field', 'Note'],
        [
          ['Deposit', 'Player deposit amount'],
          ['Deposit Fee', 'Player deposit fee'],
          ['Deposit Orders', 'Number of player deposit orders'],
          ['Deposit players', 'Number of depositing players'],
          ['Redemption', 'Player redemption amount'],
          ['Redemption Orders', 'Number of redemption orders'],
          ['Redeemed players', 'Number of players who redeemed'],
          ['Gross Net', 'Gross Net'],
        ]
      ),
    ],
  },
  {
    title: '7. Game Setting',
    blocks: [
      fig('Figure 6: Game Setting'),
      h3('7.1 Function Overview'),
      p(
        'Game Setting configures the game platform accounts available to the current store or agent. It directly controls which games players can use.'
      ),
      p('The page has two sections:'),
      ol([
        'Automatic score adjustment games: the system can add or deduct scores automatically after the game store account is configured.',
        'Manual score adjustment games: manual handling is required, or D-Link support must enable automatic mode.',
      ]),
      note(
        'Permission Note',
        'The page shows "Game settings are managed by your agent. Contact your agent for changes." Some game settings are managed by an upstream agent or the platform, so the current account may not have full edit access.'
      ),
      h3('7.2 Game Setting Fields'),
      table(
        ['Field / Control', 'Note'],
        [
          ['Game name and icon', 'Displays the game platform icon and name.'],
          ['Toggle', 'Enable or disable the game.'],
          ['Kiosk ID / Store Account', 'Account configuration varies by game platform.'],
          ['View Details', 'View platform account details.'],
        ]
      ),
      h3('7.3 Edit Platform Account'),
      table(
        ['Field', 'Note', 'Impact'],
        [
          ['Select Platform', 'Current game platform', 'Not editable'],
          [
            'Kiosk ID',
            'Kiosk ID for the game platform',
            'Affects Kiosk binding and automatic score adjustment',
          ],
          [
            'Pos Account / Pos Password',
            'POS account and password',
            'Affects device-side connection and transaction handling',
          ],
          [
            'Store Account / Store Password',
            'Store account and password on the game platform',
            'Affects player-side account binding, Deposit, and Redeem',
          ],
          [
            'Money Box',
            'Money box or platform fund box ID',
            'Affects fund records and game platform identification',
          ],
          ['Score Cost (%)', 'Score cost percentage', 'Affects distributor earnings calculation'],
          [
            'Min Deposit Amount',
            'Minimum deposit / game transfer amount',
            'Players cannot transfer into the game below this amount.',
          ],
          [
            'Min Redemption Amount',
            'Minimum redemption amount',
            'Players cannot redeem from the game below this amount.',
          ],
          ['Redeem Daily Limit', 'Daily redeem limit', "Affects the player's daily Redeem limit."],
        ]
      ),
      note(
        'Tip',
        'If fields cannot be edited, the game is configured by an upstream agent and this account does not have permission.'
      ),
      h3('7.4 Player-Side Game Center Mapping'),
      p(
        'After a game is correctly configured and enabled, its card appears in the player-side Game Center. Players can view the game account, password, Entries, Winning, and use Deposit or Redeem.'
      ),
      fig('Figure 7: Player-Side Game Entry'),
      table(
        ['Player-Side Button', 'Backend Transaction Result', 'Note'],
        [
          [
            'Deposit',
            'Creates an Online to Game record in Transaction List.',
            'Player transfers online balance into the selected game.',
          ],
          [
            'Redeem',
            'Creates a Game to Online record in Transaction List.',
            'Player transfers game balance or winnings back to online redeemable balance.',
          ],
          [
            'Auto Create Account',
            'Automatically creates or binds a game account.',
            'Only available for games that support auto account creation.',
          ],
          [
            'I have an Account',
            'Binds an existing player game account.',
            'Used when the player already has an account on that game platform.',
          ],
        ]
      ),
    ],
  },
  {
    title: '8. Sub Agent List',
    blocks: [
      p(
        'Sub Agent List is used to manage Sub Agents. Sub Agents can usually recruit stores, traffic partners, or Sale Agents for player acquisition.'
      ),
      p('Choose the setup based on business needs:'),
      ol([
        'Direct-to-endpoint model: Account System > Sale Agent List > Add Sale Agent.',
        'Multi-level model: Account System > Sub Agent List > Add Sub Agent, then attach Sale Agents under the Sub Agent.',
      ]),
      h3('8.1 Add Sub Agent'),
      table(
        ['Field', 'Note'],
        [
          ['Username', 'Sub Agent username'],
          ['Password', 'Login password'],
          ['Nickname', 'Sub Agent nickname'],
          ['Status', 'Enable status'],
          [
            'Sale Agents',
            'Available Sale Agents. Those already bound to another Sub Agent cannot be selected.',
          ],
          [
            'Kiosk',
            'Available Kiosk devices. Those already bound to another Sub Agent cannot be selected.',
          ],
          ['Remark', 'Remark'],
        ]
      ),
      h3('8.2 Operations Menu'),
      table(
        ['Action', 'Note'],
        [
          ['Edit', 'Edit Sub Agent account'],
          ['Disable', 'Disable Sub Agent account'],
          ['Reset Password', 'Reset Sub Agent login password'],
          ['Transfer', 'Transfer funds to the Sub Agent or handle agent funds'],
          ['Report', "View the Sub Agent's Daily Breakdown and Game Breakdown reports"],
          ['Platforms', 'Configure game platforms available to the Sub Agent'],
          ['Ratio', 'Set Sub Agent revenue share ratio'],
          ['CS Config', "Configure the Sub Agent's player-side support entry"],
        ]
      ),
      h3('8.3 Report'),
      p("Daily Breakdown shows the agent's daily earnings data."),
      table(
        ['Field', 'Note'],
        [
          [
            'Online→Kiosk',
            'When kiosk sc is insufficient, online sc is auto-converted to kiosk sc.',
          ],
          [
            'Kiosk→Online',
            'When online sc is insufficient, kiosk sc is auto-converted to online sc.',
          ],
          [
            'Store Online Balance Vary',
            '= Gross Net Score - Total Bonus Score - Game Deposit Fee + OnlineToKiosk - KioskToOnline',
          ],
          ['Store Kiosk Balance Vary', '= Kiosk TotalIn - Kiosk TotalOut'],
          ['TotalIn Score', 'Online / Kiosk'],
          ['TotalOut Score', 'Online / Kiosk'],
          ['Gross Net Score', '= TotalIn Score - TotalOut Score'],
          [
            'Total Bonus Score',
            '= Register Score + Deposit Bonus Score + Promotion Score',
          ],
          ['Game Deposit Fee', 'Game deposit fee'],
          ['Platform Fee', '= Gross Net Score × Score Cost%'],
          [
            'TotalNet',
            '= Gross Net Score - Total Bonus Score - Game Deposit Fee - Platform Fee',
          ],
          ['Game Bonus', 'Game platform first-deposit bonus score'],
        ]
      ),
      p("Game Breakdown shows the agent's earnings data by game."),
      table(
        ['Field', 'Note'],
        [
          [
            'Store Online Balance Vary',
            '= Gross Net Score - Total Bonus Score - Game Deposit Fee + OnlineToKiosk - KioskToOnline',
          ],
          ['TotalIn Score', 'Total score transferred into the game'],
          ['TotalOut Score', 'Total score transferred out of the game'],
          ['Gross Net Score', 'Game net score'],
          ['Total Bonus Score', 'Total game bonus score'],
          ['Game Deposit Fee', 'Total game deposit fee'],
          ['Platform Fee', '= Gross Net Score × Score Cost%'],
          [
            'TotalNet',
            '= Gross Net Score - Total Bonus Score - Game Deposit Fee - Platform Fee',
          ],
          ['Game Bonus', 'Game platform first-deposit bonus score'],
        ]
      ),
    ],
  },
  {
    title: '9. Sale Agent List',
    blocks: [
      p(
        'Sale Agent List is used to create and manage direct Sale Agents, including those added directly or under Sub Agents. Each Sale Agent can have an individual Invite Link and view their own promotion data.'
      ),
      h3('9.1 Search and List Fields'),
      table(
        ['Field', 'Note'],
        [
          ['Search', 'Search by Username, Nickname, or Email'],
          ['Code', 'Search by the POS number after the agent Invite Link'],
          ['Status', 'Filter by Normal or Disabled status'],
          ['Scope', 'Filter by Direct only or All scope'],
          ['Username', 'Sale Agent login username'],
          ['Ratio', 'Sale Agent revenue share ratio based on net profit'],
          ['Balance', 'Sale Agent balance'],
          ['Invite Link', 'Sale Agent Invite Link; can be copied'],
          ['Operations', 'Edit and More operations menu'],
        ]
      ),
      h3('9.2 Add Sale Agent'),
      fig('Figure 8: Add Sale Agent Window'),
      ol([
        'Click Add in Sale Agent List.',
        'Enter Password and Nickname.',
        'Confirm Status is Normal.',
        'Select an available Kiosk.',
        'Enter a Remark if needed.',
        'Click Confirm to create the account.',
      ]),
      note(
        'Kiosk Binding Note',
        'If a Kiosk shows Bound by another account, it is already bound to another agent and should not be bound again. Before changing attribution, confirm the original agent data and player attribution.'
      ),
      h3('9.3 Operations Menu'),
      table(
        ['Action', 'Note'],
        [
          ['Edit', 'Edit Sale Agent account'],
          ['Disable', 'Disable Sale Agent account'],
          ['Reset Password', 'Reset Sale Agent login password'],
          [
            'Transfer',
            'Transfer funds to the Sale Agent or handle agent funds (Email code required)',
          ],
          ['View Poster', "View the Sale Agent's promotional poster"],
          ['Report', 'View Sale Agent reports (see 8.3 Report for field definitions)'],
          ['Platforms', 'Configure game platforms available to the Sale Agent'],
          ['Ratio', 'Set Sale Agent revenue share ratio'],
          ['CS Config', "Configure the Sale Agent's player-side support entry"],
          ['Store Name', 'Set Sale Agent store name'],
        ]
      ),
    ],
  },
  {
    title: '10. Member List',
    blocks: [
      p(
        'Member List is used to view and manage player accounts. Use this page to check player attribution, balances, deposits, withdrawals, game scores, bonuses, status, and last login.'
      ),
      h3('10.1 Search Filters'),
      table(
        ['Filter', 'Note'],
        [
          ['Search', 'Search by player username'],
          ['Phone', 'Search by phone number'],
          ['Sale Agent', 'Filter by Sale Agent'],
          ['Kiosk', 'Filter by Kiosk'],
          ['Status', 'Filter by player status'],
          ['Has Phone', 'Whether a phone is bound'],
          ['Has Photo', 'Whether a photo is uploaded'],
          ['Win/Lose', 'Filter by win/loss'],
        ]
      ),
      h3('10.2 Player List Fields'),
      table(
        ['Field', 'Note'],
        [
          ['Username', 'Player username'],
          ['Phone', 'Player phone number; may be partially masked'],
          ['Sale Agent', "Player's attributed Sale Agent"],
          ['Online SC', 'Player Online SC balance'],
          ['Kiosk SC', 'Player Kiosk SC balance'],
          ['Deposit / Withdraw', 'Deposit and withdraw amounts'],
          ['TotalNet', 'Net amount'],
          ['TotalIn Score / TotalOut Score', 'Total scores transferred into and out of games'],
          ['Gross Net Score', 'Gross net score'],
          ['Total Bonus Score', 'Total bonus score'],
          ['Game Deposit Fee / Platform Fee', 'Game deposit fee and platform fee'],
          ['Register Time / Last Login', 'Registration time and last login device/IP information'],
        ]
      ),
      h3('10.3 Add Member'),
      fig('Figure 9: Add Member Window'),
      note(
        'Recommended Practice',
        'Normally, players should register through an Invite Link or QR code to ensure accurate attribution. Manually create members only for special operating needs.'
      ),
    ],
  },
  {
    title: '11. Kiosk List',
    blocks: [
      p(
        'Kiosk List is used to view and manage offline devices, including status, balances, reports, posters, game configuration, and error handling.'
      ),
      h3('11.1 List Fields and Indicator Lights'),
      table(
        ['Field / Status', 'Note'],
        [
          ['Kiosk', 'Device ID'],
          [
            'Indicator Lights',
            'Device indicator lights, including Normal, Activated, Offline, Latest version, Updated, Not cleaned, etc.',
          ],
          ['Balance', 'Device-related balance'],
          ['Org Name', 'Assigned organization or store'],
          ['Info', 'Device limits, such as minimum withdrawal and withdrawal limit'],
          ['Operations', 'Detail and More operations'],
          ['Offline', 'Device is offline. Check network, power, or submit a ticket.'],
          ['Error', 'Device error. Check Error or Detail.'],
        ]
      ),
      h3('11.2 Kiosk Detail'),
      fig('Figure 10: Kiosk Detail'),
      table(
        ['Field', 'Note'],
        [
          ['Status', 'Activation status'],
          ['Online Status', 'Online status'],
          ['Error Status', 'Error status'],
          ['Version Status', 'Version status'],
          ['Total Balance / Online SC / Kiosk SC', 'Device balance and related SC data'],
          ['Min Withdrawal / Withdrawal limit', 'Minimum withdrawal and withdrawal limit'],
          ['Change Flag / Clear Flag', 'Change flag and clear flag'],
        ]
      ),
      h3('11.3 Kiosk Reports'),
      p(
        'Kiosk reports include Cash Report and Transaction Report. Cash Report covers cash or device fund data such as Deposit, Withdraw, Profit, Replenish, and Extract. Transaction Report summarizes TotalIn Score, TotalOut Score, Gross Net Score, Bonus, and Fee by date and game.'
      ),
    ],
  },
  {
    title: '12. Promotion Config',
    blocks: [
      p(
        'Promotion Config controls player-side Bonus display, reward triggers, reward caps, applicable games, and user scope. Promotion settings directly affect player rewards, platform costs, and distributor earnings.'
      ),
      h3('12.1 Promotion Types and Player-Side Display'),
      table(
        ['Backend Promotion Type', 'Function'],
        [
          [
            'Promotion Game (100% Bonus)',
            'Player receives a 100% bonus on the first deposit of the day, capped at $50.00.',
          ],
          [
            'Double Game Bonus',
            'After the first deposit of the day, specified games can receive an extra 100% bonus.',
          ],
          [
            'Royalty Drop',
            'After meeting the weekly deposit threshold, the player receives a random reward, usually credited to Bonus SC or wallet.',
          ],
          [
            'Invite Friends & Earn',
            'After an invited friend meets the first-purchase requirement, both inviter and invitee receive rewards. Some rules may be platform-configured.',
          ],
          [
            'Daily Check-in Rewards',
            'Daily check-in reward. It may be a platform-level promotion depending on backend permissions.',
          ],
        ]
      ),
      h3('12.2 Key Fields'),
      table(
        ['Field', 'Note', 'Player-Side Impact'],
        [
          [
            'Assign to Users',
            'Assigns the promotion to specific stores, agents, or users.',
            'Determines which user scope can use the promotion.',
          ],
          [
            'Hidden from Users',
            'Hides the configuration from specified SALE/SUB backend users.',
            'Hidden users cannot view or use this configuration.',
          ],
          [
            'Hidden from Players',
            'Hides the promotion from players.',
            'The promotion can still be active, but will not appear in the player Bonus Center.',
          ],
          [
            'Online Only',
            'Triggered only when online balance is transferred into a game.',
            'Cash balance or Kiosk transfers do not trigger it.',
          ],
          [
            'Min Deposit / Threshold',
            'Minimum deposit threshold to qualify.',
            'Players below the threshold cannot receive the reward.',
          ],
          ['Max Bonus Amount', 'Maximum reward cap', 'Controls the cost of a single reward.'],
          [
            'Redemption Multiplier',
            'Redemption multiplier',
            'Defines the redemption condition for the reward.',
          ],
          [
            'Active Days / Timezone',
            'Active days and timezone',
            'Affects daily or weekly reset time.',
          ],
          [
            'Platforms',
            'Applicable game platforms',
            'The player-side promotion card displays applicable game tags.',
          ],
          ['Status', 'Enabled / Disabled', 'Determines whether the promotion is active.'],
        ]
      ),
      note(
        'Promotion Cost Control',
        'Before enabling a promotion, check the minimum deposit threshold, reward rate, maximum bonus amount, redemption multiplier, applicable games, Online Only setting, player visibility, and whether it is assigned only to specific agents or stores.'
      ),
    ],
  },
  {
    title: '13. Transaction List',
    blocks: [
      p(
        'Transaction List is used to query player deposits, wallet-to-game transfers, game-to-wallet transfers, admin adjustments, bonuses, fees, and platform fees.'
      ),
      h3('13.1 Search Filters'),
      table(
        ['Filter', 'Note'],
        [
          ['Search', 'Player username or game Player ID'],
          ['Game Name', 'Filter by game name'],
          ['Transaction Type', 'Filter by transaction type'],
          ['Kiosk', 'Filter by Kiosk player name'],
          ['Sale Agent / Sub Agent', 'Filter by Sale Agent or Sub Agent'],
          ['Status', 'Filter by transaction status'],
          ['Time Range', 'Filter by time range'],
          ['Manual Processing', 'Filter manual-processing transactions'],
          ['Report', 'Open the transaction report page'],
        ]
      ),
      h3('13.2 Transaction Types and Balance Changes'),
      table(
        ['Transaction Type', 'Meaning', 'Backend Result'],
        [
          [
            'Online to Game',
            'Player transfers online balance into a game.',
            'Online SC decreases; game Entries or balance increases.',
          ],
          [
            'Game to Online',
            'Player transfers game balance back to online balance.',
            'Game balance decreases; Online Redeemable increases.',
          ],
          [
            'Admin Add',
            'Manual score add or adjustment by backend.',
            'Records the adjustment amount and reason.',
          ],
          [
            'Auto Complete',
            'Completed automatically by the system.',
            'Transaction status shows Auto Complete.',
          ],
          ['Cancelled', 'Transaction is cancelled.', 'The transaction is no longer processed.'],
        ]
      ),
      h3('13.3 Transaction Detail'),
      fig('Figure 11: Transaction Detail'),
      p(
        'Transaction Detail shows Member Username, Store, Game, Player ID, Create Time, Amount, Fee, Online SC Changes, Store Balance Vary, Game Balance, Type, and Status. For deposit or game-score issues, check Transaction Detail first.'
      ),
      h3('13.4 Transaction Report'),
      p(
        'Transaction Report can be filtered by Sub Agent, Sale Agent, Kiosk, Member Username, and date range. It includes Daily Breakdown and Game Breakdown to review total in, total out, bonuses, fees, and net amounts by date, game, and agent.'
      ),
    ],
  },
  {
    title: '14. Customer Service',
    blocks: [
      p(
        'Customer Service includes CS Config and Help Tickets. CS Config controls which support entry appears in the player-side Help Center. Help Tickets is used to handle player-submitted issues.'
      ),
      h3('14.1 CS Config'),
      fig('Figure 12: CS Config - Custom JS Widget · Figure 13: CS Config - Social Links'),
      table(
        ['Field', 'Note', 'Player-Side Impact'],
        [
          [
            'Enable',
            'Whether support configuration is enabled',
            'If disabled, the player side may not show the support entry.',
          ],
          [
            'Help Tickets',
            'Whether players can submit tickets',
            'If enabled, players can submit issues through Help Center.',
          ],
          ['Platform', 'Support platform type', 'Select Custom JS Widget or Social Links.'],
          [
            'JS URL',
            'Custom support widget URL',
            'The player side loads a third-party support widget.',
          ],
          [
            'WhatsApp / Telegram / Facebook Link',
            'Social media support links',
            'The player side displays the corresponding contact methods.',
          ],
        ]
      ),
      h3('14.2 Help Tickets'),
      table(
        ['Status', 'Note'],
        [
          ['All', 'All tickets'],
          ['Pending', 'Pending'],
          ['Processing', 'Processing'],
          ['Resolved', 'Resolved'],
        ]
      ),
      h3('14.3 Ticket Detail'),
      ol([
        'Click Detail to view the player issue.',
        'Check DLink Acct #, Player Name, Phone, Email, and Summary.',
        'For deposit or game-score issues, search in Transaction List.',
        'Record the handling process in Notes.',
        'Click Mark Processing while handling the issue, and Mark Resolved after completion.',
      ]),
    ],
  },
  {
    title: '15. Download Posters',
    blocks: [
      p(
        'Download Posters is used to download promotional posters with store names and QR codes. After scanning the QR code, customers can register player accounts. Their future deposits, game activity, and rewards are attributed to the related store or agent.'
      ),
      table(
        ['Use Case', 'Suggestion'],
        [
          ['Convenience Store / Gas Station', 'Place near the cashier, entrance, or Kiosk.'],
          ['Laundromat', 'Place in the waiting area, payment area, or near machines.'],
          ['Restaurant / Bar', 'Place at the bar, on table cards, or at the cashier.'],
          [
            'Online Promotion',
            'Use it for WhatsApp, Facebook, other social channels, or email.',
          ],
        ]
      ),
      note(
        'QR Code Check',
        'Before printing, scan the code to test whether it opens the correct registration page, shows the correct store name, and registers new players under the current backend Member List.'
      ),
    ],
  },
  {
    title: '16. Notices',
    blocks: [
      p(
        'Notices is used to view platform notices, game platform alerts, and Store Account alerts. Check unread notices in the top-right corner after each login.'
      ),
      table(
        ['Field', 'Note'],
        [
          ['Notice Title', 'Notice title, such as Game Platform Alert or Store Account Alert'],
          ['Notice Type', 'Notice type'],
          ['Notice Level', 'Notice level'],
          ['Publish Time', 'Publish time'],
          ['Status', 'Read status'],
          ['Action', 'Click View for details.'],
        ]
      ),
    ],
  },
  {
    title: '17. Player-Side Pages',
    blocks: [
      p(
        'Player-side pages directly reflect backend settings. After configuring games, promotions, support, or posters, use a test player account to confirm that the player side displays correctly.'
      ),
      h3('17.1 Game Center'),
      fig('Figure 14: Player-Side Game Center'),
      table(
        ['Player-Side Element', 'Note', 'Backend Source'],
        [
          ['Store name', 'Example: D-Store', 'Dashboard > Store Name'],
          [
            'Top promotion banners',
            'Invite friends, first-deposit match, double bonus, etc.',
            'Promotion Config',
          ],
          [
            'Game card',
            'Shows game name, account, password, Entries, and Winning.',
            'Game Setting',
          ],
          ['Deposit', 'Transfer into game', '/'],
          ['Redeem', 'Transfer from game back to online balance', '/'],
          ['Auto Create Account', 'Auto-create game account', '/'],
        ]
      ),
      h3('17.2 Bonus Center'),
      fig('Figure 15: Player-Side Bonus Center'),
      p(
        'Bonus Center displays promotions available to players. Promotion Config determines whether some promotions are enabled, visible, which games apply, trigger thresholds, and reward caps.'
      ),
      h3('17.3 Invite & Earn'),
      fig('Figure 16: Player-Side Invite & Earn Page'),
      p(
        'Invite & Earn is the player-side referral reward feature. Players can share their invite link to invite friends to register and deposit. When the invited friend meets the required deposit condition, both users receive rewards. The inviter can also unlock higher future-deposit reward rates based on valid referral counts.'
      ),
      p(
        'A referral becomes valid only after the invited friend reaches $20 in total deposits. This feature is released by DLink and cannot be configured by agents in the backend.'
      ),
      h3('17.4 Player Profile / Menu'),
      table(
        ['Player-Side Function', 'Note'],
        [
          ['Deposit', 'Player deposit entry'],
          ['Withdraw', 'Player withdraw/redeem entry'],
          ['Transfer', 'Player transfer entry'],
          ['Bind / Change Phone', 'Bind or change phone number'],
          ['Invite & Earn', 'Share Invite Link to invite friends'],
          ['Transactions', 'Order history'],
          ['Help Center', 'Contact support or submit a ticket'],
          ['Theme', 'Dark/light mode'],
        ]
      ),
    ],
  },
  {
    title: '18. Common Operations',
    blocks: [
      h3('18.1 How to Promote'),
      ol([
        'Confirm Store Name and Invite Link.',
        'Download posters from Download Posters.',
        'Scan the QR code to test the registration page.',
        'Display the poster in-store or share it through social channels.',
        'Check Member List to confirm new player registration.',
      ]),
      h3('18.2 How to Confirm a Player Is Attributed to Me'),
      ol([
        'Go to Member List.',
        'Search by player Username, Phone, or registration time.',
        'Check fields such as Sale Agent, Kiosk, and Register Time.',
        "Go to Transaction List to view the player's transactions.",
        'After saving settings, check the player-side Bonus Center display.',
      ]),
      h3('18.3 What to Do If a Player Deposit Does Not Arrive'),
      ol([
        "Check the player's issue in Help Tickets.",
        'Record DLink Acct #, player name, phone, Email, and issue summary.',
        'Search in Transaction List by player, amount, and time.',
        'Open Transaction Detail to verify status and balance changes.',
        'Record the handling process in ticket Notes.',
        'Click Mark Resolved after completion.',
      ]),
      h3('18.4 What to Do If a Kiosk Is Offline'),
      ol([
        'Go to Kiosk List.',
        'Check whether Indicator Lights show Offline or Error.',
        'Click Detail to check Online Status, Error Status, and Version Status.',
        'If needed, go to More > Error or Report to review the issue.',
        'Contact device support or submit a ticket.',
      ]),
    ],
  },
  {
    title: '19. Field Reference',
    blocks: [
      h3('19.1 Financial Fields'),
      table(
        ['Field', 'Note'],
        [
          ['Deposit', 'Deposit amount'],
          ['Withdraw / Withdrawal', 'Withdraw / withdrawable amount'],
          ['Balance', 'Current balance'],
          ['Balance Before / Balance After', 'Balance before / after'],
          ['Store Online Balance Vary', 'Store online balance change'],
          ['Store Kiosk Balance Vary', 'Store Kiosk balance change'],
          ['Fee', 'Fee'],
          ['Game Deposit Fee', 'Game deposit fee'],
          ['Platform Fee', 'Platform fee'],
          ['TotalNet', 'Net profit'],
        ]
      ),
      h3('19.2 Score and Bonus Fields'),
      table(
        ['Field', 'Note'],
        [
          ['TotalIn Score', 'Total score transferred into games'],
          ['TotalOut Score', 'Total score transferred out of games'],
          ['Gross Net Score', 'Gross net score'],
          ['Total Bonus Score', 'Total bonus score'],
          ['Game Bonus', 'Game bonus'],
          ['Bonus SC', 'Bonus SC, usually from promotions, phone binding, or activities.'],
        ]
      ),
      h3('19.3 Status Fields'),
      table(
        ['Status', 'Note'],
        [
          ['Normal', 'Normal'],
          ['Disabled', 'Disabled'],
          ['Enabled', 'Enabled'],
          ['Pending', 'Pending'],
          ['Processing', 'Processing'],
          ['Resolved', 'Resolved'],
          ['Waiting', 'Waiting'],
          ['Rejected', 'Rejected'],
          ['Auto Complete', 'Completed automatically by the system.'],
          ['Cancelled', 'Cancelled'],
          ['Offline', 'Offline'],
          ['Activated', 'Activated'],
          ['Latest version', 'Latest version'],
        ]
      ),
    ],
  },
  {
    title: '20. Routine Checklist',
    blocks: [
      h3('20.1 Daily Checks'),
      table(
        ['Check Item', 'Menu', 'Purpose'],
        [
          ['Unread notices', 'My Notices', 'Detect game platform or account alerts in time.'],
          ['Online Balance', 'Dashboard', 'Check whether the balance is abnormal.'],
          ['New tickets', 'Help Tickets', 'Handle player issues in time.'],
          ['Kiosk status', 'Kiosk List', 'Identify Offline or Error status.'],
          [
            'Abnormal transactions',
            'Transaction List',
            'Check failed, cancelled, or manual-processing transactions.',
          ],
          [
            'Promotion status',
            'Promotion Config',
            'Confirm promotions are Enabled and correctly configured.',
          ],
        ]
      ),
      h3('20.2 Weekly Checks'),
      table(
        ['Check Item', 'Menu', 'Purpose'],
        [
          ['Sale Agent performance', 'Sale Agent List > Report', 'Evaluate agent performance.'],
          [
            'Sub Agent performance',
            'Sub Agent List > Report',
            'Evaluate Sub Agent promotion results.',
          ],
          ['Kiosk reports', 'Kiosk List > Total Report', 'Review device cash and transaction data.'],
          ['Game performance', 'Transaction List > Report', 'Analyze earnings and costs by game.'],
          [
            'Promotion results',
            'Promotion Config + Transaction Report',
            'Assess whether promotions drive qualified deposits.',
          ],
          [
            'Poster QR code',
            'Download posters',
            'Confirm the QR code attribution is correct and scanning works.',
          ],
        ]
      ),
      note(
        'Final Principle',
        'Always check backend operations through this chain: backend setting > player-side display > player action > backend data > distributor handling. Game Setting, Promotion Config, Transaction List, and CS Config must be understood together with the player side.'
      ),
    ],
  },
];
