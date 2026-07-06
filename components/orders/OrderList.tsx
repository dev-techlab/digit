'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { OrderDetailDialog } from './OrderDetailDialog';
import type { OrderRecord } from '@/lib/types';

const STATUS_TONE = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
  cancelled: 'neutral',
} as const;

export function OrderList({ orders }: { orders: OrderRecord[] }) {
  const [selected, setSelected] = useState<OrderRecord | null>(null);

  if (orders.length === 0) {
    return <p className="py-12 text-center text-sm text-[var(--text-secondary)]">No orders yet.</p>;
  }

  return (
    <>
      <div className="space-y-2">
        {orders.map((order) => (
          <Card
            key={order.orderNo}
            onClick={() => setSelected(order)}
            className="flex cursor-pointer items-center gap-3 p-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">${order.amount}</p>
                <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{order.paymentMethod}</p>
              <p className="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                {new Date(order.createTime).toLocaleString()}
              </p>
            </div>
            <ChevronRight size={16} className="text-[var(--text-secondary)]" />
          </Card>
        ))}
      </div>
      <OrderDetailDialog order={selected} onClose={() => setSelected(null)} />
    </>
  );
}
