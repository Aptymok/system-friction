export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  const today = new Date().toISOString().split('T')[0];
  const content = `
# SYSTEM FRICTION INSTITUTE — MACHINE-READABLE ARCHITECTURE

System Friction Institute (SFI) is an institutional observability and governance environment for complex sociotechnical systems. Public human surfaces, machine-readable representations and governed operational interfaces are distinct layers; no route is treated as authority merely because it is reachable.

## CANONICAL HOST
${baseUrl}

## CANONICAL PUBLIC HUMAN SURFACES
- ${baseUrl}/ — institutional entry
- ${baseUrl}/observatory — public observation
- ${baseUrl}/laboratory — public laboratory explanation
- ${baseUrl}/publications — canonical public registry
- ${baseUrl}/institution — institutional identity
- ${baseUrl}/contact — public institutional contact

ROOT, Cases, Cognitive Twin/Spine and Studio are internal operational lenses/workspaces, not independent public institutional surfaces. Their data contracts may remain operational without being advertised as public architecture.

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
- POST /api/external/v1/execute validates that a proposal is already queued and inspects persisted adapter state. It does NOT self-authorize, write executed_at or mark the proposal accepted.
- Unnamed material external work may be assigned to external_connector_handoff_v1. That persisted assignment only exports the approved scope to an authenticated external executor; it does not claim the side effect occurred.
- If the proposal explicitly requires another adapter and that adapter is unavailable, /execute fails closed and remediation remains required.
- After a real execution occurs through the authenticated external executor, POST /api/external/v1/proposal-return with proposal_id, observed_at, outcome and evidence_refs.
- proposal-return records OBSERVED return evidence with proposal UUID lineage but does not close the proposal, claim causal proof, complete calibration or promote canon.
- ROOT outcome recording must reference a RETURN event belonging to the same proposal.

Endpoints:
- GET /api/external/v1/console
- GET|POST /api/external/v1/cognitive-peer
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

The governed execution router and self-healing bootstrap remain bounded capabilities. Internal work may auto-dispatch only after authorization. External connector handoff may assign already-authorized material work, but the external side effect and its RETURN remain separately observable and evidence-bound.

## GOVERNED EXTERNAL COGNITIVE PEER
The authenticated MCP may project an institutional user-bound LLM into SFI as a governed external cognitive peer. GET /api/external/v1/cognitive-peer hydrates bounded Cognitive Spine/institutional context under observe. POST /api/external/v1/cognitive-peer persists a structured peer response under lab:write as INFERRED only. The route rejects attempts to mint observed RETURN, truth/canon, governance decisions, authority/capability grants, execution receipts or learning promotion. Any next action must traverse the existing evidence, proposal, execution, RETURN, calibration and promotion owners separately.

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