import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { APP_NAME } from '@/lib/constants';
import { db } from '@/lib/db';

export const metadata = { title: `Responsible Social Gameplay · ${APP_NAME}` };

export default async function ResponsibleGamingPage() {
  const page = await db.content_pages.findUnique({ where: { slug: 'responsible-gaming' } });

  return (
    <LegalPageLayout title="Responsible Social Gameplay">
      {page?.body ? (
        <div dangerouslySetInnerHTML={{ __html: page.body }} />
      ) : (
        <p>Content not found.</p>
      )}
    </LegalPageLayout>
  );
}
