export const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
      status === 'completed'
        ? 'bg-green-50 text-green-600'
        : status === 'pending'
          ? 'bg-amber-50 text-amber-600'
          : status === 'failed' || status === 'rejected'
            ? 'bg-red-50 text-red-500'
            : 'bg-slate-100 text-slate-500'
    }`}
  >
    {status}
  </span>
);

export const TypeBadge = ({ type }: { type: string }) => (
  <span
    className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${
      type === 'deposit'
        ? 'bg-emerald-50 text-emerald-600'
        : type === 'withdraw'
          ? 'bg-rose-50 text-rose-600'
          : 'bg-slate-50 text-slate-600'
    }`}
  >
    {type}
  </span>
);
