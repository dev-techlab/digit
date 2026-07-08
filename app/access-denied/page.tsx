import Link from 'next/link';
import { MapPinOff } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Region Not Available · ${APP_NAME}` };

export default function AccessDeniedPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/15 text-warning">
        <MapPinOff size={30} />
      </div>
      <h1 className="text-xl font-bold">Region Not Available</h1>
      <p className="max-w-xs text-sm text-[var(--text-secondary)]">
        {APP_NAME} isn&apos;t currently available in your region due to local regulations.
      </p>
      <Link href="/game" className="text-sm font-semibold text-brand">
        Back to Home
      </Link>
    </div>
  );
}
