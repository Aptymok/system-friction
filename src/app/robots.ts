import type { MetadataRoute } from 'next';

const BASE_URL = 'https://systemfriction.org';

const PRIVATE_PATHS = [
  '/api/',
  '/root/',
  '/studio/',
  '/operator/',
  '/admin/',
  '/settings/',
  '/memory/',
  '/telemetry/',
  '/auth/',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: PRIVATE_PATHS,
      },
      {
        userAgent: ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended'],
        allow: ['/', '/llms.txt', '/llms-full.txt', '/ai-index.json', '/field-schema.json'],
        disallow: PRIVATE_PATHS,
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
