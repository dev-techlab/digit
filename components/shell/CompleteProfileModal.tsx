'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Gift,
  Smartphone,
  CreditCard,
  Download,
  Lock,
  Check,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/auth-context';
import {
  PROFILE_TASKS,
  isTaskDone,
  completedCount,
  type ProfileTaskKey,
} from '@/lib/profile-tasks';
import { cn } from '@/lib/cn';
import { RewardBadges } from './RewardBadges';
import { BindPhoneModal } from '@/components/profile/BindPhoneModal';
import { InstallPwaModal } from '@/components/profile/InstallPwaModal';

const TASK_ICON: Record<ProfileTaskKey, LucideIcon> = {
  phone: Smartphone,
  kyc: CreditCard,
  pwa: Download,
};

/** Accent used for the active task's icon tile, keyed to the live app's look. */
const TASK_ACCENT: Record<ProfileTaskKey, string> = {
  phone: 'bg-sky-500 text-white',
  kyc: 'bg-violet-500 text-white',
  pwa: 'bg-brand-solid text-white',
};

export function CompleteProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, updateProfile } = useAuth();
  const [sub, setSub] = useState<'bindPhone' | 'installPwa' | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !user || typeof document === 'undefined') return null;

  const done = completedCount(user);
  const total = PROFILE_TASKS.length;
  // Sequential unlock: the first not-yet-done task is the only actionable one.
  const activeIndex = PROFILE_TASKS.findIndex((t) => !isTaskDone(user, t.key));

  const runTask = (key: ProfileTaskKey) => {
    switch (key) {
      case 'phone':
        setSub('bindPhone');
        break;
      case 'kyc':
        // No live KYC upload in the clone — mock an accepted submission.
        updateProfile({ kycStatus: 'verified' });
        break;
      case 'pwa':
        setSub('installPwa');
        updateProfile({ pwaInstalled: true });
        break;
    }
  };

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-10 max-h-[90dvh] w-full max-w-[460px] animate-modalScaleIn overflow-y-auto rounded-t-2xl border border-[var(--card-border)] bg-[var(--modal-bg)] p-5 shadow-2xl sm:rounded-2xl">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white">
              <Gift size={24} />
            </div>
            <div className="flex-1 pt-0.5">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                Complete Your Profile
              </h2>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                Complete the tasks below to unlock rewards and get the best experience
              </p>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-1.5 text-[var(--text-secondary)] hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>

          {/* Task list */}
          <div className="mt-5 space-y-3">
            {PROFILE_TASKS.map((task, i) => {
              const Icon = TASK_ICON[task.key];
              const isDone = isTaskDone(user, task.key);
              const isActive = !isDone && i === activeIndex;
              const isLocked = !isDone && !isActive;

              return (
                <button
                  key={task.key}
                  type="button"
                  disabled={!isActive}
                  onClick={() => isActive && runTask(task.key)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-colors',
                    isActive &&
                      'border-brand/40 bg-brand/[0.06] hover:bg-brand/10 focus:outline-none focus:ring-2 focus:ring-brand/40',
                    isDone && 'border-emerald-500/30 bg-emerald-500/[0.06]',
                    isLocked && 'cursor-not-allowed border-[var(--card-border)] opacity-55'
                  )}
                >
                  <div
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
                      isDone && 'bg-emerald-500 text-white',
                      isActive && TASK_ACCENT[task.key],
                      isLocked && 'bg-white/5 text-[var(--text-secondary)]'
                    )}
                  >
                    {isDone ? (
                      <Check size={20} />
                    ) : isLocked ? (
                      <Lock size={18} />
                    ) : (
                      <Icon size={20} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'truncate text-sm font-bold',
                        isDone ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'
                      )}
                    >
                      {task.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-secondary)]">
                      {task.description}
                    </p>
                    {!isDone && (
                      <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
                        Reward: <RewardBadges gc={task.rewardGc} sc={task.rewardSc} />
                      </span>
                    )}
                  </div>

                  <span className="shrink-0 text-[var(--text-secondary)]">
                    {isDone ? (
                      <Check size={18} className="text-emerald-500" />
                    ) : isActive ? (
                      <ChevronRight size={18} />
                    ) : (
                      <Lock size={16} />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="mt-5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-500 transition-[width] duration-300"
                style={{ width: `${(done / total) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-center text-xs font-medium text-[var(--text-secondary)]">
              {done}/{total} completed
            </p>
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full rounded-lg py-2.5 text-sm font-semibold text-[var(--text-secondary)] hover:bg-white/5"
          >
            {done === total ? 'Done' : 'Skip for now'}
          </button>
        </div>
      </div>

      <BindPhoneModal open={sub === 'bindPhone'} onClose={() => setSub(null)} />
      <InstallPwaModal open={sub === 'installPwa'} onClose={() => setSub(null)} />
    </>,
    document.body
  );
}
