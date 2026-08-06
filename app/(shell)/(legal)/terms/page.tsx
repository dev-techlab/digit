import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { APP_NAME } from '@/lib/constants';
import { db } from '@/lib/db';

export const metadata = { title: `Terms & Conditions · ${APP_NAME}` };

export default async function TermsPage() {
  const page = await db.content_pages.findUnique({ where: { slug: 'terms' } });

  return (
    <LegalPageLayout title="Terms & Conditions">
      {page?.body ? (
        <div dangerouslySetInnerHTML={{ __html: page.body }} />
      ) : (
        <p>Content not found.</p>
      )}
    </LegalPageLayout>
  );
}
