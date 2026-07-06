import { DesktopSidebar } from '@/components/shell/DesktopSidebar';
import { ShellContent } from '@/components/shell/ShellContent';
import { BottomNav } from '@/components/shell/BottomNav';
import { SupportButton } from '@/components/shell/SupportButton';
import { Starfield } from '@/components/shell/Starfield';
import { Footer } from '@/components/shell/Footer';
import { getWallet } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const wallet = await getWallet();

  return (
    <>
      <Starfield />
      <DesktopSidebar />
      <ShellContent wallet={wallet} footer={<Footer />}>
        {children}
      </ShellContent>
      <BottomNav />
      <SupportButton />
    </>
  );
}
