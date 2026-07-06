import { ProviderCard } from './ProviderCard';
import type { GameProvider } from '@/lib/types';

export function ProviderGrid({ providers }: { providers: GameProvider[] }) {
  if (providers.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-[var(--text-secondary)]">
        No providers available right now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {providers
        .slice()
        .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name))
        .map((p) => (
          <ProviderCard key={`${p.providerType}-${p.id}`} provider={p} />
        ))}
    </div>
  );
}
