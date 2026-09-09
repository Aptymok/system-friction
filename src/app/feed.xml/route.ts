import { discoveryRssXml } from '@/lib/discovery/discoveryEmitter';

export async function GET() {
  return new Response(discoveryRssXml(), {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
}
