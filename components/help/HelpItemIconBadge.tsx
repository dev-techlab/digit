import { Play, Coins, Bitcoin } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { HelpItemIcon } from '@/lib/help-content';

const SIZES = {
  md: { box: 'h-9 w-9', icon: 18, text: 'text-xs' },
  lg: { box: 'h-14 w-14', icon: 26, text: 'text-lg' },
} as const;

export function HelpItemIconBadge({
  icon,
  size = 'md',
}: {
  icon: HelpItemIcon;
  size?: keyof typeof SIZES;
}) {
  const s = SIZES[size];

  if (icon === 'pyusd') {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-[#0070ba] font-black text-white',
          s.box,
          s.text
        )}
      >
        ℙ
      </span>
    );
  }

  const config = {
    play: { bg: 'bg-[#7c3aed]', Icon: Play },
    coins: { bg: 'bg-brand-solid', Icon: Coins },
    btc: { bg: 'bg-[#f7931a]', Icon: Bitcoin },
  }[icon];

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full text-white',
        config.bg,
        s.box
      )}
    >
      <config.Icon size={s.icon} fill={icon === 'play' ? 'currentColor' : 'none'} />
    </span>
  );
}
