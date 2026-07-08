import { HelpCenter } from '@/components/help/HelpCenter';
import { PageHeader } from '@/components/shell/PageHeader';
import type { HelpTab } from '@/lib/help-content';
import { APP_NAME } from '@/lib/constants';

export const metadata = { title: `Help Center · ${APP_NAME}` };

const TABS: HelpTab[] = ['general', 'deposit', 'withdraw'];

export default function HelpGuidePage({ searchParams }: { searchParams: { tab?: string } }) {
  const initialTab = TABS.includes(searchParams.tab as HelpTab)
    ? (searchParams.tab as HelpTab)
    : 'general';

  return (
    <div className="px-4 pt-4">
      <PageHeader title="Help Center" />
      <HelpCenter initialTab={initialTab} />
    </div>
  );
}
