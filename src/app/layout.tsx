import '@/app/globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/components/auth/AuthProvider';

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
const SITE_NAME = 'System Friction Institute';
const SITE_DESCRIPTION =
  'System Friction Institute makes visible the friction that systems learn to normalize. Infrastructure for longitudinal observation of human, organizational, and institutional systemic friction.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} · Longitudinal Observation Framework`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  authors: [{ name: 'Juan Antonio Marín Liera' }],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} · Longitudinal Observation Framework`,
    description: SITE_DESCRIPTION,
    locale: 'es_MX',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} · Longitudinal Observation Framework`,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE_NAME,
  alternateName: 'SFI',
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  founder: {
    '@type': 'Person',
    name: 'Juan Antonio Marín Liera',
  },
  sameAs: [],
};

const researchProjectJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ResearchProject',
  name: 'MIHM — Marco de Observación Longitudinal de Fricción Sistémica',
  description:
    'Framework algorítmico para detectar, predecir y redirigir la entropía sistémica antes del punto de colapso, mediante observación longitudinal de campos, relaciones y regímenes de fricción.',
  url: `${SITE_URL}/repository`,
  provider: {
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(researchProjectJsonLd) }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
