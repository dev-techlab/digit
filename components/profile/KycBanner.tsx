import { ShieldAlert } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export function KycBanner({ status }: { status: 'unverified' | 'pending' | 'rejected' }) {
  const copy =
    status === 'pending'
      ? { title: 'Verification Pending', body: 'Your identity verification is being reviewed.' }
      : status === 'rejected'
        ? { title: 'Verification Rejected', body: 'Please resubmit your documents to continue.' }
        : {
            title: 'Complete KYC Verification',
            body: 'Required before initiating any cash withdrawal requests.',
          };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
          <ShieldAlert size={20} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">{copy.title}</p>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{copy.body}</p>
          <ul className="mt-2 space-y-1 text-[11px] text-[var(--text-secondary)]">
            <li>• Secure & encrypted verification process</li>
            <li>• One-time verification for lifetime access</li>
            <li>• Unlock all withdrawal features instantly</li>
          </ul>
          {status !== 'pending' && <Button className="mt-3 w-full py-2 text-sm">Verify Now</Button>}
        </div>
      </div>
    </Card>
  );
}
