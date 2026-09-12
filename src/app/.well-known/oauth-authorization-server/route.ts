import { SFI_ROOT_SCOPES } from '@/lib/sfi/oauthConfig';

export const dynamic = 'force-dynamic';

const issuer = 'https://www.systemfriction.org';

export async function GET() {
  return Response.json({
    issuer,
    authorization_endpoint: `${issuer}/api/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
    code_challenge_methods_supported: ['S256'],
    scopes_supported: [...SFI_ROOT_SCOPES],
    authorization_response_iss_parameter_supported: true,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=300',
    },
  });
}
