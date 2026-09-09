import { discoveryAtomXml } from '@/lib/discovery/discoveryEmitter';

export async function GET() {
  return new Response(discoveryAtomXml(), {
    headers: {
      'Content-Type': 'application/atom+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
}
