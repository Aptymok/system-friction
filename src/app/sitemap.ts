import type { MetadataRoute } from 'next';
import { discoverySitemapEntries } from '@/lib/discovery/discoveryEmitter';
import { SFI_PUBLIC_PROFILE } from '@/lib/public/institutionProfile';

const BASE = SFI_PUBLIC_PROFILE.institution.canonicalUrl;

export default function sitemap(): MetadataRoute.Sitemap {
  const scenes = [
    '', 'field', 'systems', 'archive', 'falsification', 'optionality',
    'governance', 'authority', 'agents', 'identity', 'models', 'genai',
  ].map((path) => ({
    url: `${BASE}/${path}`.replace(/\/$/, ''),
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: path ? 0.9 : 1,
  }));

  const machine = ['llms.txt','llms-full.txt','ai-index.json','ai-policy','field-schema.json','feed.xml','feed.atom','feed.json'].map((path) => ({
    url: `${BASE}/${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  return [...scenes, ...machine, ...discoverySitemapEntries()];
}
