import React from 'react';

interface OrderFiltersProps {
  typeFilter: string;
  setTypeFilter: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
}

export function OrderFilters({
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
}: OrderFiltersProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Type:</span>
        <select
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All Types</option>
          <option value="deposit">Deposit</option>
          <option value="withdraw">Withdraw</option>
        </select>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-slate-500">Status:</span>
        <select
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none focus:border-blue-500"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed / Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
    </div>
  );
}
