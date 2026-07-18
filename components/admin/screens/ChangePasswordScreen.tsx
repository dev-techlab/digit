'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, Btn, Card, Field, TextInput } from '@/components/agent/ui';

export function ChangePasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError(null);
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    setSaving(true);
    try {
      await api('/api/admin/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      // Password change revokes every session (including this one) — back to login.
      router.replace('/admin/login');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change password.');
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-md">
      <h3 className="text-lg font-semibold text-slate-800">Change Password</h3>
      <p className="mt-1 text-sm text-slate-500">
        Changing your password signs you out of every active session, including this one.
      </p>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">{error}</p>
      )}
      <div className="mt-5 space-y-4">
        <Field label="Current Password" required>
          <TextInput
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </Field>
        <Field label="New Password" required hint="At least 6 characters">
          <TextInput
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>
        <Field label="Confirm New Password" required>
          <TextInput
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>
        <Btn
          onClick={submit}
          disabled={saving || !currentPassword || !newPassword || !confirmPassword}
        >
          {saving ? 'Saving…' : 'Change Password'}
        </Btn>
      </div>
    </Card>
  );
}
