import type { MockUser } from './auth-context';

export type ProfileTaskKey = 'phone' | 'kyc' | 'pwa';

export interface ProfileTaskMeta {
  key: ProfileTaskKey;
  title: string;
  description: string;
  rewardGc: number;
  rewardSc: number;
}

/**
 * The onboarding tasks surfaced in the "Complete Your Profile" reward flow.
 * Ordered — tasks unlock sequentially, matching the live Octan Link app.
 */
export const PROFILE_TASKS: ProfileTaskMeta[] = [
  {
    key: 'phone',
    title: 'Bind Phone Number',
    description: 'Secure your account and unlock phone login',
    rewardGc: 30000,
    rewardSc: 3,
  },
  {
    key: 'kyc',
    title: 'Take A Picture of Driver License / ID',
    description: 'Upload your ID for verification and earn rewards',
    rewardGc: 10000,
    rewardSc: 1,
  },
  {
    key: 'pwa',
    title: 'Install DLink App',
    description: 'Quick access and better experience',
    rewardGc: 10000,
    rewardSc: 1,
  },
];

export function isTaskDone(user: MockUser, key: ProfileTaskKey): boolean {
  switch (key) {
    case 'phone':
      return user.phoneBound;
    case 'kyc':
      return user.kycStatus === 'verified' || user.kycStatus === 'pending';
    case 'pwa':
      return user.pwaInstalled;
  }
}

export function completedCount(user: MockUser): number {
  return PROFILE_TASKS.filter((t) => isTaskDone(user, t.key)).length;
}

/** The next actionable task, or `undefined` when everything is complete. */
export function nextTask(user: MockUser): ProfileTaskMeta | undefined {
  return PROFILE_TASKS.find((t) => !isTaskDone(user, t.key));
}

/** 30000 -> "30K", 1500 -> "1.5K", 500 -> "500". */
export function formatReward(n: number): string {
  if (n < 1000) return String(n);
  const k = n / 1000;
  return `${Number.isInteger(k) ? k : k.toFixed(1)}K`;
}
