import { AlertCircle } from 'lucide-react';

export function GcNotice() {
  return (
    <div className="mx-4 mt-4 flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-sm font-medium text-warning md:mx-0">
      <AlertCircle size={16} className="shrink-0" />
      Golden Coins cannot be redeemed
    </div>
  );
}
