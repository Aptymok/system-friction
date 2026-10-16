import { SFI_AUTHENTICATED_MCP_SCOPES } from '@/lib/mcp/authenticatedGatewayProjection';

export const dynamic = 'force-dynamic';

const PUBLIC_ORIGIN = 'https://www.systemfriction.org';
const WORKPLACE_ORIGIN = 'https://system-friction.vercel.app';

export async function GET(request: Request) {
  const requestedOrigin = new URL(request.url).origin;
  const origin = requestedOrigin === WORKPLACE_ORIGIN ? WORKPLACE_ORIGIN : PUBLIC_ORIGIN;
  return Response.json({
    resource: `${origin}/api/mcp/authenticated`,
    authorization_servers: [origin],
    bearer_methods_supported: ['header'],
    scopes_supported: [...SFI_AUTHENTICATED_MCP_SCOPES],
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
