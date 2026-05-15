import type { MetadataRoute } from 'next'

const BASE_URL = 'https://systemfriction.org'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = [
    '',
    '/framework',
    '/methodology',
    '/protocol',
    '/mihm',
    '/world-spectrum',
    '/montecarlo',
    '/stochastic',
    '/sfi-manifest'
  ]

  const now = new Date()

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.8
  }))
}