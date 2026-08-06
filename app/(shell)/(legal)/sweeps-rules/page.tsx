import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { APP_NAME } from '@/lib/constants';
import { db } from '@/lib/db';

export const metadata = { title: `Sweeps Rules · ${APP_NAME}` };

export default async function SweepsRulesPage() {
  const page = await db.content_pages.findUnique({ where: { slug: 'sweeps-rules' } });

  return (
    <LegalPageLayout title="Sweeps Rules">
      {page?.body ? (
        <div dangerouslySetInnerHTML={{ __html: page.body }} />
      ) : (
        <p>Content not found.</p>
      )}
    </LegalPageLayout>
  );
}
