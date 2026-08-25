import { SCENE_KEYS, SCENES } from '@/components/sfi/scenes';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  const today = new Date().toISOString().split('T')[0];
  const scenes = SCENE_KEYS.map((key) => `- ${baseUrl}/${key} — ${SCENES[key].title}: ${SCENES[key].subtitle}`).join('\n');
  const content = `
# SYSTEM FRICTION INSTITUTE — MACHINE-READABLE ARCHITECTURE

System Friction Institute (SFI) is a live institutional observability environment for complex sociotechnical systems. The current interface is a family of live scenes in which evidence, provenance, trajectories, governance, agent authority and temporal state are rendered as observable structures.

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
Authorized external agents may use the v1 gateway to observe, propose, run supported internal/laboratory operations and return evidence. Authentication and scopes are user-managed. Proposal authority, adapter binding, execution, return, calibration and canonical promotion are distinct.

Important execution boundary:
- POST /api/external/v1/execute validates that a proposal is already queued and inspects persisted adapter state. It does NOT generically dispatch work, write executed_at or mark the proposal accepted.
- If no proposal-specific governed adapter exists, /execute fails closed with execution_adapter_required.
- After a real execution occurs through an adapter-specific governed path, POST /api/external/v1/proposal-return with proposal_id, observed_at, outcome and evidence_refs.
- proposal-return records OBSERVED return evidence with proposal UUID lineage but does not close the proposal, claim causal proof, complete calibration or promote canon.
- ROOT outcome recording must reference a RETURN event belonging to the same proposal.

Endpoints:
- GET /api/external/v1/console
- POST /api/external/v1/execution-contract
- POST /api/external/v1/result
- GET|POST /api/external/v1/signal
- POST /api/external/v1/observe
- POST /api/external/v1/propose
- POST /api/external/v1/execute
- POST /api/external/v1/proposal-return
- POST /api/external/v1/lab

## OPERATIONAL FLOW
proposal → authorization → routing/readiness → assignment → adapter-specific execution → proposal-scoped RETURN → calibration → candidate learning → ROOT canon/close.

The proposed AI Execution Router and self-healing bootstrap are not implied by the existence of these endpoints. Generic auto-dispatch and self-healing remain off unless separately governed and implemented.

## COGNITIVE TWIN
The Cognitive Twin is a governed proposal and reconstruction system. It can generate proposals in normal language, reconstruct operational state from evidence and longitudinal traces, and participate in laboratory protocols. Delegated controllers may decide bounded operational proposals where authorized; ROOT alone owns canonical promotion.

## EPISTEMIC STATES
OBSERVED, DECLARED, DERIVED, INFERRED, PROJECTED, SIMULATED and MISSING states are not interchangeable. Runtime capability does not constitute external validation. Every claim should preserve provenance, time, UUID and evidence lineage.

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