import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { APP_NAME } from '@/lib/constants';
import { db } from '@/lib/db';

export const metadata = { title: `Privacy Policy · ${APP_NAME}` };

export default async function PrivacyPage() {
  const page = await db.content_pages.findUnique({ where: { slug: 'privacy' } });

  return (
    <LegalPageLayout title="Privacy Policy">
      {page?.body ? (
        <div dangerouslySetInnerHTML={{ __html: page.body }} />
      ) : (
        <p>Content not found.</p>
      )}
    </LegalPageLayout>
  );
}
