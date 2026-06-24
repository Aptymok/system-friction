import type { MetadataRoute } from 'next'

const BASE_URL = 'https://systemfriction.org'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/sfi-console',
          '/root',
          '/scorefriction',
          '/world-vector',
          '/repository',
          '/contact',
          '/campo',
          '/observatory',
          '/moph',
          '/instruments',
          '/surfaces',
          '/llms-full.txt',
          '/ai-index.json',
          '/field-schema.json'
        ],
        disallow: [
          '/api/',
          '/auth/',
          '/dashboard/',
          '/private/',
          '/admin/',
          '/settings/',
          '/memory/',
          '/telemetry/'
        ]
      },

      {
        userAgent: 'GPTBot',
        allow: '/',
      },

      {
        userAgent: 'ClaudeBot',
        allow: '/',
      },

      {
        userAgent: 'Google-Extended',
        allow: '/',
      }
    ],

    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL
  }
}
