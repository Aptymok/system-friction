export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const issuer = new URL(request.url).origin;
  const resource = `${issuer}/api/mcp/authenticated`;
  return Response.json({
    resource,
    authorization_servers: [issuer],
    bearer_methods_supported: ['header'],
    scopes_supported: ['observe', 'execute'],
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=300',
    },
  });
}
