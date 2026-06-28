import type { MetadataRoute } from 'next';

const BASE_URL = 'https://systemfriction.org';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/repository', '/contact', '/privacy', '/login', '/signup', '/llms-full.txt', '/ai-index.json', '/field-schema.json'],
        disallow: ['/api/', '/root/', '/field/', '/studio/', '/admin/', '/settings/', '/memory/', '/telemetry/'],
      },
      { userAgent: 'GPTBot', allow: '/' },
      { userAgent: 'ClaudeBot', allow: '/' },
      { userAgent: 'Google-Extended', allow: '/' },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
