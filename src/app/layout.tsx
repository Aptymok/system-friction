import '@/app/globals.css';
import '@/app/scrollbar.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { SfiConsentBanner } from '@/components/analytics/SfiConsentBanner';
import { SfiLanguageProvider, SfiUiText } from '@/components/i18n/SfiLanguageProvider';
import { SFI_PUBLIC_PROFILE } from '@/lib/public/institutionProfile';

const BASE = SFI_PUBLIC_PROFILE.institution.canonicalUrl;
const INSTITUTION_NAME = SFI_PUBLIC_PROFILE.institution.name;
const GA_ID = 'G-P8G69HMYLM';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080806',
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: INSTITUTION_NAME,
    template: '%s | SFI',
  },
  description: 'Live institutional observability environment for complex sociotechnical systems: evidence, falsification, governance, agents, Cognitive Twin and governed AI interaction.',
  applicationName: INSTITUTION_NAME,
  keywords: [
    'system friction',
    'complex systems',
    'observability',
    'evidence',
    'falsification',
    'governance',
    'cognitive twin',
    'agentic systems',
    'sociotechnical systems',
    'AI governance',
  ],
  alternates: {
    canonical: '/',
    types: {
      'text/plain': [
        { url: '/llms.txt', title: 'SFI LLM orientation' },
        { url: '/llms-full.txt', title: 'SFI extended LLM orientation' },
      ],
      'application/json': [
        { url: '/ai-index.json', title: 'SFI AI index' },
        { url: '/field-schema.json', title: 'SFI field schema' },
        { url: '/openapi.json', title: 'SFI external agent OpenAPI' },
        { url: '/api/external/v1/manifest', title: 'SFI external agent manifest' },
      ],
    },
  },
  openGraph: {
    type: 'website',
    url: BASE,
    siteName: INSTITUTION_NAME,
    title: INSTITUTION_NAME,
    description: 'Live observability, evidence, falsification, governance and governed AI interaction for complex sociotechnical systems.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const verifiedSameAs = SFI_PUBLIC_PROFILE.institution.verifiedSameAs;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ResearchOrganization',
    '@id': SFI_PUBLIC_PROFILE.institution.entityId,
    name: SFI_PUBLIC_PROFILE.institution.name,
    url: BASE,
    description: 'Research and observability environment for complex sociotechnical systems, evidence, falsification, governance and governed AI interaction.',
    ...(verifiedSameAs.length ? { sameAs: verifiedSameAs } : {}),
    privacyPolicy: `${BASE}/privacy`,
  };

  return (
    <html lang="es">
      <body>
        <Script id="sfi-consent-default" strategy="beforeInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  wait_for_update: 500
});`}
        </Script>
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="sfi-ga4" strategy="afterInteractive">
          {`gtag('js', new Date());
gtag('config', '${GA_ID}');`}
        </Script>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <SfiLanguageProvider>
          <AuthProvider>{children}</AuthProvider>
          <footer className="sfiGlobalFooter">
            <strong>SFI.</strong>
            <a href="/observatory"><SfiUiText es="OBSERVATORIO" en="OBSERVATORY" /></a>
            <a href="/history"><SfiUiText es="ORIGEN → AHORA" en="ORIGIN → NOW" /></a>
            <a href="/institution"><SfiUiText es="INSTITUTO" en="INSTITUTE" /></a>
            <a href="/privacy"><SfiUiText es="PRIVACIDAD Y POLÍTICA DE DATOS PARA AGENTES EXTERNOS" en="PRIVACY & EXTERNAL AGENT DATA POLICY" /></a>
          </footer>
          <SfiConsentBanner />
        </SfiLanguageProvider>
      </body>
    </html>
  );
}
