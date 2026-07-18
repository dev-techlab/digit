'use client';

import { useState } from 'react';
import { Mail, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function PostalRequestForm() {
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/postal-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Failed to submit request');
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Card className="flex flex-col items-center gap-3 p-8 text-center">
        <CheckCircle2 size={40} className="text-success" />
        <p className="font-bold">Request Submitted</p>
        <p className="text-sm text-[var(--text-secondary)]">
          Your postal request code <span className="font-mono font-semibold">{code}</span> has been
          received. We&apos;ll follow up by mail.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 text-brand">
          <Mail size={18} />
        </div>
        <div>
          <p className="font-bold">Postal Request Code</p>
          <p className="text-xs text-[var(--text-secondary)]">
            No purchase necessary — request your free entry code by mail
          </p>
        </div>
      </div>
      <Input
        placeholder="Enter your postal request code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button fullWidth disabled={!code || submitting} onClick={submit}>
        {submitting ? 'Submitting…' : 'Submit Request'}
      </Button>
    </Card>
  );
}
