export const dynamic = 'force-dynamic';

const ISSUER = 'https://www.systemfriction.org';
const RESOURCE = `${ISSUER}/api/mcp/authenticated`;

export async function GET() {
  return Response.json({
    resource: RESOURCE,
    authorization_servers: [ISSUER],
    bearer_methods_supported: ['header'],
    scopes_supported: ['observe', 'execute'],
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=300',
    },
  });
}
