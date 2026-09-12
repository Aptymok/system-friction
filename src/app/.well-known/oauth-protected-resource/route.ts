export const dynamic = 'force-dynamic';

const oauthIssuer = 'https://www.systemfriction.org';
const resourceOrigin = 'https://www.systemfriction.org';

export async function GET() {
  return Response.json({
    resource: `${resourceOrigin}/api/mcp/authenticated`,
    authorization_servers: [oauthIssuer],
    bearer_methods_supported: ['header'],
    scopes_supported: ['observe', 'execute'],
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=300',
    },
  });
}
