import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Sweeps Rules · ${APP_NAME}` };

export default function SweepsRulesPage() {
  return (
    <LegalPageLayout title="Sweeps Rules">
      <p>
        NO PURCHASE OR PAYMENT NECESSARY TO ENTER OR WIN. A purchase will not improve your chances
        of winning. Void where prohibited by law.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">1. Eligibility</h2>
      <p>
        Open to legal residents of eligible jurisdictions who are at least 18 years old. Employees
        of {APP_NAME} and their immediate family members are not eligible to participate.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">2. Free Entry (AMOE)</h2>
      <p>
        You may obtain Sweepstakes Coins without purchase via the{' '}
        <a href="/postal-request" className="text-brand">
          Postal Request
        </a>{' '}
        method described on the Platform, subject to the same redemption requirements as purchased
        entries.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">3. Redemption</h2>
      <p>
        Sweepstakes Coins may be redeemed for cash prizes once applicable wagering and verification
        requirements have been met. Gold Coins have no cash value and cannot be redeemed.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">4. Odds</h2>
      <p>Odds of winning depend on the number of eligible entries received and game outcomes.</p>
    </LegalPageLayout>
  );
}
