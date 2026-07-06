import { getProviders } from '@/lib/data';
import { ProviderGrid } from '@/components/game/ProviderGrid';
import { BannerCarousel } from '@/components/game/BannerCarousel';
import { GcNotice } from '@/components/game/GcNotice';
import { PwaInstallBanner } from '@/components/shell/PwaInstallBanner';

export const metadata = { title: 'Game Center · Digit Link' };

export default async function GamePage() {
  const [scProviders, gcProviders] = await Promise.all([
    getProviders('SC'),
    getProviders('GC'),
  ]);
  const providers = [...scProviders, ...gcProviders];

  return (
    <div className="pb-4">
      <PwaInstallBanner />
      <BannerCarousel />
      <GcNotice />
      <div className="px-4 pt-4 md:px-0">
        <ProviderGrid providers={providers} />
      </div>
    </div>
  );
}
