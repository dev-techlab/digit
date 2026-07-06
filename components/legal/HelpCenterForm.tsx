'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

const FAQS = [
  {
    q: 'How do I redeem Sweepstakes Coins?',
    a: 'Complete KYC verification, then submit a withdrawal request from your Wallet panel.',
  },
  {
    q: 'What is the difference between GC and SC?',
    a: 'Gold Coins (GC) are play-only with no cash value. Sweepstakes Coins (SC) can be redeemed for cash once wagering requirements are met.',
  },
  {
    q: 'Why do I need to complete KYC?',
    a: 'U.S. state regulations governing sweepstakes promotions require identity verification before any cash withdrawal.',
  },
  {
    q: 'How long do withdrawals take?',
    a: 'Most withdrawals are reviewed within 24-48 hours depending on the method and verification status.',
  },
];

export function HelpCenterForm() {
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-semibold">Frequently Asked Questions</p>
        <div className="space-y-2">
          {FAQS.map((f) => (
            <Card key={f.q} className="p-4">
              <p className="text-sm font-semibold">{f.q}</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{f.a}</p>
            </Card>
          ))}
        </div>
      </div>

      <Card className="p-4">
        <p className="mb-2 text-sm font-semibold">Still need help?</p>
        {submitted ? (
          <div className="flex items-center gap-2 text-sm text-success">
            <CheckCircle2 size={16} />
            Your ticket has been submitted. Our team will follow up by email.
          </div>
        ) : (
          <>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Briefly describe your issue so we can help you better"
              rows={3}
              className="w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)] px-4 py-3 text-sm outline-none focus:border-brand"
            />
            <Button className="mt-3" disabled={!message} onClick={() => setSubmitted(true)}>
              Submit Ticket
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
