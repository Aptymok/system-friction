export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  const content = `
# SYSTEM FRICTION INSTITUTE — AI POLICY

SFI uses probabilistic models, longitudinal evidence, governed agents and laboratory runtimes to observe complex sociotechnical systems.

## PRINCIPLES
- Evidence, inference, experiment and canonical state remain distinct.
- Provenance and time must remain attached to consequential claims.
- Cognitive Twin proposals are proposals, not automatic decisions.
- ROOT retains governed human authority for acceptance or rejection where required.
- External AI clients receive explicit scopes and do not inherit unrestricted authority.
- Execution is distinct from proposal and from canonical promotion.
- Laboratory output remains experimental unless a separate governed process changes its epistemic state.

## EXTERNAL AI INTERFACE
Capability discovery: ${baseUrl}/api/external/v1/manifest

Authorized operations may include:
- observation
- proposal generation
- execution of already-authorized work
- Method Lab state/report access
- governed laboratory persistence and runtime execution

Credentials are not public and must never be inferred from machine-readable documentation.

## SYSTEM LIMITS
SFI does not treat model output as medical diagnosis, psychiatric diagnosis, legal conclusion, immutable identity or independent empirical validation. Human and institutional systems are dynamic, context-dependent and partially observed.

## PUBLIC / PRIVATE BOUNDARY
Public scenes and machine-readable discovery documents can be indexed. Private ROOT state, credentials, account memory, non-public evidence and protected laboratory material are not public evidence.
`.trim();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
}
