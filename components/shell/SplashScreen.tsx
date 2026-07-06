'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export function SplashScreen() {
  const [exiting, setExiting] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setExiting(true), 900);
    const hideTimer = setTimeout(() => setHidden(true), 1400);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (hidden) return null;

  return (
    <div
      className={cn(
        'fixed inset-0 z-[9999] flex items-center justify-center transition-all duration-500 ease-out',
        exiting && 'pointer-events-none scale-105 opacity-0'
      )}
      style={{ background: 'linear-gradient(180deg, #041f16 0%, #0a3629 100%)' }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-[55%] animate-splashGlow rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(0,214,50,0.06) 0%, transparent 70%)' }}
      />
      <div className="relative z-10 flex flex-col items-center">
        <div className="h-[140px] w-[140px] animate-splashLogoIn">
          <div
            className="flex h-full w-full items-center justify-center rounded-[28px] text-5xl font-black text-white"
            style={{
              background: 'linear-gradient(135deg, #00d632, #0a3629)',
              filter: 'drop-shadow(0 0 60px rgba(0,214,50,0.3))',
            }}
          >
            DL
          </div>
        </div>
        <div
          className="mt-6 animate-splashFadeUp text-xl font-bold uppercase tracking-[0.08em] text-white/[0.88]"
          style={{ animationDelay: '0.25s' }}
        >
          Digit Link
        </div>
        <div
          className="mt-2 animate-splashFadeUp text-[13px] text-white/55"
          style={{ animationDelay: '0.35s' }}
        >
          Explore a bigger world...
        </div>
        <div
          className="mt-7 h-0.5 w-[100px] animate-splashFadeUp overflow-hidden rounded-full bg-white/[0.06]"
          style={{ animationDelay: '0.45s' }}
        >
          <div className="h-full w-2/5 animate-splashShimmer rounded-full bg-brand" />
        </div>
      </div>
    </div>
  );
}
