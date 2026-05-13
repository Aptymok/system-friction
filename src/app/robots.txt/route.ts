import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://systemfriction.org'

  return {

    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/terminal',
        '/systemprompt',
        '/llms.txt'
      ],
      disallow: [
        '/api/'
      ]
    },

    sitemap: `${baseUrl}/sitemap.xml`
  }
}
