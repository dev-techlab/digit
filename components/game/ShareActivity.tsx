'use client';

import { useState } from 'react';
import { UserPlus, Gift, Users, Banknote, Link2, Megaphone, Star, Medal } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShareInviteModal } from './ShareInviteModal';
import { cn } from '@/lib/cn';
import type { ReferralSummary } from '@/lib/types';

// Referral commission ladder — program config, not per-user data.
// Reaching N valid invitations unlocks a commission rate on each referral's deposits.
const TIERS = [
  { count: 1, pct: '0.1%' },
  { count: 20, pct: '0.2%' },
  { count: 50, pct: '0.5%' },
  { count: 100, pct: '1%' },
  { count: 150, pct: '2%' },
  { count: 200, pct: '3%' },
  { count: 300, pct: '4%' },
  { count: 500, pct: '5%' },
];

type Tab = 'invite' | 'rewards';

export function ShareActivity({ referral }: { referral: ReferralSummary }) {
  const [tab, setTab] = useState<Tab>('invite');
  const [shareOpen, setShareOpen] = useState(false);
  // Claim state lives here (not inside MyRewards) so it survives the tab switch
  // that unmounts the rewards panel. Keyed by invitee index — usernames are not
  // guaranteed unique by the ReferralSummary contract.
  const [claimed, setClaimed] = useState<Record<number, boolean>>({});

  const valid = referral.totalInvited;

  // Highest tier index whose threshold has been reached (-1 = none yet).
  const reachedIdx = TIERS.reduce((acc, t, i) => (valid >= t.count ? i : acc), -1);
  const currentPct = reachedIdx >= 0 ? TIERS[reachedIdx].pct : '0%';
  const nextTier = TIERS[reachedIdx + 1]; // undefined once maxed out
  const nextLevel = reachedIdx + 2; // next badge is LV{index+1} → reachedIdx+2
  const base = reachedIdx >= 0 ? TIERS[reachedIdx].count : 0;
  const target = nextTier ? nextTier.count : TIERS[TIERS.length - 1].count;
  const progress = nextTier ? Math.min(1, Math.max(0, (valid - base) / (target - base))) : 1;

  return (
    <div className="relative">
      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 pt-1">
          <span aria-hidden className="text-2xl sm:text-3xl">
            🎉
          </span>
          <h1 className="bg-gradient-to-b from-[var(--text-primary)] to-[var(--text-secondary)] bg-clip-text text-xl font-black uppercase italic tracking-wide text-transparent">
            Share Activity
          </h1>
          <span aria-hidden className="text-2xl sm:text-3xl">
            🎊
          </span>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Share activity sections" className="grid grid-cols-2 gap-3">
          <TabButton
            id="share-tab-invite"
            controls="share-tabpanel"
            active={tab === 'invite'}
            onClick={() => setTab('invite')}
            icon={<UserPlus size={18} />}
            label="Invite Friends"
          />
          <TabButton
            id="share-tab-rewards"
            controls="share-tabpanel"
            active={tab === 'rewards'}
            onClick={() => setTab('rewards')}
            icon={<Gift size={18} />}
            label="My Rewards"
          />
        </div>

        <div
          role="tabpanel"
          id="share-tabpanel"
          aria-labelledby={tab === 'invite' ? 'share-tab-invite' : 'share-tab-rewards'}
          className="flex flex-col gap-5"
        >
          {tab === 'invite' ? (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <StatCard
                  gradient="from-[#1f9e8a] to-[#137a63]"
                  icon={<Users size={26} />}
                  value={String(valid)}
                  label="Valid Invitations"
                />
                <StatCard
                  gradient="from-[#f0c95a] to-[#d99a2b]"
                  icon={<Banknote size={26} />}
                  value={`$${referral.totalCommission}`}
                  label="Cumulative Rewards"
                />
              </div>

              {/* Level progress */}
              <Card className="p-5">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-slate-200 to-slate-400 text-slate-700 shadow">
                      <Medal size={22} />
                    </span>
                    <span className="text-sm font-bold text-[var(--text-secondary)]">
                      {currentPct}
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                    aria-label="Progress to next commission tier"
                    className="relative h-1.5 flex-1 rounded-full bg-[var(--divider-color)]"
                  >
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-brand-solid shadow-glowBrand"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-bold text-brand">
                      {nextTier ? nextTier.pct : 'MAX'}
                    </span>
                    <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-b from-[#b3243a] to-[#7c1327] text-[10px] font-black text-white shadow">
                      <Star size={10} className="absolute -top-1 fill-amber-300 text-amber-300" />
                      LV{Math.min(nextLevel, TIERS.length)}
                    </span>
                  </div>
                </div>

                {/* Milestone ladder */}
                <div className="mt-5 flex justify-between gap-0.5 overflow-x-auto pb-1">
                  {TIERS.map((t, i) => {
                    const reached = valid >= t.count;
                    const isLast = i === TIERS.length - 1;
                    return (
                      <div
                        key={t.count}
                        className="flex min-w-[30px] flex-1 flex-col items-center gap-1"
                      >
                        <span
                          className={cn(
                            'text-xs font-bold',
                            reached ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                          )}
                        >
                          {t.count}
                        </span>
                        <span className="relative">
                          <Star
                            size={16}
                            className={cn(
                              reached
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-[var(--text-secondary)] opacity-40'
                            )}
                          />
                          {isLast && (
                            <Gift size={14} className="absolute -right-4 -top-0.5 text-[#ff7a45]" />
                          )}
                        </span>
                        <span
                          className={cn(
                            'text-[11px] font-semibold',
                            reached ? 'text-brand' : 'text-[var(--text-secondary)]'
                          )}
                        >
                          {t.pct}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* Rules */}
              <Card className="p-5">
                <div className="flex items-center gap-2 font-bold text-warning">
                  <Megaphone size={18} />
                  <span>Rules:</span>
                </div>
                <ol className="mt-3 space-y-2 text-sm text-[var(--text-secondary)]">
                  <RuleItem n={1}>
                    Invite a friend to make a first deposit of{' '}
                    <b className="text-[var(--text-primary)]">$20+</b>, and both of you get{' '}
                    <b className="text-[var(--text-primary)]">$5.00 Bonus SC</b>.
                  </RuleItem>
                  <RuleItem n={2}>
                    Once you reach the required number of valid referrals, you earn a percentage of
                    each referral&apos;s deposits.
                  </RuleItem>
                  <RuleItem n={3}>
                    A referral becomes valid after the referred friend reaches{' '}
                    <b className="text-[var(--text-primary)]">$20</b> in total deposits.
                  </RuleItem>
                </ol>
              </Card>

              {/* Share button */}
              <Button
                fullWidth
                onClick={() => setShareOpen(true)}
                className="bg-gradient-to-r from-brand-solid to-[#2fbf71] py-4 text-base"
              >
                <Link2 size={18} />
                Share invitation link
              </Button>
            </>
          ) : (
            <MyRewards
              referral={referral}
              claimed={claimed}
              onClaim={(index) => setClaimed((c) => ({ ...c, [index]: true }))}
            />
          )}
        </div>
      </div>

      <ShareInviteModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        link={referral.inviteLink}
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  id,
  controls,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  id: string;
  controls: string;
}) {
  return (
    <button
      id={id}
      role="tab"
      aria-selected={active}
      aria-controls={controls}
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold transition-all',
        active
          ? 'bg-gradient-to-r from-brand-solid to-[#2fbf71] text-white shadow-glowBrand'
          : 'border border-[var(--card-border)] bg-[var(--card-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StatCard({
  gradient,
  icon,
  value,
  label,
}: {
  gradient: string;
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div
      className={cn(
        'relative flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-br p-5 text-white shadow-lg',
        gradient
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent"
      />
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/20">
        {icon}
      </span>
      <div className="relative ml-auto text-right">
        <p className="text-3xl font-black leading-none">{value}</p>
        <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/85">
          {label}
        </p>
      </div>
    </div>
  );
}

function RuleItem({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="font-semibold text-[var(--text-primary)]">{n}.</span>
      <span>{children}</span>
    </li>
  );
}

function MyRewards({
  referral,
  claimed,
  onClaim,
}: {
  referral: ReferralSummary;
  claimed: Record<number, boolean>;
  onClaim: (index: number) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4 text-center">
          <p className="text-xs text-[var(--text-secondary)]">Cumulative Rewards</p>
          <p className="mt-1 text-2xl font-black text-brand">${referral.totalCommission}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-[var(--text-secondary)]">Pending</p>
          <p className="mt-1 text-2xl font-black text-warning">${referral.pendingCommission}</p>
        </Card>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Reward History</p>
        {referral.invitees.length === 0 ? (
          <Card className="p-8 text-center text-sm text-[var(--text-secondary)]">
            No rewards yet. Invite friends to start earning!
          </Card>
        ) : (
          <div className="space-y-2">
            {referral.invitees.map((inv, i) => {
              const isClaimed = inv.status === 'claimed' || claimed[i];
              return (
                <Card key={i} className="flex items-center justify-between p-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/15 text-sm font-bold text-brand">
                      {inv.username.charAt(0).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{inv.username}</p>
                      <p className="text-xs text-[var(--text-secondary)]">
                        Joined {new Date(inv.joinedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-brand">+${inv.reward}</span>
                    {isClaimed ? (
                      <Badge tone="success">Claimed</Badge>
                    ) : (
                      <Button onClick={() => onClaim(i)} className="px-3 py-1.5 text-xs">
                        Claim
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
