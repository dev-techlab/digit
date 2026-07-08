import { Mail, MessageCircle } from 'lucide-react';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { Card } from '@/components/ui/Card';
import { getSettings } from '@/lib/settings';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Contact Us · ${APP_NAME}` };
export const dynamic = 'force-dynamic';

export default async function ContactUsPage() {
  const settings = await getSettings();
  const supportEmail = (settings['support.email'] as string) ?? 'support@octanlink.com';
  return (
    <LegalPageLayout title="Contact Us">
      <p>Have a question or need help with your account? Reach out to our support team.</p>
      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
          <Mail size={18} />
        </div>
        <div className="text-sm">
          <p className="font-semibold text-[var(--text-primary)]">Email</p>
          <a
            href={`mailto:${supportEmail}`}
            className="text-xs text-[var(--text-secondary)] hover:text-brand"
          >
            {supportEmail}
          </a>
        </div>
      </Card>
      <Card className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand">
          <MessageCircle size={18} />
        </div>
        <div className="text-sm">
          <p className="font-semibold text-[var(--text-primary)]">Live Chat</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Use the support bubble in the corner of the app for a live response, or visit the{' '}
            <a href="/help-guide" className="text-brand">
              Help Center
            </a>
            .
          </p>
        </div>
      </Card>
    </LegalPageLayout>
  );
}
