export const dynamic = 'force-dynamic';

const oauthIssuer = 'https://www.systemfriction.org';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return Response.json({
    resource: `${origin}/api/mcp/studio`,
    authorization_servers: [oauthIssuer],
    bearer_methods_supported: ['header'],
    scopes_supported: ['studio:read', 'studio:content', 'studio:run'],
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=300',
    },
  });
}
