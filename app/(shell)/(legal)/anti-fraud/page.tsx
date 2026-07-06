import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const metadata = { title: 'Anti-Fraud Policy · Digit Link' };

export default function AntiFraudPage() {
  return (
    <LegalPageLayout title="Anti-Fraud Policy">
      <p>
        Digit Link is committed to protecting our players and platform from fraud, including account
        takeover, payment fraud, bonus abuse, and the use of multiple accounts.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">Identity Verification</h2>
      <p>
        We may require identity verification (KYC) at any time, particularly before processing a
        withdrawal, to confirm you are the rightful owner of an account.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">One Account Per Person</h2>
      <p>
        Each individual, household, and device is permitted one account. Duplicate accounts may be
        suspended and any associated balances forfeited.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">Reporting Suspicious Activity</h2>
      <p>
        If you suspect fraudulent activity on your account or believe someone is misusing the
        platform, contact our support team immediately via the{' '}
        <a href="/contact-us" className="text-brand">
          Contact Us
        </a>{' '}
        page.
      </p>
    </LegalPageLayout>
  );
}
