import type { MetadataRoute } from 'next';
import { publicCanonicalObjectUrls } from '@/lib/discovery/canonicalObjectRegistry';
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

  const machine = ['llms.txt','llms-full.txt','ai-index.json','ai-policy','field-schema.json'].map((path) => ({
    url: `${BASE}/${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.7,
  }));

  const canonicalObjects = publicCanonicalObjectUrls().map((url) => ({
    url,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [...scenes, ...machine, ...canonicalObjects];
}
