import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const metadata = { title: 'Terms & Conditions · Digit Link' };

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms & Conditions">
      <p>
        These Terms & Conditions (&quot;Terms&quot;) govern your access to and use of Digit Link
        (the &quot;Platform&quot;). By creating an account or using the Platform, you agree to be
        bound by these Terms.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">1. Eligibility</h2>
      <p>
        You must be at least 18 years old (or the age of majority in your jurisdiction) and a legal
        resident of a jurisdiction where use of the Platform is permitted to create an account.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">2. Virtual Currencies</h2>
      <p>
        Gold Coins (GC) have no monetary value and are for entertainment purposes only. Sweepstakes
        Coins (SC) may be redeemed for cash prizes subject to these Terms and the{' '}
        <a href="/sweeps-rules" className="text-brand">
          Sweeps Rules
        </a>
        .
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">3. Account Responsibility</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account credentials and for
        all activity that occurs under your account.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">4. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. Continued use of the Platform after changes
        take effect constitutes acceptance of the revised Terms.
      </p>
    </LegalPageLayout>
  );
}
