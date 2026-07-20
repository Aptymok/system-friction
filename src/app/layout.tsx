import '@/app/globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { GoogleAnalytics } from '@/components/analytics/GoogleAnalytics';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0A0905',
};

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
const SITE_NAME = 'System Friction Institute';
const SITE_DESCRIPTION =
  'System Friction Institute observes how signals, systems and fields accumulate friction, change state and respond to minimal interventions through MIHM, MOP-H, WorldSpect, World Vector, AMV and a longitudinal evidence Atlas.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: `${SITE_NAME} · Structural Field Observation`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: 'Juan Antonio Marín Liera' }],
  creator: 'Juan Antonio Marín Liera',
  publisher: SITE_NAME,
  category: 'Research Institute',
  keywords: [
    'systemic friction',
    'longitudinal observation',
    'MIHM',
    'MOP-H',
    'WorldSpect',
    'World Vector',
    'AMV',
    'epistemic traceability',
    'minimal intervention',
    'structural observation',
  ],
  alternates: {
    canonical: SITE_URL,
    languages: {
      'es-MX': SITE_URL,
    },
    types: {
      'text/plain': `${SITE_URL}/llms.txt`,
      'application/json': `${SITE_URL}/ai-index.json`,
    },
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} · Structural Field Observation`,
    description: SITE_DESCRIPTION,
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} · Structural Field Observation`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: {
    google: 'h11ee87RhR3lQPzsFXKLEunIUppdYXwfQeIq2E8SNxs',
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ResearchOrganization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  alternateName: 'SFI',
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  founder: {
    '@type': 'Person',
    name: 'Juan Antonio Marín Liera',
  },
  knowsAbout: [
    'Systemic friction',
    'Longitudinal field observation',
    'MIHM',
    'MOP-H',
    'WorldSpect',
    'World Vector',
    'AMV',
    'Epistemic traceability',
  ],
};

const researchProjectJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ResearchProject',
  '@id': `${SITE_URL}/#instrument`,
  name: 'SFI Structural Field-Signal Instrument',
  alternateName: 'AMV',
  description:
    'Instrumento longitudinal para situar una señal en un campo, registrar evidencia, formular hipótesis gobernadas, observar resultados y acumular aprendizaje estadístico auditable.',
  url: `${SITE_URL}/repository`,
  provider: {
    '@id': `${SITE_URL}/#organization`,
  },
};

const webSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'es-MX',
  publisher: {
    '@id': `${SITE_URL}/#organization`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        {[organizationJsonLd, researchProjectJsonLd, webSiteJsonLd].map((entry) => (
          <script
            key={entry['@id']}
            type="application/ld+json"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
          />
        ))}
      </head>
      <body>
        <GoogleAnalytics />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
