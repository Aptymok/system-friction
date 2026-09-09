import type { MetadataRoute } from 'next';
import { sfiRobotsRules } from '@/lib/discovery/crawlerPolicy';

const BASE = 'https://systemfriction.org';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: sfiRobotsRules(),
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
