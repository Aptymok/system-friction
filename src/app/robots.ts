import type { MetadataRoute } from 'next'

const BASE_URL = 'https://systemfriction.org'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/framework',
          '/methodology',
          '/protocol',
          '/mihm',
          '/world-spectrum'
        ],
        disallow: [
          '/api/',
          '/auth/',
          '/terminal/',
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