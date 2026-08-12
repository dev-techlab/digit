import * as React from 'react';
import { useState, useEffect } from 'react';
import { api, Btn, Card, Field, TextInput } from '@/components/agent/ui';
import { PlatformAccountTable } from '@/components/agent/PlatformAccountTable';
import { cn } from '@/lib/cn';

interface Platform {
  id: string;
  name: string;
  iconUrl: string | null;
}

export function PlayerCreateView({ onBack }: { onBack: () => void }) {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatformId, setSelectedPlatformId] = useState<string | null>(null);

  const [form, setForm] = useState({ purchaseAmount: '0.00', usernameNotes: '' });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    api<{ platforms: Platform[] }>('/api/agent/platforms')
      .then((d: { platforms: Platform[] }) => {
        setPlatforms(d.platforms);
        if (d.platforms.length > 0) setSelectedPlatformId(d.platforms[0].id);
      })
      .catch(console.error);
  }, []);

  const createAccount = async () => {
    if (!selectedPlatformId) return;
    setLoading(true);
    setErr(null);
    try {
      await api('/api/agent/platform-accounts', {
        method: 'POST',
        body: JSON.stringify({
          platformId: selectedPlatformId,
          purchaseAmount: parseFloat(form.purchaseAmount) || 0,
          usernameNotes: form.usernameNotes,
        }),
      });
      setForm({ purchaseAmount: '0.00', usernameNotes: '' });
      setRefreshKey((k) => k + 1);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const selectedPlatform = platforms.find((p) => p.id === selectedPlatformId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800">Add Player Account</h2>
        <Btn variant="ghost" onClick={onBack}>
          Back to List
        </Btn>
      </div>

      <Card className="bg-slate-50 p-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-6">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-slate-600">Platform</h3>
              <div className="flex flex-wrap gap-3">
                {platforms.map((p) => {
                  const isSelected = p.id === selectedPlatformId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatformId(p.id)}
                      className={cn(
                        'relative flex h-20 w-32 flex-col items-center justify-center overflow-hidden rounded-lg border-2 p-3 transition-all',
                        isSelected
                          ? 'border-green-500 shadow-md ring-2 ring-green-200'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      )}
                    >
                      {/* Platform gradient background simulation based on screenshot */}
                      <div
                        className={cn(
                          'absolute inset-0 opacity-20',
                          isSelected ? 'bg-blue-600' : 'bg-purple-600'
                        )}
                      />
                      {isSelected && (
                        <div className="absolute left-1 top-1 rounded-full bg-green-500 p-0.5">
                          <svg
                            className="h-3 w-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                      <span className="relative z-10 font-bold text-slate-800">
                        {p.name.toUpperCase()}
                      </span>
                      <span className="relative z-10 mt-1 text-[10px] text-slate-500">
                        {p.name.toLowerCase()}.com
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Purchase Amount (SC)">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 font-bold text-slate-500">$</span>
                  <TextInput
                    className="h-12 w-full max-w-[200px] pl-8 text-lg font-bold"
                    value={form.purchaseAmount}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, purchaseAmount: e.target.value }))
                    }
                    placeholder="0.00"
                  />
                </div>
              </Field>

              <Field label="Username / Notes">
                <TextInput
                  className="h-12 w-full max-w-sm"
                  value={form.usernameNotes}
                  onChange={(e) => setForm((prev) => ({ ...prev, usernameNotes: e.target.value }))}
                  placeholder="Enter player nickname or ID"
                />
              </Field>
            </div>

            {err && <p className="mb-4 rounded bg-red-50 p-2 text-sm text-red-500">{err}</p>}

            <div className="flex gap-3">
              <Btn onClick={createAccount} disabled={loading || !form.usernameNotes}>
                {loading ? 'Creating...' : 'Create account'}
              </Btn>
              <Btn variant="ghost" onClick={onBack}>
                Cancel
              </Btn>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-slate-600">
              {selectedPlatform?.name || 'Platform'} offers
            </h3>
            <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-blue-900 shadow-inner">
              {/* Fake dynamic offer banner mapping based on selected platform */}
              {selectedPlatformId ? (
                <div className="p-6 text-center text-white">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400 shadow-[0_0_30px_rgba(250,204,21,0.6)]">
                    <span className="text-4xl">🐬</span>
                  </div>
                  <h4 className="text-xl font-bold uppercase tracking-wider text-yellow-400">
                    VIP CLUB
                  </h4>
                  <p className="mt-1 text-sm text-blue-200">Exclusive VIP Benefits</p>
                </div>
              ) : (
                <span className="text-slate-400">Select a platform</span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {selectedPlatformId && (
        <PlatformAccountTable
          key={`${selectedPlatformId}-${refreshKey}`}
          platformId={selectedPlatformId}
        />
      )}
    </div>
  );
}
