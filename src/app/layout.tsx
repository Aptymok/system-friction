import '@/app/globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/components/auth/AuthProvider';

const BASE = 'https://systemfriction.org';

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
  };

  return (
    <html lang="es">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
