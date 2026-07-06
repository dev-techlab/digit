'use client';

import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import type { OrderRecord } from '@/lib/types';

const STATUS_TONE = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
  cancelled: 'neutral',
} as const;

export function OrderDetailDialog({
  order,
  onClose,
}: {
  order: OrderRecord | null;
  onClose: () => void;
}) {
  return (
    <Modal open={!!order} onClose={onClose} title="Order Details">
      {order && (
        <dl className="space-y-3 text-sm">
          <Row label="Order Number" value={order.orderNo} />
          <Row
            label="Status"
            value={<Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>}
          />
          <Row label="Payment Method" value={order.paymentMethod} />
          <Row label="Amount" value={`$${order.amount}`} />
          <Row label="Pay Amount" value={`$${order.payAmount}`} />
          <Row label="Actual Deposit Amount" value={`$${order.actualDepositAmount}`} />
          <Row
            label="Fee Mode"
            value={order.feeMode === 'waiver' ? 'Fee Waiver' : 'Standard Fee'}
          />
          <Row label="Fee" value={order.feeWaived ? 'Waived' : `$${order.fee}`} />
          <Row label="SC Bonus" value={`$${order.scBonus}`} />
          <Row label="Create Time" value={new Date(order.createTime).toLocaleString()} />
        </dl>
      )}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--divider-color)] pb-2 last:border-0">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
