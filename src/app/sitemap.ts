import type { MetadataRoute } from 'next';

const BASE_URL = 'https://systemfriction.org';

type Entry = {
  path: string;
  priority: number;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
};

const routes: Entry[] = [
  { path: '', priority: 1, changeFrequency: 'daily' },
  { path: '/observatory', priority: 1, changeFrequency: 'daily' },
  { path: '/world-vector', priority: 0.95, changeFrequency: 'daily' },
  { path: '/field', priority: 0.95, changeFrequency: 'weekly' },
  { path: '/field/participant', priority: 0.75, changeFrequency: 'monthly' },
  { path: '/moph', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/scorefriction', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/scorefriction/wave', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/scorefriction/cases', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/repository', priority: 0.9, changeFrequency: 'weekly' },
  { path: '/library', priority: 0.85, changeFrequency: 'weekly' },
  { path: '/library/phenotypes', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.65, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.45, changeFrequency: 'yearly' },
  { path: '/login', priority: 0.25, changeFrequency: 'yearly' },
  { path: '/signup', priority: 0.35, changeFrequency: 'yearly' },
  { path: '/llms.txt', priority: 0.45, changeFrequency: 'weekly' },
  { path: '/llms-full.txt', priority: 0.45, changeFrequency: 'weekly' },
  { path: '/ai-index.json', priority: 0.4, changeFrequency: 'weekly' },
  { path: '/field-schema.json', priority: 0.4, changeFrequency: 'weekly' },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
