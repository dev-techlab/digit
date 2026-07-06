'use client';

import { useState } from 'react';
import { Eye, EyeOff, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { RedemptionReview } from '@/lib/types';

const STATUS_TONE = { reviewing: 'warning', approved: 'success', rejected: 'danger' } as const;

export function RedemptionReviewList({ reviews: initial }: { reviews: RedemptionReview[] }) {
  const [reviews, setReviews] = useState(initial);

  const toggleVisibility = (id: string) =>
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, visible: !r.visible } : r)));

  const cancel = (id: string) => setReviews((prev) => prev.filter((r) => r.id !== id));

  const visible = reviews.filter((r) => r.visible);

  if (visible.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--text-secondary)]">
        No redemption reviews.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {visible.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">${r.amount}</p>
                <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {r.provider} · {r.orderNo}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                {new Date(r.submittedAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleVisibility(r.id)}
                aria-label="Toggle visibility"
                className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-white/10"
              >
                {r.visible ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
              {r.status === 'reviewing' && (
                <button
                  onClick={() => cancel(r.id)}
                  aria-label="Cancel"
                  className="rounded-full p-2 text-danger hover:bg-danger/10"
                >
                  <XCircle size={16} />
                </button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
