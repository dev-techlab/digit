'use client';

import { PlayerCreateView } from '@/components/agent/PlayerCreateView';

export default function PlatformAccountsAdminPage() {
  return (
    <div className="max-w-[1400px] space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Platform Accounts Management</h1>
      <PlayerCreateView onBack={() => {}} />
    </div>
  );
}
