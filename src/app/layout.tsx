import '@/app/globals.css';
import type { Metadata, Viewport } from 'next';
import { Suspense, type ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';
import { SfiGlobalNavigation } from '@/components/navigation/SfiGlobalNavigation';
import { SfiLivingField } from '@/components/navigation/SfiLivingField';
import { SfiExperienceMembrane } from '@/components/navigation/SfiExperienceMembrane';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#070806',
};

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
const SITE_NAME = 'System Friction Institute';
const SITE_DESCRIPTION =
  'Sistema para la observación de fenómenos de fricción sistémica.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: 'es_MX',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <SfiLivingField />
        <AuthProvider>
          <Suspense fallback={null}>
            <SfiExperienceMembrane />
          </Suspense>
          <SfiGlobalNavigation />
          {children}
        </AuthProvider>
        <GoogleAnalytics />
      </body>
    </html>
  );
}
