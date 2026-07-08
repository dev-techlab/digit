import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/shell/ThemeProvider';
import { AuthProvider } from '@/lib/auth-context';
import { AuthModalProvider } from '@/lib/auth-modal-context';
import { SidebarProvider } from '@/lib/sidebar-context';
import { SplashScreen } from '@/components/shell/SplashScreen';
import { AuthModals } from '@/components/auth/AuthModals';
import { APP_NAME } from '@/lib/constants';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: `${APP_NAME} - Game Recharge Platform`,
  description: `Join ${APP_NAME} - Your premier gaming recharge platform. Fast, secure, and reliable service for all your gaming needs.`,
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover' as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <AuthModalProvider>
              <SidebarProvider>
                <SplashScreen />
                {children}
                <AuthModals />
              </SidebarProvider>
            </AuthModalProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
