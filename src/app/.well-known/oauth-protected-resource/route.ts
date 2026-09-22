import { SFI_AUTHENTICATED_MCP_SCOPES } from '@/lib/mcp/authenticatedGatewayProjection';

export const dynamic = 'force-dynamic';

const oauthIssuer = 'https://www.systemfriction.org';
const resourceOrigin = 'https://www.systemfriction.org';

export async function GET() {
  return Response.json({
    resource: `${resourceOrigin}/api/mcp/authenticated`,
    authorization_servers: [oauthIssuer],
    bearer_methods_supported: ['header'],
    scopes_supported: [...SFI_AUTHENTICATED_MCP_SCOPES],
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=300',
    },
  });
}
