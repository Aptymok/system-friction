import { discoveryJsonFeed } from '@/lib/discovery/discoveryEmitter';

export async function GET() {
  return Response.json(discoveryJsonFeed(), {
    headers: { 'Cache-Control': 'public, max-age=900' },
  });
}
