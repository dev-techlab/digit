'use client';

import { useEffect, useState } from 'react';
import { api, Table, Toggle } from '../ui';
import { cn } from '@/lib/cn';

const AVATAR_GRADIENTS = [
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-green-600',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-red-500',
  'from-violet-400 to-purple-600',
  'from-cyan-400 to-sky-600',
];

/** Platform icon with graceful fallback: real CDN icon → branded letter avatar. */
function PlatformIcon({ name, iconUrl }: { name: string; iconUrl: string | null }) {
  const [failed, setFailed] = useState(false);
  if (iconUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    );
  }
  const hash = [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  const initials = name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white',
        AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
      )}
    >
      {initials}
    </span>
  );
}

interface Platform {
  id: string;
  name: string;
  slug: string;
  iconUrl: string | null;
  externalId: number | null;
  providerCode: string | null;
  providerType: string | null;
  launchUrl: string | null;
  sort: number;
  isActive: boolean;
}

/**
 * Read-only view of the master game-platform catalog — it's shared across
 * every store on the platform, so it's managed from the admin panel, not
 * here. Stores pick which of these platforms to enable under Game Setting.
 */
export function PlatformCatalogScreen() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ platforms: Platform[] }>('/api/agent/platforms')
      .then((d) => setPlatforms(d.platforms))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Master game platform catalog, managed by OctanLink. This list is read-only here — head to
        Game Setting to configure which of these platforms your store has enabled.
      </p>

      <Table
        headers={['#', 'Platform', 'Code', 'Type', 'Sort', 'Active']}
        empty={!loading && platforms.length === 0}
      >
        {platforms.map((p, i) => (
          <tr key={p.id} className="hover:bg-slate-50/60">
            <td className="px-4 py-2.5 text-slate-400">{i + 1}</td>
            <td className="px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <PlatformIcon name={p.name} iconUrl={p.iconUrl} />
                <div className="min-w-0">
                  <div className="font-medium text-slate-800">{p.name}</div>
                  <div className="truncate text-xs text-slate-400">{p.slug}</div>
                </div>
              </div>
            </td>
            <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
              {p.providerCode || '--'}
            </td>
            <td className="px-4 py-2.5">{p.providerType || '--'}</td>
            <td className="px-4 py-2.5">{p.sort}</td>
            <td className="px-4 py-2.5">
              <Toggle checked={p.isActive} onChange={() => {}} disabled />
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
