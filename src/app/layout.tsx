import '@/app/globals.css';
import '@/app/scrollbar.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { SfiConsentBanner } from '@/components/analytics/SfiConsentBanner';
import { SfiLanguageProvider } from '@/components/i18n/SfiLanguageProvider';
import { SFI_PUBLIC_PROFILE } from '@/lib/public/institutionProfile';
import { SfiPublicHeader, SfiPublicFooter } from '@/components/public/SfiPublicChrome';

const BASE = SFI_PUBLIC_PROFILE.institution.canonicalUrl;
const INSTITUTION_NAME = SFI_PUBLIC_PROFILE.institution.name;
const INSTITUTION_SLOGAN = SFI_PUBLIC_PROFILE.institution.slogan;
const SOCIAL_TITLE = `${INSTITUTION_NAME} | ${INSTITUTION_SLOGAN}`;
const PUBLIC_DESCRIPTION = 'Independent structural-field research institute for observing relations, evidence, authority, execution and RETURN across complex systems.';
const SOCIAL_IMAGE = '/og/sfi-institutional.jpg';
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
  description: PUBLIC_DESCRIPTION,
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
    description: PUBLIC_DESCRIPTION,
    images: [
      {
        url: SOCIAL_IMAGE,
        width: 1200,
        height: 630,
        alt: SOCIAL_TITLE,
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SOCIAL_TITLE,
    description: PUBLIC_DESCRIPTION,
    images: [SOCIAL_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
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
    description: PUBLIC_DESCRIPTION,
    slogan: INSTITUTION_SLOGAN,
    image: `${BASE}${SOCIAL_IMAGE}`,
    ...(verifiedSameAs.length ? { sameAs: verifiedSameAs } : {}),
    privacyPolicy: `${BASE}/privacy`,
  };

  return (
    <html lang="en">
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
          <SfiPublicHeader global/>
          <div className="sfiPageContent"><AuthProvider>{children}</AuthProvider></div>
          <SfiPublicFooter global/>
          <SfiConsentBanner />
        </SfiLanguageProvider>
      </body>
    </html>
  );
}
