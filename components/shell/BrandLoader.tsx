import { Loader2 } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

/** Static (non-exiting) variant of the splash branding, for auth/data gates
 * that stay up for an unknown duration — see SplashScreen for the one-shot
 * animated boot screen. */
export function BrandLoader() {
  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-4"
      style={{ background: 'linear-gradient(180deg, #03182a 0%, #0d3a5c 100%)' }}
    >
      <div
        className="flex h-24 w-24 items-center justify-center rounded-[24px] text-3xl font-black text-white"
        style={{
          background: 'linear-gradient(135deg, #0091ff, #0a2a45)',
          filter: 'drop-shadow(0 0 40px rgba(0,145,255,0.3))',
        }}
      >
        OL
      </div>
      <div className="text-lg font-bold uppercase tracking-[0.08em] text-white/[0.88]">
        {APP_NAME}
      </div>
      <Loader2 size={22} className="mt-1 animate-spin text-white/50" />
    </div>
  );
}
