'use client';

import { useState } from 'react';
import { Lock, Check, RotateCcw, Info } from 'lucide-react';
import { api, TextInput } from '../ui';

export function ChangePasswordScreen() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async () => {
    if (!current) return setMsg({ ok: false, text: 'Please enter current password' });
    if (next.length < 6)
      return setMsg({ ok: false, text: 'New password must be at least 6 characters' });
    if (next !== confirm) return setMsg({ ok: false, text: 'Passwords do not match' });
    try {
      await api('/api/agent/change-password', {
        method: 'POST',
        body: JSON.stringify({ current, next }),
      });
      setMsg({ ok: true, text: 'Password changed successfully' });
      reset();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  };

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <div className="flex items-center gap-3 bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-5 text-white">
          <Lock size={22} />
          <h3 className="text-xl font-semibold">Change Password</h3>
        </div>
        <div className="space-y-5 p-8">
          {msg && (
            <p
              className={`rounded-lg px-4 py-2 text-sm ${
                msg.ok
                  ? 'border border-green-200 bg-green-50 text-green-600'
                  : 'border border-red-200 bg-red-50 text-red-500'
              }`}
            >
              {msg.text}
            </p>
          )}
          <p className="flex items-start gap-2 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-500">
            <Info size={16} className="mt-0.5 shrink-0" />
            For account security, please change your password regularly. Password must be at least
            6 characters
          </p>
          <div className="space-y-4">
            <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-sm text-slate-600 sm:w-24 sm:text-right">
                <span className="text-red-500">*</span> Current
              </span>
              <TextInput
                type="password"
                placeholder="Please enter current password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-sm text-slate-600 sm:w-24 sm:text-right">
                <span className="text-red-500">*</span> New
              </span>
              <TextInput
                type="password"
                placeholder="Please enter new password (at least 6 chars)"
                value={next}
                onChange={(e) => setNext(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-sm text-slate-600 sm:w-24 sm:text-right">
                <span className="text-red-500">*</span> Confirm
              </span>
              <TextInput
                type="password"
                placeholder="Please enter new password again"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:pl-28">
            <button
              onClick={submit}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              <Check size={16} /> Confirm
            </button>
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-8 py-2.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw size={15} /> Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
