import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {

  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://systemfriction.org'

  const today = new Date()

  return [

    {
      url: `${baseUrl}/`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 1.0
    },

    {
      url: `${baseUrl}/terminal`,
      lastModified: today,
      changeFrequency: 'weekly',
      priority: 0.9
    },

    {
      url: `${baseUrl}/systemprompt`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.8
    },

    {
      url: `${baseUrl}/llms.txt`,
      lastModified: today,
      changeFrequency: 'monthly',
      priority: 0.7
    },

    {
      url: `${baseUrl}/api/audit`,
      lastModified: today,
      changeFrequency: 'never',
      priority: 0.3
    },

    {
      url: `${baseUrl}/api/link/generate`,
      lastModified: today,
      changeFrequency: 'never',
      priority: 0.3
    },

    {
      url: `${baseUrl}/api/link/verify`,
      lastModified: today,
      changeFrequency: 'never',
      priority: 0.3
    }

  ]
}
