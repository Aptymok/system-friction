import type { MetadataRoute } from 'next';

const BASE_URL = 'https://systemfriction.org';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = ['', '/repository', '/contact', '/privacy', '/login', '/signup'];
  const now = new Date();

  return routes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: route === '' ? 1 : 0.7,
  }));
}
