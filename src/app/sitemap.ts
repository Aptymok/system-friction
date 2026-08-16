import type { MetadataRoute } from 'next';
import surfaces from '../../config/sfi-surfaces.json';

const BASE_URL = 'https://systemfriction.org';

type Frequency = MetadataRoute.Sitemap[number]['changeFrequency'];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const publicEntries = surfaces.public
    .filter((entry) => entry.index)
    .map((entry) => ({
      url: `${BASE_URL}${entry.path === '/' ? '' : entry.path}`,
      lastModified,
      changeFrequency: entry.changeFrequency as Frequency,
      priority: entry.priority,
    }));

  return [
    ...publicEntries,
    { url: `${BASE_URL}/llms.txt`, lastModified, changeFrequency: 'weekly' as Frequency, priority: 0.4 },
    { url: `${BASE_URL}/llms-full.txt`, lastModified, changeFrequency: 'weekly' as Frequency, priority: 0.4 },
    { url: `${BASE_URL}/ai-index.json`, lastModified, changeFrequency: 'weekly' as Frequency, priority: 0.4 },
    { url: `${BASE_URL}/field-schema.json`, lastModified, changeFrequency: 'weekly' as Frequency, priority: 0.35 },
  ];
}
