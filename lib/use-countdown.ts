'use client';

import { useEffect, useState } from 'react';

export function useCountdown(seconds: number | undefined) {
  const [target] = useState(() => (seconds ? Date.now() + seconds * 1000 : null));
  const [remaining, setRemaining] = useState(seconds ?? 0);

  useEffect(() => {
    if (!target) return;
    const tick = () => setRemaining(Math.max(0, Math.round((target - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target]);

  if (!seconds) return null;

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  return `${h}h ${m}m ${s}s left`;
}
