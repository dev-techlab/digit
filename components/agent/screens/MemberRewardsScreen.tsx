'use client';

import { useEffect, useState } from 'react';
import { Info } from 'lucide-react';
import { api, Btn, Card, Field, TextInput } from '../ui';

interface WalletData {
  settings: { phoneBindRewardSc: string } | null;
}

export function MemberRewardsScreen() {
  const [reward, setReward] = useState('3');
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api<WalletData>('/api/agent/wallet').then((d) => {
      if (d.settings) setReward(d.settings.phoneBindRewardSc);
    });
  }, []);

  const save = async () => {
    setErr(null);
    try {
      await api('/api/agent/wallet', {
        method: 'PUT',
        body: JSON.stringify({ phoneBindRewardSc: Number(reward) }),
      });
      setMsg('Reward settings saved');
      setTimeout(() => setMsg(null), 2500);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <Card className="max-w-3xl">
      <h3 className="text-lg font-semibold text-slate-800">Member Rewards</h3>
      {msg && (
        <p className="mt-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-600">
          {msg}
        </p>
      )}
      {err && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {err}
        </p>
      )}
      <p className="mt-4 flex items-start gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-500">
        <Info size={16} className="mt-0.5 shrink-0" />
        Rewards are credited to members automatically. Members flagged “No SC Reward” in the Member
        List are excluded.
      </p>
      <div className="mt-6 max-w-sm space-y-5">
        <Field label="Phone Bind Reward SC" hint="SC credited when a member binds their phone number">
          <TextInput type="number" value={reward} onChange={(e) => setReward(e.target.value)} />
        </Field>
        <Btn className="w-32 justify-center" onClick={save}>
          Save
        </Btn>
      </div>
    </Card>
  );
}
