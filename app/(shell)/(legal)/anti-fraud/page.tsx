import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { APP_NAME } from '@/lib/constants';
import { db } from '@/lib/db';

export const metadata = { title: `Anti-Fraud Policy · ${APP_NAME}` };

export default async function AntiFraudPage() {
  const page = await db.content_pages.findUnique({ where: { slug: 'anti-fraud' } });

  return (
    <LegalPageLayout title="Anti-Fraud Policy">
      {page?.body ? (
        <div dangerouslySetInnerHTML={{ __html: page.body }} />
      ) : (
        <p>Content not found.</p>
      )}
    </LegalPageLayout>
  );
}
