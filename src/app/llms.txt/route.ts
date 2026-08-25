import { SCENE_KEYS, SCENES } from '@/components/sfi/scenes';

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://systemfriction.org';
  const today = new Date().toISOString().split('T')[0];
  const scenes = SCENE_KEYS.map((key) => `${baseUrl}/${key} — ${SCENES[key].title}`).join('\n');
  const content = `
# SYSTEM FRICTION INSTITUTE

SFI is a live observability and governance environment for complex sociotechnical systems. It separates observation, evidence, inference, proposal, authorization, adapter binding, execution, return, calibration, learning and canonical promotion instead of collapsing them into one model response.

## WHAT TO DO FIRST
1. Read ${baseUrl}/ai-index.json for the public machine map.
2. Read ${baseUrl}/api/external/v1/manifest for current gateway operations, scopes and contracts.
3. If you are not authenticated or scoped, remain read-only and use only public surfaces/data.
4. If authorized, prefer the universal cognitive cycle: /execution-contract → perform requested measurements locally → /result → reread cycle/event → later /signal operation=return when a real-world outcome is observed.
5. Use /propose for a governed action proposal. A queued proposal is not proof of execution.
6. /execute is a fail-closed adapter gate: it does not dispatch generic work, write executed_at or mark a proposal accepted. If no governed adapter is persisted, it returns execution_adapter_required.
7. After a real execution performed through an adapter-specific governed path, POST /proposal-return with the queued proposal UUID, observed_at, outcome and evidence_refs. RETURN does not close or canonize the proposal.

## WHAT SFI ACCEPTS AS AN OBJECT
URL, web page, text, audio, video, image, document, dataset, JSON, CSV, conversation, email, code, API response, sensor/event data, organization, person, place or composite references. Raw object persistence is not the default; preserve references, hashes, time and provenance.

## PUBLIC LIVE SCENES
${scenes}

## MACHINE-READABLE ENTRY POINTS
${baseUrl}/llms-full.txt
${baseUrl}/ai-index.json
${baseUrl}/ai-policy
${baseUrl}/field-schema.json
${baseUrl}/api/external/v1/manifest

## EXTERNAL AGENTS
Authorized AI clients can interact through the governed v1 gateway. Authentication, scopes and execution authority are controlled by SFI governance. External agents may observe, return structured analysis, propose within granted scopes, validate execution readiness and record evidence-linked RETURN; they cannot self-authorize execution, fabricate an adapter, close a proposal without matching RETURN evidence, or promote canon.

## COGNITIVE TWIN
The Cognitive Twin proposes and reconstructs; governed reviewers decide bounded proposals and ROOT alone owns canonical promotion. Experimental output is not automatically canonical.

## EPISTEMIC BOUNDARY
OBSERVED, DECLARED, DERIVED, INFERRED, PROJECTED, SIMULATED and MISSING states remain distinct. Preserve provenance, UUID, time and evidence lineage. Runtime capability is not external validation.

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
