import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const metadata = { title: 'Responsible Social Gameplay · Digit Link' };

export default function ResponsibleGamingPage() {
  return (
    <LegalPageLayout title="Responsible Social Gameplay">
      <p>
        Digit Link is committed to promoting responsible social gameplay. Our games are intended for
        entertainment purposes and should never be viewed as a way to make money.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">Play Within Your Means</h2>
      <p>
        Only use funds you can comfortably afford. Set personal time and spending limits before you
        start playing.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">Warning Signs</h2>
      <p>
        If gameplay is affecting your relationships, finances, or wellbeing, take a break and seek
        support. Warning signs include chasing losses, hiding play from loved ones, and playing
        longer than intended.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">Self-Exclusion & Support</h2>
      <p>
        Contact our Help Center to set deposit limits, take a cooling-off period, or self-exclude
        from the Platform. If you or someone you know needs help, contact the National Council on
        Problem Gambling at 1-800-522-4700.
      </p>
    </LegalPageLayout>
  );
}
