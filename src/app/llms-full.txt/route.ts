import { SCENE_KEYS, SCENES } from '@/components/sfi/scenes';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  const today = new Date().toISOString().split('T')[0];
  const scenes = SCENE_KEYS.map((key) => `- ${baseUrl}/${key} — ${SCENES[key].title}: ${SCENES[key].subtitle}`).join('\n');
  const content = `
# SYSTEM FRICTION INSTITUTE — MACHINE-READABLE ARCHITECTURE

System Friction Institute (SFI) is a live institutional observability environment for complex sociotechnical systems. The current interface is not a conventional dashboard. It is a family of live scenes in which evidence, provenance, trajectories, governance, agent authority and temporal state are rendered as observable structures.

## CANONICAL HOST
${baseUrl}

## LIVE PUBLIC SCENES
${scenes}

## MACHINE DISCOVERY
- ${baseUrl}/llms.txt — compact AI orientation
- ${baseUrl}/llms-full.txt — extended AI orientation
- ${baseUrl}/ai-index.json — structured public AI index
- ${baseUrl}/ai-policy — epistemic and governance policy
- ${baseUrl}/field-schema.json — public evidence schema
- ${baseUrl}/api/external/v1/manifest — external-agent capability manifest
- ${baseUrl}/sitemap.xml — search-engine discovery
- ${baseUrl}/robots.txt — crawler policy

## GOVERNED EXTERNAL AGENT INTERFACE
Authorized external agents may use the v1 gateway to observe, propose, execute already-authorized work, and interact with Method Lab. Authentication and scopes are user-managed. Proposal authority and execution authority are distinct. External agents do not self-promote experimental results into canonical truth.

Endpoints:
- POST /api/external/v1/observe
- POST /api/external/v1/propose
- POST /api/external/v1/execute
- POST /api/external/v1/lab

## COGNITIVE TWIN
The Cognitive Twin is a governed proposal and reconstruction system. It can generate proposals in normal language, reconstruct operational state from evidence and longitudinal traces, and participate in laboratory protocols. ROOT remains the human decision authority for governed acceptance or rejection.

## EPISTEMIC STATES
Observed, derived, inferred, experimental and canonical states are not interchangeable. Runtime capability does not constitute external validation. Every claim should preserve provenance, time and evidence lineage.

## PRIVACY
Authenticated ROOT state, private evidence, credentials, account memory and non-public laboratory material are not public evidence and must not be inferred from the public surfaces.

## LAST UPDATE
${today}
`.trim();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=900',
    },
  });
}
