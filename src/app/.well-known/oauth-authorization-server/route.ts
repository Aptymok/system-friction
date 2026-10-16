import { SFI_ROOT_SCOPES } from '@/lib/sfi/oauthConfig';

export const dynamic = 'force-dynamic';

const PUBLIC_ORIGIN = 'https://www.systemfriction.org';
const WORKPLACE_ORIGIN = 'https://system-friction.vercel.app';

export async function GET(request: Request) {
  const requestedOrigin = new URL(request.url).origin;
  const issuer = requestedOrigin === WORKPLACE_ORIGIN ? WORKPLACE_ORIGIN : PUBLIC_ORIGIN;
  return Response.json({
    issuer,
    authorization_endpoint: `${issuer}/api/oauth/authorize`,
    token_endpoint: `${issuer}/api/oauth/token`,
    registration_endpoint: `${issuer}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code'],
    token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
    client_id_metadata_document_supported: true,
    code_challenge_methods_supported: ['S256'],
    scopes_supported: [...SFI_ROOT_SCOPES],
    authorization_response_iss_parameter_supported: true,
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
