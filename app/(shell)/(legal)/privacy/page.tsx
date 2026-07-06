import { LegalPageLayout } from '@/components/legal/LegalPageLayout';

export const metadata = { title: 'Privacy Policy · Digit Link' };

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy">
      <p>
        This Privacy Policy explains how Digit Link collects, uses, and protects your personal
        information when you use the Platform.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">1. Information We Collect</h2>
      <p>
        We collect information you provide directly (account details, contact information, identity
        verification documents) and information collected automatically (device information, usage
        data, approximate location for geo-compliance).
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">2. How We Use Information</h2>
      <p>
        We use your information to operate the Platform, process transactions, verify your identity,
        comply with legal obligations, and communicate with you about your account.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">3. Data Sharing</h2>
      <p>
        We share information with service providers who help us operate the Platform (payment
        processors, identity verification providers) and as required by law.
      </p>
      <h2 className="font-semibold text-[var(--text-primary)]">4. Your Rights</h2>
      <p>
        You may request access to, correction of, or deletion of your personal information by
        contacting our support team through the Help Center.
      </p>
    </LegalPageLayout>
  );
}
