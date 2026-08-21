import type { MetadataRoute } from 'next';

const BASE = 'https://systemfriction.org';
const PUBLIC = ['/','/field','/systems','/archive','/falsification','/optionality','/governance','/authority','/agents','/identity','/models','/genai','/llms.txt','/llms-full.txt','/ai-index.json','/ai-policy','/field-schema.json','/api/external/v1/manifest'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: PUBLIC,
        disallow: ['/root','/login','/api/'],
      },
      {
        userAgent: ['GPTBot','ClaudeBot','PerplexityBot','Google-Extended'],
        allow: PUBLIC,
        disallow: ['/root','/login','/api/external/v1/observe','/api/external/v1/propose','/api/external/v1/execute','/api/external/v1/lab','/api/'],
      },
    ],
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
