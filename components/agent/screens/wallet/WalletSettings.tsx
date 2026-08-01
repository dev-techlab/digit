'use client';

import { useState, useRef, useEffect } from 'react';
import { Info, Plus } from 'lucide-react';
import { api, Btn, Card, Field, TextInput } from '../../ui';
import { WalletData } from './types';

const InfoDot = () => <Info size={13} className="ml-1 inline text-slate-300" />;

interface Props {
  data: WalletData;
  flash: (ok: boolean, text: string) => void;
  mutate: () => void;
}

export function WalletSettings({ data, flash, mutate }: Props) {
  const [form, setForm] = useState({
    storeName: '',
    dailyMaxRedeem: '5000',
    dailyMaxWithdraw: '500',
    phoneBindRewardSc: '3',
    logoUrl: null as string | null,
  });

  const logoInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data.settings) {
      setForm({
        storeName: data.settings.storeName ?? '',
        dailyMaxRedeem: data.settings.dailyMaxRedeem,
        dailyMaxWithdraw: data.settings.dailyMaxWithdraw,
        phoneBindRewardSc: data.settings.phoneBindRewardSc,
        logoUrl: data.settings.logoUrl,
      });
    }
  }, [data.settings]);

  const saveSettings = async () => {
    try {
      await api('/api/agent/wallet', { method: 'PUT', body: JSON.stringify(form) });
      flash(true, 'Settings saved');
      mutate();
    } catch (e) {
      flash(false, (e as Error).message);
    }
  };

  const pickLogo = (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return flash(false, 'Logo must be at most 2MB');
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, logoUrl: reader.result as string }));
    reader.readAsDataURL(file);
  };

  return (
    <Card>
      <h3 className="mb-1 w-fit border-b-2 border-blue-500 pb-2 text-base font-semibold text-blue-500">
        Basic
      </h3>
      <div className="mt-4 grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
        <Field label="Store Name">
          <TextInput
            maxLength={20}
            placeholder="Enter store brand name"
            value={form.storeName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, storeName: e.target.value })}
          />
        </Field>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-600">
            Daily Max Redeem
            <InfoDot />
            <span className="ml-2 text-xs font-normal text-slate-400">USD / day</span>
          </span>
          <TextInput
            type="number"
            value={form.dailyMaxRedeem}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, dailyMaxRedeem: e.target.value })}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-600">
            Daily Max Withdraw
            <InfoDot />
            <span className="ml-2 text-xs font-normal text-slate-400">USD / day</span>
          </span>
          <TextInput
            type="number"
            value={form.dailyMaxWithdraw}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, dailyMaxWithdraw: e.target.value })}
          />
        </label>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-slate-600">
            Store Logo
            <InfoDot />
          </span>
          <input
            ref={logoInput}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={(e) => pickLogo(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => logoInput.current?.click()}
            className="flex h-36 w-full max-w-44 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-blue-400 hover:text-blue-400"
          >
            {form.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.logoUrl}
                alt="Store logo"
                className="h-full w-full rounded-lg object-contain p-1"
              />
            ) : (
              <>
                <Plus size={30} strokeWidth={1.2} />
                <span className="text-sm">Upload Image</span>
                <span className="px-3 text-center text-xs text-slate-300">
                  Supports JPG, PNG, GIF, WEBP format, max 2MB
                </span>
              </>
            )}
          </button>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-600">
            Phone Bind Reward SC
            <InfoDot />
            <span className="ml-2 text-xs font-normal text-slate-400">SC</span>
          </span>
          <TextInput
            type="number"
            value={form.phoneBindRewardSc}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, phoneBindRewardSc: e.target.value })}
          />
        </label>
      </div>
      <Btn className="mt-5 w-40 justify-center" onClick={saveSettings}>
        Save
      </Btn>
    </Card>
  );
}
