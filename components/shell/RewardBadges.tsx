import { cn } from '@/lib/cn';
import { formatReward } from '@/lib/profile-tasks';

/**
 * The "GC +30K  SC +3" reward chips used by the profile-completion flow.
 * `tone="onLight"` renders dark value text for the gold reward bar; the
 * default renders bright value text for dark surfaces (cards / modal).
 */
export function RewardBadges({
  gc,
  sc,
  tone = 'onDark',
  className,
}: {
  gc: number;
  sc: number;
  tone?: 'onDark' | 'onLight';
  className?: string;
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <span className="flex items-center gap-1">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[7px] font-black leading-none text-black">
          GC
        </span>
        <span
          className={cn(
            'text-xs font-bold',
            tone === 'onLight' ? 'text-amber-900' : 'text-amber-400'
          )}
        >
          +{formatReward(gc)}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-[7px] font-black leading-none text-white">
          SC
        </span>
        <span
          className={cn(
            'text-xs font-bold',
            tone === 'onLight' ? 'text-emerald-900' : 'text-emerald-400'
          )}
        >
          +{sc}
        </span>
      </span>
    </span>
  );
}
