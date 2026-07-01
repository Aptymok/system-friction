import type { MetadataRoute } from 'next';

const BASE_URL = 'https://systemfriction.org';

const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
  { path: '', priority: 1.0, changeFrequency: 'daily' },
  { path: '/repository', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/library', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/library/phenotypes', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/world-vector', priority: 0.9, changeFrequency: 'daily' },
  { path: '/field', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/root/agents', priority: 0.5, changeFrequency: 'weekly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/login', priority: 0.2, changeFrequency: 'yearly' },
  { path: '/signup', priority: 0.4, changeFrequency: 'yearly' },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE_URL}${path}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));
}
