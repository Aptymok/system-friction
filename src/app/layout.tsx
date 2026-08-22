import '@/app/globals.css';
import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { SfiConsentBanner } from '@/components/analytics/SfiConsentBanner';

const BASE = 'https://systemfriction.org';
const GA_ID = 'G-P8G69HMYLM';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080806',
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: 'System Friction Institute',
    template: '%s | SFI',
  },
  description: 'Live institutional observability environment for complex sociotechnical systems: evidence, falsification, governance, agents, Cognitive Twin and governed AI interaction.',
  applicationName: 'System Friction Institute',
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
    siteName: 'System Friction Institute',
    title: 'System Friction Institute',
    description: 'Live observability, evidence, falsification, governance and governed AI interaction for complex sociotechnical systems.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'ResearchOrganization',
    name: 'System Friction Institute',
    url: BASE,
    description: 'Research and observability environment for complex sociotechnical systems, evidence, falsification, governance and governed AI interaction.',
    sameAs: ['https://github.com/Aptymok/system-friction'],
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
        <AuthProvider>{children}</AuthProvider>
        <footer style={{ background: '#080806', borderTop: '1px solid rgba(205,164,93,.12)', padding: '14px 20px', textAlign: 'center', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontSize: 11, letterSpacing: '.08em' }}>
          <a href="/privacy" style={{ color: '#8f7855', textDecoration: 'none' }}>PRIVACY & EXTERNAL AGENT DATA POLICY</a>
        </footer>
        <SfiConsentBanner />
      </body>
    </html>
  );
}
